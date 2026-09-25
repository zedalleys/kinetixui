/**
 * The Flutter exporter — a Create design as a `KinetixColors` pair.
 *
 * ## The most complete native target so far
 *
 * `packages/ui-flutter`'s `KinetixColors` carries all 35 semantic colours plus `chart`, including
 * `input`, `ring` and `tertiaryForeground` — the three the Compose port lacks. So this exporter has no
 * unmapped-role section to declare: every colour the resolved theme produces has a field to land in, and
 * the header says nothing about roles that cannot travel, because none cannot.
 *
 * Verified against the merged source rather than assumed. The Compose audit found real drift between what
 * a brief expected and what the class declared, and `flutter.test.ts` reads `theme.dart` itself so a field
 * added or removed there fails here rather than silently changing what a preset exports.
 *
 * ## Flutter adds no quantization
 *
 * Colours are `Color(0xFF1D4ED8)` — exact 8-bit ARGB, uppercase, which is what the vendored
 * `kinetix_color_scheme.dart` uses. That is the resolved hex byte for byte, so Flutter IS the `exact`
 * term `guaranteedContrast` already scores. No fourth representation, no new contrast maths, and no
 * Flutter-specific repair. Proved in `flutter.test.ts`, not asserted here.
 *
 * ## What does not travel
 *
 * Radius and elevation. `KinetixRadius` is a class of static constants that widgets read directly
 * (`BorderRadius.circular(KinetixRadius.container)`), and `KinetixTheme` carries neither it nor
 * `KinetixShadows` — grep `theme.dart` for either and there is nothing. So a design's radius and surface
 * treatment have nowhere to be installed, exactly as on the other two native platforms, and the header
 * says so rather than emitting constants nothing reads.
 *
 * Pure: no file system, no process, no CLI formatting, no React.
 */
import { SHIPPED_COLORS, type ResolvedCreateTheme, type ResolvedThemeMode } from "../resolve";
import type { ThemeExporter } from "./index";

export type FlutterExportOptions = {
  /** The class the theme is written into. Must be a plain Dart identifier; see `dartSymbolError`. */
  symbol?: string;
};

export const DEFAULT_FLUTTER_SYMBOL = "CreateTheme";

/* ------------------------------------------------------------------ identifiers */

/**
 * Dart's reserved words — the ones that can never be an identifier.
 *
 * Dart splits its keywords three ways, and only this group is actually forbidden. "Built-in identifiers"
 * (`abstract`, `import`, `library`, `part`, `extension`, `mixin`, `static`, `typedef`, …) are legal as
 * type names; so are contextual words like `async` and `await` outside their own grammar. Refusing those
 * would be inventing a rule the language does not have — `class Import {}` compiles.
 *
 * `enum`, `switch` and `return` ARE reserved and are in this list. `abstract`, `import`, `library`,
 * `part`, `extension` and `mixin` are not, and `flutter.test.ts` asserts both halves of that, because a
 * list written from memory would very likely get it backwards.
 */
const DART_RESERVED_WORDS = new Set([
  "assert", "break", "case", "catch", "class", "const", "continue", "default", "do", "else", "enum",
  "extends", "false", "final", "finally", "for", "if", "in", "is", "new", "null", "rethrow", "return",
  "super", "switch", "this", "throw", "true", "try", "var", "void", "while", "with",
]);

/**
 * Why a symbol cannot be used, or null when it can.
 *
 * The rule the SwiftUI and Compose exporters apply, with Dart's reserved list: ASCII letters, digits and
 * underscore, not starting with a digit, not a reserved word. Dart's real grammar is wider — it accepts
 * most Unicode letters — but this is the name of a type in someone else's codebase, generated from a URL
 * parameter, and the narrow rule is the one that is obviously safe to read.
 *
 * A leading underscore is accepted and means something in Dart: `_Theme` is library-private. That is a
 * legal choice for a generated file the user owns, so it is not refused — just worth knowing it will not
 * be importable from another library.
 */
export function dartSymbolError(symbol: string): string | null {
  if (symbol.length === 0) return "A theme name cannot be empty.";
  if (symbol.length > 64) return "A theme name must be 64 characters or fewer.";
  // Control characters are refused without quoting the input back — a name containing a newline would
  // otherwise put the rest of it on its own line in the terminal.
  if (/[\p{Cc}\p{Cf}]/u.test(symbol)) return "A theme name cannot contain control characters.";
  if (/^[0-9]/.test(symbol)) return `"${symbol}" cannot start with a digit — Dart type names begin with a letter or underscore.`;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) {
    return `"${symbol}" is not a Dart identifier — use letters, digits and underscores only.`;
  }
  if (DART_RESERVED_WORDS.has(symbol)) return `"${symbol}" is a Dart reserved word and cannot be a type name.`;
  return null;
}

/** `primary-foreground` → `primaryForeground`, `chart-1` → `chart1`. The vendored tokens' own rule. */
export function dartFieldName(token: string): string {
  return token.replace(/[-_]([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/* ------------------------------------------------------------------ colours */

/**
 * `#1d4ed8` → `Color(0xFF1D4ED8)`.
 *
 * Exact 8-bit ARGB with an opaque alpha, UPPERCASE — which is what `kinetix_color_scheme.dart` writes,
 * unlike Compose's lowercase. Each generated file should be indistinguishable in style from the vendored
 * one beside it, and the two platforms genuinely differ here.
 *
 * More importantly the value Flutter receives is the resolved value with nothing lost, which is what lets
 * `guaranteedContrast`'s existing exact term cover this platform without a new one.
 */
export function dartColor(hex: string): string | null {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return `Color(0xFF${h.toUpperCase()})`;
}

/* ------------------------------------------------------------------ the field list */

/**
 * `KinetixColors`' constructor, in its declared order, as `[dart field, Create token]`.
 *
 * Explicit pairs rather than a derivation from the token list: the two vocabularies are not the same, and
 * pretending otherwise is how a mapping goes quietly wrong. `flutter.test.ts` checks this against the
 * Dart class itself.
 */
export const FLUTTER_COLOR_FIELDS: readonly (readonly [field: string, token: string])[] = [
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
  ["input", "input"],
  ["ring", "ring"],
  ["muted", "muted"],
  ["mutedForeground", "muted-foreground"],
  ["accent", "accent"],
  ["accentForeground", "accent-foreground"],
  ["tertiary", "tertiary"],
  ["tertiaryForeground", "tertiary-foreground"],
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
export const FLUTTER_CHART_STOPS = [1, 2, 3, 4, 5] as const;

type Appearance = "light" | "dark";

/**
 * A field the design did not change, as a reference to the shipped palette.
 *
 * `KinetixColors.light` / `.dark` are public `static const` on the class this file constructs, and they
 * are exported from `package:kinetix_ui/kinetix_ui.dart`. Nothing circular: the library never reads the
 * generated theme.
 *
 * The internal path is deliberately not used. `KinetixColorScheme.primary` — the static const the library
 * itself builds from — would also work, and is imported by `theme.dart` but never exported, so generated
 * code dropped into someone else's app has no business reaching for it.
 */
const shippedRef = (appearance: Appearance, field: string) => `KinetixColors.${appearance}.${field}`;

/**
 * A literal where the design changed the value, a reference to the shipped palette where it did not.
 *
 * The same rule the SwiftUI and Compose exporters follow, and it is not optional here: six fields of the
 * Flutter contract — `tertiary`, `tertiaryForeground`, `info`, `infoForeground`, `successForeground` and
 * `warningForeground` — are not in the Create token contract at all, so the resolved theme has no value
 * for them. Emitting literals for everything would have written black into six colours; the first draft
 * of this exporter did exactly that, and `flutter.test.ts` now asserts it cannot happen again.
 */
function fieldValue(mode: ResolvedThemeMode, appearance: Appearance, field: string, token: string): string {
  const resolved = mode.colors[token];
  if (!resolved) return shippedRef(appearance, field);

  const shipped = SHIPPED_COLORS[appearance][token];
  if (shipped && shipped.toLowerCase() === resolved.toLowerCase()) return shippedRef(appearance, field);

  return dartColor(resolved) ?? shippedRef(appearance, field);
}

function colorSet(mode: ResolvedThemeMode, appearance: Appearance): string {
  const fields = FLUTTER_COLOR_FIELDS.map(
    ([field, token]) => `    ${field}: ${fieldValue(mode, appearance, field, token)},`,
  );
  const chart = FLUTTER_CHART_STOPS.map(
    (stop) => `      ${fieldValue(mode, appearance, `chart${stop}`, `chart-${stop}`)},`,
  );
  return [...fields, "    chart: <Color>[", ...chart, "    ],"].join("\n");
}

/* ------------------------------------------------------------------ the file */

/**
 * No timestamp, no preset code, no URL.
 *
 * A timestamp would make two exports of one design differ, which is the property this pipeline exists to
 * have. The code and the share URL are the user's content, and a generated header is the least visible
 * place to put something a person will commit.
 */
function header(symbol: string, theme: ResolvedCreateTheme): string {
  const design = theme.meta.design;
  return [
    "//",
    `// ${symbol} — a KinetixUI Create theme.`,
    "//",
    "// Generated by `kinetixui preset flutter`. Edit the design in Create and re-export rather than",
    "// editing this file: it is a rendering of a preset, not a source of one.",
    "//",
    `// Theme colour ${design.brand} · ${design.neutral} neutral · ${design.chartPalette} charts`,
    "//",
    "// Every semantic colour KinetixColors declares is carried here, light and dark — Flutter's contract",
    "// is the complete one, so no role is left behind.",
    "//",
    "// COLOURS ONLY. Radius and elevation are not themeable at runtime: widgets read `KinetixRadius`",
    "// constants directly and `KinetixTheme` carries neither them nor `KinetixShadows`, so this design's",
    `// radius (${design.radius}) and surface treatment (${design.surface}) have nowhere to be installed.`,
    "// They apply on the web. That is the only thing this file does not carry.",
    "//",
    "// A field written as `KinetixColors.light.…` is one this design did not change, and it keeps",
    "// following the library. Six of them — tertiary, tertiaryForeground, info, infoForeground,",
    "// successForeground and warningForeground — are always references, because Create does not model",
    "// those tokens.",
    "//",
    "// These are `static final` rather than `static const`: Dart's constant expressions do not include",
    "// instance field access, so a `static const` could not reference the shipped palette. The theme is",
    "// still usable everywhere a const one would be — `KinetixTheme.custom` takes it fine — you just",
    "// cannot write `const KinetixTheme.custom(…)` around it.",
    "//",
    "// Apply it to Kinetix widgets:",
    "//",
    `//   KinetixTheme.custom(light: ${symbol}.light, dark: ${symbol}.dark, child: App())`,
    "//",
    "// …and to Material or Cupertino widgets, whose own theme APIs represent the subset they can:",
    "//",
    `//   MaterialApp(theme: KinetixMaterialTheme.fromColors(Brightness.light, ${symbol}.light))`,
    "//",
  ].join("\n");
}

export function exportFlutter(theme: ResolvedCreateTheme, options: FlutterExportOptions = {}): string {
  const symbol = options.symbol ?? DEFAULT_FLUTTER_SYMBOL;
  const reason = dartSymbolError(symbol);
  // Thrown rather than returned: a caller that ignored this would write a file that cannot compile, and
  // the CLI turns it into one sentence and a non-zero exit.
  if (reason) throw new Error(reason);

  return [
    header(symbol, theme),
    "",
    "import 'package:flutter/widgets.dart';",
    "import 'package:kinetix_ui/kinetix_ui.dart';",
    "",
    // `abstract final class` is Dart 3 and the package floor is >=3.6, so it is available. It is the
    // idiomatic way to say "namespace, never instantiated, never extended" — the same intent SwiftUI's
    // `enum` and Compose's `object` express.
    `abstract final class ${symbol} {`,
    "  static final KinetixColors light = KinetixColors(",
    colorSet(theme.light, "light"),
    "  );",
    "",
    "  static final KinetixColors dark = KinetixColors(",
    colorSet(theme.dark, "dark"),
    "  );",
    "}",
    "",
  ].join("\n");
}

export const flutterExporter: ThemeExporter<FlutterExportOptions, string> = {
  target: "flutter",
  label: "Flutter",
  export: exportFlutter,
};
