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

/** Every installable item, per `apps/web/public/r/registry.json` (written by
 *  `scripts/gen-registry-index.mjs` as part of `pnpm build:registry` — the
 *  per-item `{name}.json` files `shadcn build` emits have no index of their
 *  own, so this is a separate, deliberately small manifest). */
export async function fetchRegistryIndex(registryUrl: string): Promise<RegistryIndexItem[]> {
  const url = `${registryUrl.replace(/\/$/, "")}/registry.json`;
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
  const url = `${registryUrl.replace(/\/$/, "")}/${name}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not find "${name}" in the registry (${res.status} at ${url}).`);
  }
  return (await res.json()) as RegistryItem;
}

/** Fetch a set of items and everything they transitively depend on. */
export async function resolveTree(registryUrl: string, names: string[]): Promise<Map<string, RegistryItem>> {
  const resolved = new Map<string, RegistryItem>();
  const queue = [...names];

  while (queue.length) {
    const name = queue.shift();
    if (!name || resolved.has(name)) continue;
    const item = await fetchRegistryItem(registryUrl, name);
    resolved.set(name, item);
    for (const dep of item.registryDependencies ?? []) {
      if (!resolved.has(dep)) queue.push(dep);
    }
  }

  return resolved;
}
