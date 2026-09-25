/**
 * Hex <-> RGB/HSL conversion and WCAG contrast — no dependency.
 *
 * The one implementation. `packages/cli/src/lib/color-math.ts` used to be a hand-synced 1:1 port of this
 * file, kept in step by a comment asking the next person to remember; it now re-exports from here, so
 * `kinetixui theme build` and the /create workspace cannot disagree about what a contrast ratio is.
 */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

/** "h s% l%" — the exact shape the token pipeline stores channels in (for hsl(var(--x))). */
export function hexToHslChannels(hex: string): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return `${h} ${s}% ${l}%`;
}

/**
 * WCAG relative luminance from NORMALIZED sRGB — each channel 0–1.
 *
 * Normalized rather than 0–255 because not every representation Kinetix emits is 8-bit. SwiftUI writes
 * fractional channels, and converting those back to bytes to measure them would add a rounding step that
 * the platform never performs.
 */
function relLuminanceNormalized([r, g, b]: Normalized): number {
  const linear = (s: number) => (s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4));
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** sRGB with each channel in 0–1. The form every representation is compared in. */
export type Normalized = [number, number, number];

const normalize = ([r, g, b]: [number, number, number]): Normalized => [r / 255, g / 255, b / 255];

/** WCAG contrast between two normalized colours. */
export function contrastOfNormalized(a: Normalized, b: Normalized): number {
  const la = relLuminanceNormalized(a) + 0.05;
  const lb = relLuminanceNormalized(b) + 0.05;
  return la > lb ? la / lb : lb / la;
}

export function contrastRatio(hexA: string, hexB: string): number {
  return contrastOfNormalized(normalize(hexToRgb(hexA)), normalize(hexToRgb(hexB)));
}

/** "h s% l%" back to a hex — the inverse of `hexToHslChannels`, rounding included. */
export function hslChannelsToHex(channels: string): string {
  const [h = 0, s = 0, l = 0] = channels.trim().split(/\s+/).map((v) => parseFloat(v));
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;

  const sector = Math.floor((((h % 360) + 360) % 360) / 60);
  const rgb = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector]!;

  return `#${rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The colour as the SwiftUI exporter writes it: each channel divided by 255 and rounded to three
 * decimals, which is what `Color(red: 0.114, green: 0.306, blue: 0.847)` hands to the platform.
 *
 * Normalized out, deliberately. Converting these back to bytes to measure them would add a rounding step
 * SwiftUI never performs, so the measurement would be of a colour nothing renders.
 *
 * `exporters/swiftui.ts` formats its output from this same function, so the engine cannot come to believe
 * the exporter emits one thing while it emits another — which is exactly the gap this function was added
 * to close. `swiftui.test.ts` asserts the two agree digit for digit.
 */
export function swiftUiChannels(hex: string): Normalized {
  return hexToRgb(hex).map((v) => Number((v / 255).toFixed(3))) as Normalized;
}

/**
 * The contrast a consumer is guaranteed, in every representation Create can export.
 *
 * A theme is authored in hex and then written through a format, and every format moves the pixel a
 * little. There are three today:
 *
 *   exact    the resolved 8-bit colour, before any exporter touches it
 *   web      `hsl(var(--x))` — whole degrees, whole percent. Costs up to 0.37 of a ratio.
 *   SwiftUI  `Color(red:green:blue:)` — each channel to three decimals.
 *
 * The bar is the worst of the three, because a guarantee that holds in one representation and not another
 * is not a guarantee. Getting this wrong twice is what made it worth writing down: judging on the exact
 * hex alone let the web round 3.7% of pairs under AA, and then judging on exact-plus-web let a pair reach
 * 4.5 only BECAUSE the CSS rounding helped — and the same pair came out at 4.46 in SwiftUI, whose
 * three-decimal rounding is a different function, not a finer version of the same one.
 *
 * A fourth exporter adds a fourth term here, not a special case in the exporter. Generation adapts to the
 * bar; an exporter never repairs a theme it was handed.
 */
export function guaranteedContrast(hexA: string, hexB: string): number {
  const exact = contrastRatio(hexA, hexB);
  const asCss = contrastRatio(hslChannelsToHex(hexToHslChannels(hexA)), hslChannelsToHex(hexToHslChannels(hexB)));
  const asSwift = contrastOfNormalized(swiftUiChannels(hexA), swiftUiChannels(hexB));
  return Math.min(exact, asCss, asSwift);
}

/** Whichever of white/black reads better on this background. */
export function bestTextHex(bgHex: string): "#ffffff" | "#000000" {
  return contrastRatio(bgHex, "#ffffff") >= contrastRatio(bgHex, "#000000") ? "#ffffff" : "#000000";
}

export function isHex(v: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(v.trim());
}

export function normalizeHex(v: string): string {
  const t = v.trim().replace(/^#/, "");
  return `#${t.toLowerCase()}`;
}
