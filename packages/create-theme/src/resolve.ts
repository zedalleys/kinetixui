/**
 * Design in, theme out.
 *
 * This is the only place that combines the layers, and it does so in one fixed order:
 *
 *   1. the shipped Kinetix contract for the mode
 *   2. generated values — neutral family, then brand roles, charts, radius, surface
 *   3. the user's manual overrides
 *
 * Manual always wins. Re-rendering cannot drop an override, because overrides are applied last on every
 * resolve rather than merged into a mutable store that generation could later overwrite.
 *
 * Both modes are resolved every time. Light and dark are two outputs of one design, not two designs,
 * which is what lets an exporter emit a `:root` and a `.dark` that agree with each other — or, on a
 * platform with no cascade, two theme structs built from one source.
 *
 * The input is a `PresetConfig`: exactly the portable design, nothing about which mode is on screen or
 * which demo is showing. That is not a convenience, it is the guarantee — a theme is a function of what
 * a preset carries, so a decoded preset and the design it was encoded from resolve identically, and an
 * exporter cannot come to depend on workspace state that never travels.
 *
 * The design is canonicalized first, so "identically" holds for the whole theme object and not merely
 * for its colours: `#C2410C` and `#c2410c`, and two override maps written in different orders, are one
 * design and resolve to one value.
 */
import {
  ACCEPTED_TOKENS,
  DEFAULT_PRESET,
  canonicalize,
  isDefaultPreset,
  validate,
  type AcceptedToken,
  type PresetConfig,
} from "@kinetixui/create-preset";
import {
  ROLE_DEFAULTS,
  SHIPPED_ELEVATION,
  SHIPPED_RADIUS,
  TOKEN_CONTRACT,
  type ElevationStep,
  type RadiusStep,
  type ShadowLayer,
} from "./contract";
import {
  deriveBrandRoles,
  deriveChart,
  deriveElevation,
  deriveNeutrals,
  deriveRadius,
  deriveSurfaceBorder,
  foregroundFor,
  interactionStates,
  type Mode,
} from "./engine";
import { hexToOklch } from "./oklch";
import { CONTRAST_PAIRS, checkContrast, type ContrastResult } from "./palette";

/**
 * One appearance of a theme, resolved completely and expressed in no particular technology.
 *
 * Serializable by construction: strings, numbers and plain objects. No functions, no CSS, no class names,
 * no sets. `JSON.parse(JSON.stringify(theme))` is the same theme, which is what an exporter running in a
 * different process needs it to be.
 */
export type ResolvedThemeMode = {
  /** Every semantic colour, as `#rrggbb`. Complete — a renderer needs nothing else. */
  colors: Record<string, string>;
  /** Corner radii, in px. Complete: the shipped ladder when the design does not change it. */
  radius: Record<RadiusStep, number>;
  /** Elevation, as shadow layers. An empty list is "no shadow", not a missing value. */
  elevation: Record<ElevationStep, ShadowLayer[]>;
};

export type ResolvedCreateTheme = {
  light: ResolvedThemeMode;
  dark: ResolvedThemeMode;
  meta: {
    /** The design this came from, so an exporter can name it without being handed it separately. */
    design: PresetConfig;
    /** Tokens the user pinned by hand — an exporter may mark them, the UI labels them "manual". */
    manualTokens: AcceptedToken[];
    /** True when nothing was generated: the shipped Kinetix theme, unchanged. */
    isDefault: boolean;
  };
};

/* ------------------------------------------------------------------ the shipped floor */

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
/** Foreground → its base, the same pairs read the other way. */
const BASE_OF: Record<string, string> = Object.fromEntries(CONTRAST_PAIRS.map(([base, fg]) => [fg, base]));

function shippedColorsFor(mode: Mode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of TOKEN_CONTRACT) out[row.token] = mode === "dark" ? row.dark : row.light;
  for (const [token, source] of Object.entries(ALIASED_FROM)) {
    const value = out[source];
    if (value) out[token] = value;
  }
  // `destructive-foreground` resolves to --semantic-on-error, which the contract does not expose; the
  // engine's own rule picks it, exactly as the old builder did.
  for (const [base, fg] of Object.entries(FOREGROUND_OF)) {
    const baseHex = out[base];
    if (baseHex && !out[fg]) out[fg] = foregroundFor(baseHex);
  }
  return out;
}

/** The shipped contract per mode — the floor every resolve starts from, and the exporters' baseline. */
export const SHIPPED_COLORS: Record<Mode, Record<string, string>> = {
  light: shippedColorsFor("light"),
  dark: shippedColorsFor("dark"),
};

/** The shipped theme itself, which is what the default design resolves to. */
export const SHIPPED_THEME: Record<Mode, ResolvedThemeMode> = {
  light: { colors: SHIPPED_COLORS.light, radius: SHIPPED_RADIUS, elevation: SHIPPED_ELEVATION },
  dark: { colors: SHIPPED_COLORS.dark, radius: SHIPPED_RADIUS, elevation: SHIPPED_ELEVATION },
};

/* ------------------------------------------------------------------ resolve */

function resolveMode(design: PresetConfig, mode: Mode): ResolvedThemeMode {
  const colors: Record<string, string> = { ...SHIPPED_COLORS[mode] };

  // Neutral first: the bordered surface treatment reads the resolved border, and `accent` belongs to the
  // brand rather than the neutral family, so brand must land after it.
  Object.assign(colors, deriveNeutrals(design.neutral, mode));
  if (design.brand.toLowerCase() !== DEFAULT_PRESET.brand) {
    Object.assign(colors, deriveBrandRoles(design.brand, mode));
  }
  Object.assign(colors, deriveChart(design.chartPalette, design.brand, mode));

  const border = deriveSurfaceBorder(design.surface, mode, colors.border ?? "#000000");
  if (border) colors.border = border;

  const generatedAction = colors.action;
  const pinned = design.manualOverrides as Partial<Record<string, string>>;

  // Manual overrides last — nothing generated can displace them.
  for (const [token, hex] of Object.entries(design.manualOverrides)) {
    if (hex) colors[token] = hex;
  }
  // A surface overridden without its text colour gets a readable one. This is not repairing the user's
  // choice: they did not make one. A foreground they DID set is left exactly as typed, pass or fail.
  for (const [base, fg] of Object.entries(FOREGROUND_OF)) {
    if (pinned[base] && !pinned[fg]) {
      colors[fg] = foregroundFor(colors[base]!);
    }
  }
  // A role that defaults to another one follows it when the user moved the source by hand and left the
  // role alone: pin `primary` and `action` and `link` are that colour, pin `ring` and `focus` is. This is
  // what the token source says (`action` = `{color.primary}`) and what a web stylesheet already did, so
  // writing it into the resolved theme is what makes the preview and the native exports mean the same
  // thing as the CSS (audit P1-3). "Moved by hand" includes a foreground regenerated because its base
  // was pinned; a foreground whose own base the user pinned keeps the colour picked for that base.
  for (const [role, source] of Object.entries(ROLE_DEFAULTS)) {
    if (pinned[role]) continue;
    if (BASE_OF[role] && pinned[BASE_OF[role]!]) continue;
    const sourceMoved = Boolean(pinned[source] || (BASE_OF[source] && pinned[BASE_OF[source]!]));
    if (sourceMoved && colors[source]) colors[role] = colors[source]!;
  }
  // Native ports draw hover and pressed from explicit fields, the web from `action` itself. When the
  // action colour came from a hand-set value, regenerate the two fills from it with the same rule a
  // generated action uses — otherwise a native button keeps the shipped blue hover under a green action.
  const action = colors.action ? hexToOklch(colors.action) : null;
  if (action && colors.action !== generatedAction) {
    const states = interactionStates(action, mode);
    colors["action-hover"] = states.hover;
    colors["action-pressed"] = states.pressed;
    // The label has to stay readable on all three fills, which a foreground chosen against the resting
    // colour alone does not promise (a mid-green pressed fill falls below AA under it). A foreground the
    // user set themselves, on `action` or on `primary`, is left exactly as typed.
    if (!pinned["action-foreground"] && !pinned["primary-foreground"]) colors["action-foreground"] = states.foreground;
  }

  return {
    colors,
    radius: deriveRadius(design.radius),
    elevation: deriveElevation(design.surface),
  };
}

/**
 * The design as the codec would round-trip it: hex lower-cased, overrides in token order, unknown values
 * already refused. Built from the codec's own two functions rather than a second normalizer here, so
 * "canonical" means the same thing to the engine as it does to a shared code.
 *
 * Falls back to the design as given if validation refuses it — the engine already ignores a colour it
 * cannot read, and a resolve is not the place to start throwing at a caller.
 */
function canonicalDesign(design: PresetConfig): PresetConfig {
  const result = validate(canonicalize(design));
  return result.ok ? result.config : design;
}

export function resolveCreateTheme(input: PresetConfig): ResolvedCreateTheme {
  const design = canonicalDesign(input);
  return {
    light: resolveMode(design, "light"),
    dark: resolveMode(design, "dark"),
    meta: {
      design,
      // In token order, not insertion order. `Object.keys` would hand back whatever order the overrides
      // happened to be written in, so a decoded preset (canonicalized, sorted) and the design it was
      // encoded from would resolve to two theme objects that are not equal — which breaks the one
      // property the whole pipeline rests on. Token order, rather than alphabetical, because that is the
      // order the raw editor and the CLI already list overrides in.
      manualTokens: ACCEPTED_TOKENS.filter((token) => design.manualOverrides[token]),
      isDefault: isDefaultPreset(design),
    },
  };
}

/* ------------------------------------------------------------------ contrast */

/**
 * WCAG AA over every pair the theme defines, for one appearance.
 *
 * Exposed here rather than left to the UI so that a check in the workspace, a check in the CLI and a
 * check in a future exporter are the same check. The engine reports; it does not repair — a failing pair
 * the user typed stays exactly as typed.
 */
export function contrastOf(mode: ResolvedThemeMode): ContrastResult[] {
  return checkContrast(mode.colors as Partial<Record<AcceptedToken, string>>);
}
