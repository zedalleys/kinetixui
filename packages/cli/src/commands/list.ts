import pc from "picocolors";
import { fetchRegistryIndex } from "../lib/registry.js";

export interface ListOptions {
  registry: string;
}

export async function list(options: ListOptions): Promise<void> {
  const items = await fetchRegistryIndex(options.registry);
  const components = items.filter((item) => item.type === "registry:ui").sort((a, b) => a.name.localeCompare(b.name));

  console.log(`${components.length} component(s):`);
  console.log();
  for (const item of components) {
    const description = item.description ? pc.dim(` — ${item.description}`) : "";
    console.log(`  ${pc.cyan(item.name)}${description}`);
  }
  console.log();
  console.log(`Add one: ${pc.cyan("npx @kinetixui/cli add <name>")}`);
  console.log(`Add everything: ${pc.cyan("npx @kinetixui/cli add --all")}`);
}
