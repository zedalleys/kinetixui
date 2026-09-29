import { assertComponentName, assertRegistryUrl } from "./validate.js";

export interface RegistryFile {
  path: string;
  content: string;
  type: string;
  target: string;
}

export interface RegistryItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
}

export interface RegistryIndexItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
  /** native libraries that carry this component — `registry:ui` items only, absent on `registry:style` (e.g. `tokens`) */
  platforms?: string[];
  /** maturity status — omitted entirely when "stable" (the default), same "exceptions only" convention as `platforms` */
  status?: "beta" | "deprecated";
}

export interface ComponentSpec {
  name: string;
  title: string;
  /** lifecycle status and first release, from components.manifest.json */
  status?: string;
  since?: string;
  /** variant axis name -> its option names (e.g. `variant: ["Primary", ...]`); empty for components with no cva matrix */
  variants: Record<string, string[]>;
  /** every exported part (the component and its sub-components) with the props it declares itself */
  components?: { name: string; props: { name: string; type: string; required: boolean; description?: string }[] }[];
  source: string;
}

/**
 * One place where a registry request can go wrong, so every command says the same useful thing.
 *
 * Three failure modes, kept apart because the reader's next action differs:
 *
 *   - **Unreachable.** `fetch` rejects — DNS, TLS, no network, a corporate proxy. This used to surface as
 *     the bare `fetch failed`, which reads like a bug in the CLI. The registry origin is a single point of
 *     failure for `add` (there is no offline mode), so the message names the origin and both ways to point
 *     somewhere else.
 *   - **Answered, but not with what was asked for.** A 404 or a 500. The caller decides, because a missing
 *     component spec is normal and a missing component is not.
 *   - **Answered with something that is not the expected shape.** A proxy login page, an HTML error page, a
 *     truncated body. `res.json()` throwing, or JSON that parses into the wrong shape, previously became a
 *     `TypeError` several frames later — `Cannot read properties of undefined (reading 'filter')` — which
 *     tells the reader nothing about the registry.
 */
async function request(url: string): Promise<Response> {
  try {
    return await fetch(url);
  } catch (cause) {
    const origin = safeOrigin(url);
    throw new Error(
      `Could not reach the registry at ${origin} (${(cause as Error).message}). ` +
        `Check the network, or point somewhere else with --registry <url> or "registry" in kinetixui.json.`,
      { cause },
    );
  }
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/** Parse a registry response, turning "answered with something else" into a message about the registry. */
async function parse<T>(res: Response, url: string, describe: string, valid: (value: unknown) => boolean): Promise<T> {
  let data: unknown;
  try {
    data = await res.json();
  } catch (cause) {
    throw new Error(
      `The registry at ${safeOrigin(url)} did not return JSON for ${describe} (${(cause as Error).message}). ` +
        `If you are behind a proxy, it may be answering instead of the registry.`,
      { cause },
    );
  }
  if (!valid(data)) {
    throw new Error(`The registry at ${safeOrigin(url)} returned JSON that is not a valid ${describe} (${url}).`);
  }
  return data as T;
}

const isIndex = (v: unknown): boolean => typeof v === "object" && v !== null && Array.isArray((v as { items?: unknown }).items);
const isItem = (v: unknown): boolean =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as { name?: unknown }).name === "string" &&
  Array.isArray((v as { files?: unknown }).files);
const isSpec = (v: unknown): boolean => typeof v === "object" && v !== null && typeof (v as { name?: unknown }).name === "string";

/** Every installable item, per `apps/web/public/r/registry.json` (written by
 *  `scripts/gen-registry-index.mjs` as part of `pnpm build:registry` — the
 *  per-item `{name}.json` files `shadcn build` emits have no index of their
 *  own, so this is a separate, deliberately small manifest). */
export async function fetchRegistryIndex(registryUrl: string): Promise<RegistryIndexItem[]> {
  const url = `${assertRegistryUrl(registryUrl).replace(/\/$/, "")}/registry.json`;
  const res = await request(url);
  if (!res.ok) {
    throw new Error(`Could not load the registry index (${res.status} at ${url}).`);
  }
  const data = await parse<{ items: RegistryIndexItem[] }>(res, url, "registry index", isIndex);
  return data.items;
}

/** Every real component name — everything but `tokens` (a `registry:style`
 *  item, `init`'s job, not `add`'s). */
export async function fetchComponentNames(registryUrl: string): Promise<string[]> {
  const items = await fetchRegistryIndex(registryUrl);
  return items.filter((item) => item.type === "registry:ui").map((item) => item.name);
}

export async function fetchRegistryItem(registryUrl: string, name: string): Promise<RegistryItem> {
  const base = assertRegistryUrl(registryUrl).replace(/\/$/, "");
  const url = `${base}/${assertComponentName(name)}.json`;
  const res = await request(url);
  if (!res.ok) {
    throw new Error(`Could not find "${name}" in the registry (${res.status} at ${url}).`);
  }
  return await parse<RegistryItem>(res, url, `registry item for "${name}"`, isItem);
}

/** `apps/web/public/specs/<name>.json` — served alongside (a sibling of)
 *  the registry root, not under it, e.g. `https://kinetixui.com/r` ->
 *  `https://kinetixui.com/specs`. Only the ~20 `cva`-based components
 *  (variant-axis components) have one; a missing spec is normal, not an
 *  error, so this returns `null` on 404 instead of throwing. */
export async function fetchComponentSpec(registryUrl: string, name: string): Promise<ComponentSpec | null> {
  const base = assertRegistryUrl(registryUrl).replace(/\/$/, "");
  const specsBase = base.endsWith("/r") ? `${base.slice(0, -2)}/specs` : `${base}/specs`;
  const url = `${specsBase}/${assertComponentName(name)}.json`;
  const res = await request(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Could not load the component spec for "${name}" (${res.status} at ${url}).`);
  }
  return await parse<ComponentSpec>(res, url, `component spec for "${name}"`, isSpec);
}

/** Fetch a set of items and everything they transitively depend on. */
export async function resolveTree(registryUrl: string, names: string[]): Promise<Map<string, RegistryItem>> {
  const resolved = new Map<string, RegistryItem>();
  const queue = [...names];

  while (queue.length) {
    const name = queue.shift();
    if (!name || resolved.has(name)) continue;
    const item = await fetchRegistryItem(registryUrl, assertComponentName(name));
    resolved.set(name, item);
    for (const dep of item.registryDependencies ?? []) {
      if (!resolved.has(dep)) queue.push(assertComponentName(dep));
    }
  }

  return resolved;
}
