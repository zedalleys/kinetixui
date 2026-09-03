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
