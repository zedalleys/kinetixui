#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { add } from "./commands/add.js";
import { init } from "./commands/init.js";
import { list } from "./commands/list.js";

const DEFAULT_REGISTRY = "https://kinetixui.com/r";

const program = new Command();

program.name("kinetixui").description("Add KinetixUI components and tokens to your project.").version("0.3.0");

program
  .command("init")
  .description("Set up kinetixui.json and pull in the token contract.")
  .option("-y, --yes", "skip prompts and use defaults", false)
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (opts: { yes: boolean; registry: string }) => {
    try {
      await init({ registry: opts.registry, yes: opts.yes });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("add")
  .description("Add one or more components to your project.")
  .argument("[components...]", "component names, e.g. button card")
  .option("-a, --all", "add every component in the registry", false)
  .option("-o, --overwrite", "overwrite existing files", false)
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (components: string[], opts: { all: boolean; overwrite: boolean; registry: string }) => {
    try {
      await add(components, { registry: opts.registry, overwrite: opts.overwrite, all: opts.all });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("list")
  .description("List every component available in the registry.")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (opts: { registry: string }) => {
    try {
      await list({ registry: opts.registry });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

program.parseAsync();
