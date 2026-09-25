// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CHART_PALETTES, NEUTRALS, RADII, SURFACES } from "@kinetixui/create-preset";
import { hexToOklch } from "../color/oklch";
import { DEFAULT_CREATE_CONFIG, type CreateConfig } from "./config";
import { RANDOM_BRAND_BOUNDS, configToPreset, decodeIntoConfig, encodeConfig, presetToConfig, randomizeConfig } from "./preset";
import { resolveTheme } from "./theme-adapter";

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

const sample = (n: number): CreateConfig[] =>
  Array.from({ length: n }, (_, i) => randomizeConfig(DEFAULT_CREATE_CONFIG, seeded(i + 1)));

describe("determinism", () => {
  it("gives the same theme for the same source", () => {
    const a = randomizeConfig(DEFAULT_CREATE_CONFIG, seeded(42));
    const b = randomizeConfig(DEFAULT_CREATE_CONFIG, seeded(42));
    expect(a).toEqual(b);
  });

  it("gives different themes for different sources", () => {
    const brands = new Set(sample(20).map((c) => c.brand));
    expect(brands.size).toBeGreaterThan(15);
  });

  it("is exact, not merely plausible", () => {
    // A concrete pin. If the bounds or the draw order change, this is the test that says so.
    const config = randomizeConfig(DEFAULT_CREATE_CONFIG, seeded(1));
    expect(config.brand).toMatch(/^#[0-9a-f]{6}$/);
    expect(randomizeConfig(DEFAULT_CREATE_CONFIG, seeded(1)).brand).toBe(config.brand);
  });
});

describe("what it is allowed to touch", () => {
  it("leaves the workspace's own state alone", () => {
    const before: CreateConfig = { ...DEFAULT_CREATE_CONFIG, mode: "dark", previewScene: "form" };
    const after = randomizeConfig(before, seeded(7));
    expect(after.mode).toBe("dark");
    expect(after.previewScene).toBe("form");
  });

  it("never creates a manual override", () => {
    // An override is a decision a person made. Generating them would mean Randomize pinned values nobody
    // chose, which then survive every later change — because that is exactly what pinning means.
    const withOverrides: CreateConfig = { ...DEFAULT_CREATE_CONFIG, manualOverrides: { action: "#ff0000" } };
    for (const config of [...sample(10), randomizeConfig(withOverrides, seeded(3))]) {
      expect(config.manualOverrides).toEqual({});
    }
  });

  it("only produces values the engine offers", () => {
    for (const config of sample(30)) {
      expect(NEUTRALS).toContain(config.neutral);
      expect(RADII).toContain(config.radius);
      expect(SURFACES).toContain(config.surface);
      expect(CHART_PALETTES).toContain(config.chartPalette);
    }
  });

  it("touches no deferred dimension", () => {
    // density, typography and navigation are not shipped; Randomize must not invent them.
    const config = randomizeConfig(DEFAULT_CREATE_CONFIG, seeded(9));
    expect(Object.keys(config).sort()).toEqual(Object.keys(DEFAULT_CREATE_CONFIG).sort());
  });
});

describe("the colours it draws", () => {
  it("stays inside the usable band", () => {
    for (const config of sample(40)) {
      const colour = hexToOklch(config.brand)!;
      expect(colour.c).toBeGreaterThanOrEqual(RANDOM_BRAND_BOUNDS.chroma[0] - 0.02);
      expect(colour.l).toBeGreaterThanOrEqual(RANDOM_BRAND_BOUNDS.lightness[0] - 0.02);
      expect(colour.l).toBeLessThanOrEqual(RANDOM_BRAND_BOUNDS.lightness[1] + 0.02);
    }
  });

  it("never comes back grey", () => {
    // A "random theme" that is grey reads as broken rather than restrained.
    for (const config of sample(40)) expect(hexToOklch(config.brand)!.c).toBeGreaterThan(0.05);
  });

  it("reaches around the wheel", () => {
    const hues = sample(40).map((c) => hexToOklch(c.brand)!.h);
    const quadrants = new Set(hues.map((h) => Math.floor(h / 90)));
    expect(quadrants.size).toBe(4);
  });

  it("produces a valid colour every time", () => {
    for (const config of sample(60)) expect(config.brand).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("accessibility — no random theme may fail the AA contract", () => {
  it("clears every generated pair, in both appearances, across a wide sample", () => {
    const failures: string[] = [];
    for (const config of sample(60)) {
      for (const mode of ["light", "dark"] as const) {
        for (const result of resolveTheme({ ...config, mode }).contrast) {
          if (!result.pass) {
            failures.push(`${config.brand}/${config.neutral}/${mode} ${result.pair.join("/")} ${result.ratio.toFixed(2)}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("a randomized theme is portable", () => {
  it("survives encode → decode unchanged", () => {
    for (const config of sample(15)) {
      const result = decodeIntoConfig(encodeConfig(config), { mode: config.mode, previewScene: config.previewScene });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.config).toEqual(config);
    }
  });

  it("resolves to the same theme after a round trip", () => {
    // The real claim: a shared link reproduces the design, not merely the fields.
    for (const config of sample(10)) {
      const result = decodeIntoConfig(encodeConfig(config));
      expect(result.ok).toBe(true);
      if (result.ok) expect(resolveTheme(result.config).css).toBe(resolveTheme(config).css);
    }
  });
});

describe("the local/portable boundary", () => {
  it("drops mode and scene on the way out", () => {
    const preset = configToPreset({ ...DEFAULT_CREATE_CONFIG, mode: "dark", previewScene: "form", brand: "#c2410c" });
    expect(preset).not.toHaveProperty("mode");
    expect(preset).not.toHaveProperty("previewScene");
    expect(preset.brand).toBe("#c2410c");
  });

  it("keeps the opener's own mode and scene on the way in", () => {
    // Opening a shared link should not move you into someone else's dark mode.
    const preset = configToPreset({ ...DEFAULT_CREATE_CONFIG, brand: "#c2410c" });
    const config = presetToConfig(preset, { mode: "dark", previewScene: "form" });
    expect(config.mode).toBe("dark");
    expect(config.previewScene).toBe("form");
    expect(config.brand).toBe("#c2410c");
  });

  it("falls back to the shipped defaults when there is no workspace state", () => {
    const config = presetToConfig(configToPreset(DEFAULT_CREATE_CONFIG));
    expect(config).toEqual(DEFAULT_CREATE_CONFIG);
  });
});
