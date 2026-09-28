import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchComponentNames,
  fetchComponentSpec,
  fetchRegistryIndex,
  fetchRegistryItem,
  resolveTree,
} from "../src/lib/registry.js";

const REGISTRY = "https://registry.example.com/r";

/** A `fetch` that answers from a map of URL -> response, and records what was asked for. */
function stubFetch(routes: Record<string, { status?: number; body?: unknown; text?: string; reject?: Error }>) {
  const asked: string[] = [];
  const impl = vi.fn(async (input: string | URL) => {
    const url = String(input);
    asked.push(url);
    const route = routes[url];
    if (!route) return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
    if (route.reject) throw route.reject;
    const status = route.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (route.text !== undefined) throw new SyntaxError(`Unexpected token < in JSON at position 0`);
        return route.body;
      },
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", impl);
  return { asked, impl };
}

afterEach(() => vi.unstubAllGlobals());

const item = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  type: "registry:ui",
  files: [{ path: `ui/${name}.tsx`, content: `// ${name}`, type: "registry:ui", target: `components/ui/${name}.tsx` }],
  ...extra,
});

describe("registry index", () => {
  it("returns the items and asks the right URL", async () => {
    const { asked } = stubFetch({
      [`${REGISTRY}/registry.json`]: { body: { items: [item("button"), { name: "tokens", type: "registry:style", files: [] }] } },
    });
    expect(await fetchRegistryIndex(REGISTRY)).toHaveLength(2);
    expect(asked).toEqual([`${REGISTRY}/registry.json`]);
  });

  it("tolerates a trailing slash on the registry URL", async () => {
    const { asked } = stubFetch({ [`${REGISTRY}/registry.json`]: { body: { items: [] } } });
    await fetchRegistryIndex(`${REGISTRY}/`);
    expect(asked).toEqual([`${REGISTRY}/registry.json`]);
  });

  it("lists only registry:ui items as component names — tokens is init's job", async () => {
    stubFetch({
      [`${REGISTRY}/registry.json`]: {
        body: { items: [item("button"), { name: "tokens", type: "registry:style", files: [] }, item("card")] },
      },
    });
    expect(await fetchComponentNames(REGISTRY)).toEqual(["button", "card"]);
  });

  it("reports the status and the URL on a non-OK response", async () => {
    stubFetch({ [`${REGISTRY}/registry.json`]: { status: 500, body: {} } });
    await expect(fetchRegistryIndex(REGISTRY)).rejects.toThrow(/Could not load the registry index \(500/);
  });
});

/**
 * The failure the audit cared about: the registry origin is a single point of failure for `add`, and this
 * used to surface as a bare `fetch failed`, which reads like a bug in the CLI rather than a network fact.
 */
describe("when the registry cannot be reached", () => {
  it("names the origin and both ways to point elsewhere", async () => {
    stubFetch({ [`${REGISTRY}/registry.json`]: { reject: new TypeError("fetch failed") } });
    const error = await fetchRegistryIndex(REGISTRY).catch((e: Error) => e);
    expect(error.message).toContain("https://registry.example.com");
    expect(error.message).toMatch(/--registry/);
    expect(error.message).toMatch(/kinetixui\.json/);
    expect(error.message).toContain("fetch failed");
  });

  it("keeps the original error as the cause", async () => {
    const cause = new TypeError("ENOTFOUND");
    stubFetch({ [`${REGISTRY}/registry.json`]: { reject: cause } });
    const error = await fetchRegistryIndex(REGISTRY).catch((e: Error) => e);
    expect(error.cause).toBe(cause);
  });
});

/**
 * A proxy login page is a 200 with HTML in it. Before this, `res.json()` throwing (or parsing into the
 * wrong shape) became a TypeError several frames away — `Cannot read properties of undefined (reading
 * 'filter')` — which says nothing about the registry.
 */
describe("when the registry answers with something else", () => {
  it("says the registry did not return JSON, mentioning a proxy", async () => {
    stubFetch({ [`${REGISTRY}/registry.json`]: { text: "<html>Sign in</html>" } });
    await expect(fetchRegistryIndex(REGISTRY)).rejects.toThrow(/did not return JSON[\s\S]*proxy/);
  });

  it("rejects an index with no items array instead of returning undefined", async () => {
    stubFetch({ [`${REGISTRY}/registry.json`]: { body: { message: "hello" } } });
    await expect(fetchRegistryIndex(REGISTRY)).rejects.toThrow(/not a valid registry index/);
  });

  it("rejects an index whose items is not an array", async () => {
    stubFetch({ [`${REGISTRY}/registry.json`]: { body: { items: { button: {} } } } });
    await expect(fetchRegistryIndex(REGISTRY)).rejects.toThrow(/not a valid registry index/);
  });

  it("rejects a component item with no files array", async () => {
    stubFetch({ [`${REGISTRY}/button.json`]: { body: { name: "button", type: "registry:ui" } } });
    await expect(fetchRegistryItem(REGISTRY, "button")).rejects.toThrow(/not a valid registry item for "button"/);
  });

  it("does not let fetchComponentNames throw a TypeError on a malformed index", async () => {
    stubFetch({ [`${REGISTRY}/registry.json`]: { body: {} } });
    const error = await fetchComponentNames(REGISTRY).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
    expect(error.message).not.toMatch(/Cannot read propert/);
  });
});

describe("a single component", () => {
  it("fetches it by name", async () => {
    stubFetch({ [`${REGISTRY}/button.json`]: { body: item("button") } });
    expect((await fetchRegistryItem(REGISTRY, "button")).name).toBe("button");
  });

  it("reports a missing component with its status", async () => {
    stubFetch({ [`${REGISTRY}/nope.json`]: { status: 404, body: {} } });
    await expect(fetchRegistryItem(REGISTRY, "nope")).rejects.toThrow(/Could not find "nope" in the registry \(404/);
  });

  it("refuses an invalid name before making any request", async () => {
    const { impl } = stubFetch({});
    await expect(fetchRegistryItem(REGISTRY, "../../etc/passwd")).rejects.toThrow(/Invalid component name/);
    expect(impl).not.toHaveBeenCalled();
  });
});

describe("component specs", () => {
  it("looks beside the registry root, not under it", async () => {
    const { asked } = stubFetch({ "https://registry.example.com/specs/button.json": { body: { name: "button", title: "Button", variants: {}, source: "" } } });
    const spec = await fetchComponentSpec(REGISTRY, "button");
    expect(asked).toEqual(["https://registry.example.com/specs/button.json"]);
    expect(spec?.name).toBe("button");
  });

  it("treats a missing spec as normal, not an error", async () => {
    stubFetch({ "https://registry.example.com/specs/card.json": { status: 404, body: {} } });
    expect(await fetchComponentSpec(REGISTRY, "card")).toBeNull();
  });

  it("still reports a server error for a spec", async () => {
    stubFetch({ "https://registry.example.com/specs/card.json": { status: 503, body: {} } });
    await expect(fetchComponentSpec(REGISTRY, "card")).rejects.toThrow(/Could not load the component spec/);
  });
});

describe("resolveTree", () => {
  it("follows registryDependencies transitively", async () => {
    stubFetch({
      [`${REGISTRY}/dialog.json`]: { body: item("dialog", { registryDependencies: ["button"] }) },
      [`${REGISTRY}/button.json`]: { body: item("button", { registryDependencies: ["utils"] }) },
      [`${REGISTRY}/utils.json`]: { body: item("utils") },
    });
    expect([...(await resolveTree(REGISTRY, ["dialog"])).keys()]).toEqual(["dialog", "button", "utils"]);
  });

  it("terminates on a dependency cycle instead of looping forever", async () => {
    stubFetch({
      [`${REGISTRY}/a.json`]: { body: item("a", { registryDependencies: ["b"] }) },
      [`${REGISTRY}/b.json`]: { body: item("b", { registryDependencies: ["a"] }) },
    });
    expect([...(await resolveTree(REGISTRY, ["a"])).keys()]).toEqual(["a", "b"]);
  });

  it("fetches a shared dependency once", async () => {
    const { asked } = stubFetch({
      [`${REGISTRY}/a.json`]: { body: item("a", { registryDependencies: ["shared"] }) },
      [`${REGISTRY}/b.json`]: { body: item("b", { registryDependencies: ["shared"] }) },
      [`${REGISTRY}/shared.json`]: { body: item("shared") },
    });
    await resolveTree(REGISTRY, ["a", "b"]);
    expect(asked.filter((u) => u.endsWith("/shared.json"))).toHaveLength(1);
  });

  it("refuses a malicious registryDependency from the registry response", async () => {
    // The component name came from the network here, not the command line.
    stubFetch({ [`${REGISTRY}/a.json`]: { body: item("a", { registryDependencies: ["../../../etc/passwd"] }) } });
    await expect(resolveTree(REGISTRY, ["a"])).rejects.toThrow(/Invalid component name/);
  });
});
