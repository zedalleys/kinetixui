#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { add } from "./commands/add.js";
import { doctor } from "./commands/doctor.js";
import { init } from "./commands/init.js";
import { inspect } from "./commands/inspect.js";
import { list } from "./commands/list.js";
import { parity } from "./commands/parity.js";
import { DEFAULT_REGISTRY } from "./lib/config.js";
// Bundled at build time (esbuild inlines JSON imports), not read at runtime —
// so `kinetixui --version` can never drift from the published package again.
import pkg from "../package.json" with { type: "json" };

const program = new Command();

program.name("kinetixui").description("Add KinetixUI components and tokens to your project.").version(pkg.version);

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

program
  .command("inspect")
  .description("Show everything the registry knows about one component.")
  .argument("<name>", "component name, e.g. button")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (name: string, opts: { registry: string }) => {
    try {
      await inspect(name, { registry: opts.registry });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("parity")
  .description("Show which platforms carry each component (or one, by name).")
  .argument("[components...]", "component names, e.g. button card — omit for the full matrix")
  .option("-r, --registry <url>", "registry base URL", DEFAULT_REGISTRY)
  .action(async (components: string[], opts: { registry: string }) => {
    try {
      await parity(components, { registry: opts.registry });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("doctor")
  .description("Check kinetixui.json, its aliases, and the registry connection.")
  .action(async () => {
    try {
      await doctor();
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

program.parseAsync();
