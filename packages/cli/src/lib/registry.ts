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
}

export interface ComponentSpec {
  name: string;
  title: string;
  /** variant axis name -> its option names (e.g. `variant: ["Primary", ...]`) */
  variants: Record<string, string[]>;
  source: string;
}

/** Every installable item, per `apps/web/public/r/registry.json` (written by
 *  `scripts/gen-registry-index.mjs` as part of `pnpm build:registry` — the
 *  per-item `{name}.json` files `shadcn build` emits have no index of their
 *  own, so this is a separate, deliberately small manifest). */
export async function fetchRegistryIndex(registryUrl: string): Promise<RegistryIndexItem[]> {
  const url = `${assertRegistryUrl(registryUrl).replace(/\/$/, "")}/registry.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not load the registry index (${res.status} at ${url}).`);
  }
  const data = (await res.json()) as { items: RegistryIndexItem[] };
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
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not find "${name}" in the registry (${res.status} at ${url}).`);
  }
  return (await res.json()) as RegistryItem;
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
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Could not load the component spec for "${name}" (${res.status} at ${url}).`);
  }
  return (await res.json()) as ComponentSpec;
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
