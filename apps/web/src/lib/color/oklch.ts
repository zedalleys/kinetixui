/**
 * OKLab / OKLCH — the authoring model for every colour Create generates.
 *
 * Why not HSL, which the token pipeline stores: HSL lightness is not perceptual. `hsl(60 100% 50%)` and
 * `hsl(240 100% 50%)` claim the same lightness and differ by about 20:1 in contrast, so "make this 10%
 * darker for the pressed state" produces a different amount of darker for every hue. OKLab's L is
 * perceptual, which is what makes one derivation rule work across the wheel.
 *
 * This module is the only place that knows the OKLab matrices. It deliberately does NOT duplicate
 * hex↔RGB or contrast, which `../color-math` already owns and which `packages/cli/src/lib/color-math.ts`
 * is a 1:1 port of — adding to that file would silently break a port that claims to be exact.
 *
 * CLI parity: the CLI has no OKLCH. It compiles a CSV of literal hex values, so it needs none today. If
 * a future `theme` command ever generates colours rather than transcribing them, this module is what it
 * has to share; moving it into a package at that point is a mechanical lift, because nothing here touches
 * the DOM, React or the token pipeline.
 *
 * Conventions: L ∈ [0,1], C ≥ 0, H ∈ [0,360). Hue of an achromatic colour is 0, not NaN.
 */
import { hexToRgb, isHex, normalizeHex } from "../color-math";

export type Oklch = { l: number; c: number; h: number };
export type Rgb = [number, number, number];

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Wrap a hue into [0,360) — but return it untouched when it is already there. `((h % 360) + 360) % 360`
 * looks equivalent and is not: on 264.052 it returns 264.05200000000007, so mapping an in-gamut colour
 * would hand back a value that no longer equals the one that went in.
 */
const wrapHue = (h: number) => (h >= 0 && h < 360 ? h : ((h % 360) + 360) % 360);

/** Largest chroma any sRGB colour reaches in OKLCH (~0.32 for pure magenta). Bounds the UI's slider. */
export const MAX_CHROMA = 0.37;

/* ------------------------------------------------------------------ sRGB transfer */

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

/* ------------------------------------------------------------------ sRGB ↔ OKLab */

/** 0–255 sRGB to OKLab. Matrices from Björn Ottosson's reference derivation. */
export function srgbToOklab([r, g, b]: Rgb): { L: number; a: number; b: number } {
  const lr = toLinear(r / 255);
  const lg = toLinear(g / 255);
  const lb = toLinear(b / 255);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/**
 * OKLab to sRGB, as unrounded and UNCLAMPED channels in 0–255 space. Out-of-range values are left alone
 * on purpose: `fitsSrgb` uses them to decide whether a colour is in gamut, and rounding first would
 * quietly declare an out-of-gamut colour representable.
 */
export function oklabToSrgbRaw({ L, a, b }: { L: number; a: number; b: number }): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255,
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255,
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255,
  ];
}

/* ------------------------------------------------------------------ OKLab ↔ OKLCH */

export function oklabToOklch({ L, a, b }: { L: number; a: number; b: number }): Oklch {
  const c = Math.sqrt(a * a + b * b);
  // Below this, a and b are numerical noise and atan2 returns an arbitrary angle. Greys get hue 0 so the
  // same grey always round-trips to the same triple — determinism matters more than a meaningless angle.
  if (c < 1e-6) return { l: L, c: 0, h: 0 };
  return { l: L, c, h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

export function oklchToOklab({ l, c, h }: Oklch) {
  const rad = (h * Math.PI) / 180;
  return { L: l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

/* ------------------------------------------------------------------ gamut */

const EPS = 0.5 / 255; // half a quantisation step: closer than a channel can express

const fitsSrgb = (rgb: Rgb) => rgb.every((v) => v >= -EPS * 255 && v <= 255 + EPS * 255);

/**
 * Bring an OKLCH colour into sRGB by reducing chroma, holding lightness and hue fixed.
 *
 * Clamping R, G and B independently is the obvious alternative and it shifts hue: an out-of-gamut blue
 * clips its red channel to zero and comes back visibly purple, so the picker would return a different
 * colour from the one under the cursor. Chroma reduction keeps the hue angle exactly and only makes the
 * colour less saturated, which is the change a user can see coming.
 *
 * 24 bisection steps resolve chroma to ~2e-8 — far below a quantisation step, and a fixed count rather
 * than a tolerance loop so the result is identical on every machine and every run.
 */
export function gamutMapOklch(colour: Oklch): Oklch {
  const h = wrapHue(colour.h);
  const l = clamp(colour.l, 0, 1);
  const c = Math.max(0, colour.c);

  if (fitsSrgb(oklabToSrgbRaw(oklchToOklab({ l, c, h })))) return { l, c, h };
  // Pure black and white are in gamut at zero chroma; anything else at L 0 or 1 is too.
  let lo = 0;
  let hi = c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (fitsSrgb(oklabToSrgbRaw(oklchToOklab({ l, c: mid, h })))) lo = mid;
    else hi = mid;
  }
  return { l, c: lo, h };
}

/** The largest in-gamut chroma at this lightness and hue — what the chroma slider's maximum means. */
export function maxChromaFor(l: number, h: number): number {
  return gamutMapOklch({ l, c: MAX_CHROMA, h }).c;
}

/* ------------------------------------------------------------------ hex ↔ OKLCH */

export function rgbToHex([r, g, b]: Rgb): string {
  const ch = (v: number) =>
    Math.round(clamp(v, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

/** Returns null rather than throwing or guessing — callers show the input as invalid instead. */
export function hexToOklch(hex: string): Oklch | null {
  if (!isHex(hex)) return null;
  return oklabToOklch(srgbToOklab(hexToRgb(normalizeHex(hex))));
}

/** Always a valid 6-digit hex: the colour is gamut-mapped first, so no channel can fall outside 0–255. */
export function oklchToHex(colour: Oklch): string {
  return rgbToHex(oklabToSrgbRaw(oklchToOklab(gamutMapOklch(colour))));
}

/* ------------------------------------------------------------------ text form */

/** `oklch(62.8% 0.258 29.2)` — CSS's own syntax, so a value pasted from devtools is accepted. */
export function formatOklch({ l, c, h }: Oklch): string {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

/**
 * Accepts `oklch(62.8% 0.258 29.2)`, the same without the wrapper, and `0–1` lightness without a percent.
 * Anything else is null: a half-typed value must not be committed as a colour, it must be shown as
 * incomplete. Out-of-range components are clamped and gamut-mapped rather than rejected — a hue of 400
 * is unambiguous, so refusing it would be pedantry.
 */
export function parseOklch(text: string): Oklch | null {
  const body = text.trim().replace(/^oklch\(\s*/i, "").replace(/\)\s*$/, "");
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const num = (s: string) => {
    const m = /^([+-]?\d*\.?\d+)(%?)$/.exec(s);
    return m ? { value: Number(m[1]), percent: m[2] === "%" } : null;
  };
  const [rawL, rawC, rawH] = parts.slice(0, 3).map(num);
  if (!rawL || !rawC || !rawH) return null;

  return gamutMapOklch({
    l: clamp(rawL.percent ? rawL.value / 100 : rawL.value, 0, 1),
    c: Math.max(0, rawC.percent ? (rawC.value / 100) * 0.4 : rawC.value),
    h: wrapHue(rawH.value),
  });
}

/* ------------------------------------------------------------------ manipulation */

/** Adjust lightness and chroma, keeping hue. The primitive every state derivation is built from. */
export function adjust(colour: Oklch, { dl = 0, dc = 0, dh = 0 }: { dl?: number; dc?: number; dh?: number }): Oklch {
  return gamutMapOklch({
    l: clamp(colour.l + dl, 0, 1),
    c: Math.max(0, colour.c + dc),
    h: wrapHue(colour.h + dh),
  });
}

/** Perceptual lightness of a hex colour, 0–1. Cheaper to read than a full conversion at call sites. */
export function lightnessOf(hex: string): number {
  return hexToOklch(hex)?.l ?? 0;
}
