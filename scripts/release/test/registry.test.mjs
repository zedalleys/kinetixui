import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyRegistryResult, lookupRegistryState, packumentUrl } from "../registry.mjs";

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
