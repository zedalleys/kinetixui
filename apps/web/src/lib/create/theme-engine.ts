/**
 * Turning a handful of choices into a theme.
 *
 * Everything here is a pure function of the config and nothing else — no clock, no randomness, no module
 * state. That is not tidiness: PR 3 encodes a config into a shareable preset, and a preset that resolves
 * to a different theme on someone else's machine is worse than no preset.
 *
 * Generation is OPT-IN BY CHANGE. At the default config nothing is generated and the shipped Kinetix
 * contract is used verbatim, so a fresh /create previews the real library rather than a close imitation
 * of it, and copying produces an empty override block because there is genuinely nothing to override.
 * Change the brand colour and the brand roles regenerate; change the neutral and the surfaces do. The
 * cost is a small discontinuity at the default value — generated(#1d4ed8) is near but not identical to
 * the hand-tuned shipped blue — which `theme-engine.test.ts` measures rather than leaves to be
 * discovered.
 */
import { contrastRatio } from "../color-math";
import { MAX_CHROMA, adjust, hexToOklch, oklchToHex, type Oklch } from "../color/oklch";
import type { AcceptedToken } from "../theme-builder";

export type Tokens = Partial<Record<string, string>>;

/* ------------------------------------------------------------------ option sets */

export const NEUTRALS = ["kinetix", "neutral", "cool", "warm", "stone"] as const;
export const RADII = ["square", "small", "default", "rounded", "soft"] as const;
export const SURFACES = ["flat", "bordered", "soft", "elevated"] as const;
export const CHART_PALETTES = ["kinetix", "brand", "categorical", "cool", "warm"] as const;
export const STYLES = ["default", "soft", "sharp"] as const;

export type NeutralId = (typeof NEUTRALS)[number];
export type RadiusId = (typeof RADII)[number];
export type SurfaceId = (typeof SURFACES)[number];
export type ChartPaletteId = (typeof CHART_PALETTES)[number];
export type StyleId = (typeof STYLES)[number];
export type Mode = "light" | "dark";

/** The shipped action blue. The default brand, and the value that means "generate nothing". */
export const KINETIX_BRAND = "#1d4ed8";

export const NEUTRAL_LABELS: Record<NeutralId, string> = {
  kinetix: "Kinetix",
  neutral: "Neutral",
  cool: "Cool",
  warm: "Warm",
  stone: "Stone",
};

export const RADIUS_LABELS: Record<RadiusId, string> = {
  square: "Square",
  small: "Small",
  default: "Default",
  rounded: "Rounded",
  soft: "Soft",
};

export const SURFACE_LABELS: Record<SurfaceId, string> = {
  flat: "Flat",
  bordered: "Bordered",
  soft: "Soft",
  elevated: "Elevated",
};

export const CHART_LABELS: Record<ChartPaletteId, string> = {
  kinetix: "Kinetix",
  brand: "Brand",
  categorical: "Categorical",
  cool: "Cool",
  warm: "Warm",
};

export const STYLE_LABELS: Record<StyleId, string> = {
  default: "Default",
  soft: "Soft",
  sharp: "Sharp",
};

/* ------------------------------------------------------------------ brand roles */

/**
 * Where an interactive colour has to sit to carry readable text on this mode's background.
 *
 * A brand picked for a light UI is usually too dark for a dark one — the shipped pair is #1d4ed8 at
 * L 0.49 and #60a5fa at L 0.72, the same blue moved, not inverted. Clamping into a band reproduces that
 * automatically for any hue instead of asking the user to configure two systems (§38).
 */
const ACTION_BAND: Record<Mode, [number, number]> = {
  light: [0.42, 0.62],
  dark: [0.66, 0.84],
};

/** The background lightness each mode's interaction states move toward. */
const BACKDROP_L: Record<Mode, number> = { light: 1, dark: 0.15 };

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Pull a colour into the band for this mode, keeping hue and chroma. */
function intoBand(colour: Oklch, mode: Mode): Oklch {
  const [lo, hi] = ACTION_BAND[mode];
  return adjust(colour, { dl: clamp(colour.l, lo, hi) - colour.l });
}

/**
 * A readable foreground for a coloured surface.
 *
 * Candidates are a near-white and a near-black carrying a trace of the surface's own hue, because that
 * is what the shipped tokens do — `primary-foreground` is #f0f7ff, a blue-tinted white, not plain white.
 * Whichever has more contrast wins; if neither clears AA (only possible for a mid-lightness surface with
 * extreme chroma), pure white or black is used, which always beats a tinted one.
 *
 * Deliberately not an optimizer. Two candidates, one comparison, same answer every time (§14).
 */
export function foregroundFor(surfaceHex: string): string {
  const s = hexToOklch(surfaceHex);
  if (!s) return "#000000";
  const tint = Math.min(s.c, 0.03);
  const light = oklchToHex({ l: 0.97, c: tint, h: s.h });
  const dark = oklchToHex({ l: 0.09, c: tint, h: s.h });

  const best = contrastRatio(surfaceHex, light) >= contrastRatio(surfaceHex, dark) ? light : dark;
  if (contrastRatio(surfaceHex, best) >= 4.5) return best;
  return contrastRatio(surfaceHex, "#ffffff") >= contrastRatio(surfaceHex, "#000000") ? "#ffffff" : "#000000";
}

/**
 * Hover and pressed, as perceptual moves toward the background.
 *
 * The contract documents these as "action at 90%" and "at 85%" over the background, which is an alpha
 * blend. Reproducing that as a lightness move toward the backdrop gives the same visual result and, unlike
 * alpha, keeps working when the surface under the control is not the page background (§13 forbids deriving
 * states by opacity for exactly this reason).
 */
function stateOf(action: Oklch, mode: Mode, fraction: number): Oklch {
  return adjust(action, { dl: (BACKDROP_L[mode] - action.l) * fraction });
}

export const HOVER_FRACTION = 0.1;
export const PRESSED_FRACTION = 0.16;

/**
 * A readable foreground that keeps a preferred colour's identity.
 *
 * The shipped theme puts the action blue on a pale blue accent, and reproducing that look is worth more
 * than reaching for near-black: a coloured surface with its own colour on it reads as one thing. But the
 * preferred colour only clears AA on a pale surface for part of the wheel — a saturated magenta action on
 * its own tint is 3.76:1 — so the lightness is stepped toward the readable end until it does.
 *
 * Fixed 0.02 steps and a fixed ceiling, so the answer never depends on floating point luck. If the hue
 * cannot get there at all, the ordinary tinted extreme takes over.
 */
function readableOnSurface(surfaceHex: string, preferredHex: string): string {
  if (contrastRatio(surfaceHex, preferredHex) >= 4.5) return preferredHex;

  const surface = hexToOklch(surfaceHex);
  const preferred = hexToOklch(preferredHex);
  if (!surface || !preferred) return foregroundFor(surfaceHex);

  // Move away from the surface's lightness, not in a fixed direction: on a dark accent the readable end
  // is lighter, on a pale one it is darker.
  const step = surface.l > 0.5 ? -0.02 : 0.02;
  for (let i = 1; i <= 50; i++) {
    const candidate = oklchToHex(adjust(preferred, { dl: step * i }));
    if (contrastRatio(surfaceHex, candidate) >= 4.5) return candidate;
  }
  return foregroundFor(surfaceHex);
}

/**
 * Every role a brand colour seeds.
 *
 * Brand and action are written separately even though Simple mode seeds both from one colour: a system
 * whose brand is not its interactive colour is normal, and Advanced overrides either independently (§12).
 */
export function deriveBrandRoles(brandHex: string, mode: Mode): Tokens {
  const brand = hexToOklch(brandHex);
  if (!brand) return {};

  const action = intoBand(brand, mode);
  const actionHex = oklchToHex(action);
  const brandOwn = oklchToHex(brand);
  const actionFg = foregroundFor(actionHex);

  // `accent` is a quiet surface that carries the brand hue — a selected row, a hover fill. It belongs to
  // the surface family, so it takes its lightness from the mode and only its hue from the brand.
  const accent = oklchToHex({
    l: mode === "light" ? 0.96 : 0.24,
    c: Math.min(brand.c, 0.04),
    h: brand.h,
  });

  return {
    brand: brandOwn,
    "brand-foreground": foregroundFor(brandOwn),
    action: actionHex,
    "action-foreground": actionFg,
    "action-hover": oklchToHex(stateOf(action, mode, HOVER_FRACTION)),
    "action-pressed": oklchToHex(stateOf(action, mode, PRESSED_FRACTION)),
    link: actionHex,
    focus: actionHex,
    // `primary` and `ring` are the pre-role names the contract says `action` and `focus` default to.
    // Create writes both so a component that still reads the older name follows the theme.
    primary: actionHex,
    "primary-foreground": actionFg,
    ring: actionHex,
    accent,
    // The action colour if it is readable on its own tint, stepped toward readable if not.
    "accent-foreground": readableOnSurface(accent, actionHex),
  };
}

/* ------------------------------------------------------------------ neutrals */

/**
 * Neutral families as a hue and a chroma ceiling.
 *
 * The chroma is deliberately tiny. At 0.012 a "warm" grey reads as warm next to a cool one and as grey on
 * its own, which is the point — a warm neutral that looks orange is not a neutral (§18). `kinetix` is the
 * shipped hand-tuned palette and generates nothing.
 */
const NEUTRAL_TINT: Record<Exclude<NeutralId, "kinetix">, { h: number; c: number }> = {
  neutral: { h: 0, c: 0 },
  cool: { h: 250, c: 0.012 },
  warm: { h: 70, c: 0.012 },
  stone: { h: 40, c: 0.008 },
};

/** Lightness ladder per mode. Calibrated against the shipped contract so "Neutral" is a grey Kinetix. */
const NEUTRAL_LADDER: Record<Mode, Record<string, number>> = {
  light: {
    background: 1,
    card: 1,
    popover: 1,
    muted: 0.975,
    border: 0.86,
    input: 0.86,
    "muted-foreground": 0.55,
    foreground: 0.15,
  },
  dark: {
    background: 0.16,
    card: 0.22,
    popover: 0.22,
    muted: 0.27,
    border: 0.4,
    input: 0.4,
    "muted-foreground": 0.72,
    foreground: 0.97,
  },
};

export function deriveNeutrals(neutral: NeutralId, mode: Mode): Tokens {
  if (neutral === "kinetix") return {};
  const { h, c } = NEUTRAL_TINT[neutral];
  const ladder = NEUTRAL_LADDER[mode];
  const at = (l: number) => oklchToHex({ l, c, h });

  const out: Tokens = {};
  for (const [token, l] of Object.entries(ladder)) out[token] = at(l);
  // Surfaces get their text from the same rule every other coloured surface uses.
  out["card-foreground"] = out.foreground;
  out["popover-foreground"] = out.foreground;
  return out;
}

/* ------------------------------------------------------------------ radius */

/**
 * Radius ladders, in the units the tokens already use. Every value is a multiple of 4, which is the grid
 * the design system is checked against — a builder that emitted 6px corners would put the system off its
 * own grid the moment someone pasted the output.
 *
 * Only the four size steps are written: `--radius-field`, `-control`, `-container` and `-surface` are
 * defined as `var(--radius-sm|md|lg|xl)`, so the role aliases follow without Create knowing about them
 * (§70 — no create-specific radius tokens).
 */
const RADIUS_STEPS: Record<RadiusId, [number, number, number, number]> = {
  square: [0, 0, 0, 0],
  small: [4, 4, 8, 12],
  default: [4, 8, 12, 16],
  rounded: [8, 12, 16, 24],
  soft: [12, 20, 28, 36],
};

export function deriveRadius(radius: RadiusId): Tokens {
  const [sm, md, lg, xl] = RADIUS_STEPS[radius];
  return {
    "radius-sm": `${sm}px`,
    "radius-md": `${md}px`,
    "radius-lg": `${lg}px`,
    "radius-xl": `${xl}px`,
  };
}

/* ------------------------------------------------------------------ surface */

/**
 * Surface treatment, expressed by REMAPPING the shipped elevation ladder rather than inventing shadows.
 *
 * `soft` is the shipped behaviour and writes nothing. `elevated` shifts every step up one rung, so a card
 * using `shadow-sm` gets the `--shadow-md` value — the same tokenized shadows, redistributed. `flat` and
 * `bordered` remove them; `bordered` compensates by darkening the border, which is the only way a flat
 * surface keeps its edges (§29).
 */
const SHADOW_STEPS = ["--shadow-sm", "--shadow-md", "--shadow-lg", "--shadow-xl"] as const;

export function deriveSurface(surface: SurfaceId, mode: Mode, borderHex: string): Tokens {
  if (surface === "soft") return {};

  if (surface === "elevated") {
    // Each step takes the next one's value; the top step keeps its own.
    return {
      "shadow-sm": "var(--shadow-md)",
      "shadow-md": "var(--shadow-lg)",
      "shadow-lg": "var(--shadow-xl)",
    };
  }

  const flat = Object.fromEntries(SHADOW_STEPS.map((s) => [s.slice(2), "none"])) as Tokens;
  if (surface === "flat") return flat;

  // bordered: no elevation, stronger edges. The border moves toward the foreground, not to an arbitrary
  // colour, so it stays on whatever neutral family is selected.
  const border = hexToOklch(borderHex);
  return {
    ...flat,
    ...(border ? { border: oklchToHex(adjust(border, { dl: mode === "light" ? -0.14 : 0.14 })) } : {}),
  };
}

/* ------------------------------------------------------------------ charts */

/**
 * Chart palettes.
 *
 * Series have to be told apart from each other, not just from the background (§32), so each palette is
 * defined as a set of hues with real separation and the generator only varies lightness within it. Five
 * tints of one brand hue is the thing this explicitly is not: `brand` spreads ±50° around the brand and
 * leans on lightness for the rest.
 */
const CHART_HUES: Record<Exclude<ChartPaletteId, "kinetix" | "brand">, number[]> = {
  categorical: [255, 60, 145, 330, 200],
  cool: [200, 250, 290, 170, 225],
  // A warm band is only ~100° wide, so the hues are ordered against the lightness ladder below rather
  // than run in sequence: the two closest hues (45 and 55) sit on the two most separated lightnesses.
  // Running them in order gave two oranges a reader could not tell apart.
  warm: [20, 55, 45, 115, 90],
};

/** Lightness per series, per mode — enough spread that adjacent hues stay separable. */
const CHART_L: Record<Mode, number[]> = {
  light: [0.55, 0.68, 0.46, 0.62, 0.74],
  dark: [0.7, 0.62, 0.78, 0.55, 0.85],
};

export function deriveChart(palette: ChartPaletteId, brandHex: string, mode: Mode): Tokens {
  if (palette === "kinetix") return {};

  const hues =
    palette === "brand"
      ? (() => {
          const h = hexToOklch(brandHex)?.h ?? 255;
          return [0, 50, -50, 100, -100].map((d) => (((h + d) % 360) + 360) % 360);
        })()
      : CHART_HUES[palette];

  const ls = CHART_L[mode];
  const out: Tokens = {};
  hues.forEach((h, i) => {
    out[`chart-${i + 1}`] = oklchToHex({ l: ls[i], c: Math.min(0.16, MAX_CHROMA), h });
  });
  return out;
}

/* ------------------------------------------------------------------ styles */

/**
 * A style is a named point in the controls that already exist — not a separate pile of overrides. That is
 * what lets the user pick one and then change a single dimension without the preset fighting them (§19).
 *
 * There is no "Compact": it would be a density preset, and density is not expressible in the current token
 * architecture, so shipping it would mean a control that vanishes when copied (§104).
 */
export const STYLE_VALUES: Record<StyleId, { radius: RadiusId; surface: SurfaceId }> = {
  default: { radius: "default", surface: "soft" },
  soft: { radius: "soft", surface: "soft" },
  sharp: { radius: "square", surface: "bordered" },
};

/** The style whose values these are, or null when the combination is not a named one. */
export function styleFor(radius: RadiusId, surface: SurfaceId): StyleId | null {
  const hit = (Object.keys(STYLE_VALUES) as StyleId[]).find(
    (id) => STYLE_VALUES[id].radius === radius && STYLE_VALUES[id].surface === surface,
  );
  return hit ?? null;
}

/** Re-exported so the sidebar can label a contrast pair without importing the parser's token union. */
export type { AcceptedToken };
