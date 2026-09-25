#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { add } from "./commands/add.js";
import { doctor } from "./commands/doctor.js";
import { init } from "./commands/init.js";
import { inspect } from "./commands/inspect.js";
import { lint } from "./commands/lint.js";
import { list } from "./commands/list.js";
import { parity } from "./commands/parity.js";
import { presetCompose, presetCss, presetDecode, presetSwiftUi, presetUrlCommand } from "./commands/preset.js";
import { DEFAULT_COMPOSE_SYMBOL, DEFAULT_SWIFT_SYMBOL } from "@kinetixui/create-theme";
import { themeBuild, themeCreate } from "./commands/theme.js";
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
  .command("lint")
  .description("Scan for hardcoded colors and spacing that should be semantic tokens.")
  .argument("[path]", "directory to scan — defaults to the components/ui aliases from kinetixui.json")
  .option("--no-fail", "exit 0 even if violations are found")
  .action(async (target: string | undefined, opts: { fail: boolean }) => {
    try {
      await lint(target, { fail: opts.fail });
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

const theme = program
  .command("theme")
  .description("Scaffold and compile a local token override (CSS only — see 'theme build --help').");

theme
  .command("create")
  .description("Scaffold kinetixui-themes/<name>.csv with every overridable token, commented out.")
  .argument("<name>", "theme name, e.g. acme")
  .option("-f, --force", "overwrite an existing theme file", false)
  .action(async (name: string, opts: { force: boolean }) => {
    try {
      await themeCreate(name, { force: opts.force });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

theme
  .command("build")
  .description("Compile kinetixui-themes/<name>.csv to CSS and print a WCAG AA contrast report. CSS only — no native (SwiftUI/Compose/Flutter) output yet.")
  .argument("<name>", "theme name, e.g. acme")
  .option("--no-fail-on-contrast", "exit 0 even if a pair fails WCAG AA")
  .action(async (name: string, opts: { failOnContrast: boolean }) => {
    try {
      await themeBuild(name, { failOnContrast: opts.failOnContrast });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

/**
 * `preset` sits beside `theme` rather than inside it, because they are different inputs to the same
 * system: `theme` compiles a local CSV of literal colours, `preset` reads a portable code produced by the
 * /create workspace. Folding either into the other would mean one command with two unrelated argument
 * shapes. `theme create/build` are unchanged.
 */
const preset = program
  .command("preset")
  .description("Read a Kinetix Create preset code (KX1_…) produced by kinetixui.com/create.");

preset
  .command("decode")
  .description("Show what a preset contains. Accepts a KX1_ code or a full /create?preset=… URL.")
  .argument("<preset>", "a KX1_ code, or a share URL")
  .option("--json", "print the configuration as JSON", false)
  .action((input: string, opts: { json: boolean }) => {
    try {
      presetDecode(input, { json: opts.json });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

preset
  .command("css")
  .description("Resolve a preset into its web CSS override block — the same output as Copy CSS in the workspace. Web CSS only; no native (SwiftUI/Compose/Flutter) output.")
  .argument("<preset>", "a KX1_ code, or a share URL")
  .option("-o, --output <file>", "write to a file instead of stdout")
  .action(async (input: string, opts: { output?: string }) => {
    try {
      await presetCss(input, { output: opts.output });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

preset
  .command("swiftui")
  .description("Resolve a preset into a SwiftUI theme file (KinetixColors, light and dark). Colours only — SwiftUI has no radius or elevation token to carry. No Compose or Flutter output.")
  .argument("<preset>", "a KX1_ code, or a share URL")
  .option("-o, --output <file>", "write to a file instead of stdout")
  .option("-n, --name <symbol>", "the Swift enum to generate", DEFAULT_SWIFT_SYMBOL)
  .action(async (input: string, opts: { output?: string; name?: string }) => {
    try {
      await presetSwiftUi(input, { output: opts.output, name: opts.name });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

preset
  .command("compose")
  .description("Resolve a preset into a Jetpack Compose theme file (KinetixColors, light and dark). Colours only — Compose has no runtime radius or elevation token to carry. No Flutter or Android XML output.")
  .argument("<preset>", "a KX1_ code, or a share URL")
  .option("-o, --output <file>", "write to a file instead of stdout")
  .option("-n, --name <symbol>", "the Kotlin object to generate", DEFAULT_COMPOSE_SYMBOL)
  .action(async (input: string, opts: { output?: string; name?: string }) => {
    try {
      await presetCompose(input, { output: opts.output, name: opts.name });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

preset
  .command("url")
  .description("Print the canonical share URL for a preset. Prints it — piping it to your opener is up to you.")
  .argument("<preset>", "a KX1_ code, or a share URL")
  .option("-s, --site <origin>", "site origin", "https://kinetixui.com")
  .action((input: string, opts: { site: string }) => {
    try {
      presetUrlCommand(input, { site: opts.site });
    } catch (err) {
      console.error(pc.red("✖"), (err as Error).message);
      process.exitCode = 1;
    }
  });

program.parseAsync();
