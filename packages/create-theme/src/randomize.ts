/**
 * A theme generator, not noise.
 *
 * Uniform RGB produces mud: most of the cube is a desaturated brown, and a third of it is too dark or too
 * light to be an interactive colour at all. So the brand is drawn in OKLCH inside a band that is
 * *usable* before the engine touches it — enough chroma to read as a colour, a lightness near where an
 * action colour lives anyway — and the engine's own gamut mapping and mode bands do the rest.
 *
 * The bounds are the interesting part:
 *
 * - **Hue** is unconstrained. Every hue has a good theme in it.
 * - **Chroma 0.09–0.17.** Below ~0.06 a colour reads as grey, and a "random theme" that comes back grey
 *   looks broken rather than restrained. The ceiling is well inside sRGB at these lightnesses, so the
 *   result is rarely gamut-clipped and two nearby hues stay distinguishable.
 * - **Lightness 0.45–0.62.** This is roughly the light-mode action band. Outside it, the engine clamps
 *   every seed onto the band edge, so a wider range would produce *less* variety, not more — near-black
 *   and near-white seeds would all converge on the same two colours.
 *
 * It lives beside the engine rather than in the app because it is the same maths: it draws in OKLCH and
 * it has to know which dimensions the engine can durably express. It lives outside the codec because the
 * codec is dependency-free and has no colour model at all.
 *
 * The random source is a parameter so tests can hand it a sequence and assert the exact output. Nothing
 * here is cryptographic; `Math.random` is the production source.
 */
import {
  CHART_PALETTES,
  NEUTRALS,
  RADII,
  SURFACES,
  type PresetConfig,
} from "@kinetixui/create-preset";
import { MAX_CHROMA, oklchToHex } from "./oklch";

export const RANDOM_BRAND_BOUNDS = {
  chroma: [0.09, 0.17] as const,
  lightness: [0.45, 0.62] as const,
};

export type RandomSource = () => number;

const pick = <T>(options: readonly T[], random: RandomSource): T =>
  options[Math.min(options.length - 1, Math.floor(random() * options.length))]!;

const between = (random: RandomSource, [lo, hi]: readonly [number, number]) => lo + random() * (hi - lo);

/**
 * A new design.
 *
 * Manual overrides are cleared rather than generated: an override is something a person decided, and
 * inventing them would mean Randomize produced pinned values nobody chose — which then survive every
 * later change, because that is what pinning means.
 */
export function randomizeDesign(random: RandomSource = Math.random): PresetConfig {
  const brand = oklchToHex({
    l: between(random, RANDOM_BRAND_BOUNDS.lightness),
    c: Math.min(between(random, RANDOM_BRAND_BOUNDS.chroma), MAX_CHROMA),
    h: random() * 360,
  });

  return {
    brand,
    neutral: pick(NEUTRALS, random),
    radius: pick(RADII, random),
    surface: pick(SURFACES, random),
    chartPalette: pick(CHART_PALETTES, random),
    manualOverrides: {},
  };
}

/** The dimensions Randomize is allowed to touch. Density, typography and navigation are not shipped. */
export const RANDOMIZED_FIELDS = ["brand", "neutral", "radius", "surface", "chartPalette", "manualOverrides"] as const;
