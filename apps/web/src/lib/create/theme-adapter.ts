/**
 * Between Create's config and the theme engine that already exists.
 *
 * There is exactly one theme engine on the site (lib/theme-builder.ts) and one colour maths module
 * (lib/color-math.ts), both also ported into the CLI. Nothing here reimplements either: this module
 * supplies the *defaults* the old Theme Builder never had, merges the user's overrides over them, and
 * hands the result back to the same `toCssVarStyle` / `toCssBlock` / `checkContrast` the builder used.
 *
 * The defaults are what make Create usable without pasting anything. They are read from TOKEN_CONTRACT —
 * the resolved semantic contract the docs table and /themes already render — rather than typed again here.
 */
import { TOKEN_CONTRACT } from "../token-contract";
import {
  ACCEPTED_TOKENS,
  checkContrast,
  deriveForegrounds,
  parsePaletteText,
  toCssBlock,
  toCssVarStyle,
  type AcceptedToken,
  type ContrastResult,
  type ParsedPalette,
} from "../theme-builder";
import type { CreateConfig, PreviewMode } from "./config";

const isAccepted = (t: string): t is AcceptedToken => (ACCEPTED_TOKENS as readonly string[]).includes(t);

/**
 * Three tokens the builder accepts that TOKEN_CONTRACT does not list separately, because the stylesheet
 * defines them as the same primitive as another row. Verified against apps/web/src/app/globals.css:
 *
 *   --card-foreground: var(--blue-900)   — the same ref as --foreground
 *   --popover-foreground: var(--blue-900)
 *   --input: var(--blue-100)             — the same ref as --border
 *
 * They are aliased rather than given their own hex so there is still only one place a value is written.
 * `destructive-foreground` is deliberately absent: the stylesheet resolves it to --semantic-on-error, which
 * the contract does not expose, so it is left to `deriveForegrounds` — the engine's own documented rule.
 */
const ALIASED_FROM: Partial<Record<AcceptedToken, AcceptedToken>> = {
  "card-foreground": "foreground",
  "popover-foreground": "foreground",
  input: "border",
};

function defaultsFor(mode: PreviewMode): Partial<Record<AcceptedToken, string>> {
  const values: Partial<Record<AcceptedToken, string>> = {};
  for (const row of TOKEN_CONTRACT) {
    if (isAccepted(row.token)) values[row.token] = mode === "dark" ? row.dark : row.light;
  }
  for (const [token, source] of Object.entries(ALIASED_FROM) as [AcceptedToken, AcceptedToken][]) {
    if (values[source]) values[token] = values[source];
  }
  return deriveForegrounds(values);
}

/** Both modes resolved once — the contract is a module constant, so this never needs recomputing. */
export const DEFAULT_TOKENS: Record<PreviewMode, Partial<Record<AcceptedToken, string>>> = {
  light: defaultsFor("light"),
  dark: defaultsFor("dark"),
};

export type CreateTheme = {
  /** What the preview renders: defaults with the user's overrides on top. Always complete. */
  values: Partial<Record<AcceptedToken, string>>;
  /** Only what the user actually supplied, foregrounds derived — the CLI's unit of work. */
  overrides: Partial<Record<AcceptedToken, string>>;
  /** Inline custom properties for the scoped preview root. */
  style: Record<string, string>;
  contrast: ContrastResult[];
  css: string;
  /** True when `css` is the shipped default rather than a block of the user's own overrides. */
  cssIsDefault: boolean;
  parsed: ParsedPalette;
  /** Parse problems worth showing inline. Empty input is not a problem. */
  hasErrors: boolean;
};

/**
 * Resolve a config into everything the workspace renders.
 *
 * Invalid rows do not take the preview down with them: `parsePaletteText` already skips a bad row and
 * reports it, so the valid rows still apply and the untouched tokens fall back to the default. The user
 * sees their good input rendered and their bad input named, rather than an error screen or a blank canvas.
 */
export function resolveTheme(config: CreateConfig): CreateTheme {
  const parsed = parsePaletteText(config.themeInput);
  const overrides = deriveForegrounds(parsed.values);
  const hasOverrides = Object.keys(overrides).length > 0;
  const values = { ...DEFAULT_TOKENS[config.mode], ...overrides };

  return {
    values,
    overrides,
    style: toCssVarStyle(values),
    contrast: checkContrast(values),
    // With overrides, the block is exactly what the user changed — byte-identical to what `kinetixui theme
    // build` writes for the same rows, which is the point of there being one engine. With nothing changed
    // there is no override to show, so the full default block stands in; the panel says which one it is.
    css: toCssBlock(hasOverrides ? overrides : values),
    cssIsDefault: !hasOverrides,
    parsed,
    hasErrors: parsed.errors.length > 0 || parsed.unknownTokens.length > 0,
  };
}

/** The current defaults as editable `token,hex` rows — what "Load current values" puts in the textarea. */
export function defaultThemeInput(mode: PreviewMode): string {
  const values = DEFAULT_TOKENS[mode];
  return ACCEPTED_TOKENS.filter((t) => values[t])
    .map((t) => `${t},${values[t]}`)
    .join("\n");
}
