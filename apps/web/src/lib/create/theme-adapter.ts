/**
 * Config in, theme out.
 *
 * This is the only place that combines the layers, and it does so in one fixed order (§40):
 *
 *   1. the shipped Kinetix contract for the mode
 *   2. generated values — neutral family, then brand roles, radius, surface, charts
 *   3. the user's manual overrides
 *
 * Manual always wins. Re-rendering cannot drop an override, because overrides are applied last on every
 * resolve rather than merged into a mutable store that generation could later overwrite.
 *
 * Both modes are resolved every time. Light and dark are two outputs of one configuration, not two
 * configurations (§38), which is what lets the copied CSS carry a `:root` and a `.dark` block that agree
 * with each other.
 */
import { hexToHslChannels } from "../color-math";
import {
  ACCEPTED_TOKENS,
  CONTRAST_PAIRS,
  checkContrast,
  parsePaletteText,
  type AcceptedToken,
  type ContrastResult,
  type ParsedPalette,
} from "../theme-builder";
import { TOKEN_CONTRACT } from "../token-contract";
import { hexToOklch } from "../color/oklch";
import {
  deriveBrandRoles,
  deriveChart,
  deriveNeutrals,
  deriveRadius,
  deriveSurface,
  foregroundFor,
  type Mode,
} from "./theme-engine";
import { DEFAULT_CREATE_CONFIG, type CreateConfig, type PreviewMode } from "./config";

/**
 * Three tokens the parser accepts that TOKEN_CONTRACT does not list, because the stylesheet defines them
 * as the same primitive as another row (verified in apps/web/src/app/globals.css):
 * `--card-foreground`/`--popover-foreground` resolve to `--foreground`, `--input` to `--border`.
 */
const ALIASED_FROM: Partial<Record<AcceptedToken, AcceptedToken>> = {
  "card-foreground": "foreground",
  "popover-foreground": "foreground",
  input: "border",
};

/** Base → its foreground, for regenerating a text colour when only the surface was overridden. */
const FOREGROUND_OF: Record<string, string> = Object.fromEntries(CONTRAST_PAIRS);

function shippedFor(mode: Mode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of TOKEN_CONTRACT) out[row.token] = mode === "dark" ? row.dark : row.light;
  for (const [token, source] of Object.entries(ALIASED_FROM)) {
    if (out[source]) out[token] = out[source];
  }
  // `destructive-foreground` resolves to --semantic-on-error, which the contract does not expose; the
  // engine's own rule picks it, exactly as the old builder did.
  for (const [base, fg] of Object.entries(FOREGROUND_OF)) {
    if (out[base] && !out[fg]) out[fg] = foregroundFor(out[base]);
  }
  return out;
}

/** The shipped contract per mode — the floor every resolve starts from. */
export const SHIPPED_TOKENS: Record<PreviewMode, Record<string, string>> = {
  light: shippedFor("light"),
  dark: shippedFor("dark"),
};

export type ResolvedMode = {
  /** Every colour token, as hex. Complete: a preview can render from this alone. */
  colors: Record<string, string>;
  /** Non-colour custom properties — radius steps, remapped shadows. Raw CSS values. */
  vars: Record<string, string>;
};

export type CreateTheme = {
  light: ResolvedMode;
  dark: ResolvedMode;
  /** The mode the preview is showing. */
  active: ResolvedMode;
  /** Inline custom properties for the scoped preview root. */
  style: Record<string, string>;
  contrast: ContrastResult[];
  /** Tokens the user set by hand — shown as "manual" beside a contrast result. */
  manualTokens: Set<string>;
  css: string;
  /** True when the config is the shipped default and there is genuinely nothing to override. */
  cssIsEmpty: boolean;
};

/* ------------------------------------------------------------------ resolve */

function resolveMode(config: CreateConfig, mode: Mode): ResolvedMode {
  const colors: Record<string, string> = { ...SHIPPED_TOKENS[mode] };

  // Neutral first: the brand roles read the resolved border for the bordered surface treatment, and
  // `accent` belongs to the brand rather than the neutral family, so brand must land after it.
  Object.assign(colors, deriveNeutrals(config.neutral, mode));
  if (config.brand.toLowerCase() !== DEFAULT_CREATE_CONFIG.brand) {
    Object.assign(colors, deriveBrandRoles(config.brand, mode));
  }
  Object.assign(colors, deriveChart(config.chartPalette, config.brand, mode));

  const vars: Record<string, string> = {};
  if (config.radius !== DEFAULT_CREATE_CONFIG.radius) Object.assign(vars, deriveRadius(config.radius));

  const surface = deriveSurface(config.surface, mode, colors.border ?? "#000000");
  for (const [token, value] of Object.entries(surface)) {
    // `deriveSurface` may move the border, which is a colour, alongside the shadow remaps, which are not.
    if (token === "border") colors[token] = value as string;
    else vars[token] = value as string;
  }
  if (vars.border) delete vars.border;

  // Manual overrides last — nothing generated can displace them.
  for (const [token, hex] of Object.entries(config.manualOverrides)) {
    if (hex) colors[token] = hex;
  }
  // A surface overridden without its text colour gets a readable one. This is not repairing the user's
  // choice: they did not make one. A foreground they DID set is left exactly as typed, pass or fail.
  for (const [base, fg] of Object.entries(FOREGROUND_OF)) {
    if (config.manualOverrides[base as AcceptedToken] && !config.manualOverrides[fg as AcceptedToken]) {
      colors[fg] = foregroundFor(colors[base]);
    }
  }

  return { colors, vars };
}

export function resolveTheme(config: CreateConfig): CreateTheme {
  const light = resolveMode(config, "light");
  const dark = resolveMode(config, "dark");
  const active = config.mode === "dark" ? dark : light;

  const style: Record<string, string> = {};
  for (const [token, hex] of Object.entries(active.colors)) {
    if (hex) style[`--${token}`] = hexToHslChannels(hex);
  }
  for (const [token, value] of Object.entries(active.vars)) style[`--${token}`] = value;

  const css = buildCss(config, light, dark);

  return {
    light,
    dark,
    active,
    style,
    contrast: checkContrast(active.colors as Partial<Record<AcceptedToken, string>>),
    manualTokens: new Set(Object.keys(config.manualOverrides)),
    css: css || NOTHING_TO_OVERRIDE,
    cssIsEmpty: css === "",
  };
}

/* ------------------------------------------------------------------ output */

export const NOTHING_TO_OVERRIDE =
  "/* Nothing to override — this is the Kinetix default.\n   Change a control above and the CSS appears here. */";

const block = (selector: string, lines: string[]) =>
  lines.length ? `${selector} {\n${lines.join("\n")}\n}` : "";

/**
 * Only what differs from the shipped theme.
 *
 * A full dump of every token would be mostly the values the consumer already has, and a reader could not
 * see what they changed. Diffing also makes the default case honest: no change, no CSS.
 *
 * Colours are emitted as HSL channels because that is the shape `hsl(var(--x))` expects throughout
 * @kinetixui/ui — the internal model is OKLCH, the output format is the one the library reads.
 */
function buildCss(config: CreateConfig, light: ResolvedMode, dark: ResolvedMode): string {
  const base = { light: SHIPPED_TOKENS.light, dark: SHIPPED_TOKENS.dark };

  const colorLines = (mode: PreviewMode, resolved: ResolvedMode) =>
    Object.keys(resolved.colors)
      .filter((t) => resolved.colors[t] && resolved.colors[t].toLowerCase() !== base[mode][t]?.toLowerCase())
      .sort()
      .map((t) => `  --${t}: ${hexToHslChannels(resolved.colors[t])};`);

  const varLines = (resolved: ResolvedMode) =>
    Object.keys(resolved.vars)
      .sort()
      .map((t) => `  --${t}: ${resolved.vars[t]};`);

  // Radius and the shadow remaps do not vary by mode, so they belong in :root once. The only mode-varying
  // non-colour case would be a shadow that referenced a colour, and none of them do.
  const root = [...colorLines("light", light), ...varLines(light)];
  const darkLines = colorLines("dark", dark);
  const darkVars = varLines(dark).filter((l) => !varLines(light).includes(l));

  return [block(":root", root), block(".dark", [...darkLines, ...darkVars])].filter(Boolean).join("\n\n");
}

/* ------------------------------------------------------------------ advanced editor bridge */

/** `token,hex` rows for the values the user has set by hand. The raw editor's initial text. */
export function overridesToText(overrides: Partial<Record<AcceptedToken, string>>): string {
  return (ACCEPTED_TOKENS as readonly AcceptedToken[])
    .filter((t) => overrides[t])
    .map((t) => `${t},${overrides[t]}`)
    .join("\n");
}

/** Parse raw editor text into overrides, keeping the parser's own error reporting. */
export function textToOverrides(text: string): ParsedPalette {
  return parsePaletteText(text);
}

/** The resolved value of a token in the active mode — what an Advanced field shows before it is set. */
export function effectiveValue(theme: CreateTheme, token: AcceptedToken): string {
  return theme.active.colors[token] ?? "#000000";
}

/** Perceptual lightness of the active background — used to pick readable swatch outlines. */
export function activeBackgroundLightness(theme: CreateTheme): number {
  return hexToOklch(theme.active.colors.background ?? "#ffffff")?.l ?? 1;
}
