/**
 * Between the workspace's state and the portable preset.
 *
 * The codec (`@kinetixui/create-preset`) knows the schema and the encoding; it deliberately knows nothing
 * about `mode`, `previewScene`, or how a theme is generated. This is the seam: it maps one onto the other
 * and keeps the local-only fields local.
 *
 * Randomize is the shared engine's (`randomizeDesign`) — it draws in OKLCH and has to know which
 * dimensions the engine can durably express, so it belongs with them. What is left here is the same
 * boundary as everything else in this file: a random *design* becomes workspace state without disturbing
 * the mode or the scene the person is looking at.
 */
import {
  DEFAULT_PRESET,
  decodePreset,
  encodePreset,
  isDefaultPreset,
  presetUrl,
  type PresetConfig,
  type PresetError,
} from "@kinetixui/create-preset";
import { randomizeDesign, type RandomSource } from "@kinetixui/create-theme";
import { DEFAULT_CREATE_CONFIG, type CreateConfig } from "./config";

export { PRESET_PARAM, decodePreset, encodePreset } from "@kinetixui/create-preset";
export type { PresetConfig, PresetError } from "@kinetixui/create-preset";
export { RANDOM_BRAND_BOUNDS, RANDOMIZED_FIELDS, type RandomSource } from "@kinetixui/create-theme";

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
 * A new design, leaving the workspace's own state alone.
 *
 * `mode` and `previewScene` are not design: shuffling someone into dark mode and the Form scene because
 * they pressed Randomize would be a different feature, and an annoying one.
 */
export function randomizeConfig(config: CreateConfig, random: RandomSource = Math.random): CreateConfig {
  return presetToConfig(randomizeDesign(random), config);
}

export { DEFAULT_PRESET };
