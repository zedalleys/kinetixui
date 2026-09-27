/**
 * The four things a design can be exported as.
 *
 * Typed configuration, not a plugin registry: there are four targets, they are fixed, and an
 * abstraction that could load a fifth would be designed around one that does not exist. Each entry
 * says what the target is called, what language its output is, what a sensible filename would be,
 * and — the part that matters — what of the design the target's runtime can actually receive.
 *
 * Every `generate` here calls an exporter from `@kinetixui/create-theme`. None of them computes a
 * colour, maps a token or formats a value; doing any of that in this file is how the website and
 * `kinetixui preset <target>` would start disagreeing about what a preset means. The CLI imports the
 * same functions, and `cli-preset.test.ts` asserts the two produce identical text.
 *
 * `capability` is written from each exporter's own contract rather than from what would read well.
 * A native package that has no runtime radius token does not get a sentence implying it might.
 *
 * Each target also carries the `kinetixui preset …` subcommand that produces the same file, which is
 * the shortest honest way to say that this panel is not a website feature bolted onto a design tool —
 * it is one of two front ends over the same exporter. The subcommand is stored rather than derived
 * from the id, because for CSS they differ: the target is `web-css` and the command is `preset css`.
 */
import {
  exportCompose,
  exportCss,
  exportFlutter,
  exportSwiftUi,
  dartSymbolError,
  kotlinSymbolError,
  swiftSymbolError,
  DEFAULT_COMPOSE_SYMBOL,
  DEFAULT_FLUTTER_SYMBOL,
  DEFAULT_SWIFT_SYMBOL,
  COMPOSE_UNMAPPED_PRESET_ROLES,
  NOTHING_TO_OVERRIDE,
  type ResolvedCreateTheme,
} from "@kinetixui/create-theme";

/** Stable identifiers. These are the exporters' own `target` strings, and they are analytics-safe. */
export const EXPORT_TARGETS = ["web-css", "swiftui", "compose", "flutter"] as const;
export type ExportTarget = (typeof EXPORT_TARGETS)[number];

export type TargetConfig = {
  id: ExportTarget;
  /** What a person calls it. "Jetpack Compose", not "Android". */
  label: string;
  /** For the code region's accessible name: "Generated SwiftUI theme". */
  outputLabel: string;
  filename: string;
  /** One sentence on what this output is for. */
  description: string;
  /** What the target's runtime theme can actually receive. Written from the exporter's contract. */
  capability: string;
  /** The `kinetixui preset <this>` subcommand that produces the same file. Not always the id. */
  cliSubcommand: string;
  /** Present only where the target takes a generated type name. */
  symbol?: { default: string; validate: (name: string) => string | null; shape: string };
  generate: (theme: ResolvedCreateTheme, symbol: string) => string;
};

/**
 * Radius and surface are web-only, and every native target says so in the same words.
 *
 * None of the three native packages has a runtime radius or elevation token: their widgets read
 * generated constants directly. That is a fact about those packages, not a gap in the theme, and the
 * exporters already write it into each generated file's header.
 */
const NATIVE_LIMIT = "Radius and surface are not runtime-themeable here — they apply on the web.";

export const TARGETS: Record<ExportTarget, TargetConfig> = {
  "web-css": {
    id: "web-css",
    cliSubcommand: "css",
    label: "Web CSS",
    outputLabel: "Generated Web CSS",
    filename: "kinetix-theme.css",
    // Verified, not assumed: @kinetixui/angular's stylesheet spends the same @kinetixui/tokens
    // custom properties this block overrides — there is no Angular-specific token set, which is why
    // there is no Angular exporter. `export-targets.test.ts` reads both and holds that true.
    description: "Custom properties for KinetixUI on the web — React and Angular both read them.",
    capability: "Carries everything: colours, chart palette, radius and surface.",
    generate: (theme) => exportCss(theme) || NOTHING_TO_OVERRIDE,
  },
  swiftui: {
    id: "swiftui",
    cliSubcommand: "swiftui",
    label: "SwiftUI",
    outputLabel: "Generated SwiftUI theme",
    filename: "CreateTheme.swift",
    description: "A KinetixColors pair for the SwiftUI package — light and dark.",
    capability: `Colours and the chart palette, in both appearances. ${NATIVE_LIMIT}`,
    symbol: { default: DEFAULT_SWIFT_SYMBOL, validate: swiftSymbolError, shape: "public enum" },
    generate: (theme, symbol) => exportSwiftUi(theme, { symbol }),
  },
  compose: {
    id: "compose",
    cliSubcommand: "compose",
    label: "Jetpack Compose",
    outputLabel: "Generated Jetpack Compose theme",
    filename: "CreateTheme.kt",
    description: "A KinetixColors pair for the Jetpack Compose package — light and dark.",
    // Compose's KinetixColors has no field for these two, so a design that overrides them reaches
    // web, SwiftUI and Flutter but not Compose. Said plainly rather than left to be discovered.
    capability:
      `Colours and the chart palette, in both appearances. ` +
      `Compose has no field for ${COMPOSE_UNMAPPED_PRESET_ROLES.join(" or ")}, so overriding those does not reach it. ` +
      NATIVE_LIMIT,
    symbol: { default: DEFAULT_COMPOSE_SYMBOL, validate: kotlinSymbolError, shape: "object" },
    generate: (theme, symbol) => exportCompose(theme, { symbol }),
  },
  flutter: {
    id: "flutter",
    cliSubcommand: "flutter",
    label: "Flutter",
    outputLabel: "Generated Flutter theme",
    filename: "create_theme.dart",
    description: "A KinetixColors pair for the Flutter package — light and dark.",
    // The most complete colour target: every role Create models reaches it. That is a claim about
    // colour, and stops there — radius and surface still do not travel.
    capability: `Every colour role Create models, in both appearances. ${NATIVE_LIMIT}`,
    symbol: { default: DEFAULT_FLUTTER_SYMBOL, validate: dartSymbolError, shape: "abstract final class" },
    generate: (theme, symbol) => exportFlutter(theme, { symbol }),
  },
};

export const TARGET_LIST: TargetConfig[] = EXPORT_TARGETS.map((id) => TARGETS[id]);

/**
 * The `kinetixui preset …` invocation that writes the same file.
 *
 * `-n` appears only when the name is not the exporter's default, so the common case stays short and a
 * flag in the command means someone actually chose something. Nothing is quoted: a preset code is
 * base64url, a symbol has already been validated to an identifier, and the filename is ours — so
 * there is no shell metacharacter to escape, which `export-targets.test.ts` asserts rather than
 * assumes. If that ever stopped being true, quoting would be the fix, not a looser test.
 */
function cliCommand(target: ExportTarget, presetCode: string, symbol: string): string {
  const config = TARGETS[target];
  const parts = ["kinetixui", "preset", config.cliSubcommand, presetCode];
  if (config.symbol && symbol !== config.symbol.default) parts.push("-n", symbol);
  parts.push("-o", config.filename);
  return parts.join(" ");
}

/**
 * The output for one target, the command that produces it, or the reason the symbol cannot be used.
 *
 * Only the selected target is generated. A colour drag re-resolves the theme on every pointer move,
 * and generating four files each time would be three files of work nobody asked to see.
 *
 * The code and the command are returned together so they cannot disagree: an invalid symbol produces
 * neither, rather than a command someone could copy that would fail for a reason the page had already
 * been told.
 */
export function generateExport(
  theme: ResolvedCreateTheme,
  target: ExportTarget,
  symbol: string,
  presetCode = "",
): { code: string; command: string; error: null } | { code: null; command: null; error: string } {
  const config = TARGETS[target];
  if (config.symbol) {
    const error = config.symbol.validate(symbol);
    if (error) return { code: null, command: null, error };
  }
  return {
    code: config.generate(theme, symbol),
    command: cliCommand(target, presetCode, symbol),
    error: null,
  };
}
