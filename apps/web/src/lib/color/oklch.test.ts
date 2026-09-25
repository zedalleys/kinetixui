// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../color-math";
import {
  MAX_CHROMA,
  adjust,
  formatOklch,
  gamutMapOklch,
  hexToOklch,
  maxChromaFor,
  oklabToOklch,
  oklabToSrgbRaw,
  oklchToHex,
  oklchToOklab,
  parseOklch,
  rgbToHex,
  srgbToOklab,
} from "./oklch";

/**
 * Reference values from the CSS Color 4 conversion sample, which is the same derivation browsers ship.
 * Compared with a tolerance: these are irrational in both directions and exact equality would only be
 * testing this machine's floating point.
 */
const REFERENCE: [string, [number, number, number]][] = [
  ["#ffffff", [1, 0, 0]],
  ["#000000", [0, 0, 0]],
  ["#ff0000", [0.62796, 0.25768, 29.234]],
  ["#00ff00", [0.86644, 0.29483, 142.495]],
  ["#0000ff", [0.45201, 0.31321, 264.052]],
  ["#808080", [0.59987, 0, 0]],
];

describe("hex → OKLCH", () => {
  it.each(REFERENCE)("%s", (hex, [l, c, h]) => {
    const got = hexToOklch(hex)!;
    expect(got.l).toBeCloseTo(l, 3);
    expect(got.c).toBeCloseTo(c, 3);
    // Hue is meaningless at zero chroma and is pinned to 0 rather than left to atan2 on noise.
    if (c > 0.001) expect(got.h).toBeCloseTo(h, 1);
    else expect(got.h).toBe(0);
  });

  it("accepts exactly what the shared hex validator accepts", () => {
    // Create and the raw editor share isHex/normalizeHex, so they must take the same set. Six digits,
    // upper or lower, hash optional. The 3-digit shorthand is NOT accepted — widening it here would
    // quietly widen what the raw token editor accepts too.
    expect(hexToOklch("#FF0000")).toEqual(hexToOklch("#ff0000"));
    expect(hexToOklch("ff0000")).toEqual(hexToOklch("#ff0000"));
    expect(hexToOklch("  #ff0000  ")).toEqual(hexToOklch("#ff0000"));
    expect(hexToOklch("#fff")).toBeNull();
  });

  it("returns null for anything that is not a colour, rather than NaN", () => {
    for (const bad of ["", "red", "#12", "#gggggg", "oklch(1 0 0)", "#1234567", "  "]) {
      expect(hexToOklch(bad), bad).toBeNull();
    }
  });
});

describe("round trips", () => {
  it.each(["#ffffff", "#000000", "#ff0000", "#00ff00", "#0000ff", "#1d4ed8", "#c7cfc7", "#050c11", "#92b2c8", "#f6f6f6"])(
    "%s survives hex → OKLCH → hex exactly",
    (hex) => {
      // Exact here, not approximate: every one of these is already inside sRGB, so nothing should move.
      expect(oklchToHex(hexToOklch(hex)!)).toBe(hex);
    },
  );

  it("survives OKLab → OKLCH → OKLab", () => {
    for (const rgb of [[29, 78, 216], [127, 91, 33], [221, 106, 106]] as [number, number, number][]) {
      const lab = srgbToOklab(rgb);
      const back = oklchToOklab(oklabToOklch(lab));
      expect(back.L).toBeCloseTo(lab.L, 10);
      expect(back.a).toBeCloseTo(lab.a, 10);
      expect(back.b).toBeCloseTo(lab.b, 10);
    }
  });

  it("round-trips every ramp value the token contract ships", () => {
    // A broad sweep rather than a handful: an error in one matrix row only shows on some hues.
    for (let r = 0; r < 256; r += 37) {
      for (let g = 0; g < 256; g += 41) {
        for (let b = 0; b < 256; b += 43) {
          const hex = rgbToHex([r, g, b]);
          expect(oklchToHex(hexToOklch(hex)!), hex).toBe(hex);
        }
      }
    }
  });
});

describe("gamut mapping", () => {
  // A saturated colour at each of these hues sits well outside sRGB at MAX_CHROMA.
  const HUES: [string, number][] = [
    ["red", 29],
    ["yellow", 100],
    ["green", 142],
    ["cyan", 195],
    ["blue", 264],
    ["purple", 328],
  ];

  it.each(HUES)("%s reduces chroma and keeps hue and lightness", (_name, h) => {
    const wanted = { l: 0.55, c: MAX_CHROMA, h };
    const got = gamutMapOklch(wanted);

    expect(got.h).toBe(h);
    expect(got.l).toBe(0.55);
    expect(got.c).toBeLessThanOrEqual(wanted.c);
    expect(got.c).toBeGreaterThan(0);
  });

  it.each(HUES)("%s produces a hex whose hue is still the one asked for", (_name, h) => {
    // The property independent clamping breaks: clip blue's red channel and it comes back purple.
    const hex = oklchToHex({ l: 0.5, c: MAX_CHROMA, h });
    const round = hexToOklch(hex)!;
    const delta = Math.abs(((round.h - h + 540) % 360) - 180);
    expect(delta, `${hex} drifted to hue ${round.h.toFixed(1)}`).toBeLessThan(1.5);
  });

  it.each([0, 0.02, 0.1, 0.5, 0.9, 0.98, 1])("never produces an invalid channel at lightness %s", (l) => {
    for (let h = 0; h < 360; h += 15) {
      const hex = oklchToHex({ l, c: MAX_CHROMA, h });
      expect(hex, `l=${l} h=${h}`).toMatch(/^#[0-9a-f]{6}$/);
      expect(oklabToSrgbRaw(oklchToOklab(gamutMapOklch({ l, c: MAX_CHROMA, h }))).every(Number.isFinite)).toBe(true);
    }
  });

  it("leaves an in-gamut colour untouched", () => {
    const inside = hexToOklch("#1d4ed8")!;
    expect(gamutMapOklch(inside)).toEqual(inside);
  });

  it("stays valid at the extremes of lightness", () => {
    // Not pure black: OKLab L=0 with non-zero a/b is a real near-black colour, and a little of it fits
    // in sRGB. What matters is that the result is representable and essentially unlit.
    const darkest = oklchToHex({ l: 0, c: 0.3, h: 264 });
    const lightest = oklchToHex({ l: 1, c: 0.3, h: 264 });
    expect(darkest).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(darkest, "#000000")).toBeLessThan(1.05);
    expect(contrastRatio(lightest, "#ffffff")).toBeLessThan(1.05);
  });

  it("is deterministic — the same input gives the same output every time", () => {
    for (const h of [29, 142, 264]) {
      const runs = Array.from({ length: 5 }, () => oklchToHex({ l: 0.63, c: 0.3, h }));
      expect(new Set(runs).size).toBe(1);
    }
  });

  it("reports a usable maximum chroma per lightness and hue", () => {
    // Mid lightness holds far more chroma than the ends; a slider that ignored this would spend most of
    // its travel on values that all clip to the same colour.
    expect(maxChromaFor(0.5, 264)).toBeGreaterThan(maxChromaFor(0.95, 264));
    expect(maxChromaFor(0.5, 264)).toBeGreaterThan(maxChromaFor(0.05, 264));
    expect(maxChromaFor(0.5, 264)).toBeLessThanOrEqual(MAX_CHROMA);
  });

  it("normalizes hue wrapping and negative chroma instead of producing nonsense", () => {
    expect(gamutMapOklch({ l: 0.5, c: 0.1, h: 400 }).h).toBeCloseTo(40, 6);
    expect(gamutMapOklch({ l: 0.5, c: 0.1, h: -40 }).h).toBeCloseTo(320, 6);
    expect(gamutMapOklch({ l: 0.5, c: -1, h: 0 }).c).toBe(0);
    expect(gamutMapOklch({ l: 2, c: 0.1, h: 0 }).l).toBe(1);
  });
});

describe("text form", () => {
  it("formats as CSS's own oklch() syntax", () => {
    expect(formatOklch(hexToOklch("#ff0000")!)).toBe("oklch(62.8% 0.258 29.2)");
    expect(formatOklch({ l: 1, c: 0, h: 0 })).toBe("oklch(100.0% 0.000 0.0)");
  });

  it("parses what it formats, and what a browser would print", () => {
    for (const hex of ["#1d4ed8", "#ff0000", "#050c11"]) {
      const c = hexToOklch(hex)!;
      const back = parseOklch(formatOklch(c))!;
      expect(back.l).toBeCloseTo(c.l, 2);
      expect(back.c).toBeCloseTo(c.c, 2);
      expect(back.h).toBeCloseTo(c.h, 1);
    }
    expect(parseOklch("oklch(0.628 0.258 29.23)")!.l).toBeCloseTo(0.628, 3);
    expect(parseOklch("62.8% 0.258 29.23")!.l).toBeCloseTo(0.628, 3);
    expect(parseOklch("oklch(62.8% 0.258 29.23 / 0.5)")!.h).toBeCloseTo(29.23, 2);
  });

  it("rejects a malformed or half-typed value rather than committing a guess", () => {
    for (const bad of ["", "oklch(", "oklch(50%)", "oklch(50% 0.1)", "red", "#ff0000", "oklch(a b c)", "50%"]) {
      expect(parseOklch(bad), bad).toBeNull();
    }
  });

  it("clamps an out-of-range component instead of refusing an unambiguous value", () => {
    expect(parseOklch("oklch(150% 0.1 0)")!.l).toBe(1);
    expect(parseOklch("oklch(50% -1 0)")!.c).toBe(0);
    expect(parseOklch("oklch(50% 0.1 720)")!.h).toBeCloseTo(0, 6);
  });
});

describe("adjust", () => {
  it("moves lightness perceptually and keeps hue", () => {
    const base = hexToOklch("#1d4ed8")!;
    const lighter = adjust(base, { dl: 0.08 });
    expect(lighter.l).toBeCloseTo(base.l + 0.08, 6);
    expect(lighter.h).toBeCloseTo(base.h, 6);
  });

  it("moves the same perceptual distance on every hue — the reason for OKLab", () => {
    // In HSL this is the failing case: equal lightness steps on yellow and blue look nothing alike.
    const deltas = [29, 100, 142, 264, 328].map((h) => {
      const base = { l: 0.5, c: 0.1, h };
      const lighter = adjust(base, { dl: 0.1 });
      return lightnessDelta(oklchToHex(base), oklchToHex(lighter));
    });
    const spread = Math.max(...deltas) - Math.min(...deltas);
    expect(spread).toBeLessThan(0.02);
  });

  it("stays in gamut when pushed past the edge", () => {
    const hot = adjust({ l: 0.5, c: 0.3, h: 264 }, { dc: 0.2 });
    expect(oklchToHex(hot)).toMatch(/^#[0-9a-f]{6}$/);
    expect(hot.c).toBeLessThan(0.5);
  });

  it("clamps rather than wrapping lightness", () => {
    expect(adjust({ l: 0.95, c: 0, h: 0 }, { dl: 0.5 }).l).toBe(1);
    expect(adjust({ l: 0.05, c: 0, h: 0 }, { dl: -0.5 }).l).toBe(0);
  });
});

/** OKLab lightness difference between two hex colours — used to compare perceptual steps. */
function lightnessDelta(a: string, b: string): number {
  return Math.abs(hexToOklch(b)!.l - hexToOklch(a)!.l);
}

describe("agreement with the contrast maths already in use", () => {
  it("orders colours the same way relative luminance does", () => {
    // Not the same quantity, but a colour with higher OKLab L must not have lower luminance — if these
    // ever disagreed, generated foregrounds would fight the contrast panel.
    const samples = ["#000000", "#050c11", "#1d4ed8", "#92b2c8", "#f6f6f6", "#ffffff"];
    const byL = [...samples].sort((a, b) => hexToOklch(a)!.l - hexToOklch(b)!.l);
    const byContrast = [...samples].sort((a, b) => contrastRatio(a, "#000000") - contrastRatio(b, "#000000"));
    expect(byL).toEqual(byContrast);
  });
});
