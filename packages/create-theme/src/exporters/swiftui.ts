/**
 * The SwiftUI exporter — a Create design as a `KinetixColors` pair.
 *
 * ## What it writes, and why that is all it writes
 *
 * `packages/ui-swiftui` is themeable along three axes, and this writes all three. `KinetixColors` is a
 * public struct of 37 semantic colours plus a five-stop chart palette; `KinetixRadii` is four corners
 * named by role; `KinetixElevations` is a four-step shadow ladder whose steps are ordered layer lists.
 * Every `Kinetix*` view reads all three through `@Environment`.
 *
 * It used to emit colours only, and said so, because radius and elevation were literals inside each
 * view with no public type that could change them. That was a fact about the package rather than about
 * this exporter, and it stopped being true when those types landed — so the output grew rather than the
 * caveat.
 *
 * ONE THING STILL DOES NOT TRAVEL. CSS shadows carry `spread`; SwiftUI's `.shadow` has no equivalent
 * and no way to synthesise one, so spread is dropped. The shipped `KinetixElevations.default` is mapped
 * the same way, which means a generated theme and the built-in one differ from the web identically
 * rather than in two different directions. The generated header says so in the file itself.
 *
 * ## Complete file, changed values only
 *
 * `KinetixColors` has a memberwise initializer that demands 35 of its 37 colours (`onInfoContainer` and `scrim` default,
 * so a theme written before they existed still compiles), so a partial theme is not
 * expressible and this file is always complete — unlike the CSS exporter, which emits a diff and nothing
 * at all for the default design. But a field the design did not change is written as a reference to the
 * shipped token (`KinetixColorsSwiftUI.tertiary`) rather than as a literal. That keeps both ideas: a
 * complete artifact that compiles, and no invented numbers. A token release then moves every unchanged
 * field without anyone re-exporting, and the default design exports a file that is all references —
 * which is exactly what "this design changes nothing" should look like.
 *
 * Eight of the 37 — `tertiary`, `tertiaryForeground`, `successForeground`, `warningForeground`, `info`,
 * `infoForeground`, `onInfoContainer` and `scrim` — are not in the Create token contract at all, so they are always references. So is
 * the chart palette at the `kinetix` default, which generates nothing.
 *
 * Pure, like every exporter here: no file system, no process, no CLI formatting.
 */
import { swiftUiChannels } from "../color-math";
import { SHIPPED_ELEVATION, SHIPPED_RADIUS, type ElevationStep } from "../contract";
import { SHIPPED_COLORS, type ResolvedCreateTheme, type ResolvedThemeMode } from "../resolve";
import type { ThemeExporter } from "./index";

export type SwiftUiExportOptions = {
  /** The enum the theme is written into. Must be a plain Swift identifier; see `swiftSymbolError`. */
  symbol?: string;
};

export const DEFAULT_SWIFT_SYMBOL = "CreateTheme";

/* ------------------------------------------------------------------ identifiers */

/**
 * Swift's reserved words, as of Swift 6.
 *
 * Declaration, statement and expression keywords — the ones that cannot be a bare type name. Swift does
 * allow a keyword as an identifier when it is backtick-escaped, and this deliberately does not do that:
 * `public enum \`class\` { … }` compiles, and nobody wants it in their codebase. A clear refusal is a
 * better outcome than a surprising escape.
 */
const SWIFT_KEYWORDS = new Set([
  "associatedtype", "borrowing", "class", "consuming", "deinit", "enum", "extension", "fileprivate",
  "func", "import", "init", "inout", "internal", "let", "macro", "nonisolated", "open", "operator",
  "private", "precedencegroup", "protocol", "public", "rethrows", "static", "struct", "subscript",
  "typealias", "var", "break", "case", "catch", "continue", "default", "defer", "do", "else",
  "fallthrough", "for", "guard", "if", "in", "repeat", "return", "throw", "switch", "where", "while",
  "Any", "as", "await", "false", "is", "nil", "rethrows", "self", "Self", "super", "throw", "throws",
  "true", "try",
]);

/**
 * Why a symbol cannot be used, or null when it can.
 *
 * ASCII letters, digits and underscore, not starting with a digit. Swift's real identifier grammar is far
 * wider — it accepts most Unicode letters, so `Ünïcode` and a good deal of emoji are legal — but this is
 * the name of a type in someone else's codebase, generated from a URL parameter, and the narrow rule is
 * the one that is obviously safe to read. A name outside it is refused with the reason, never truncated
 * into something else: silently turning `Theme; import Foundation` into `ThemeimportFoundation` would
 * hide exactly the input worth noticing.
 */
export function swiftSymbolError(symbol: string): string | null {
  if (symbol.length === 0) return "A theme name cannot be empty.";
  if (symbol.length > 64) return "A theme name must be 64 characters or fewer.";
  // Control characters are refused without quoting the input back. Every other message echoes the name,
  // because seeing what you typed is most of the help — but a name containing a newline would put the
  // rest of it on its own line in the terminal, which is the shape of output someone can write to mislead.
  if (/[\p{Cc}\p{Cf}]/u.test(symbol)) return "A theme name cannot contain control characters.";
  if (/^[0-9]/.test(symbol)) return `"${symbol}" cannot start with a digit — Swift type names begin with a letter or underscore.`;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) {
    return `"${symbol}" is not a Swift identifier — use letters, digits and underscores only.`;
  }
  if (SWIFT_KEYWORDS.has(symbol)) return `"${symbol}" is a Swift keyword and cannot be a type name.`;
  return null;
}

/**
 * `primary-foreground` → `primaryForeground`, `chart-1` → `chart1`.
 *
 * The same rule `style-dictionary/hooks.mjs` applies when it generates `KinetixColorsSwiftUI`, so a
 * Create field name and a shipped token field name are spelled identically. Token names come off the
 * codec's allowlist, so this is a formatter rather than a guard — but it is the only path from a token
 * name to a Swift identifier, which is what keeps it one rule to check.
 */
export function swiftFieldName(token: string): string {
  return token.replace(/[-_]([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/* ------------------------------------------------------------------ colours */

/**
 * `#1d4ed8` → `Color(red: 0.114, green: 0.306, blue: 0.847)`.
 *
 * Three decimal places and `Number(...)`, not `toFixed(3)` as a string — `1`, never `1.000` — because
 * that is byte-for-byte what style-dictionary emits into the vendored token files. A generated theme
 * should be indistinguishable in style from the shipped one sitting beside it.
 *
 * The channel values come from `swiftUiChannels`, which is also what `guaranteedContrast` measures a
 * colour by. That shared call is the point: this exporter rounds a colour in a way the engine has to
 * know about when it decides whether a pair clears AA, and the engine knowing a stale version of that
 * rule is not a hypothetical — it shipped, and a pair the engine scored at 4.50 arrived here at 4.46.
 * One function, so the engine's model of this format cannot drift from the format.
 */
export function swiftColor(hex: string): string | null {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const [r, g, b] = swiftUiChannels(`#${h}`);
  return `Color(red: ${r}, green: ${g}, blue: ${b})`;
}

/**
 * A shadow colour, which unlike every other colour here carries alpha.
 *
 * The token source writes shadows as 8-digit `#rrggbbaa` — `#0000000d` is black at 5%, and `#676e7614`
 * is a slate grey at 8%, so assuming black would be wrong on the second one. SwiftUI has no 8-digit
 * initializer, so the alpha becomes `.opacity(…)`, which is also how `Elevation.swift` writes the
 * shipped ladder by hand. The RGB channels go through `swiftUiChannels`, the same function
 * `swiftColor` uses, so there is one rounding rule in this file rather than two.
 */
export function swiftShadowColor(hex: string): string | null {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(h)) return null;
  // Pure black as `.black`, which is what `Elevation.swift` writes for the shipped ladder and what
  // almost every shadow in the token source is. The long form is correct but reads as a stranger
  // beside the hand-written file, and this exporter's stated aim is to be indistinguishable from it.
  const base = h.slice(0, 6) === "000000" ? "Color.black" : swiftColor(`#${h.slice(0, 6)}`);
  if (!base) return null;
  if (h.length === 6) return base;
  const alpha = Number((parseInt(h.slice(6, 8), 16) / 255).toFixed(3));
  return `${base}.opacity(${alpha})`;
}

const RADIUS_STEPS = ["sm", "md", "lg", "xl"] as const;
const ELEVATION_STEPS = ["sm", "md", "lg", "xl"] as const;

/** Two layer lists are the same shadow when every field of every layer matches, in order. */
const sameLayers = (a: ResolvedThemeMode["elevation"][ElevationStep], b: ResolvedThemeMode["elevation"][ElevationStep]): boolean =>
  a.length === b.length &&
  a.every((layer, i) => {
    const other = b[i]!;
    return (
      layer.color.toLowerCase() === other.color.toLowerCase() &&
      layer.offsetX === other.offsetX &&
      layer.offsetY === other.offsetY &&
      layer.blur === other.blur &&
      layer.spread === other.spread
    );
  });

/** `"0"` / `"-1"` / `"2"` as the numbers Swift wants. Unitless in the token source already. */
const swiftLength = (value: string): number => Number(Number(value).toFixed(3));

/**
 * `KinetixRadii`, from the resolved ladder.
 *
 * The runtime names corners by role and the token source names them by size, and the two are the same
 * four values — `KinetixRadii.default` is built from `KinetixRadius.field` … `.surface`, which are
 * aliases of `sm` … `xl`. That mapping lives in one place, here, rather than being re-derived.
 *
 * `none` and `full` are left to the initializer's defaults on purpose. Neither is on the ladder a
 * design moves: `none` is zero by definition, and `full` means "a pill" — a design that softens its
 * corners does not make a capsule rounder.
 */
export function swiftRadii(radius: ResolvedThemeMode["radius"]): string {
  // A design that did not touch the corners gets `.default`, not a copy of today's ladder. Same rule
  // the colours follow: exporting a design that changes nothing must not change anything, and a
  // literal here would pin the user's app to this week's numbers.
  if (RADIUS_STEPS.every((step) => radius[step] === SHIPPED_RADIUS[step])) return "KinetixRadii.default";
  return [
    "KinetixRadii(",
    `        field: ${swiftLength(String(radius.sm))},`,
    `        control: ${swiftLength(String(radius.md))},`,
    `        container: ${swiftLength(String(radius.lg))},`,
    `        surface: ${swiftLength(String(radius.xl))}`,
    "    )",
  ].join("\n");
}

/**
 * `KinetixElevations`, from the resolved layers.
 *
 * Layer order is preserved, because a two-layer step is a near shadow and a far one and swapping them
 * is a different shadow. An empty list becomes `.none` rather than `KinetixElevation([])` — the same
 * value, and the one a reader recognises.
 *
 * SPREAD IS DROPPED. CSS shadows have it, SwiftUI's `.shadow` does not, and there is no way to
 * synthesise it. The shipped ladder uses `-1` / `-2` on `lg`, so an exported `lg` renders slightly
 * larger in SwiftUI than on the web — the same mapping `Elevation.swift` documents for the built-in
 * ladder, applied here so a generated theme and the default theme are wrong in exactly the same way
 * rather than in two different ways.
 */
export function swiftElevations(elevation: ResolvedThemeMode["elevation"]): string {
  // As above: an untouched ladder follows the library rather than freezing into the export.
  if (ELEVATION_STEPS.every((s) => sameLayers(elevation[s], SHIPPED_ELEVATION[s]))) return "KinetixElevations.default";
  const step = (layers: ResolvedThemeMode["elevation"][ElevationStep]): string => {
    if (layers.length === 0) return ".none";
    const rendered = layers.map((layer) => {
      const color = swiftShadowColor(layer.color) ?? "Color.black.opacity(0.05)";
      return [
        "            KinetixShadowLayer(",
        `                color: ${color},`,
        `                radius: ${swiftLength(layer.blur)},`,
        `                x: ${swiftLength(layer.offsetX)},`,
        `                y: ${swiftLength(layer.offsetY)}`,
        "            ),",
      ].join("\n");
    });
    return ["KinetixElevation([", ...rendered, "        ])"].join("\n");
  };

  return [
    "KinetixElevations(",
    `        sm: ${step(elevation.sm)},`,
    `        md: ${step(elevation.md)},`,
    `        lg: ${step(elevation.lg)},`,
    `        xl: ${step(elevation.xl)}`,
    "    )",
  ].join("\n");
}

/* ------------------------------------------------------------------ the field list */

/**
 * `KinetixColors`' initializer, in its declared order.
 *
 * Order is part of the output contract: it keeps the generated file readable next to `Theme.swift`, and
 * it is what makes the export deterministic rather than dependent on how the resolved colours happened to
 * be assembled. `swiftui.test.ts` asserts this list still matches the Swift struct.
 */
export const SWIFT_COLOR_FIELDS = [
  "primary", "primary-foreground", "action", "action-foreground", "action-hover", "action-pressed",
  "link", "focus", "brand", "brand-foreground", "secondary", "secondary-foreground", "destructive",
  "destructive-foreground", "foreground", "background", "border", "input", "ring", "muted",
  "muted-foreground", "accent", "accent-foreground", "tertiary", "tertiary-foreground", "warning",
  "warning-foreground", "card", "card-foreground", "success", "success-foreground", "info",
  "info-foreground", "popover", "popover-foreground", "on-info-container", "scrim",
] as const;

/** The chart stops `KinetixColors.chart` carries. The shipped enum has eight; the struct exposes five. */
export const SWIFT_CHART_STOPS = [1, 2, 3, 4, 5] as const;

/** The generated enum holding the shipped values, per appearance. */
const SHIPPED_ENUM = { light: "KinetixColorsSwiftUI", dark: "KinetixColorsSwiftUIDark" } as const;

type Appearance = keyof typeof SHIPPED_ENUM;

/**
 * One field: a literal where the design changed the value, a reference to the shipped token where it did
 * not.
 *
 * Every field is written, so the file is complete and compiles — but a field the design left alone keeps
 * following the library rather than freezing today's number into someone's app. That is the same
 * "only what changed" principle the CSS exporter applies, expressed the way Swift allows: `KinetixColors`
 * has a memberwise initializer that demands 35 of its 37 colours, so a partial theme is not expressible and a
 * reference is how a field says "unchanged".
 *
 * It also fixes a small infidelity that the first version of this exporter had. `destructive-foreground`
 * is not a row in the Create token contract — the engine derives it by contrast — so at the default
 * design a literal would have written `Color(red: 1, green: 0.949, blue: 0.937)` where the shipped Swift
 * token is `(0.996, 0.953, 0.949)`. Close, and wrong: exporting a design that changes nothing must not
 * change anything.
 */
function fieldValue(mode: ResolvedThemeMode, appearance: Appearance, token: string): string {
  const reference = `${SHIPPED_ENUM[appearance]}.${swiftFieldName(token)}`;
  const resolved = mode.colors[token];
  if (!resolved) return reference;

  const shipped = SHIPPED_COLORS[appearance][token];
  if (shipped && shipped.toLowerCase() === resolved.toLowerCase()) return reference;

  return swiftColor(resolved) ?? reference;
}

function colorSet(mode: ResolvedThemeMode, appearance: Appearance): string {
  const fields = SWIFT_COLOR_FIELDS.map(
    (token) => `        ${swiftFieldName(token)}: ${fieldValue(mode, appearance, token)},`,
  );
  const chart = SWIFT_CHART_STOPS.map(
    (stop) => `            ${fieldValue(mode, appearance, `chart-${stop}`)},`,
  );
  return [...fields, "        chart: [", ...chart, "        ]"].join("\n");
}

/* ------------------------------------------------------------------ the file */

/**
 * No timestamp, no preset code, no URL.
 *
 * A timestamp would make two exports of one design differ, which is the property this whole pipeline
 * exists to have. The preset code and the share URL are the user's content — a code identifies a design
 * someone may not have meant to publish, and a header is the least visible place to put something a
 * person will paste into a repository. The design's values are in the file already; the code is not
 * needed to read it.
 */
function header(symbol: string, theme: ResolvedCreateTheme): string {
  const design = theme.meta.design;
  return [
    "//",
    `// ${symbol} — a KinetixUI Create theme.`,
    "//",
    "// Generated by `kinetixui preset swiftui`. Edit the design in Create and re-export rather than",
    "// editing this file: it is a rendering of a preset, not a source of one.",
    "//",
    `// Theme colour ${design.brand} · ${design.neutral} neutral · ${design.chartPalette} charts`,
    `// Radius ${design.radius} · surface ${design.surface}`,
    "//",
    "// Colours, corner radii and elevation — the whole design this file can express. Radii and",
    "// elevation are one value rather than a light/dark pair, because the runtime takes one and the",
    "// two appearances resolve to the same ladder.",
    "//",
    "// ONE THING DOES NOT SURVIVE THE PORT. CSS shadows have `spread`; SwiftUI's `.shadow` has no",
    "// equivalent, so the spread on this design's larger steps is dropped and they render slightly",
    "// wider here than on the web. The shipped `KinetixElevations.default` is mapped the same way, so",
    "// a generated theme and the built-in one differ from the web in exactly the same manner.",
    "//",
    "// A field written as `KinetixColorsSwiftUI.…` is one this design did not change, and it keeps",
    "// following the library.",
    "//",
  ].join("\n");
}

export function exportSwiftUi(theme: ResolvedCreateTheme, options: SwiftUiExportOptions = {}): string {
  const symbol = options.symbol ?? DEFAULT_SWIFT_SYMBOL;
  const reason = swiftSymbolError(symbol);
  // Thrown rather than returned: a caller that ignored this would write a file that cannot compile, and
  // the CLI turns it into one sentence and a non-zero exit.
  if (reason) throw new Error(reason);

  return [
    header(symbol, theme),
    "",
    "import SwiftUI",
    "import KinetixUI",
    "",
    `public enum ${symbol} {`,
    "    /// Apply the whole design with",
    `    /// \`KinetixTheme(light: .light, dark: .dark, radii: .radii, elevations: .elevations) { … }\`,`,
    "    /// or set `\\.kinetixColors` directly to pin one appearance.",
    `    public static let light = KinetixColors(`,
    colorSet(theme.light, "light"),
    "    )",
    "",
    `    public static let dark = KinetixColors(`,
    colorSet(theme.dark, "dark"),
    "    )",
    "",
    // One value, not a light/dark pair: the runtime takes one, and the resolver produces the same
    // ladder for both appearances — a card's corner does not change when the lights go out.
    // `swiftui.test.ts` asserts that equality rather than trusting it.
    `    public static let radii = ${swiftRadii(theme.light.radius)}`,
    "",
    `    public static let elevations = ${swiftElevations(theme.light.elevation)}`,
    "}",
    "",
  ].join("\n");
}

export const swiftuiExporter: ThemeExporter<SwiftUiExportOptions, string> = {
  target: "swiftui",
  label: "SwiftUI",
  export: exportSwiftUi,
};
