import { existsSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import prompts from "prompts";
import { writeItems } from "../lib/apply.js";
import { CONFIG_FILE, DEFAULT_CONFIG, writeConfig, type KinetixConfig } from "../lib/config.js";
import { resolveTree } from "../lib/registry.js";

export interface InitOptions {
  registry: string;
  yes: boolean;
}

export async function init(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, CONFIG_FILE);

  if (existsSync(configPath) && !options.yes) {
    const { proceed } = await prompts({
      type: "confirm",
      name: "proceed",
      message: `${CONFIG_FILE} already exists. Overwrite it?`,
      initial: false,
    });
    if (!proceed) {
      console.log("Cancelled.");
      return;
    }
  }

  const srcDirDetected = existsSync(path.join(cwd, "src"));

  const answers = options.yes
    ? {
        srcDir: srcDirDetected,
        css: DEFAULT_CONFIG.tailwind.css,
        components: DEFAULT_CONFIG.aliases.components,
        utils: DEFAULT_CONFIG.aliases.utils,
      }
    : await prompts([
        {
          type: "toggle",
          name: "srcDir",
          message: "Use a src/ directory?",
          initial: srcDirDetected,
          active: "yes",
          inactive: "no",
        },
        {
          type: "text",
          name: "css",
          message: "Where's your global CSS file?",
          initial: DEFAULT_CONFIG.tailwind.css,
        },
        {
          type: "text",
          name: "components",
          message: "Import alias for components?",
          initial: DEFAULT_CONFIG.aliases.components,
        },
        {
          type: "text",
          name: "utils",
          message: "Import alias for utils?",
          initial: DEFAULT_CONFIG.aliases.utils,
        },
      ]);

  if (answers.css === undefined) {
    console.log("Cancelled.");
    return;
  }

  const config: KinetixConfig = {
    ...DEFAULT_CONFIG,
    srcDir: !!answers.srcDir,
    tailwind: { css: answers.css },
    aliases: {
      components: answers.components,
      ui: `${answers.components}/ui`,
      lib: answers.utils.replace(/\/utils$/, ""),
      utils: answers.utils,
    },
  };

  await writeConfig(cwd, config);
  console.log(pc.green("✔"), `Created ${CONFIG_FILE}`);

  const items = await resolveTree(options.registry, ["tokens"]);
  const { written, skipped } = await writeItems(cwd, config, items.values(), false);

  for (const file of written) console.log(pc.green("✔"), `Wrote ${file}`);
  for (const file of skipped) {
    console.log(pc.yellow("!"), `${file} already exists — merge the token contract in by hand, or delete it and re-run init.`);
  }

  console.log();
  console.log(`Next: ${pc.cyan("npx @kinetixui/cli add button")}`);
  console.log(`See everything: ${pc.cyan("npx @kinetixui/cli list")}`);
}
