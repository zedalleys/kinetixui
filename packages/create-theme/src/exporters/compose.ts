/**
 * The Jetpack Compose exporter — a Create design as a `KinetixColors` pair.
 *
 * ## The same shape as SwiftUI, for the same reasons
 *
 * `packages/ui-compose` is themeable through one type: `KinetixColors`, a data class of 32 semantic
 * colours plus `chart: List<Color>`, read by every `Kinetix*` composable through
 * `KinetixColorScheme.current`. Radius and elevation are generated constants (`KinetixRadius.md`) that
 * components reference directly — there is no composition-local for either, so a design's radius and
 * surface treatment have nowhere to land. The generated file says that in its own header rather than
 * emitting values nothing reads.
 *
 * ## Compose adds no quantization
 *
 * The package writes colours as `Color(0xff1d4ed8)` — exact 8-bit ARGB, alpha `ff`. That is the resolved
 * hex, byte for byte, so Compose IS the `exact` term `guaranteedContrast` already scores. No fourth
 * representation, no new contrast maths, no Compose-specific repair. `compose.test.ts` proves the round
 * trip rather than asserting it in prose, because the last exporter's prose was wrong about exactly this.
 *
 * ## Three tokens with nowhere to go
 *
 * Create resolves `input` and `ring`, and `KinetixColors` has no field for either — they are real fields
 * on the web and in SwiftUI. A design that overrides them gets that change everywhere except here. The
 * header names them; closing the gap means adding fields to a published Maven artifact's public data
 * class, which is a deliberate native-theming change rather than an exporter's business.
 *
 * Pure: no file system, no process, no CLI formatting, no React.
 */
import { SHIPPED_COLORS, type ResolvedCreateTheme, type ResolvedThemeMode } from "../resolve";
import type { ThemeExporter } from "./index";

export type ComposeExportOptions = {
  /** The object the theme is written into. Must be a plain Kotlin identifier; see `kotlinSymbolError`. */
  symbol?: string;
};

export const DEFAULT_COMPOSE_SYMBOL = "CreateTheme";

/* ------------------------------------------------------------------ identifiers */

/**
 * Kotlin's hard keywords — the ones that cannot be an identifier without backticks.
 *
 * Soft and modifier keywords (`data`, `value`, `sealed`, `by`, `where`, …) are deliberately absent:
 * Kotlin allows them as plain identifiers, so `object data { … }` compiles, and refusing a name the
 * language accepts would be inventing a rule. Backtick escaping is possible for the hard ones and is not
 * used here for the same reason the SwiftUI exporter refuses it — ``object `class` { … }`` compiles and
 * nobody wants it in their codebase.
 */
const KOTLIN_KEYWORDS = new Set([
  "as", "break", "class", "continue", "do", "else", "false", "for", "fun", "if", "in", "interface", "is",
  "null", "object", "package", "return", "super", "this", "throw", "true", "try", "typealias", "typeof",
  "val", "var", "when", "while",
]);

/**
 * Why a symbol cannot be used, or null when it can.
 *
 * The same rule the SwiftUI exporter applies, with Kotlin's keyword list: ASCII letters, digits and
 * underscore, not starting with a digit, not a hard keyword. Kotlin's real identifier grammar is wider —
 * it takes most Unicode letters, and anything at all inside backticks — but this is the name of a type in
 * someone else's codebase, generated from a URL parameter, and the narrow rule is the one that is
 * obviously safe to read.
 *
 * Refused with the reason, never rewritten. Quietly turning `Theme; import java.io.File` into
 * `ThemeimportjavaioFile` would hide the input most worth noticing.
 */
export function kotlinSymbolError(symbol: string): string | null {
  if (symbol.length === 0) return "A theme name cannot be empty.";
  if (symbol.length > 64) return "A theme name must be 64 characters or fewer.";
  // Control characters are refused without quoting the input back — a name containing a newline would
  // otherwise put the rest of it on its own line in the terminal.
  if (/[\p{Cc}\p{Cf}]/u.test(symbol)) return "A theme name cannot contain control characters.";
  if (/^[0-9]/.test(symbol)) return `"${symbol}" cannot start with a digit — Kotlin type names begin with a letter or underscore.`;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) {
    return `"${symbol}" is not a Kotlin identifier — use letters, digits and underscores only.`;
  }
  if (KOTLIN_KEYWORDS.has(symbol)) return `"${symbol}" is a Kotlin keyword and cannot be a type name.`;
  return null;
}

/** `primary-foreground` → `primaryForeground`, `chart-1` → `chart1`. The vendored tokens' own rule. */
export function kotlinFieldName(token: string): string {
  return token.replace(/[-_]([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/* ------------------------------------------------------------------ colours */

/**
 * `#1d4ed8` → `Color(0xff1d4ed8)`.
 *
 * Exact 8-bit ARGB with an opaque alpha, lowercase, which is byte-for-byte what style-dictionary writes
 * into `com/kinetixui/tokens/Theme.kt`. A generated theme should be indistinguishable in style from the
 * shipped one beside it — and, more importantly, the value Compose receives is the resolved value with
 * nothing lost, which is what lets `guaranteedContrast`'s existing exact term cover this platform.
 */
export function composeColor(hex: string): string | null {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return `Color(0xff${h.toLowerCase()})`;
}

/* ------------------------------------------------------------------ the field list */

/**
 * `KinetixColors`' constructor, in its declared order, as `[kotlin field, Create token]`.
 *
 * Written as pairs rather than derived from the token list because the two vocabularies are not the same
 * and pretending otherwise is how a mapping goes quietly wrong. `compose.test.ts` checks this list
 * against the Kotlin data class itself, so a field added there without one added here fails in this repo
 * rather than in someone's build.
 */
export const COMPOSE_COLOR_FIELDS: readonly (readonly [field: string, token: string])[] = [
  ["primary", "primary"],
  ["primaryForeground", "primary-foreground"],
  ["action", "action"],
  ["actionForeground", "action-foreground"],
  ["actionHover", "action-hover"],
  ["actionPressed", "action-pressed"],
  ["link", "link"],
  ["focus", "focus"],
  ["brand", "brand"],
  ["brandForeground", "brand-foreground"],
  ["secondary", "secondary"],
  ["secondaryForeground", "secondary-foreground"],
  ["destructive", "destructive"],
  ["destructiveForeground", "destructive-foreground"],
  ["foreground", "foreground"],
  ["background", "background"],
  ["border", "border"],
  ["muted", "muted"],
  ["mutedForeground", "muted-foreground"],
  ["accent", "accent"],
  ["accentForeground", "accent-foreground"],
  ["tertiary", "tertiary"],
  ["warning", "warning"],
  ["warningForeground", "warning-foreground"],
  ["card", "card"],
  ["cardForeground", "card-foreground"],
  ["success", "success"],
  ["successForeground", "success-foreground"],
  ["info", "info"],
  ["infoForeground", "info-foreground"],
  ["popover", "popover"],
  ["popoverForeground", "popover-foreground"],
] as const;

/** The chart stops `KinetixColors.chart` carries, in series order. */
export const COMPOSE_CHART_STOPS = [1, 2, 3, 4, 5] as const;

/**
 * Tokens Create resolves that `KinetixColors` has no field for.
 *
 * Exported so a test can assert the list is complete rather than aspirational — if a field is added to
 * the Kotlin data class, this shrinks, and the test that reads the data class notices.
 */
export const COMPOSE_UNMAPPED_TOKENS = ["input", "ring"] as const;

/** The generated object holding the shipped values, per appearance, as this file aliases them. */
const SHIPPED_OBJECT = { light: "KinetixTokensLight", dark: "KinetixTokensDark" } as const;

type Appearance = keyof typeof SHIPPED_OBJECT;

/** The generated tokens spell every colour `colorSomething`. */
const shippedRef = (appearance: Appearance, token: string) =>
  `${SHIPPED_OBJECT[appearance]}.color${kotlinFieldName(token).replace(/^./, (c) => c.toUpperCase())}`;

/**
 * A literal where the design changed the value, a reference to the shipped token where it did not.
 *
 * Same rule as the SwiftUI exporter, and for the same two reasons: the file stays complete (a Kotlin data
 * class constructor wants every argument, so a partial theme is not expressible) while inventing no
 * numbers, and a token release moves every field the design did not pin.
 */
function fieldValue(mode: ResolvedThemeMode, appearance: Appearance, token: string): string {
  const resolved = mode.colors[token];
  if (!resolved) return shippedRef(appearance, token);

  const shipped = SHIPPED_COLORS[appearance][token];
  if (shipped && shipped.toLowerCase() === resolved.toLowerCase()) return shippedRef(appearance, token);

  return composeColor(resolved) ?? shippedRef(appearance, token);
}

function colorSet(mode: ResolvedThemeMode, appearance: Appearance): string {
  const fields = COMPOSE_COLOR_FIELDS.map(
        ([field, token]) => `        ${field} = ${fieldValue(mode, appearance, token)},`,
  );
  const chart = COMPOSE_CHART_STOPS.map(
    (stop) => `            ${fieldValue(mode, appearance, `chart-${stop}`)},`,
  );
  return [...fields, "        chart = listOf(", ...chart, "        ),"].join("\n");
}

/* ------------------------------------------------------------------ the file */

/**
 * No timestamp, no preset code, no URL.
 *
 * A timestamp would make two exports of one design differ, which is the property the whole pipeline
 * exists to have. The code and the share URL are the user's content, and a generated header is the least
 * visible place to put something a person will commit.
 */
function header(symbol: string, theme: ResolvedCreateTheme): string {
  const design = theme.meta.design;
  return [
    "//",
    `// ${symbol} — a KinetixUI Create theme.`,
    "//",
    "// Generated by `kinetixui preset compose`. Edit the design in Create and re-export rather than",
    "// editing this file: it is a rendering of a preset, not a source of one.",
    "//",
    `// Theme colour ${design.brand} · ${design.neutral} neutral · ${design.chartPalette} charts`,
    "//",
    "// COLOURS ONLY. KinetixUI for Compose is themeable through `KinetixColors`; corner radius and",
    "// elevation are generated constants that components reference directly, with no runtime theme to",
    `// override, so this design's radius (${design.radius}) and surface treatment (${design.surface}) are`,
    "// NOT carried here. They apply on the web. Nothing is silently dropped; there is nowhere yet for",
    "// them to go.",
    "//",
    `// \`${COMPOSE_UNMAPPED_TOKENS.join("` and `")}\` are not carried either: Create resolves them and`,
    "// `KinetixColors` has no field for either one.",
    "//",
    "// A field written as `KinetixTokensLight.…` is one this design did not change, and it keeps",
    "// following the library.",
    "//",
  ].join("\n");
}

export function exportCompose(theme: ResolvedCreateTheme, options: ComposeExportOptions = {}): string {
  const symbol = options.symbol ?? DEFAULT_COMPOSE_SYMBOL;
  const reason = kotlinSymbolError(symbol);
  // Thrown rather than returned: a caller that ignored this would write a file that cannot compile, and
  // the CLI turns it into one sentence and a non-zero exit.
  if (reason) throw new Error(reason);

  const light = colorSet(theme.light, "light");
  const dark = colorSet(theme.dark, "dark");

  // `Color` is imported only when the file actually names one. A design that changes nothing exports
  // pure references, and an unused import in generated code is a warning someone else has to look at.
  const usesColor = `${light}${dark}`.includes("Color(0x");

  return [
    header(symbol, theme),
    "",
    "package com.kinetixui.create",
    "",
    // Alphabetical, and aliased exactly as the package's own Theme.kt does it:
    // `com.kinetixui.tokens.KinetixTheme` is the generated token object while `com.kinetixui.ui.KinetixTheme`
    // is the composable, so the bare name is ambiguous in any file that wants both.
    ...(usesColor ? ["import androidx.compose.ui.graphics.Color"] : []),
    "import com.kinetixui.tokens.KinetixTheme as KinetixTokensLight",
    "import com.kinetixui.tokens.KinetixThemeDark as KinetixTokensDark",
    "import com.kinetixui.ui.KinetixColors",
    "",
    `object ${symbol} {`,
    "    /** Apply with `KinetixTheme(light = light, dark = dark) { … }`. */",
    "    val light = KinetixColors(",
    light,
    "    )",
    "",
    "    val dark = KinetixColors(",
    dark,
    "    )",
    "}",
    "",
  ].join("\n");
}

export const composeExporter: ThemeExporter<ComposeExportOptions, string> = {
  target: "compose",
  label: "Jetpack Compose",
  export: exportCompose,
};
