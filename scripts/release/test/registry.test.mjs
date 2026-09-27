import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyRegistryResult, confirmPublished, lookupRegistryState, packumentUrl } from "../registry.mjs";

const target = { name: "@kinetixui/ui", version: "0.24.0" };
const stateOf = (result) => classifyRegistryResult(result, target).state;

describe("packument URLs", () => {
  it("encodes the scope separator, which npm requires", () => {
    assert.equal(packumentUrl("https://registry.npmjs.org/", "@kinetixui/ui"), "https://registry.npmjs.org/%40kinetixui%2fui");
  });

  it("tolerates a registry without a trailing slash", () => {
    assert.equal(packumentUrl("https://registry.npmjs.org", "@kinetixui/ui"), "https://registry.npmjs.org/%40kinetixui%2fui");
  });

  it("leaves an unscoped name alone", () => {
    assert.equal(packumentUrl("https://r/", "kinetixui"), "https://r/kinetixui");
  });
});

describe("registry state", () => {
  it("reports a version present in the packument as published", () => {
    assert.equal(stateOf({ status: 200, ok: true, body: { versions: { "0.23.0": {}, "0.24.0": {} } } }), "published");
  });

  it("reports a version absent from the packument as unpublished", () => {
    assert.equal(stateOf({ status: 200, ok: true, body: { versions: { "0.23.0": {} } } }), "unpublished");
  });

  it("reports a 404 as unpublished, because the package does not exist yet", () => {
    const result = classifyRegistryResult({ status: 404, ok: false, body: null }, target);
    assert.equal(result.state, "unpublished");
    assert.ok(result.detail.includes("does not exist"));
  });

  /**
   * The distinction the whole module exists for. Treating an unreachable registry as "not
   * published" would turn a transient network failure into a publish against unknown state.
   */
  it("never reports a transport failure as unpublished", () => {
    const result = classifyRegistryResult({ status: 0, ok: false, body: null, error: new Error("ECONNRESET") }, target);
    assert.equal(result.state, "unknown");
    assert.ok(result.detail.includes("unreachable"));
  });

  it("treats an authentication or permission failure as unknown", () => {
    for (const status of [401, 403]) assert.equal(stateOf({ status, ok: false, body: null }), "unknown", `HTTP ${status}`);
  });

  it("treats a server error as unknown", () => {
    assert.equal(stateOf({ status: 500, ok: false, body: null }), "unknown");
  });

  it("treats a malformed packument as unknown rather than guessing", () => {
    assert.equal(stateOf({ status: 200, ok: true, body: "not an object" }), "unknown");
    assert.equal(stateOf({ status: 200, ok: true, body: {} }), "unknown");
    assert.equal(stateOf({ status: 200, ok: true, body: { versions: [] } }), "unknown");
  });

  it("does not mistake an inherited property for a published version", () => {
    const result = classifyRegistryResult({ status: 200, ok: true, body: { versions: {} } }, { name: "x", version: "toString" });
    assert.equal(result.state, "unpublished");
  });
});

describe("looking up several packages at once", () => {
  const fakeFetch = (routes) => async (url) => {
    const entry = Object.entries(routes).find(([fragment]) => url.includes(fragment));
    if (!entry) throw new Error(`unexpected request: ${url}`);
    const [, response] = entry;
    if (response instanceof Error) throw response;
    return { status: response.status, ok: response.status >= 200 && response.status < 300, json: async () => response.body };
  };

  it("keys results by package name", async () => {
    const state = await lookupRegistryState(
      [
        { name: "@kinetixui/tokens", version: "0.24.0" },
        { name: "@kinetixui/ui", version: "0.24.0" },
      ],
      {
        registry: "https://registry.npmjs.org/",
        fetchImpl: fakeFetch({
          tokens: { status: 200, body: { versions: { "0.24.0": {} } } },
          "%2fui": { status: 200, body: { versions: { "0.23.0": {} } } },
        }),
      },
    );
    assert.equal(state.get("@kinetixui/tokens").state, "published");
    assert.equal(state.get("@kinetixui/ui").state, "unpublished");
  });

  it("surfaces a thrown fetch as unknown rather than letting it escape", async () => {
    const state = await lookupRegistryState([{ name: "@kinetixui/ui", version: "0.24.0" }], {
      registry: "https://registry.npmjs.org/",
      fetchImpl: fakeFetch({ ui: new Error("getaddrinfo ENOTFOUND") }),
    });
    assert.equal(state.get("@kinetixui/ui").state, "unknown");
  });

  it("treats unparseable JSON as unknown", async () => {
    const state = await lookupRegistryState([{ name: "@kinetixui/ui", version: "0.24.0" }], {
      registry: "https://registry.npmjs.org/",
      fetchImpl: async () => ({
        status: 200,
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token <");
        },
      }),
    });
    assert.equal(state.get("@kinetixui/ui").state, "unknown");
  });
});

/**
 * Confirming a publish against the registry.
 *
 * The 0.23.1 release is the case these are written from: three uploads all exited 0, and the
 * registry served the three versions 3, 4 and 7 minutes later. In between, a packument fetch
 * returned a `modified` timestamp from the previous day — stale, not wrong. So the rule being
 * asserted is "keep looking until the window runs out", never "absent once means failed".
 */
describe("confirming a publish reached the registry", () => {
  /** A registry that starts empty and starts serving the version after `after` polls. */
  const appearsAfter = (after, version = "0.24.0") => {
    let polls = 0;
    return async () => {
      polls += 1;
      const versions = polls > after ? { [version]: {} } : {};
      return { status: 200, ok: true, json: async () => ({ versions }) };
    };
  };

  const noWait = { sleep: async () => {}, intervalMs: 0 };
  const targets = [{ name: "@kinetixui/ui", version: "0.24.0" }];

  it("confirms a version the registry already serves, in one look", async () => {
    const result = await confirmPublished(targets, {
      registry: "https://registry.npmjs.org/",
      fetchImpl: appearsAfter(0),
      ...noWait,
    });
    assert.deepEqual(result.confirmed, targets);
    assert.deepEqual(result.unconfirmed, []);
    assert.equal(result.attempts, 1);
  });

  it("keeps looking while the registry has not caught up, rather than calling it a failure", async () => {
    const result = await confirmPublished(targets, {
      registry: "https://registry.npmjs.org/",
      fetchImpl: appearsAfter(3),
      ...noWait,
    });
    assert.deepEqual(result.unconfirmed, []);
    assert.equal(result.attempts, 4);
  });

  it("treats an unreachable registry as not-yet-known and keeps waiting", async () => {
    let calls = 0;
    const result = await confirmPublished(targets, {
      registry: "https://registry.npmjs.org/",
      fetchImpl: async () => {
        calls += 1;
        if (calls < 3) throw new Error("ECONNRESET");
        return { status: 200, ok: true, json: async () => ({ versions: { "0.24.0": {} } }) };
      },
      ...noWait,
    });
    assert.deepEqual(result.unconfirmed, []);
    assert.equal(result.attempts, 3);
  });

  it("gives up only when the window has elapsed, and reports why", async () => {
    let clock = 0;
    const result = await confirmPublished(targets, {
      registry: "https://registry.npmjs.org/",
      fetchImpl: appearsAfter(Infinity),
      windowMs: 100,
      intervalMs: 0,
      sleep: async () => {
        clock += 60;
      },
      now: () => clock,
    });
    assert.deepEqual(result.confirmed, []);
    assert.equal(result.unconfirmed.length, 1);
    assert.equal(result.unconfirmed[0].name, "@kinetixui/ui");
    // Carries the registry's own reason forward, so the failure says what was seen.
    assert.match(result.unconfirmed[0].detail, /registry/i);
    // Polled more than once before giving up — a single miss is never the answer.
    assert.ok(result.attempts >= 2, `expected more than one attempt, got ${result.attempts}`);
  });

  it("looks at least once even with no window at all", async () => {
    const result = await confirmPublished(targets, {
      registry: "https://registry.npmjs.org/",
      fetchImpl: appearsAfter(Infinity),
      windowMs: 0,
      ...noWait,
    });
    assert.equal(result.attempts, 1);
    assert.equal(result.unconfirmed.length, 1);
  });

  it("stops asking about a package once it is confirmed, and reports the rest", async () => {
    const asked = [];
    const result = await confirmPublished(
      [
        { name: "@kinetixui/tokens", version: "0.24.0" },
        { name: "@kinetixui/ui", version: "0.24.0" },
      ],
      {
        registry: "https://registry.npmjs.org/",
        fetchImpl: async (url) => {
          asked.push(url.includes("tokens") ? "tokens" : "ui");
          const versions = url.includes("tokens") ? { "0.24.0": {} } : {};
          return { status: 200, ok: true, json: async () => ({ versions }) };
        },
        windowMs: 0,
        ...noWait,
      },
    );
    assert.deepEqual(result.confirmed.map((t) => t.name), ["@kinetixui/tokens"]);
    assert.deepEqual(result.unconfirmed.map((t) => t.name), ["@kinetixui/ui"]);
    assert.equal(asked.filter((n) => n === "tokens").length, 1, "a confirmed package should not be polled again");
  });
});
