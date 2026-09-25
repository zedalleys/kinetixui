/**
 * `kinetixui preset …` — read a Kinetix Create preset without a browser.
 *
 * The codec is imported from `@kinetixui/create-preset`, the same module the website uses. It is a
 * devDependency rather than a dependency on purpose: tsup inlines it into `dist/index.js`, so the
 * published surface of this package does not change and there is still exactly one implementation of
 * what a KX1 code means.
 *
 * Nothing here executes anything from a preset. A preset is structured data — enum names, hex colours and
 * token names off a fixed list — and the decoder refuses everything else before this file sees it.
 */
import { writeFile } from "node:fs/promises";
import pc from "picocolors";
import {
  ACCEPTED_TOKENS,
  decodePreset,
  isDefaultPreset,
  presetUrl,
  type PresetConfig,
} from "@kinetixui/create-preset";
import {
  DEFAULT_COMPOSE_SYMBOL,
  DEFAULT_SWIFT_SYMBOL,
  exportCompose,
  exportCss,
  exportSwiftUi,
  kotlinSymbolError,
  resolveCreateTheme,
  swiftSymbolError,
} from "@kinetixui/create-theme";

const SITE = "https://kinetixui.com";

/** A decode failure is normal user input, not a crash: one sentence, no stack, non-zero exit. */
function read(input: string): PresetConfig {
  const result = decodePreset(input);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.config;
}

const row = (label: string, value: string) => `  ${pc.dim(label.padEnd(16))} ${value}`;

/**
 * `preset decode <code|url>` — print what a preset actually says.
 *
 * Accepts a bare `KX1_…` or a full share URL, because someone inspecting a link has a link, and telling
 * them to trim it themselves would be a worse tool for no gain.
 */
export function presetDecode(input: string, opts: { json: boolean }): void {
  const config = read(input);

  if (opts.json) {
    // Machine-readable form, for piping. Same fields, no colour codes.
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  console.log();
  console.log(pc.bold("Kinetix Create preset"));
  console.log();
  console.log(row("Theme colour", config.brand));
  console.log(row("Neutral", config.neutral));
  console.log(row("Radius", config.radius));
  console.log(row("Surface", config.surface));
  console.log(row("Chart palette", config.chartPalette));

  const overrides = ACCEPTED_TOKENS.filter((token) => config.manualOverrides[token]);
  console.log();
  if (overrides.length === 0) {
    console.log(pc.dim("  No manual overrides — every colour is generated from the theme colour."));
  } else {
    console.log(pc.bold(`  Manual overrides (${overrides.length})`));
    for (const token of overrides) console.log(row(`  ${token}`, config.manualOverrides[token]!));
  }

  if (isDefaultPreset(config)) {
    console.log();
    console.log(pc.dim("  This preset is the shipped Kinetix default — it changes nothing."));
  }

  console.log();
  console.log(
    pc.dim(
      // Wrapped so that no command name is split across lines — a reader scanning for `theme build`
      // should find it, and so should a test.
      "  A preset describes a design, not a stylesheet.\n\n" +
        "    kinetixui preset css <code>       the same web CSS the workspace's Copy CSS produces\n" +
        "    kinetixui preset swiftui <code>   a SwiftUI colour theme\n" +
        "    kinetixui preset compose <code>   a Jetpack Compose colour theme\n\n" +
        "  For a file of literal colours, `kinetixui theme build` is unchanged.",
    ),
  );
  console.log();
}

/**
 * `preset css <code|url>` — resolve a preset into the web CSS override block.
 *
 * Web CSS, and only web CSS. It is the same exporter the /create workspace's Copy CSS runs, over the same
 * resolved theme, so the two cannot drift; `cli-preset.test.ts` asserts byte equality rather than trusting
 * that. There is no SwiftUI, Compose or Flutter output behind this command and the command name says so —
 * `preset apply` would not have, which is why it is not the name.
 *
 * A preset that changes nothing produces no CSS. That is printed to stderr as a note rather than stdout,
 * so `kinetixui preset css X > theme.css` writes an empty file instead of a comment a stylesheet cannot
 * use, and the exit code still says the command succeeded — the preset was valid, it simply says nothing.
 */
export async function presetCss(input: string, opts: { output?: string }): Promise<void> {
  const css = exportCss(resolveCreateTheme(read(input)));

  if (opts.output) {
    await writeFile(opts.output, css ? `${css}\n` : "", "utf8");
    console.log(pc.green("✔"), css ? `Wrote ${opts.output}` : `Wrote ${opts.output} (empty — the preset is the Kinetix default)`);
    return;
  }

  if (!css) {
    console.error(pc.dim("This preset is the shipped Kinetix default — there is nothing to override."));
    return;
  }
  console.log(css);
}

/**
 * `preset swiftui <code|url>` — resolve a preset into a SwiftUI theme file.
 *
 * SwiftUI, and only SwiftUI. There is no Compose, Flutter or Android XML output behind this or any other
 * command, and the command name is the platform rather than something like `preset native` for that
 * reason. What it writes is colours: `packages/ui-swiftui` is themeable through `KinetixColors` and
 * nothing else, so the design's radius and surface treatment do not travel — the generated file says so
 * in its own header, not only in the docs.
 *
 * Unlike `preset css`, the default preset still produces a file. A Swift file is a complete artifact
 * rather than an override block layered over one the consumer already has, so "nothing to override" is
 * not an outcome it can express; what it produces instead is a theme whose every field references the
 * shipped token.
 */
export async function presetSwiftUi(input: string, opts: { output?: string; name?: string }): Promise<void> {
  const symbol = opts.name ?? DEFAULT_SWIFT_SYMBOL;
  // Checked here as well as inside the exporter so a bad `--name` is refused before a preset is decoded:
  // the name is the argument the user got wrong, and it should be the one the message is about.
  const reason = swiftSymbolError(symbol);
  if (reason) throw new Error(reason);

  const swift = exportSwiftUi(resolveCreateTheme(read(input)), { symbol });

  if (opts.output) {
    await writeFile(opts.output, swift, "utf8");
    console.log(pc.green("✔"), `Wrote ${opts.output} — apply it with KinetixTheme(light: ${symbol}.light, dark: ${symbol}.dark)`);
    return;
  }
  // No trailing console.log: the exporter's output already ends in a newline, and a second one would
  // show up in a redirected file.
  process.stdout.write(swift);
}

/**
 * `preset compose <code|url>` — resolve a preset into a Jetpack Compose theme file.
 *
 * Compose, and only Compose. Like `preset swiftui`, what it writes is colours: `packages/ui-compose` is
 * themeable through `KinetixColors` and nothing else, so the design's radius and surface treatment do not
 * travel — the generated file says so in its own header.
 *
 * The one thing worth knowing beside `preset swiftui`: Compose writes `Color(0xffRRGGBB)`, which is the
 * resolved colour exactly, so nothing is lost on the way to the platform. SwiftUI's three-decimal
 * channels are their own term in the shared contrast guarantee; Compose needs none.
 */
export async function presetCompose(input: string, opts: { output?: string; name?: string }): Promise<void> {
  const symbol = opts.name ?? DEFAULT_COMPOSE_SYMBOL;
  // Checked before the preset is decoded, so a bad `--name` reports the argument the user got wrong.
  const reason = kotlinSymbolError(symbol);
  if (reason) throw new Error(reason);

  const kotlin = exportCompose(resolveCreateTheme(read(input)), { symbol });

  if (opts.output) {
    await writeFile(opts.output, kotlin, "utf8");
    console.log(pc.green("✔"), `Wrote ${opts.output} — apply it with KinetixTheme(light = ${symbol}.light, dark = ${symbol}.dark)`);
    return;
  }
  process.stdout.write(kotlin);
}

/**
 * `preset url <code>` — print the canonical share URL.
 *
 * It prints rather than launching a browser. Opening one needs a platform-specific spawn, makes the
 * command untestable in CI and unusable over SSH, and buys nothing a shell cannot do: pipe this into
 * `open`, `xdg-open` or `start` if that is what you want.
 */
export function presetUrlCommand(input: string, opts: { site: string }): void {
  console.log(presetUrl(read(input), opts.site));
}
