/**
 * Release tags: identity, not just existence.
 *
 * A release has two states that fail separately — what is on the registry, and what is tagged — so
 * tag reconciliation runs on every release, including one with an empty publish plan. A run that
 * published everything and then failed to push its tags leaves exactly that shape behind, and an
 * implementation that stopped at "nothing to publish" could never repair it.
 *
 * But a tag *name* existing proves nothing. `@kinetixui/ui@0.24.0` pointing at some other commit is
 * worse than no tag at all, because it is a confident lie about what was released. Every tag is
 * therefore compared by the commit it resolves to, and a mismatch is a hard failure: nothing is
 * force-pushed, nothing is deleted, nothing is overwritten.
 *
 * ## Which commit is the release commit
 *
 * Not derivable from versions. Six commits on this repository carry version 0.23.0 — the Changesets
 * bump, the merge that landed it, two fixes, the merge that released it, and everything after — and
 * the real tags peel to the *fifth* of those. "The commit that introduced the version" would call
 * the genuine 0.23.0 tags divergent.
 *
 * What is sound is narrower:
 *
 *   - If this run published a package, HEAD is the release commit. The tarballs that went to npm
 *     were built from this tree; there is nothing else they could belong to.
 *   - If this run published nothing, HEAD is not evidence of anything — unrelated commits may have
 *     landed since the release. A sibling tag from the same release is evidence, so one is used if
 *     present.
 *   - Otherwise the release commit is unknown, and this fails closed rather than tagging HEAD.
 *
 * Checked against the real history: the 0.23.0 release published `ui` and `cli` (`tokens` was
 * already up from the failed run), so HEAD was the release commit, and the tags do point at it.
 *
 * ## Why Changesets no longer creates the tags
 *
 * `changeset git-tag` runs `git tag <name> -m <name>`, which tags HEAD unconditionally — the exact
 * behaviour this module exists to prevent during a delayed recovery. Tags are created here instead,
 * in the same annotated form and with the same name, and `releaseTagName` is checked against the
 * installed Changesets implementation so the naming stays theirs.
 */
import { run } from "./exec.mjs";

export class TagIntegrityError extends Error {
  constructor(message, { divergent }) {
    super(message);
    this.name = "TagIntegrityError";
    this.divergent = divergent;
  }
}

export class ReleaseCommitUnknownError extends Error {
  constructor(message, { expected }) {
    super(message);
    this.name = "ReleaseCommitUnknownError";
    this.expected = expected;
  }
}

export class TagCreationError extends Error {
  constructor(message, { published }) {
    super(message);
    this.name = "TagCreationError";
    this.published = published;
  }
}

export class TagPushError extends Error {
  constructor(message, { published, attempted }) {
    super(message);
    this.name = "TagPushError";
    this.published = published;
    this.attempted = attempted;
  }
}

/**
 * The tag Changesets creates for a workspace package.
 *
 * `buildGitTag` in @changesets/cli 3.0.3 is
 * `tool.type !== "root" ? `${name}@${version}` : `v${version}``, and this is a pnpm workspace, so
 * the first branch applies. A test asserts this against the installed implementation.
 */
export function releaseTagName(name, version) {
  return `${name}@${version}`;
}

/**
 * The tags a finished release owes: one per allowlisted package whose version is on the registry.
 * `alreadyPublished` counts — those versions are live, so their tags are owed whether or not this
 * run uploaded them. Private packages are never in the plan's publish sets, so they can never
 * appear here.
 */
export function expectedReleaseTags(plan) {
  return [...plan.publish, ...plan.alreadyPublished].map((target) => releaseTagName(target.name, target.version)).sort();
}

/**
 * Decide the commit the release's tags must identify. Pure.
 *
 * @param {object} input
 * @param {number} input.publishedCount packages uploaded by *this* run
 * @param {string} input.head
 * @param {string[]} input.expected tag names this release owes
 * @param {Map<string, string>} input.remote tag name → commit sha
 * @param {Map<string, string>} input.local tag name → commit sha
 * @returns {{commit: string|null, source: string, reason?: string}}
 */
export function determineReleaseCommit({ publishedCount, head, expected, remote, local }) {
  if (publishedCount > 0) {
    return { commit: head, source: "this run published from HEAD" };
  }

  // Nothing was uploaded, so this is a tag-only recovery and HEAD may have moved on. A tag from
  // the same release already knows where the release was.
  const siblings = new Map();
  for (const name of expected) {
    const commit = remote.get(name) ?? local.get(name);
    if (commit) siblings.set(name, commit);
  }

  const distinct = [...new Set(siblings.values())];
  if (distinct.length === 1) {
    return { commit: distinct[0], source: `the existing release tag ${[...siblings.keys()][0]}` };
  }
  if (distinct.length > 1) {
    return {
      commit: null,
      source: "none",
      reason:
        `the existing release tags disagree about which commit this release is: ` +
        [...siblings].map(([name, commit]) => `${name} → ${commit.slice(0, 10)}`).join(", "),
    };
  }
  return {
    commit: null,
    source: "none",
    reason:
      "nothing was published in this run and no tag from this release exists, so there is no " +
      "evidence of which commit it was released from. HEAD is not that evidence: unrelated commits " +
      "may have landed since.",
  };
}

/**
 * Compare what exists against what is owed, by commit. Pure.
 *
 * @param {object} input
 * @param {Map<string, string>} input.expected tag name → the commit it must identify
 * @param {Map<string, string>} input.local tag name → commit sha
 * @param {Map<string, string>} input.remote tag name → commit sha
 */
export function reconcileTags({ expected, local, remote }) {
  const correctRemote = [];
  const correctLocalNeedsPush = [];
  const missingNeedsCreation = [];
  const divergentLocal = [];
  const divergentRemote = [];

  for (const name of [...expected.keys()].sort()) {
    const want = expected.get(name);
    const onRemote = remote.get(name);
    const onLocal = local.get(name);

    if (onRemote !== undefined && onRemote !== want) {
      divergentRemote.push({ tag: name, expected: want, actual: onRemote, where: "remote" });
      continue;
    }
    if (onLocal !== undefined && onLocal !== want) {
      // Also reached when the remote is correct but the local ref is not: the two refs disagree
      // about the same release, which is an integrity conflict either way. Neither is mutated.
      divergentLocal.push({ tag: name, expected: want, actual: onLocal, where: "local" });
      continue;
    }
    if (onRemote !== undefined) {
      correctRemote.push(name);
      continue;
    }
    if (onLocal !== undefined) {
      correctLocalNeedsPush.push(name);
      continue;
    }
    missingNeedsCreation.push(name);
  }

  // Local tags that are not this release's business. Reported, never pushed.
  const unexpected = [...local.keys()].filter((name) => !expected.has(name)).sort();

  return {
    expected: [...expected.keys()].sort(),
    correctRemote,
    correctLocalNeedsPush,
    missingNeedsCreation,
    divergentLocal,
    divergentRemote,
    unexpected,
    // Never includes anything divergent.
    toPush: [...correctLocalNeedsPush].sort(),
  };
}

/** A human-readable integrity failure. Never suggests a force-push or a delete. */
export function formatDivergence(divergent) {
  const lines = ["Release tag integrity check failed."];
  for (const entry of divergent) {
    lines.push(
      "",
      entry.tag,
      `  expected commit:        ${entry.expected}`,
      `  ${entry.where} resolves to: ${entry.actual}`,
    );
  }
  lines.push(
    "",
    "The tag already exists but does not identify the expected release commit.",
    "No tag was created, overwritten or force-pushed.",
    "Investigate the existing tag before retrying: something else released this version, or the tag",
    "was created by hand. Resolving it is a deliberate decision, not something a release should make.",
  );
  return lines.join("\n");
}

/** Parse `<sha>\trefs/tags/X` and `<sha>\trefs/tags/X^{}` into tag name → commit sha. */
export function parseTagRefs(text) {
  const objects = new Map();
  const peeled = new Map();
  for (const line of text.split(/\r?\n/)) {
    const [sha, ref] = line.split(/\s+/);
    if (!sha || !ref?.startsWith("refs/tags/")) continue;
    const name = ref.slice("refs/tags/".length);
    if (name.endsWith("^{}")) peeled.set(name.slice(0, -3), sha);
    else objects.set(name, sha);
  }
  // An annotated tag's own object sha is not a commit sha; its peeled entry is the commit. A
  // lightweight tag has no peeled entry and points at the commit directly.
  const commits = new Map();
  for (const [name, sha] of objects) commits.set(name, peeled.get(name) ?? sha);
  for (const [name, sha] of peeled) commits.set(name, sha);
  return { commits, objects, peeled };
}

/** Local tags as name → commit sha. `-d` asks for the dereferenced entries. */
export async function listLocalTags({ root }) {
  try {
    const { stdout } = await run("git", ["show-ref", "--tags", "-d"], { cwd: root });
    return parseTagRefs(stdout).commits;
  } catch (error) {
    // `git show-ref` exits 1 when there are no refs at all, which is the normal state of a shallow
    // CI checkout.
    if (error.code === 1 && !String(error.stderr).trim()) return new Map();
    throw error;
  }
}

/** Remote tags as name → commit sha, without fetching any objects. */
export async function listRemoteTags({ root, remote = "origin" }) {
  const { stdout } = await run("git", ["ls-remote", "--tags", remote], { cwd: root });
  return parseTagRefs(stdout).commits;
}

/** HEAD's commit sha. */
export async function headCommit({ root }) {
  const { stdout } = await run("git", ["rev-parse", "HEAD"], { cwd: root });
  return stdout.trim();
}

/** True when `commit` is reachable from HEAD — a release tag must be on this history. */
export async function isAncestorOfHead({ root, commit }) {
  try {
    await run("git", ["merge-base", "--is-ancestor", commit, "HEAD"], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create an annotated tag at a specific commit — the same form Changesets creates
 * (`git tag <name> -m <name>`), with the commit made explicit rather than left as HEAD.
 */
export async function createTag({ root, tag, commit }) {
  await run("git", ["tag", "-a", tag, "-m", tag, commit], { cwd: root });
}

/** Push tags by explicit ref. Never `--force`. */
export async function pushTags({ root, tags, remote = "origin" }) {
  if (tags.length === 0) return;
  await run("git", ["push", remote, ...tags.map((tag) => `refs/tags/${tag}`)], { cwd: root });
}

/**
 * Bring the tag state in line with the registry state, refusing to proceed if any tag that exists
 * disagrees about which commit was released.
 */
export async function reconcileReleaseTags({ root, plan, published = [], log = () => {}, git = {} }) {
  const readLocal = git.listLocalTags ?? listLocalTags;
  const readRemote = git.listRemoteTags ?? listRemoteTags;
  const readHead = git.headCommit ?? headCommit;
  const ancestorOfHead = git.isAncestorOfHead ?? isAncestorOfHead;
  const create = git.createTag ?? createTag;
  const push = git.pushTags ?? pushTags;

  const names = expectedReleaseTags(plan);
  const head = await readHead({ root });
  const local = await readLocal({ root });
  const remote = await readRemote({ root });

  const decision = determineReleaseCommit({ publishedCount: published.length, head, expected: names, remote, local });
  if (!decision.commit) {
    throw new ReleaseCommitUnknownError(
      [
        `Cannot safely determine the commit that ${names.join(", ")} should be tagged at.`,
        `No tag was created or force-pushed.`,
        "",
        decision.reason,
        "",
        "Recovery:",
        "  1. Find the commit the release was published from — the Release workflow run for this",
        "     version records it, and so does the merge that versioned the packages.",
        "  2. Create the tags at that commit and push them:",
        ...names.map((name) => `       git tag -a ${name} -m ${name} <that-commit>`),
        `       git push origin ${names.map((name) => `refs/tags/${name}`).join(" ")}`,
        "  3. Re-run the release; it will verify them and do nothing else.",
        "",
        "Do not bump the version, and do not tag HEAD to make this pass.",
      ].join("\n"),
      { expected: names },
    );
  }

  if (decision.commit !== head && !(await ancestorOfHead({ root, commit: decision.commit }))) {
    throw new ReleaseCommitUnknownError(
      [
        `The commit this release would be tagged at (${decision.commit}) is not reachable from HEAD.`,
        `It was taken from ${decision.source}.`,
        "No tag was created or force-pushed.",
        "",
        "A release tag must be on the history being released. Investigate that tag before retrying.",
      ].join("\n"),
      { expected: names },
    );
  }
  log(`tag: release commit ${decision.commit.slice(0, 10)} (${decision.source})`);

  const expected = new Map(names.map((name) => [name, decision.commit]));
  const state = reconcileTags({ expected, local, remote });

  // Identity first: nothing is created and nothing is pushed while a tag that already exists
  // disagrees about what was released.
  const divergent = [...state.divergentRemote, ...state.divergentLocal];
  if (divergent.length > 0) throw new TagIntegrityError(formatDivergence(divergent), { divergent });

  for (const name of state.unexpected) log(`tag: ignoring ${name}, which this release does not own`);

  const created = [];
  for (const name of state.missingNeedsCreation) {
    log(`tag: creating ${name} at ${decision.commit.slice(0, 10)}`);
    try {
      await create({ root, tag: name, commit: decision.commit });
      created.push(name);
    } catch (error) {
      throw new TagCreationError(
        [
          `Creating ${name} at ${decision.commit} failed: ${String(error.stderr || error.message).trim()}`,
          describePublished(published),
          created.length > 0 ? `Created in this run: ${created.join(", ")}.` : "No tag was created.",
          "Nothing was overwritten or force-pushed. Re-run the release: it will skip every version",
          "already on the registry and every tag already correct. Do not bump the version.",
        ].join("\n"),
        { published },
      );
    }
  }

  const toPush = [...state.toPush, ...created].sort();
  if (toPush.length === 0) {
    log(
      state.correctRemote.length === names.length && names.length > 0
        ? "tag: every release tag is already on the remote at the right commit"
        : "tag: nothing to push",
    );
    return { ...state, releaseCommit: decision.commit, created, pushed: [] };
  }

  log(`tag: pushing ${toPush.join(", ")}`);
  try {
    await push({ root, tags: toPush });
  } catch (error) {
    throw new TagPushError(
      [
        "npm publication completed. Tag publication is incomplete.",
        describePublished(published),
        `Pushing ${toPush.join(", ")} failed: ${String(error.stderr || error.message).trim()}`,
        "",
        "Re-running the release is safe: published versions are skipped and tags already correct on",
        "the remote are left alone. Do not bump the version. If the remote holds one of these tags at",
        "a different commit the next run will say so and stop — investigate it rather than forcing it.",
      ].join("\n"),
      { published, attempted: toPush },
    );
  }

  return { ...state, releaseCommit: decision.commit, created, pushed: toPush };
}

function describePublished(published) {
  return published.length === 0
    ? "No package was published in this run."
    : `Published in this run: ${published.map((artifact) => `${artifact.name}@${artifact.version}`).join(", ")}.`;
}
