import { existsSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { writeItems } from "../lib/apply.js";
import { CONFIG_FILE, DEFAULT_CONFIG, readConfig } from "../lib/config.js";
import { detectPackageManager, runInstall } from "../lib/pm.js";
import { fetchComponentNames, resolveTree } from "../lib/registry.js";

export interface AddOptions {
  registry: string;
  overwrite: boolean;
  all: boolean;
}

export async function add(names: string[], options: AddOptions): Promise<void> {
  const cwd = process.cwd();
  const config = (await readConfig(cwd)) ?? DEFAULT_CONFIG;

  if (!existsSync(path.join(cwd, CONFIG_FILE))) {
    console.log(pc.yellow("!"), `No ${CONFIG_FILE} found — using defaults. Run "kinetixui init" first to set your own aliases.`);
  }

  if (options.all) {
    console.log("Fetching the full component list…");
    names = await fetchComponentNames(options.registry);
  } else if (names.length === 0) {
    throw new Error('Pass component names to add (e.g. "kinetixui add button card"), or use --all for every component.');
  }

  console.log(options.all ? `Resolving all ${names.length} components…` : `Resolving ${names.join(", ")}…`);
  const items = await resolveTree(options.registry, names);

  const { deps, written, skipped } = await writeItems(cwd, config, items.values(), options.overwrite);

  for (const file of written) console.log(pc.green("✔"), `Added ${file}`);
  for (const file of skipped) console.log(pc.yellow("skip"), `${file} already exists (pass --overwrite to replace it)`);

  if (deps.size > 0) {
    const pm = detectPackageManager(cwd);
    console.log();
    console.log(`Installing ${[...deps].join(", ")} with ${pm}…`);
    await runInstall(cwd, pm, [...deps]);
  }

  console.log();
  console.log(pc.green("Done."));
}
