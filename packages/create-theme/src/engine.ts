/**
 * Turning a handful of choices into a theme.
 *
 * Everything here is a pure function of the design and nothing else — no clock, no randomness, no module
 * state. That is not tidiness: a design travels as a shareable preset, and a preset that resolves to a
 * different theme on someone else's machine is worse than no preset.
 *
 * Every function returns a value in the domain it is about: colours as hex, radii as numbers, elevation as
 * shadow layers. None of them returns CSS. That is what lets one engine feed a stylesheet, a Swift file
 * and a Dart file without any of them re-parsing another's output.
 *
 * Generation is OPT-IN BY CHANGE. At the default config nothing is generated and the shipped Kinetix
 * contract is used verbatim, so a fresh /create previews the real library rather than a close imitation
 * of it, and copying produces an empty override block because there is genuinely nothing to override.
 * Change the brand colour and the brand roles regenerate; change the neutral and the surfaces do. The
 * cost is a small discontinuity at the default value — generated(#1d4ed8) is near but not identical to
 * the hand-tuned shipped blue — which `engine.test.ts` measures rather than leaves to be discovered.
 */
import {
  CHART_PALETTES,
  NEUTRALS,
  RADII,
  SURFACES,
  type ChartPaletteId,
  type NeutralId,
  type RadiusId,
  type SurfaceId,
} from "@kinetixui/create-preset";
import { SHIPPED_ELEVATION, type ElevationStep, type RadiusStep, type ShadowLayer } from "./contract";
import { guaranteedContrast } from "./color-math";
import { MAX_CHROMA, adjust, hexToOklch, oklchToHex, type Oklch } from "./oklch";
import type { AcceptedToken } from "./palette";

export type Tokens = Partial<Record<string, string>>;

/* ------------------------------------------------------------------ option sets */

// The four portable dimensions are defined by the preset codec and re-exported here. A preset has to be
// decodable without the app, so the codec owns the vocabulary; the engine owns what each value MEANS.
export {
  CHART_PALETTES,
  NEUTRALS,
  RADII,
  SURFACES,
  type ChartPaletteId,
  type NeutralId,
  type RadiusId,
  type SurfaceId,
};

// A style is derived from radius + surface and never stored, so it is not part of the portable contract.
export const STYLES = ["default", "soft", "sharp"] as const;
export type StyleId = (typeof STYLES)[number];
export type Mode = "light" | "dark";

/** The shipped action blue. The default brand, and the value that means "generate nothing". */
export { DEFAULT_BRAND as KINETIX_BRAND } from "@kinetixui/create-preset";

/**
 * The labels a person reads ("Warm", "Elevated") are NOT here. They are UI copy — they get translated,
 * shortened for a narrow sidebar, and rewritten when the marketing voice changes, none of which is a
 * property of the theme. They live in `apps/web/src/lib/create/labels.ts`, and a `satisfies` there keeps
 * every id in this file named exactly once.
 */

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
  return foregroundForAll([surfaceHex]);
}

/**
 * A foreground that has to read on SEVERAL surfaces, not one.
 *
 * A button's label sits on `action` at rest, on `action-hover` while the pointer is over it, and on
 * `action-pressed` while it is held. All three are the same text; only the fill changes. Choosing the
 * colour against the resting fill alone is how a label ends up at 3.37:1 the moment someone presses the
 * button — which is exactly what happened, and what the SwiftUI exporter's contrast gate surfaced.
 *
 * Candidates are unchanged: a near-white and a near-black carrying a trace of the surface's own hue,
 * because that is what the shipped tokens do (`primary-foreground` is #f0f7ff, a blue-tinted white, not
 * plain white), falling back to pure white or black when neither tinted extreme is enough. What changed
 * is the score — each candidate is judged by its WORST contrast across every surface it must sit on,
 * so a foreground cannot be chosen for the state a user happens not to be in.
 *
 * Still not an optimizer: a fixed candidate list, one comparison, the same answer every time. The tint
 * comes from the first surface, which is the resting one, so identity still follows the action colour
 * rather than drifting with whichever state scored best.
 */
export function foregroundForAll(surfaces: string[]): string {
  const primary = surfaces[0];
  if (primary === undefined) return "#000000";
  const s = hexToOklch(primary);
  if (!s) return "#000000";

  const tint = Math.min(s.c, 0.03);
  const worst = (candidate: string) => Math.min(...surfaces.map((surface) => guaranteedContrast(surface, candidate)));

  const tinted = [oklchToHex({ l: 0.97, c: tint, h: s.h }), oklchToHex({ l: 0.09, c: tint, h: s.h })];
  const best = worst(tinted[0]!) >= worst(tinted[1]!) ? tinted[0]! : tinted[1]!;
  if (worst(best) >= AA) return best;
  return worst("#ffffff") >= worst("#000000") ? "#ffffff" : "#000000";
}

/** WCAG AA for body text. The bar every generated pair is held to. */
const AA = 4.5;

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
 * The interaction states, moved as far as the label can follow.
 *
 * In light mode the states move toward white, and the label on a mid-lightness action colour is usually
 * a near-white too — so the two converge, and past a point the text stops being readable. A colour at
 * L 0.55 has only about 4.7:1 against near-white to begin with; spending 16% of the remaining distance
 * to the backdrop spends most of that headroom. Seven of eight sample brands fell below AA while pressed,
 * including the shipped blue passed through the generator.
 *
 * Choosing the foreground across all three surfaces (`foregroundForAll`) recovers most of it but not all:
 * for part of the wheel NO foreground — tinted or pure, light or dark — clears AA against `action`,
 * `action-hover` and `action-pressed` at the nominal fractions. So the movement itself gives way, and it
 * is the movement that should: a hover fill is a hint about interactivity, and a label you cannot read is
 * a failure. AA wins.
 *
 * It gives way by SCALING BOTH FRACTIONS TOGETHER, in fixed 5% steps, never by moving them independently
 * and never by changing direction. That keeps the model intact — hover and pressed stay in their 10:16
 * ratio, still travelling toward the backdrop, still uniform across hues for any given scale — so what a
 * tight hue loses is amplitude, not behaviour. Scale 0 (the states equal the resting colour) always
 * satisfies the bar, because the foreground clears AA on `action` by construction, so the search always
 * terminates; in practice it never gets close.
 */
const STATE_SCALE_STEPS = 20;

export function interactionStates(
  action: Oklch,
  mode: Mode,
): { hover: string; pressed: string; foreground: string; scale: number } {
  const actionHex = oklchToHex(action);

  for (let step = STATE_SCALE_STEPS; step >= 0; step--) {
    const scale = step / STATE_SCALE_STEPS;
    const hover = oklchToHex(stateOf(action, mode, HOVER_FRACTION * scale));
    const pressed = oklchToHex(stateOf(action, mode, PRESSED_FRACTION * scale));
    const foreground = foregroundForAll([actionHex, hover, pressed]);

    const readable = [actionHex, hover, pressed].every((surface) => guaranteedContrast(surface, foreground) >= AA);
    if (readable) return { hover, pressed, foreground, scale };
  }

  // Unreachable: scale 0 makes all three surfaces the resting colour. Kept so the function is total.
  const foreground = foregroundForAll([actionHex]);
  return { hover: actionHex, pressed: actionHex, foreground, scale: 0 };
}

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
  if (guaranteedContrast(surfaceHex, preferredHex) >= AA) return preferredHex;

  const surface = hexToOklch(surfaceHex);
  const preferred = hexToOklch(preferredHex);
  if (!surface || !preferred) return foregroundFor(surfaceHex);

  // Move away from the surface's lightness, not in a fixed direction: on a dark accent the readable end
  // is lighter, on a pale one it is darker.
  const step = surface.l > 0.5 ? -0.02 : 0.02;
  for (let i = 1; i <= 50; i++) {
    const candidate = oklchToHex(adjust(preferred, { dl: step * i }));
    if (guaranteedContrast(surfaceHex, candidate) >= AA) return candidate;
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
  // The label and the two interaction fills are decided together — see `interactionStates`. Deciding the
  // label first and the fills afterwards is what let a pressed button fall to 3.37:1.
  const states = interactionStates(action, mode);
  const actionFg = states.foreground;

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
    "action-hover": states.hover,
    "action-pressed": states.pressed,
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

/**
 * Lightness ladder per mode. Calibrated against the shipped contract so "Neutral" is a grey Kinetix.
 *
 * `muted-foreground` sits at 0.535 in light mode rather than the 0.55 that matches the shipped grey most
 * closely, because 0.55 leaves no margin: it lands between 4.45 and 4.56 against `muted` depending on the
 * family's tint, and the web's integer-HSL output rounds some of those under AA. 0.535 clears 4.76 for
 * every family. The shipped tokens do not need the same nudge — they are authored as HSL channels, so
 * nothing rounds them afterwards.
 */
const NEUTRAL_LADDER: Record<Mode, Record<string, number>> = {
  light: {
    background: 1,
    card: 1,
    popover: 1,
    muted: 0.975,
    border: 0.86,
    input: 0.86,
    "muted-foreground": 0.535,
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
 * Radius ladders, as NUMBERS rather than CSS.
 *
 * Every value is a multiple of 4, which is the grid the design system is checked against — a builder that
 * emitted 6px corners would put the system off its own grid the moment someone pasted the output.
 *
 * `4`, not `"4px"`: a radius is a length, and only the web spells one that way. The CSS exporter appends
 * the unit; a SwiftUI exporter would write the same number as a CGFloat. Keeping the unit here would make
 * every future exporter parse a string this one just built (§7).
 *
 * Only the four size steps exist: `--radius-field`, `-control`, `-container` and `-surface` are defined as
 * `var(--radius-sm|md|lg|xl)`, so the role aliases follow without Create knowing about them.
 */
const RADIUS_STEPS: Record<RadiusId, Record<RadiusStep, number>> = {
  square: { sm: 0, md: 0, lg: 0, xl: 0 },
  small: { sm: 4, md: 4, lg: 8, xl: 12 },
  default: { sm: 4, md: 8, lg: 12, xl: 16 },
  rounded: { sm: 8, md: 12, lg: 16, xl: 24 },
  soft: { sm: 12, md: 20, lg: 28, xl: 36 },
};

/**
 * The full ladder, always — including at `default`, where it equals the shipped values.
 *
 * The resolved theme describes a theme completely; it is the exporter that decides what is worth
 * emitting, by diffing against the shipped ladder. Returning "nothing changed" from here instead would
 * mean a SwiftUI exporter received a theme with no radius in it and had to know the defaults itself.
 */
export function deriveRadius(radius: RadiusId): Record<RadiusStep, number> {
  return { ...RADIUS_STEPS[radius] };
}

/* ------------------------------------------------------------------ surface */

/**
 * Surface treatment, expressed by REMAPPING the shipped elevation ladder rather than inventing shadows.
 *
 * `soft` is the shipped behaviour. `elevated` shifts every step up one rung, so a card using the `sm`
 * elevation gets the `md` shadow. `flat` and `bordered` remove elevation entirely; `bordered` compensates
 * by darkening the border, which is the only way a flat surface keeps its edges.
 *
 * `elevated` resolves to the LITERAL layers of the rung above, never to a reference. This is the bug #218
 * shipped and #218's follow-up fixed: CSS custom properties substitute at computed-value time, so a block
 * that says
 *
 *     --shadow-sm: var(--shadow-md);  --shadow-md: var(--shadow-lg);  --shadow-lg: var(--shadow-xl);
 *
 * does not snapshot the ladder — each reference resolves against the *overridden* property beside it, and
 * all three collapse onto the `xl` value. Verified in a browser: sm, md and lg all came back as xl.
 *
 * Carrying layers rather than strings makes that failure unreachable by construction, and not only for
 * CSS: there is no value in this type that could be a reference to another token.
 */
export function deriveElevation(surface: SurfaceId): Record<ElevationStep, ShadowLayer[]> {
  switch (surface) {
    case "soft":
      return { ...SHIPPED_ELEVATION };
    case "elevated":
      // Each step takes the next rung's own layers; the top step has nothing above it and keeps its own.
      return {
        sm: SHIPPED_ELEVATION.md,
        md: SHIPPED_ELEVATION.lg,
        lg: SHIPPED_ELEVATION.xl,
        xl: SHIPPED_ELEVATION.xl,
      };
    case "flat":
    case "bordered":
      // An empty layer list is "no shadow" — `none` in CSS, no shadow modifier natively.
      return { sm: [], md: [], lg: [], xl: [] };
  }
}

/**
 * The border a surface treatment asks for, or null when it leaves the border alone.
 *
 * Split out from the elevation because it is a colour and elevation is not. Folding them into one return
 * value meant every caller sorting one from the other by token name.
 */
export function deriveSurfaceBorder(surface: SurfaceId, mode: Mode, borderHex: string): string | null {
  if (surface !== "bordered") return null;
  // The border moves toward the foreground, not to an arbitrary colour, so it stays on whatever neutral
  // family is selected.
  const border = hexToOklch(borderHex);
  return border ? oklchToHex(adjust(border, { dl: mode === "light" ? -0.14 : 0.14 })) : null;
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
    out[`chart-${i + 1}`] = oklchToHex({ l: ls[i]!, c: Math.min(0.16, MAX_CHROMA), h });
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
