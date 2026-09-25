/**
 * @kinetixui/create-theme — a Kinetix Create preset, resolved.
 *
 *     KX1 preset  →  validated design  →  resolved semantic theme  →  export target
 *                    (@kinetixui/create-preset)   (this package)      (this package's exporters)
 *
 * Framework-free on purpose: no React, no Next, no `node:` imports, no DOM. The website renders from it,
 * `kinetixui preset css` prints from it, and a future SwiftUI/Compose/Flutter exporter will read the same
 * resolved theme rather than a second derivation that agrees by hand.
 *
 * One exporter exists today, for web CSS, because that is the only output Kinetix has actually validated.
 * There is no native theme export yet and nothing here should be read as claiming otherwise.
 */
export {
  hexToRgb,
  rgbToHsl,
  hexToHslChannels,
  contrastRatio,
  bestTextHex,
  isHex,
  normalizeHex,
} from "./color-math";

export {
  MAX_CHROMA,
  srgbToOklab,
  oklabToSrgbRaw,
  oklabToOklch,
  oklchToOklab,
  gamutMapOklch,
  maxChromaFor,
  rgbToHex,
  hexToOklch,
  oklchToHex,
  formatOklch,
  parseOklch,
  adjust,
  lightnessOf,
  type Oklch,
  type Rgb,
} from "./oklch";

export {
  TOKEN_CONTRACT,
  tokenNameForHex,
  SHIPPED_RADIUS,
  SHIPPED_ELEVATION,
  RADIUS_STEP_NAMES,
  ELEVATION_STEP_NAMES,
  type TokenRow,
  type RadiusStep,
  type ElevationStep,
  type ShadowLayer,
} from "./contract";

export {
  ACCEPTED_TOKENS,
  CONTRAST_PAIRS,
  parsePaletteText,
  deriveForegrounds,
  toCssVarStyle,
  toCssBlock,
  checkContrast,
  type AcceptedToken,
  type ContrastResult,
  type ParsedPalette,
} from "./palette";

export {
  CHART_PALETTES,
  NEUTRALS,
  RADII,
  SURFACES,
  STYLES,
  STYLE_VALUES,
  KINETIX_BRAND,
  HOVER_FRACTION,
  PRESSED_FRACTION,
  deriveBrandRoles,
  deriveNeutrals,
  deriveRadius,
  deriveElevation,
  deriveSurfaceBorder,
  deriveChart,
  foregroundFor,
  styleFor,
  type ChartPaletteId,
  type NeutralId,
  type RadiusId,
  type SurfaceId,
  type StyleId,
  type Mode,
  type Tokens,
} from "./engine";

export {
  resolveCreateTheme,
  contrastOf,
  SHIPPED_COLORS,
  SHIPPED_THEME,
  type ResolvedCreateTheme,
  type ResolvedThemeMode,
} from "./resolve";

export {
  randomizeDesign,
  RANDOM_BRAND_BOUNDS,
  RANDOMIZED_FIELDS,
  type RandomSource,
} from "./randomize";

export {
  cssExporter,
  exportCss,
  cssVarOverrides,
  shadowCss,
  NOTHING_TO_OVERRIDE,
  type CssExportOptions,
  type ThemeExporter,
} from "./exporters/index";
