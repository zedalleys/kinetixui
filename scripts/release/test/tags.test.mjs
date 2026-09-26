import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expectedReleaseTags,
  reconcileReleaseTags,
  reconcileTags,
  releaseTagName,
  TagCreationError,
  TagPushError,
} from "../tags.mjs";

const V = "0.24.0";
const tag = (name) => `@kinetixui/${name}@${V}`;
const ALL = [tag("cli"), tag("tokens"), tag("ui")];

const target = (name) => ({ name: `@kinetixui/${name}`, version: V });
const planOf = ({ publish = [], alreadyPublished = [] }) => ({
  publish: publish.map(target),
  alreadyPublished: alreadyPublished.map(target),
  private: [{ name: "@kinetixui/angular", version: "0.23.0" }],
});

/**
 * A fake git, recording what it was asked to do. `created` is what the tagger would add locally,
 * which mirrors Changesets: a tag already present locally or on the remote is not re-created.
 */
function fakeGit({ local = [], remote = [], createFails = false, pushFails = false } = {}) {
  const state = { local: new Set(local), remote: new Set(remote), pushed: [], created: [], taggerRuns: 0 };
  return {
    state,
    git: {
      listLocalTags: async () => new Set(state.local),
      listRemoteTags: async () => new Set(state.remote),
      createTags: async () => {
        state.taggerRuns += 1;
        if (createFails) throw Object.assign(new Error("git tag failed"), { stderr: "fatal: tag already exists" });
        for (const name of ALL) {
          if (state.local.has(name) || state.remote.has(name)) continue;
          state.local.add(name);
          state.created.push(name);
        }
      },
      pushTags: async ({ tags }) => {
        if (pushFails) throw Object.assign(new Error("push failed"), { stderr: "! [remote rejected]" });
        state.pushed.push(...tags);
        for (const t of tags) state.remote.add(t);
      },
    },
  };
}

const reconcile = (plan, git, published = []) =>
  reconcileReleaseTags({ root: "/repo", plan, published, packageManager: { file: "pnpm", prefix: [] }, git });

describe("expected release tags", () => {
  it("uses the name@version form Changesets creates for a workspace package", () => {
    assert.equal(releaseTagName("@kinetixui/ui", "0.24.0"), "@kinetixui/ui@0.24.0");
  });

  it("covers both what this run published and what was already published", () => {
    const plan = planOf({ publish: ["ui", "cli"], alreadyPublished: ["tokens"] });
    assert.deepEqual(expectedReleaseTags(plan), ALL);
  });

  it("never includes a private package", () => {
    const plan = planOf({ publish: ["ui", "cli", "tokens"] });
    assert.ok(!expectedReleaseTags(plan).some((t) => t.includes("angular")));
  });
});

describe("tag reconciliation", () => {
  it("pushes a tag the remote does not have, whoever created it", () => {
    const state = reconcileTags({ expected: ALL, localBefore: [], localAfter: ALL, remote: [] });
    assert.deepEqual(state.created, ALL);
    assert.deepEqual(state.toPush, ALL);
    assert.deepEqual(state.unreconciled, []);
  });

  /**
   * A tag created by an earlier run that then failed to push. Changesets will not create it again —
   * it can already see it locally — so a "what did the tagger just create" diff would find nothing
   * and the remote would stay missing it forever. What matters is the remote, not who made it.
   */
  it("pushes a tag that already existed locally but was never pushed", () => {
    const state = reconcileTags({ expected: ALL, localBefore: ALL, localAfter: ALL, remote: [] });
    assert.deepEqual(state.created, []);
    assert.deepEqual(state.toPush, ALL);
  });

  it("never re-pushes a tag the remote already has", () => {
    const state = reconcileTags({ expected: ALL, localBefore: [], localAfter: ALL, remote: ALL });
    assert.deepEqual(state.toPush, []);
    assert.deepEqual(state.alreadyOnRemote, ALL);
  });

  it("reports an owed tag that exists neither locally nor on the remote", () => {
    const state = reconcileTags({ expected: ALL, localBefore: [], localAfter: [tag("ui")], remote: [] });
    assert.deepEqual(state.toPush, [tag("ui")]);
    assert.deepEqual(state.unreconciled, [tag("cli"), tag("tokens")]);
  });

  it("does not push a tag this release does not own", () => {
    const state = reconcileTags({ expected: [tag("ui")], localBefore: [], localAfter: [tag("ui"), "v9.9.9"], remote: [] });
    assert.deepEqual(state.toPush, [tag("ui")]);
    assert.deepEqual(state.createdUnexpected, ["v9.9.9"]);
  });
});

describe("recovery", () => {
  /**
   * The bug this module was added for. A run published all three packages and then failed before
   * the tags reached the remote. On the retry every version is already on the registry, so the
   * publish plan is empty — and an implementation that stops there can never repair the tags.
   */
  it("reconciles tags when every npm version is already published but the release tags are missing", async () => {
    const { state, git } = fakeGit({ local: [], remote: [] });
    const plan = planOf({ alreadyPublished: ["tokens", "ui", "cli"] });

    const result = await reconcile(plan, git, []);

    assert.equal(state.taggerRuns, 1, "tag reconciliation must run even with an empty publish plan");
    assert.deepEqual(result.expected, ALL);
    assert.deepEqual(result.created, ALL);
    assert.deepEqual(result.pushed, ALL);
    assert.deepEqual(state.pushed, ALL);
  });

  it("is a clean no-op when the registry and the tags are both complete", async () => {
    const { state, git } = fakeGit({ local: ALL, remote: ALL });
    const result = await reconcile(planOf({ alreadyPublished: ["tokens", "ui", "cli"] }), git, []);

    assert.deepEqual(result.created, []);
    assert.deepEqual(result.pushed, []);
    assert.deepEqual(state.pushed, []);
    assert.deepEqual(result.alreadyOnRemote, ALL);
    assert.deepEqual(result.unreconciled, []);
  });

  /** 0.23.0's shape: tokens published, the run died, ui and cli never went out and nothing tagged. */
  it("tags everything owed after a partial release is completed", async () => {
    const { state, git } = fakeGit({ local: [], remote: [] });
    const plan = planOf({ publish: ["ui", "cli"], alreadyPublished: ["tokens"] });

    const result = await reconcile(plan, git, [target("ui"), target("cli")]);

    // The tag for the package published by the earlier, failed run is owed too.
    assert.deepEqual(result.expected, ALL);
    assert.deepEqual(result.pushed, ALL);
  });

  it("pushes only what the remote is missing when a previous run pushed some tags", async () => {
    const { state, git } = fakeGit({ local: [], remote: [tag("tokens")] });
    const result = await reconcile(planOf({ publish: ["ui", "cli"], alreadyPublished: ["tokens"] }), git, [target("ui"), target("cli")]);

    assert.deepEqual(result.alreadyOnRemote, [tag("tokens")]);
    assert.deepEqual(result.pushed, [tag("cli"), tag("ui")]);
    assert.ok(!state.pushed.includes(tag("tokens")), "an existing remote tag is never re-pushed");
  });

  it("pushes a locally-present tag the remote lacks, without re-creating it", async () => {
    const { state, git } = fakeGit({ local: ALL, remote: [] });
    const result = await reconcile(planOf({ alreadyPublished: ["tokens", "ui", "cli"] }), git, []);

    assert.deepEqual(state.created, [], "Changesets must not re-create a tag it can already see");
    assert.deepEqual(result.pushed, ALL);
  });
});

describe("failure reporting", () => {
  it("says what was published and to re-run, not to bump, when tag creation fails", async () => {
    const { git } = fakeGit({ createFails: true });
    const plan = planOf({ publish: ["ui"], alreadyPublished: ["tokens", "cli"] });

    await assert.rejects(
      () => reconcile(plan, git, [target("ui")]),
      (error) => {
        assert.ok(error instanceof TagCreationError);
        assert.ok(error.message.includes("Published in this run: @kinetixui/ui@0.24.0"));
        assert.ok(error.message.includes("Re-run the release"));
        assert.ok(error.message.includes("Do not bump the version"));
        return true;
      },
    );
  });

  it("separates the two states when the push fails", async () => {
    const { git } = fakeGit({ pushFails: true });
    const plan = planOf({ publish: ["ui", "cli", "tokens"] });

    await assert.rejects(
      () => reconcile(plan, git, [target("ui"), target("cli"), target("tokens")]),
      (error) => {
        assert.ok(error instanceof TagPushError);
        assert.ok(error.message.includes("npm publication completed. Tag publication is incomplete."));
        assert.ok(error.message.includes("Re-running the release is safe"));
        assert.ok(error.message.includes("do not force-push"));
        assert.deepEqual(error.attempted, ALL);
        return true;
      },
    );
  });

  it("reports honestly when nothing was published and tag creation fails", async () => {
    const { git } = fakeGit({ createFails: true });
    await assert.rejects(
      () => reconcile(planOf({ alreadyPublished: ["ui"] }), git, []),
      (error) => error.message.includes("No package was published in this run."),
    );
  });
});
