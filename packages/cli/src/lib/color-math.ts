/**
 * Hex <-> RGB/HSL conversion and WCAG contrast.
 *
 * This file used to be a hand-maintained 1:1 port of the website's colour maths, with a comment asking
 * the next person to remember to keep the two in step. It now re-exports the one implementation from
 * `@kinetixui/create-theme`, so `kinetixui theme build`, `kinetixui preset css` and the /create workspace
 * cannot disagree about what a contrast ratio is.
 *
 * The package is a devDependency: tsup inlines it into `dist/index.js`, so the published surface of
 * @kinetixui/cli is unchanged — exactly as `@kinetixui/create-preset` is consumed.
 *
 * Kept as a file rather than deleted because `theme.ts` imports `./color-math.js`, and a re-export is a
 * smaller, more obvious change than rewriting those call sites to reach across packages directly.
 */
export {
  hexToRgb,
  rgbToHsl,
  hexToHslChannels,
  contrastRatio,
  bestTextHex,
  isHex,
  normalizeHex,
} from "@kinetixui/create-theme";
