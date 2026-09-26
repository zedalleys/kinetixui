/**
 * Release tags, and why they are their own convergence problem.
 *
 * A release has two independent states: what is on the registry, and what is tagged. They fail
 * separately. A release can publish all three packages and then fail to create or push the tags —
 * at which point the npm side is complete, the publish plan on any retry is empty, and an
 * implementation that treats "nothing to publish" as "nothing to do" can never repair the tags.
 * That hole is the reason this module exists: an empty publish plan is not the same thing as a
 * finished release.
 *
 * Changesets is the authority on tag naming and on what may be created. `changeset git-tag`
 * (3.0.3) skips packages that are `private`, skips packages in `ignore`, and skips any tag that
 * already exists locally *or* on the remote, so running it repeatedly is safe. It creates tags; it
 * does not push them. This module decides what to push, and never forces: a tag already on the
 * remote is left exactly as it is.
 *
 * The reconciliation itself is pure, so every recovery shape — nothing published but tags missing,
 * everything already converged, a half-published release, a tag that exists locally but was never
 * pushed — is a unit test rather than a rehearsal against a real remote.
 */
import { run } from "./exec.mjs";

export class TagCreationError extends Error {
  constructor(message, { published }) {
    super(message);
    this.name = "TagCreationError";
    this.published = published;
  }
}

export class TagPushError extends Error {
  constructor(message, { published, created, attempted }) {
    super(message);
    this.name = "TagPushError";
    this.published = published;
    this.created = created;
    this.attempted = attempted;
  }
}

/**
 * The tag Changesets creates for a workspace package.
 *
 * `buildGitTag` in @changesets/cli 3.0.3 is `tool.type !== "root" ? `${name}@${version}` : `v${version}``,
 * and this is a pnpm workspace, so the first branch applies. It is repeated here only to say what
 * *should* exist — Changesets remains the thing that creates them — and a repository test checks
 * this against the tags a real release actually produced.
 */
export function releaseTagName(name, version) {
  return `${name}@${version}`;
}

/**
 * The tags a finished release must have: one per allowlisted package whose version is on the
 * registry. `alreadyPublished` counts — those versions are live, so their tags are owed whether or
 * not this run was the one that uploaded them.
 *
 * Private packages are not included, and cannot be: they are never in the plan's publish sets.
 * Changesets would skip them anyway.
 *
 * @param {{publish: {name: string, version: string}[], alreadyPublished: {name: string, version: string}[]}} plan
 */
export function expectedReleaseTags(plan) {
  return [...plan.publish, ...plan.alreadyPublished].map((target) => releaseTagName(target.name, target.version)).sort();
}

/**
 * What the tag state means, given what exists where. Pure.
 *
 * @param {object} input
 * @param {string[]} input.expected
 * @param {Iterable<string>} input.localBefore local tags before the tagger ran
 * @param {Iterable<string>} input.localAfter local tags after it ran
 * @param {Iterable<string>} input.remote tags on the remote, read before pushing
 */
export function reconcileTags({ expected, localBefore, localAfter, remote }) {
  const before = new Set(localBefore);
  const after = new Set(localAfter);
  const onRemote = new Set(remote);
  const want = [...new Set(expected)].sort();

  const createdAll = [...after].filter((tag) => !before.has(tag)).sort();
  const created = createdAll.filter((tag) => want.includes(tag));
  // Something else in the working tree made a tag. Never pushed, only reported.
  const createdUnexpected = createdAll.filter((tag) => !want.includes(tag));

  const alreadyOnRemote = want.filter((tag) => onRemote.has(tag));
  // Everything owed that the remote does not have and that exists locally to push. This covers a
  // tag created by this run, and equally one created by an earlier run that failed before pushing
  // — Changesets will not re-create that one, because it can already see it locally.
  const toPush = want.filter((tag) => !onRemote.has(tag) && after.has(tag));
  // Owed, but nowhere to push it from. Reported rather than silently dropped.
  const unreconciled = want.filter((tag) => !onRemote.has(tag) && !after.has(tag));

  return { expected: want, created, createdUnexpected, alreadyOnRemote, toPush, unreconciled };
}

/** Local tags, as a Set. */
export async function listLocalTags({ root }) {
  const { stdout } = await run("git", ["tag", "--list"], { cwd: root });
  return new Set(
    stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

/**
 * Tags on the remote, as a Set. `git ls-remote --tags` prints both `refs/tags/X` and the
 * dereferenced `refs/tags/X^{}` for annotated tags — Changesets creates annotated tags, so both
 * appear and the peel suffix has to come off.
 */
export async function listRemoteTags({ root, remote = "origin" }) {
  const { stdout } = await run("git", ["ls-remote", "--tags", remote], { cwd: root });
  const tags = new Set();
  for (const line of stdout.split(/\r?\n/)) {
    const ref = line.split("\t")[1];
    if (!ref?.startsWith("refs/tags/")) continue;
    tags.add(ref.slice("refs/tags/".length).replace(/\^\{\}$/, ""));
  }
  return tags;
}

/** Create any missing tags, via Changesets. */
export async function createTagsWithChangesets({ root, packageManager }) {
  const { file, prefix } = packageManager;
  await run(file, [...prefix, "exec", "changeset", "git-tag"], { cwd: root });
}

/** Push tags by explicit ref. Never `--force`: a tag already on the remote is never replaced. */
export async function pushTags({ root, tags, remote = "origin" }) {
  if (tags.length === 0) return;
  await run("git", ["push", remote, ...tags.map((tag) => `refs/tags/${tag}`)], { cwd: root });
}

/**
 * Bring the tag state in line with the registry state.
 *
 * Runs whether or not anything was published in this run, because the two states fail
 * independently. Every git operation is injectable so the recovery shapes can be tested without a
 * remote.
 *
 * @returns {Promise<ReturnType<typeof reconcileTags> & {pushed: string[]}>}
 */
export async function reconcileReleaseTags({
  root,
  plan,
  published = [],
  packageManager,
  log = () => {},
  git = {},
}) {
  const local = git.listLocalTags ?? listLocalTags;
  const remoteList = git.listRemoteTags ?? listRemoteTags;
  const create = git.createTags ?? createTagsWithChangesets;
  const push = git.pushTags ?? pushTags;

  const expected = expectedReleaseTags(plan);
  const localBefore = await local({ root });
  const remote = await remoteList({ root });

  log("tag: changeset git-tag");
  try {
    await create({ root, packageManager });
  } catch (error) {
    throw new TagCreationError(
      [
        `Creating release tags failed: ${String(error.stderr || error.message).trim()}`,
        describePublished(published),
        "The tags are missing, not wrong. Re-run the release: it will skip every version already " +
          "on the registry and create only the tags that are still absent. Do not bump the version.",
      ].join("\n"),
      { published },
    );
  }

  const localAfter = await local({ root });
  const state = reconcileTags({ expected, localBefore, localAfter, remote });

  for (const tag of state.createdUnexpected) log(`tag: ignoring ${tag}, which this release does not own`);
  if (state.unreconciled.length > 0) log(`tag: could not reconcile ${state.unreconciled.join(", ")}`);

  if (state.toPush.length === 0) {
    log(
      state.alreadyOnRemote.length === expected.length && expected.length > 0
        ? "tag: every release tag is already on the remote"
        : "tag: nothing to push",
    );
    return { ...state, pushed: [] };
  }

  log(`tag: pushing ${state.toPush.join(", ")}`);
  try {
    await push({ root, tags: state.toPush });
  } catch (error) {
    throw new TagPushError(
      [
        "npm publication completed. Tag publication is incomplete.",
        describePublished(published),
        `Pushing ${state.toPush.join(", ")} failed: ${String(error.stderr || error.message).trim()}`,
        "Re-running the release is safe: published versions are skipped and tags already on the " +
          "remote are left alone. Do not bump the version, and do not force-push a tag the remote " +
          "already has at a different commit — investigate that instead.",
      ].join("\n"),
      { published, created: state.created, attempted: state.toPush },
    );
  }

  return { ...state, pushed: state.toPush };
}

function describePublished(published) {
  return published.length === 0
    ? "No package was published in this run."
    : `Published in this run: ${published.map((artifact) => `${artifact.name}@${artifact.version}`).join(", ")}.`;
}
