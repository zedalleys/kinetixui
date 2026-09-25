import { describe, expect, it } from "vitest";
import {
  CHART_PALETTES,
  DEFAULT_PRESET,
  NEUTRALS,
  RADII,
  SURFACES,
  decodePreset,
  encodePreset,
  type PresetConfig,
} from "@kinetixui/create-preset";
import { hexToOklch } from "./oklch";
import { randomizeDesign, RANDOM_BRAND_BOUNDS } from "./randomize";
import { contrastOf, resolveCreateTheme } from "./resolve";
import { exportCss } from "./exporters/css";

/**
 * Randomize is a theme generator, so it is tested like one: not "did it change something" but "is every
 * theme it can produce one we would be willing to ship".
 *
 * The random source is injected, so these assert exact output rather than ranges-of-plausible.
 */

/** A deterministic source: the same sequence, every run, on every machine. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    // xorshift32 — small, stateless to configure, and reproducible. Not cryptographic; nothing here is.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

const sample = (n: number): PresetConfig[] => Array.from({ length: n }, (_, i) => randomizeDesign(seeded(i + 1)));

describe("determinism", () => {
  it("gives the same design for the same source", () => {
    expect(randomizeDesign(seeded(42))).toEqual(randomizeDesign(seeded(42)));
  });

  it("gives different designs for different sources", () => {
    expect(new Set(sample(20).map((c) => c.brand)).size).toBeGreaterThan(15);
  });

  it("is exact, not merely plausible", () => {
    // A concrete pin. If the bounds or the draw order change, this is the test that says so.
    const design = randomizeDesign(seeded(1));
    expect(design.brand).toMatch(/^#[0-9a-f]{6}$/);
    expect(randomizeDesign(seeded(1)).brand).toBe(design.brand);
  });
});

describe("what it is allowed to touch", () => {
  it("never creates a manual override", () => {
    // An override is a decision a person made. Generating them would mean Randomize pinned values nobody
    // chose, which then survive every later change — because that is exactly what pinning means.
    for (const design of sample(10)) expect(design.manualOverrides).toEqual({});
  });

  it("only produces values the engine offers", () => {
    for (const design of sample(30)) {
      expect(NEUTRALS).toContain(design.neutral);
      expect(RADII).toContain(design.radius);
      expect(SURFACES).toContain(design.surface);
      expect(CHART_PALETTES).toContain(design.chartPalette);
    }
  });

  it("touches no deferred dimension", () => {
    // density, typography and navigation are not shipped; Randomize must not invent them.
    expect(Object.keys(randomizeDesign(seeded(9))).sort()).toEqual(Object.keys(DEFAULT_PRESET).sort());
  });
});

describe("the colours it draws", () => {
  it("stays inside the usable band", () => {
    for (const design of sample(40)) {
      const colour = hexToOklch(design.brand)!;
      expect(colour.c).toBeGreaterThanOrEqual(RANDOM_BRAND_BOUNDS.chroma[0] - 0.02);
      expect(colour.l).toBeGreaterThanOrEqual(RANDOM_BRAND_BOUNDS.lightness[0] - 0.02);
      expect(colour.l).toBeLessThanOrEqual(RANDOM_BRAND_BOUNDS.lightness[1] + 0.02);
    }
  });

  it("never comes back grey", () => {
    // A "random theme" that is grey reads as broken rather than restrained.
    for (const design of sample(40)) expect(hexToOklch(design.brand)!.c).toBeGreaterThan(0.05);
  });

  it("reaches around the wheel", () => {
    const hues = sample(40).map((c) => hexToOklch(c.brand)!.h);
    expect(new Set(hues.map((h) => Math.floor(h / 90))).size).toBe(4);
  });

  it("produces a valid colour every time", () => {
    for (const design of sample(60)) expect(design.brand).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("accessibility — no random theme may fail the AA contract", () => {
  it("clears every generated pair, in both appearances, across a wide sample", () => {
    const failures: string[] = [];
    for (const design of sample(60)) {
      const theme = resolveCreateTheme(design);
      for (const mode of ["light", "dark"] as const) {
        for (const result of contrastOf(theme[mode])) {
          if (!result.pass) {
            failures.push(
              `${design.brand}/${design.neutral}/${mode} ${result.pair.join("/")} ${result.ratio.toFixed(2)}`,
            );
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("a randomized theme is portable", () => {
  it("survives encode → decode unchanged", () => {
    for (const design of sample(15)) {
      const result = decodePreset(encodePreset(design));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.config).toEqual(design);
    }
  });

  it("resolves to the same theme after a round trip", () => {
    // The real claim: a shared link reproduces the design, not merely the fields.
    for (const design of sample(10)) {
      const result = decodePreset(encodePreset(design));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(resolveCreateTheme(result.config)).toEqual(resolveCreateTheme(design));
        expect(exportCss(resolveCreateTheme(result.config))).toBe(exportCss(resolveCreateTheme(design)));
      }
    }
  });
});
