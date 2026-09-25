/**
 * Between the workspace's state and the portable preset.
 *
 * The codec (`@kinetixui/create-preset`) knows the schema and the encoding; it deliberately knows nothing
 * about `mode`, `previewScene`, or how a theme is generated. This is the seam: it maps one onto the other
 * and keeps the local-only fields local.
 *
 * Randomize lives here rather than in the codec because it needs the OKLCH engine, and the codec is
 * dependency-free on purpose. The CLI has no use for it.
 */
import {
  CHART_PALETTES,
  DEFAULT_PRESET,
  NEUTRALS,
  RADII,
  SURFACES,
  decodePreset,
  encodePreset,
  isDefaultPreset,
  presetUrl,
  type PresetConfig,
  type PresetError,
} from "@kinetixui/create-preset";
import { MAX_CHROMA, oklchToHex } from "../color/oklch";
import { DEFAULT_CREATE_CONFIG, type CreateConfig } from "./config";

export { PRESET_PARAM, decodePreset, encodePreset } from "@kinetixui/create-preset";
export type { PresetConfig, PresetError } from "@kinetixui/create-preset";

/** The design half of the workspace state — everything a preset carries. */
export function configToPreset(config: CreateConfig): PresetConfig {
  return {
    brand: config.brand,
    neutral: config.neutral,
    radius: config.radius,
    surface: config.surface,
    chartPalette: config.chartPalette,
    manualOverrides: { ...config.manualOverrides },
  };
}

/**
 * Rebuild workspace state from a preset.
 *
 * `mode` and `previewScene` come from the workspace, not the preset — opening someone's link should not
 * move you into dark mode or a different demo. They default to the shipped values when there is no
 * workspace state to keep.
 */
export function presetToConfig(preset: PresetConfig, local?: Pick<CreateConfig, "mode" | "previewScene">): CreateConfig {
  return {
    mode: local?.mode ?? DEFAULT_CREATE_CONFIG.mode,
    previewScene: local?.previewScene ?? DEFAULT_CREATE_CONFIG.previewScene,
    brand: preset.brand,
    neutral: preset.neutral,
    radius: preset.radius,
    surface: preset.surface,
    chartPalette: preset.chartPalette,
    manualOverrides: { ...preset.manualOverrides },
  };
}

export const encodeConfig = (config: CreateConfig): string => encodePreset(configToPreset(config));
export const shareUrlFor = (config: CreateConfig, origin: string): string => presetUrl(configToPreset(config), origin);
export const configCarriesNoDesign = (config: CreateConfig): boolean => isDefaultPreset(configToPreset(config));

/** Decode straight into workspace state, keeping whatever local state the workspace already had. */
export function decodeIntoConfig(
  input: string,
  local?: Pick<CreateConfig, "mode" | "previewScene">,
): { ok: true; config: CreateConfig } | { ok: false; error: PresetError } {
  const result = decodePreset(input);
  return result.ok ? { ok: true, config: presetToConfig(result.config, local) } : result;
}

/* ------------------------------------------------------------------ randomize */

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
 * The random source is a parameter so tests can hand it a sequence and assert the exact output. Nothing
 * here is cryptographic; `Math.random` is the production source.
 */
export const RANDOM_BRAND_BOUNDS = {
  chroma: [0.09, 0.17] as const,
  lightness: [0.45, 0.62] as const,
};

export type RandomSource = () => number;

const pick = <T>(options: readonly T[], random: RandomSource): T =>
  options[Math.min(options.length - 1, Math.floor(random() * options.length))]!;

const between = (random: RandomSource, [lo, hi]: readonly [number, number]) => lo + random() * (hi - lo);

/**
 * A new design, leaving the workspace's own state alone.
 *
 * Manual overrides are cleared rather than generated: an override is something a person decided, and
 * inventing them would mean Randomize produced pinned values nobody chose — which then survive every
 * later change, because that is what pinning means.
 */
export function randomizeConfig(config: CreateConfig, random: RandomSource = Math.random): CreateConfig {
  const brand = oklchToHex({
    l: between(random, RANDOM_BRAND_BOUNDS.lightness),
    c: Math.min(between(random, RANDOM_BRAND_BOUNDS.chroma), MAX_CHROMA),
    h: random() * 360,
  });

  return {
    ...config,
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

export { DEFAULT_PRESET };
