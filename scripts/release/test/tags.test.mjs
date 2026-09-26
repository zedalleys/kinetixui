import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  determineReleaseCommit,
  expectedReleaseTags,
  parseTagRefs,
  reconcileReleaseTags,
  reconcileTags,
  releaseTagName,
  ReleaseCommitUnknownError,
  TagCreationError,
  TagIntegrityError,
  TagPushError,
} from "../tags.mjs";

const V = "0.24.0";
const A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // the release commit
const B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"; // some other commit
const ANNOTATED = "0123456789abcdef0123456789abcdef01234567"; // an annotated tag's own object

const tag = (name) => `@kinetixui/${name}@${V}`;
const ALL = [tag("cli"), tag("tokens"), tag("ui")];
const target = (name) => ({ name: `@kinetixui/${name}`, version: V });
const planOf = ({ publish = [], alreadyPublished = [] }) => ({
  publish: publish.map(target),
  alreadyPublished: alreadyPublished.map(target),
});
const at = (commit, names = ALL) => new Map(names.map((name) => [name, commit]));

/**
 * A fake git. `local` and `remote` are tag → commit maps, so every assertion below is about tag
 * identity rather than tag existence.
 */
function fakeGit({ local = new Map(), remote = new Map(), head = A, ancestors = [A, B], createFails = false, pushFails = false } = {}) {
  const state = { local: new Map(local), remote: new Map(remote), created: [], pushed: [] };
  return {
    state,
    git: {
      headCommit: async () => head,
      listLocalTags: async () => new Map(state.local),
      listRemoteTags: async () => new Map(state.remote),
      isAncestorOfHead: async ({ commit }) => ancestors.includes(commit),
      createTag: async ({ tag: name, commit }) => {
        if (createFails) throw Object.assign(new Error("tag failed"), { stderr: "fatal: unable to write tag" });
        state.created.push({ tag: name, commit });
        state.local.set(name, commit);
      },
      pushTags: async ({ tags }) => {
        if (pushFails) throw Object.assign(new Error("push failed"), { stderr: "! [rejected] would clobber existing tag" });
        state.pushed.push(...tags);
        for (const name of tags) state.remote.set(name, state.local.get(name));
      },
    },
  };
}

const reconcile = (plan, git, published = []) => reconcileReleaseTags({ root: "/repo", plan, published, git });

describe("tag names", () => {
  it("uses the name@version form Changesets creates for a workspace package", () => {
    assert.equal(releaseTagName("@kinetixui/ui", V), tag("ui"));
  });

  it("owes a tag for what this run published and for what was already published", () => {
    assert.deepEqual(expectedReleaseTags(planOf({ publish: ["ui", "cli"], alreadyPublished: ["tokens"] })), ALL);
  });
});

describe("reading tag refs", () => {
  /**
   * Changesets creates annotated tags, so `git ls-remote --tags` reports the tag object *and* the
   * peeled commit. Comparing the tag object's sha against a commit sha would never match.
   */
  it("uses the peeled commit for an annotated tag, not the tag object", () => {
    const { commits, objects } = parseTagRefs(
      [`${ANNOTATED}\trefs/tags/${tag("ui")}`, `${A}\trefs/tags/${tag("ui")}^{}`].join("\n"),
    );
    assert.equal(objects.get(tag("ui")), ANNOTATED);
    assert.equal(commits.get(tag("ui")), A, "an annotated tag must resolve to its peeled commit");
    assert.notEqual(commits.get(tag("ui")), ANNOTATED);
  });

  it("uses the direct target for a lightweight tag", () => {
    const { commits } = parseTagRefs(`${A}\trefs/tags/${tag("ui")}`);
    assert.equal(commits.get(tag("ui")), A);
  });

  it("ignores anything that is not a tag ref", () => {
    const { commits } = parseTagRefs([`${A}\trefs/heads/main`, `${B}\trefs/tags/${tag("ui")}`].join("\n"));
    assert.deepEqual([...commits.keys()], [tag("ui")]);
  });
});

describe("which commit the release is tagged at", () => {
  it("is HEAD when this run published something, because the tarballs came from this tree", () => {
    const decision = determineReleaseCommit({ publishedCount: 2, head: A, expected: ALL, remote: new Map(), local: new Map() });
    assert.equal(decision.commit, A);
  });

  /**
   * The delayed-recovery hazard: npm is complete, only tags are missing, and unrelated commits have
   * landed since. HEAD is not evidence of anything, and a sibling tag from the same release is.
   */
  it("is taken from a sibling release tag when this run published nothing", () => {
    const decision = determineReleaseCommit({
      publishedCount: 0,
      head: B,
      expected: ALL,
      remote: new Map([[tag("tokens"), A]]),
      local: new Map(),
    });
    assert.equal(decision.commit, A, "must not assume the advanced HEAD");
    assert.match(decision.source, /existing release tag/);
  });

  it("fails closed when nothing was published and no tag from this release exists", () => {
    const decision = determineReleaseCommit({ publishedCount: 0, head: B, expected: ALL, remote: new Map(), local: new Map() });
    assert.equal(decision.commit, null);
    assert.match(decision.reason, /no evidence|no tag from this release/i);
  });

  it("fails closed when the existing release tags disagree with each other", () => {
    const decision = determineReleaseCommit({
      publishedCount: 0,
      head: A,
      expected: ALL,
      remote: new Map([
        [tag("tokens"), A],
        [tag("ui"), B],
      ]),
      local: new Map(),
    });
    assert.equal(decision.commit, null);
    assert.match(decision.reason, /disagree/);
  });
});

describe("reconciling by identity", () => {
  it("accepts a remote tag that resolves to the release commit", () => {
    const state = reconcileTags({ expected: at(A), local: new Map(), remote: at(A) });
    assert.deepEqual(state.correctRemote, ALL);
    assert.deepEqual(state.toPush, []);
    assert.deepEqual(state.divergentRemote, []);
  });

  it("rejects a remote tag that resolves to another commit", () => {
    const state = reconcileTags({ expected: at(A), local: new Map(), remote: at(B, [tag("ui")]) });
    assert.deepEqual(
      state.divergentRemote.map((d) => d.tag),
      [tag("ui")],
    );
    assert.ok(!state.toPush.includes(tag("ui")), "a divergent tag is never in toPush");
  });

  it("pushes a correct local tag the remote lacks", () => {
    const state = reconcileTags({ expected: at(A), local: at(A), remote: new Map() });
    assert.deepEqual(state.correctLocalNeedsPush, ALL);
    assert.deepEqual(state.toPush, ALL);
  });

  it("rejects a local tag that resolves to another commit, and never pushes it", () => {
    const state = reconcileTags({ expected: at(A), local: at(B, [tag("ui")]), remote: new Map() });
    assert.deepEqual(
      state.divergentLocal.map((d) => d.tag),
      [tag("ui")],
    );
    assert.ok(!state.toPush.includes(tag("ui")));
  });

  it("treats a correct remote and a divergent local as an integrity conflict", () => {
    const state = reconcileTags({ expected: at(A), local: at(B, [tag("ui")]), remote: at(A, [tag("ui")]) });
    assert.deepEqual(
      state.divergentLocal.map((d) => d.tag),
      [tag("ui")],
    );
    assert.deepEqual(state.correctRemote, []);
  });

  it("is a clean no-op when local and remote are both correct", () => {
    const state = reconcileTags({ expected: at(A), local: at(A), remote: at(A) });
    assert.deepEqual(state.correctRemote, ALL);
    assert.deepEqual(state.toPush, []);
    assert.deepEqual(state.missingNeedsCreation, []);
  });

  it("marks a tag that exists nowhere for creation", () => {
    const state = reconcileTags({ expected: at(A), local: new Map(), remote: new Map() });
    assert.deepEqual(state.missingNeedsCreation, ALL);
  });

  it("ignores a local tag this release does not own", () => {
    const state = reconcileTags({ expected: at(A, [tag("ui")]), local: new Map([[tag("ui"), A], ["v9.9.9", B]]), remote: new Map() });
    assert.deepEqual(state.unexpected, ["v9.9.9"]);
    assert.deepEqual(state.toPush, [tag("ui")]);
  });
});

describe("recovery", () => {
  it("creates and pushes every tag when npm is complete but the tags are missing", async () => {
    // Recovered on the release commit itself, so HEAD is still the right answer even though
    // nothing needed publishing — a sibling tag is absent, so this is the fail-closed path unless
    // something published. Here one package publishes, which settles it.
    const { state, git } = fakeGit({ head: A });
    const result = await reconcile(planOf({ publish: ["ui"], alreadyPublished: ["tokens", "cli"] }), git, [target("ui")]);

    assert.equal(result.releaseCommit, A);
    assert.deepEqual(result.created.sort(), ALL);
    assert.deepEqual(result.pushed, ALL);
    for (const entry of state.created) assert.equal(entry.commit, A);
  });

  /** npm complete, tags absent, HEAD has advanced, and one sibling tag survives to point the way. */
  it("tags the real release commit, not the advanced HEAD, when a sibling tag exists", async () => {
    const { state, git } = fakeGit({ head: B, remote: new Map([[tag("tokens"), A]]) });
    const result = await reconcile(planOf({ alreadyPublished: ["tokens", "ui", "cli"] }), git, []);

    assert.equal(result.releaseCommit, A, "must tag the release commit, not HEAD");
    assert.deepEqual(result.created.sort(), [tag("cli"), tag("ui")]);
    for (const entry of state.created) assert.equal(entry.commit, A, "a new tag must be created at the release commit");
    assert.deepEqual(result.pushed, [tag("cli"), tag("ui")]);
    assert.ok(!state.pushed.includes(tag("tokens")), "a correct remote tag is never re-pushed");
  });

  /** npm complete, tags absent, HEAD has advanced, and nothing says where the release was. */
  it("refuses to tag anything when the release commit cannot be established", async () => {
    const { state, git } = fakeGit({ head: B });
    await assert.rejects(
      () => reconcile(planOf({ alreadyPublished: ["tokens", "ui", "cli"] }), git, []),
      (error) => {
        assert.ok(error instanceof ReleaseCommitUnknownError);
        assert.match(error.message, /Cannot safely determine the commit/);
        assert.match(error.message, /No tag was created or force-pushed/);
        assert.match(error.message, /Do not bump the version, and do not tag HEAD/);
        return true;
      },
    );
    assert.deepEqual(state.created, [], "nothing may be created");
    assert.deepEqual(state.pushed, [], "nothing may be pushed");
  });

  it("refuses a release commit that is not reachable from HEAD", async () => {
    const { state, git } = fakeGit({ head: A, remote: new Map([[tag("tokens"), "cccccccccccccccccccccccccccccccccccccccc"]]), ancestors: [A] });
    await assert.rejects(
      () => reconcile(planOf({ alreadyPublished: ["tokens", "ui", "cli"] }), git, []),
      (error) => error instanceof ReleaseCommitUnknownError && /not reachable from HEAD/.test(error.message),
    );
    assert.deepEqual(state.created, []);
    assert.deepEqual(state.pushed, []);
  });

  it("is a clean no-op when every tag is already correct on the remote", async () => {
    const { state, git } = fakeGit({ head: A, local: at(A), remote: at(A) });
    const result = await reconcile(planOf({ alreadyPublished: ["tokens", "ui", "cli"] }), git, []);

    assert.deepEqual(result.created, []);
    assert.deepEqual(result.pushed, []);
    assert.deepEqual(state.pushed, []);
    assert.deepEqual(result.correctRemote, ALL);
  });

  it("pushes a correct local tag the remote lacks, without recreating it", async () => {
    const { state, git } = fakeGit({ head: A, local: at(A), remote: new Map() });
    const result = await reconcile(planOf({ publish: ["ui", "cli", "tokens"] }), git, [target("ui"), target("cli"), target("tokens")]);

    assert.deepEqual(state.created, [], "an existing correct tag is not recreated");
    assert.deepEqual(result.pushed, ALL);
  });

  it("completes a partial npm release and tags everything owed", async () => {
    const { state, git } = fakeGit({ head: A });
    const result = await reconcile(planOf({ publish: ["ui", "cli"], alreadyPublished: ["tokens"] }), git, [target("ui"), target("cli")]);

    assert.deepEqual(result.expected, ALL, "the earlier run's package is owed a tag too");
    assert.deepEqual(result.pushed, ALL);
    for (const entry of state.created) assert.equal(entry.commit, A);
  });
});

describe("integrity failures", () => {
  it("stops on a divergent remote tag without creating, pushing or forcing anything", async () => {
    const { state, git } = fakeGit({ head: A, remote: at(B, [tag("ui")]) });
    await assert.rejects(
      () => reconcile(planOf({ publish: ["tokens", "cli"], alreadyPublished: ["ui"] }), git, [target("tokens"), target("cli")]),
      (error) => {
        assert.ok(error instanceof TagIntegrityError);
        assert.match(error.message, /Release tag integrity check failed/);
        assert.match(error.message, new RegExp(`expected commit:\\s+${A}`));
        assert.match(error.message, new RegExp(`remote resolves to:\\s+${B}`));
        assert.match(error.message, /No tag was created, overwritten or force-pushed/);
        assert.doesNotMatch(error.message, /--force|force-push it|delete/i);
        return true;
      },
    );
    assert.deepEqual(state.created, []);
    assert.deepEqual(state.pushed, []);
  });

  /** An annotated remote tag whose peeled commit is wrong — the case a name-only check misses. */
  it("stops on a divergent annotated remote tag", async () => {
    const { commits } = parseTagRefs([`${ANNOTATED}\trefs/tags/${tag("ui")}`, `${B}\trefs/tags/${tag("ui")}^{}`].join("\n"));
    const { state, git } = fakeGit({ head: A, remote: commits });
    await assert.rejects(
      () => reconcile(planOf({ publish: ["tokens", "cli"], alreadyPublished: ["ui"] }), git, [target("tokens")]),
      (error) => error instanceof TagIntegrityError && error.divergent[0].actual === B,
    );
    assert.deepEqual(state.pushed, []);
  });

  it("accepts an annotated remote tag whose peeled commit is right", async () => {
    const { commits } = parseTagRefs([`${ANNOTATED}\trefs/tags/${tag("ui")}`, `${A}\trefs/tags/${tag("ui")}^{}`].join("\n"));
    const { git } = fakeGit({ head: A, remote: commits });
    const result = await reconcile(planOf({ publish: ["tokens", "cli"], alreadyPublished: ["ui"] }), git, [target("tokens"), target("cli")]);
    assert.ok(result.correctRemote.includes(tag("ui")));
  });

  it("stops on a divergent local tag before pushing", async () => {
    const { state, git } = fakeGit({ head: A, local: at(B, [tag("ui")]) });
    await assert.rejects(
      () => reconcile(planOf({ publish: ["tokens", "cli", "ui"] }), git, [target("tokens")]),
      (error) => error instanceof TagIntegrityError && error.divergent[0].where === "local",
    );
    assert.deepEqual(state.pushed, []);
    assert.deepEqual(state.created, []);
  });

  it("stops when the local ref and a correct remote ref disagree", async () => {
    const { state, git } = fakeGit({ head: A, local: at(B, [tag("ui")]), remote: at(A, [tag("ui")]) });
    await assert.rejects(
      () => reconcile(planOf({ publish: ["tokens", "cli"], alreadyPublished: ["ui"] }), git, [target("tokens")]),
      (error) => error instanceof TagIntegrityError,
    );
    assert.deepEqual(state.pushed, [], "neither ref is mutated");
    assert.deepEqual(state.created, []);
  });
});

describe("failure reporting", () => {
  it("says what was published and to re-run, not to bump, when tag creation fails", async () => {
    const { git } = fakeGit({ head: A, createFails: true });
    await assert.rejects(
      () => reconcile(planOf({ publish: ["ui"], alreadyPublished: ["tokens", "cli"] }), git, [target("ui")]),
      (error) => {
        assert.ok(error instanceof TagCreationError);
        assert.match(error.message, /Published in this run: @kinetixui\/ui@0\.24\.0/);
        assert.match(error.message, /Nothing was overwritten or force-pushed/);
        assert.match(error.message, /Do not bump the version/);
        return true;
      },
    );
  });

  it("separates the two states when the push fails, and never suggests forcing", async () => {
    const { git } = fakeGit({ head: A, pushFails: true });
    await assert.rejects(
      () => reconcile(planOf({ publish: ["ui", "cli", "tokens"] }), git, [target("ui"), target("cli"), target("tokens")]),
      (error) => {
        assert.ok(error instanceof TagPushError);
        assert.match(error.message, /npm publication completed\. Tag publication is incomplete\./);
        assert.match(error.message, /Re-running the release is safe/);
        assert.match(error.message, /investigate it rather than forcing it/);
        assert.doesNotMatch(error.message, /--force/);
        assert.deepEqual(error.attempted, ALL);
        return true;
      },
    );
  });
});
