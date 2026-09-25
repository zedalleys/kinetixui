/**
 * The names a person reads.
 *
 * Separated from the engine on purpose. "Warm", "Elevated", "Sharp" are UI copy — they get shortened for
 * a narrow sidebar, rewritten when the voice changes, and translated if the site ever is. None of that is
 * a property of the theme, and a CLI printing a preset has no use for any of it.
 *
 * Annotated `Record<…>` rather than left to inference: adding an option to the engine without naming it
 * here is then a type error rather than a control labelled `undefined`. The literal values are not
 * needed at the type level — these are handed to a component as a lookup table, never switched on.
 */
import type { ChartPaletteId, NeutralId, RadiusId, StyleId, SurfaceId } from "@kinetixui/create-theme";

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
