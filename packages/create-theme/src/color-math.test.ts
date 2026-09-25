import { describe, expect, it } from "vitest";
import {
  contrastOfNormalized,
  contrastRatio,
  guaranteedContrast,
  hexToHslChannels,
  hslChannelsToHex,
  swiftUiChannels,
} from "./color-math";
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

  it("is the worst of exact, web HSL and SwiftUI 3dp", () => {
    for (let h = 0; h < 360; h += 13) {
      const surface = oklchToHex({ l: 0.6, c: 0.14, h });
      const fg = oklchToHex({ l: 0.97, c: 0.02, h });
      const asCss = contrastRatio(hslChannelsToHex(hexToHslChannels(surface)), hslChannelsToHex(hexToHslChannels(fg)));
      const asSwift = contrastOfNormalized(swiftUiChannels(surface), swiftUiChannels(fg));

      expect(guaranteedContrast(surface, fg)).toBe(Math.min(contrastRatio(surface, fg), asCss, asSwift));
    }
  });

  it("counts SwiftUI's rounding as its own representation, not a finer copy of the exact one", () => {
    // The mistake this replaced: "3dp is finer than 8-bit, so a guarantee on the exact hex holds there".
    // Three-decimal rounding is a DIFFERENT function, not a more precise one — 1/255 is 0.00392, so
    // rounding to 0.001 moves a channel by up to 0.0005 in a direction the 8-bit value does not predict.
    // These are the colours where SwiftUI is strictly the worst of the three.
    const worseInSwift: string[] = [];
    for (let h = 0; h < 360; h += 3) {
      for (const l of [0.45, 0.55, 0.65]) {
        const surface = oklchToHex({ l, c: 0.16, h });
        const fg = "#ffffff";
        const asSwift = contrastOfNormalized(swiftUiChannels(surface), swiftUiChannels(fg));
        if (asSwift < contrastRatio(surface, fg) - 1e-12) worseInSwift.push(surface);
      }
    }
    expect(worseInSwift.length).toBeGreaterThan(0);
  });

  it("never reports more than any single representation", () => {
    for (let h = 0; h < 360; h += 17) {
      const surface = oklchToHex({ l: 0.55, c: 0.18, h });
      const guaranteed = guaranteedContrast(surface, "#ffffff");
      expect(guaranteed).toBeLessThanOrEqual(contrastRatio(surface, "#ffffff") + 1e-9);
      expect(guaranteed).toBeLessThanOrEqual(
        contrastOfNormalized(swiftUiChannels(surface), swiftUiChannels("#ffffff")) + 1e-9,
      );
    }
  });
});

describe("swiftUiChannels", () => {
  it("is hex → /255 → three decimals, with no trip back through bytes", () => {
    expect(swiftUiChannels("#1d4ed8")).toEqual([0.114, 0.306, 0.847]);
    expect(swiftUiChannels("#ffffff")).toEqual([1, 1, 1]);
    expect(swiftUiChannels("#000000")).toEqual([0, 0, 0]);
    expect(swiftUiChannels("#050c11")).toEqual([0.02, 0.047, 0.067]);
  });

  it("stays in range for every byte", () => {
    for (let v = 0; v <= 255; v++) {
      const hex = `#${v.toString(16).padStart(2, "0").repeat(3)}`;
      for (const channel of swiftUiChannels(hex)) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
        // Three decimals exactly — an exporter writing 0.30600000000000005 would be a diff in every file.
        expect(Number(channel.toFixed(3))).toBe(channel);
      }
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
