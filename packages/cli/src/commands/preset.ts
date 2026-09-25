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
import pc from "picocolors";
import {
  ACCEPTED_TOKENS,
  decodePreset,
  isDefaultPreset,
  presetUrl,
  type PresetConfig,
} from "@kinetixui/create-preset";

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
      "  A preset describes a design, not a stylesheet. For CSS, open it in the workspace —\n" +
        "  `kinetixui preset url <code>` prints the link — and use Copy CSS there. For a file of\n" +
        "  literal colours, `kinetixui theme build` is unchanged.",
    ),
  );
  console.log();
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
