import { existsSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { readConfig, resolveAliasDir } from "../lib/config.js";
import { fetchComponentSpec, fetchRegistryItem } from "../lib/registry.js";

export interface InspectOptions {
  registry: string;
}

export async function inspect(name: string, options: InspectOptions): Promise<void> {
  const item = await fetchRegistryItem(options.registry, name);

  console.log(`${pc.bold(item.title ?? item.name)} ${pc.dim(`(${item.name})`)}`);
  if (item.description) console.log(item.description);
  console.log();
  console.log(`${pc.dim("Type")}         ${item.type}`);

  const cwd = process.cwd();
  const config = await readConfig(cwd);
  if (config) {
    const uiDir = resolveAliasDir(cwd, config, "ui");
    const installed = item.files.some(
      (file) => file.type === "registry:ui" && existsSync(path.join(uiDir, path.basename(file.target))),
    );
    console.log(`${pc.dim("Installed")}    ${installed ? pc.green("yes") : pc.yellow("no")}`);
  }

  console.log(
    `${pc.dim("Depends on")}   ${item.dependencies?.length ? item.dependencies.join(", ") : pc.dim("(none)")}`,
  );
  console.log(
    `${pc.dim("Registry")}     ${item.registryDependencies?.length ? item.registryDependencies.join(", ") : pc.dim("(none)")}`,
  );

  console.log();
  console.log(pc.dim("Files:"));
  for (const file of item.files) {
    console.log(`  ${file.path} ${pc.dim("→")} ${file.target}`);
  }

  const spec = await fetchComponentSpec(options.registry, name);
  if (spec) {
    console.log();
    console.log(pc.dim("Variants:"));
    for (const [axis, options_] of Object.entries(spec.variants)) {
      console.log(`  ${pc.dim(axis)}   ${options_.join(", ")}`);
    }
  }

  console.log();
  console.log(`Add it: ${pc.cyan(`npx @kinetixui/cli add ${item.name}`)}`);
}
