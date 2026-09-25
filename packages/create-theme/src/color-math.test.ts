import { describe, expect, it } from "vitest";
import { contrastRatio, guaranteedContrast, hexToHslChannels, hslChannelsToHex } from "./color-math";
import { oklchToHex } from "./oklch";

/**
 * The contrast bar the engine actually holds itself to.
 *
 * A theme is authored in hex and rendered through a format, and the format moves the pixel. These are the
 * tests for that gap, which cost two wrong attempts to see: judging on the hex alone let the web round
 * pairs under AA, and judging on the rounded value alone let a pair pass only because the rounding
 * helped — which put the same pair below AA in SwiftUI, where it does not round that way.
 */

describe("hsl channel round trip", () => {
  it("returns the same colour for a value that survives rounding", () => {
    for (const hex of ["#ffffff", "#000000", "#ff0000", "#808080"]) {
      expect(hslChannelsToHex(hexToHslChannels(hex)), hex).toBe(hex);
    }
  });

  it("moves a colour that does not", () => {
    // The whole reason `guaranteedContrast` exists: whole degrees and whole percent are lossy.
    const moved = ["#1d4ed8", "#c2410c", "#3f69de"].filter((hex) => hslChannelsToHex(hexToHslChannels(hex)) !== hex);
    expect(moved.length).toBeGreaterThan(0);
  });

  it("stays inside one channel step of the input", () => {
    // Lossy, but not wildly so — a bug in the inverse would show up as a large drift rather than a
    // rounding difference, and every assertion built on it would quietly weaken.
    const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (let h = 0; h < 360; h += 7) {
      for (const l of [0.2, 0.4, 0.55, 0.75, 0.9]) {
        const hex = oklchToHex({ l, c: 0.12, h });
        const back = hslChannelsToHex(hexToHslChannels(hex));
        const drift = Math.max(...toRgb(hex).map((v, i) => Math.abs(v - toRgb(back)[i]!)));
        expect(drift, `${hex} -> ${back}`).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe("guaranteedContrast", () => {
  it("never reports more than the plain ratio", () => {
    for (let h = 0; h < 360; h += 11) {
      const surface = oklchToHex({ l: 0.55, c: 0.18, h });
      expect(guaranteedContrast(surface, "#ffffff")).toBeLessThanOrEqual(contrastRatio(surface, "#ffffff") + 1e-9);
    }
  });

  it("is the worse of the exact and the CSS-rounded ratio", () => {
    for (let h = 0; h < 360; h += 13) {
      const surface = oklchToHex({ l: 0.6, c: 0.14, h });
      const fg = oklchToHex({ l: 0.97, c: 0.02, h });
      const asCss = contrastRatio(hslChannelsToHex(hexToHslChannels(surface)), hslChannelsToHex(hexToHslChannels(fg)));
      expect(guaranteedContrast(surface, fg)).toBe(Math.min(contrastRatio(surface, fg), asCss));
    }
  });

  it("is exact for pure black and white, which no format rounds", () => {
    expect(guaranteedContrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(guaranteedContrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(guaranteedContrast("#1d4ed8", "#f0f7ff")).toBe(guaranteedContrast("#f0f7ff", "#1d4ed8"));
  });
});
