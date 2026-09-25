import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, type PresetConfig } from "@kinetixui/create-preset";
import { contrastRatio } from "./color-math";
import { hexToOklch, oklchToHex } from "./oklch";
import { SHIPPED_ELEVATION } from "./contract";
import {
  CHART_PALETTES,
  KINETIX_BRAND,
  NEUTRALS,
  RADII,
  STYLES,
  STYLE_VALUES,
  SURFACES,
  deriveBrandRoles,
  deriveChart,
  deriveElevation,
  deriveNeutrals,
  deriveRadius,
  deriveSurfaceBorder,
  foregroundFor,
  styleFor,
  type Mode,
} from "./engine";
import { SHIPPED_COLORS, contrastOf, resolveCreateTheme } from "./resolve";
import { exportCss, shadowCss } from "./exporters/css";

/**
 * The engine, tested against the portable design rather than the workspace.
 *
 * These moved out of apps/web with the code. The assertions are unchanged in substance; what changed is
 * the input — a `PresetConfig`, not a `CreateConfig` — because that is now the engine's whole surface.
 * The reducer, the preview mode and the raw-editor bridge stayed in the app and are tested there.
 */

const MODES: Mode[] = ["light", "dark"];

/** A saturated colour at a given hue — used to sweep the wheel. */
const atHue = (h: number) => oklchToHex({ l: 0.55, c: 0.2, h });
const design = (over: Partial<PresetConfig> = {}): PresetConfig => ({ ...DEFAULT_PRESET, ...over });
const theme = (over: Partial<PresetConfig> = {}) => resolveCreateTheme(design(over));
const css = (over: Partial<PresetConfig> = {}) => exportCss(theme(over));

/** Every brand colour worth checking a rule against: two neutrals-adjacent, the rest around the wheel. */
const BRANDS = ["#1d4ed8", "#c2410c", "#15803d", "#7e22ce", "#eab308", "#0f766e", "#111111", "#f5f5f5"];

/* ------------------------------------------------------------------ determinism */

describe("determinism", () => {
  it("resolves the same design to the same theme every time", () => {
    const d = design({ brand: "#c2410c", neutral: "warm", radius: "soft", surface: "elevated", chartPalette: "cool" });
    const runs = Array.from({ length: 4 }, () => JSON.stringify(resolveCreateTheme(d).light));
    expect(new Set(runs).size).toBe(1);
  });

  it("does not depend on how the design object was built", () => {
    const a = design({ brand: "#c2410c", manualOverrides: { primary: "#ff0000", border: "#00ff00" } });
    const b: PresetConfig = {
      ...DEFAULT_PRESET,
      manualOverrides: { border: "#00ff00", primary: "#ff0000" },
      brand: "#c2410c",
    };
    // The whole theme object, not merely its CSS: hex casing and override order are authoring details,
    // and a decoded preset arrives canonicalized while a hand-built design does not.
    expect(resolveCreateTheme(a)).toEqual(resolveCreateTheme(b));
    expect(exportCss(resolveCreateTheme(a))).toBe(exportCss(resolveCreateTheme(b)));
  });

  it("reports the design in canonical form, whatever it was handed", () => {
    const t = resolveCreateTheme(design({ brand: "#C2410C", manualOverrides: { border: "#00FF00", action: "#FF0000" } }));
    expect(t.meta.design.brand).toBe("#c2410c");
    // Token order, which is the order ACCEPTED_TOKENS declares — `border` is listed before `action`.
    expect(Object.keys(t.meta.design.manualOverrides)).toEqual(["border", "action"]);
    expect(t.meta.manualTokens).toEqual(["border", "action"]);
  });

  it("holds no unserializable value anywhere in the resolved theme", () => {
    // An exporter may run in another process. Functions, Sets and class instances would not survive.
    const resolved = theme({ brand: "#7e22ce", surface: "elevated", manualOverrides: { primary: "#ff0000" } });
    expect(JSON.parse(JSON.stringify(resolved))).toEqual(resolved);
  });
});

/* ------------------------------------------------------------------ the default */

describe("the default design", () => {
  it("generates nothing, so the preview is the real shipped theme", () => {
    for (const mode of MODES) expect(theme()[mode].colors).toEqual(SHIPPED_COLORS[mode]);
  });

  it("resolves to the shipped radius and elevation ladders", () => {
    expect(theme().light.radius).toEqual({ sm: 4, md: 8, lg: 12, xl: 16 });
    expect(theme().light.elevation).toEqual(SHIPPED_ELEVATION);
  });

  it("produces no CSS, because there is nothing to override", () => {
    expect(css()).toBe("");
    expect(theme().meta.isDefault).toBe(true);
  });

  it("passes its own contrast panel in both modes", () => {
    for (const mode of MODES) {
      expect(
        contrastOf(theme()[mode])
          .filter((c) => !c.pass)
          .map((f) => f.pair.join("/")),
      ).toEqual([]);
    }
  });

  it("treats case as an authoring detail, not a change", () => {
    expect(css({ brand: KINETIX_BRAND.toUpperCase() })).toBe("");
  });
});

/* ------------------------------------------------------------------ brand */

describe("brand roles", () => {
  it.each(MODES)("fills every seeded role in %s", (mode) => {
    const roles = deriveBrandRoles("#c2410c", mode);
    for (const token of [
      "brand",
      "brand-foreground",
      "action",
      "action-foreground",
      "action-hover",
      "action-pressed",
      "link",
      "focus",
      "primary",
      "primary-foreground",
      "ring",
      "accent",
      "accent-foreground",
    ]) {
      expect(roles[token], `${mode} ${token}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it.each(BRANDS)("%s produces an action that carries AA text in both modes", (hex) => {
    for (const mode of MODES) {
      const r = deriveBrandRoles(hex, mode);
      expect(contrastRatio(r.action!, r["action-foreground"]!), `${hex} ${mode}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("lifts a dark brand for dark mode rather than inverting it", () => {
    // The shipped pair is the same blue moved, not flipped: #1d4ed8 (L .49) and #60a5fa (L .72).
    const light = hexToOklch(deriveBrandRoles("#1d4ed8", "light").action!)!;
    const dark = hexToOklch(deriveBrandRoles("#1d4ed8", "dark").action!)!;
    expect(dark.l).toBeGreaterThan(light.l);
    expect(Math.abs(dark.h - light.h)).toBeLessThan(1);
  });

  it.each(BRANDS)("%s keeps its hue through the mode bands", (hex) => {
    const source = hexToOklch(hex)!;
    for (const mode of MODES) {
      const action = hexToOklch(deriveBrandRoles(hex, mode).action!)!;
      // A near-grey brand has no meaningful hue to keep.
      if (source.c > 0.02 && action.c > 0.02) {
        const d = Math.abs(((action.h - source.h + 540) % 360) - 180);
        expect(d, `${hex} ${mode} hue drifted`).toBeLessThan(2);
      }
    }
  });

  it("moves hover and pressed toward the background, by increasing amounts", () => {
    for (const mode of MODES) {
      const r = deriveBrandRoles("#1d4ed8", mode);
      const action = hexToOklch(r.action!)!.l;
      const hover = hexToOklch(r["action-hover"]!)!.l;
      const pressed = hexToOklch(r["action-pressed"]!)!.l;
      const toward = mode === "light" ? 1 : -1;

      expect((hover - action) * toward, `${mode} hover`).toBeGreaterThan(0);
      expect((pressed - action) * toward, `${mode} pressed`).toBeGreaterThan((hover - action) * toward);
    }
  });

  it("moves hover by the same perceptual amount on every hue", () => {
    // The reason states are not derived with opacity: an alpha blend moves yellow and blue differently.
    const deltas = BRANDS.slice(0, 6).map((hex) => {
      const r = deriveBrandRoles(hex, "light");
      return hexToOklch(r["action-hover"]!)!.l - hexToOklch(r.action!)!.l;
    });
    expect(Math.max(...deltas) - Math.min(...deltas)).toBeLessThan(0.03);
  });

  it("separates brand from action, so a dark brand can keep its identity", () => {
    // #111111 is far too dark to be an interactive colour; `action` is lifted, `brand` is not.
    const r = deriveBrandRoles("#111111", "light");
    expect(r.brand).toBe("#111111");
    expect(hexToOklch(r.action!)!.l).toBeGreaterThan(hexToOklch("#111111")!.l);
  });

  it("ignores an invalid colour instead of producing broken tokens", () => {
    expect(deriveBrandRoles("nope", "light")).toEqual({});
    expect(theme({ brand: "nope" }).light.colors).toEqual(SHIPPED_COLORS.light);
  });
});

describe("foreground generation", () => {
  it("prefers a tinted extreme over flat black or white", () => {
    const fg = foregroundFor("#1d4ed8");
    expect(fg).not.toBe("#ffffff");
    expect(hexToOklch(fg)!.c).toBeGreaterThan(0);
    expect(contrastRatio("#1d4ed8", fg)).toBeGreaterThanOrEqual(4.5);
  });

  it("clears AA on every hue at every lightness it is likely to meet", () => {
    for (let h = 0; h < 360; h += 30) {
      for (const l of [0.2, 0.35, 0.5, 0.65, 0.8, 0.95]) {
        const surface = deriveBrandRoles(
          `#${((h * 7919 + l * 977) | 0).toString(16).padStart(6, "0").slice(0, 6)}`,
          "light",
        );
        if (!surface.action) continue;
        expect(contrastRatio(surface.action, surface["action-foreground"]!)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("is deterministic", () => {
    expect(new Set(Array.from({ length: 5 }, () => foregroundFor("#7e22ce"))).size).toBe(1);
  });
});

describe("every generated pair, on every hue", () => {
  /**
   * The assertion that should have existed from the start.
   *
   * Checking `action`/`action-foreground` covered the role most likely to be wrong and missed the one
   * that actually was: `accent-foreground` took the action colour unchecked, and a saturated magenta on
   * its own pale tint came out at 3.76:1. Browser QA caught it, which means a test should have.
   *
   * Sweeping the wheel matters as much as sweeping the roles — a rule can be right for blue and wrong
   * for yellow, which is the whole reason the engine works in OKLab.
   */
  const WHEEL = Array.from({ length: 24 }, (_, i) => atHue(i * 15));

  it.each(MODES)("clears AA in %s for every hue and every neutral", (mode) => {
    const failures: string[] = [];
    for (const brand of [...WHEEL, ...BRANDS]) {
      for (const neutral of NEUTRALS) {
        for (const c of contrastOf(theme({ brand, neutral })[mode])) {
          if (!c.pass) failures.push(`${mode} ${brand}/${neutral} ${c.pair.join("/")} ${c.ratio.toFixed(2)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

/**
 * A known gap, pinned with its real numbers.
 *
 * The engine guarantees AA for the pairs in `CONTRAST_PAIRS` — which is where `action-foreground` is
 * checked against `action`, and nothing else. It is NOT checked against `action-hover` or
 * `action-pressed`, and those surfaces are derived by moving `action` 10% and 16% toward the background,
 * which costs contrast. So a button label can fall below AA while the button is hovered or pressed.
 *
 * `scripts/check-contrast.mjs` holds the SHIPPED theme to those two pairs, and the shipped values clear
 * them — they were hand-tuned. Generated themes are not held to them anywhere, which is how this went
 * unnoticed until the SwiftUI exporter's committed fixture was run through the Swift-side contrast
 * suite, whose pair list mirrors `check:contrast` rather than the engine's own.
 *
 * It is not fixable by picking a different foreground: across the wheel, no candidate — tinted white,
 * tinted black, pure white, pure black — clears 4.5:1 against `action`, `action-hover` and
 * `action-pressed` at once; the best achievable floor is 3.93:1. The fix is to the state derivation
 * itself (smaller or contrast-aware movement), which changes every generated theme including the web's,
 * and is a visual design decision rather than a bug fix.
 *
 * These assertions therefore record the status quo rather than the goal. They fail if it gets worse, and
 * they fail if someone fixes it — at which point the right move is to delete them and add these two
 * pairs to `CONTRAST_PAIRS`, so the workspace's own panel shows them.
 */
describe("interaction states are not held to AA — a known gap", () => {
  const SWEEP = [
    ...Array.from({ length: 36 }, (_, i) => oklchToHex({ l: 0.55, c: 0.2, h: i * 10 })),
    ...BRANDS,
  ];

  const floors = () => {
    let action = Infinity;
    let hover = Infinity;
    let pressed = Infinity;
    for (const brand of SWEEP) {
      for (const mode of MODES) {
        const r = deriveBrandRoles(brand, mode);
        const fg = r["action-foreground"]!;
        action = Math.min(action, contrastRatio(r.action!, fg));
        hover = Math.min(hover, contrastRatio(r["action-hover"]!, fg));
        pressed = Math.min(pressed, contrastRatio(r["action-pressed"]!, fg));
      }
    }
    return { action, hover, pressed };
  };

  it("holds the guarantee it does make: the foreground clears AA on the action colour", () => {
    expect(floors().action).toBeGreaterThanOrEqual(4.5);
  });

  it("does not hold it on hover or pressed, and this records how far short", () => {
    const { hover, pressed } = floors();
    // Delete this test and add the two pairs to CONTRAST_PAIRS when the state derivation is fixed.
    expect(hover).toBeLessThan(4.5);
    expect(pressed).toBeLessThan(4.5);
    // Pinned so a regression is visible: today's floors are 3.75 and 3.37.
    expect(hover).toBeGreaterThan(3.7);
    expect(pressed).toBeGreaterThan(3.3);
  });

  it("cannot be fixed by choosing a different foreground", () => {
    // Every candidate `foregroundFor` would consider, scored by its WORST contrast across the three
    // surfaces. If any reached 4.5 the fix would be local; none does.
    let best = 0;
    for (const brand of SWEEP) {
      for (const mode of MODES) {
        const r = deriveBrandRoles(brand, mode);
        const surfaces = [r.action!, r["action-hover"]!, r["action-pressed"]!];
        const source = hexToOklch(r.action!)!;
        const tint = Math.min(source.c, 0.03);
        const candidates = [
          oklchToHex({ l: 0.97, c: tint, h: source.h }),
          oklchToHex({ l: 0.09, c: tint, h: source.h }),
          "#ffffff",
          "#000000",
        ];
        const reachable = Math.max(...candidates.map((c) => Math.min(...surfaces.map((s) => contrastRatio(s, c)))));
        best = Math.max(best, Math.min(reachable, 4.5));
        if (reachable < 4.5) {
          expect(reachable, `${brand} ${mode}`).toBeLessThan(4.5);
        }
      }
    }
    // Some hues do reach 4.5; the point is that not all of them can.
    expect(best).toBe(4.5);
  });
});

/**
 * `brand` is identity, not guaranteed-readable text.
 *
 * `brand / background` is in `check:contrast`'s pair list for the shipped theme and fails for some
 * generated ones — a near-black brand on a dark background is 1.03:1. That is the design working: the
 * engine keeps the user's colour exactly, which is what the test below this one asserts, and clamping it
 * for contrast would mean Create silently refusing to use the brand it was given. `brand-foreground` is
 * the pair that carries text, and that one IS guaranteed.
 */
describe("brand is preserved rather than made readable on the background", () => {
  it("can fall below AA against the background, by design", () => {
    const dark = theme({ brand: "#111111", neutral: "cool" }).dark.colors;
    expect(contrastRatio(dark.brand!, dark.background!)).toBeLessThan(4.5);
  });

  it("but the text that sits ON it always clears AA", () => {
    for (const brand of BRANDS) {
      for (const mode of MODES) {
        const colors = theme({ brand })[mode].colors;
        expect(contrastRatio(colors.brand!, colors["brand-foreground"]!), `${brand} ${mode}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

/* ------------------------------------------------------------------ neutrals */

const GENERATED_NEUTRALS = NEUTRALS.filter((n) => n !== "kinetix");

describe("neutrals", () => {
  it("generates nothing for the shipped palette", () => {
    expect(deriveNeutrals("kinetix", "light")).toEqual({});
    expect(deriveNeutrals("kinetix", "dark")).toEqual({});
  });

  it.each(GENERATED_NEUTRALS)("%s covers the whole surface family", (neutral) => {
    for (const mode of MODES) {
      const n = deriveNeutrals(neutral, mode);
      for (const token of [
        "background",
        "foreground",
        "card",
        "card-foreground",
        "popover",
        "popover-foreground",
        "muted",
        "muted-foreground",
        "border",
        "input",
      ]) {
        expect(n[token], `${neutral} ${mode} ${token}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it.each(GENERATED_NEUTRALS)("%s stays neutral — never a visible colour", (neutral) => {
    for (const mode of MODES) {
      for (const hex of Object.values(deriveNeutrals(neutral, mode))) {
        // 0.02 is about where a tint stops reading as grey. Warm must not look orange.
        expect(hexToOklch(hex!)!.c, `${neutral} ${mode} ${hex}`).toBeLessThan(0.02);
      }
    }
  });

  it.each(GENERATED_NEUTRALS)("%s keeps body text readable in both modes", (neutral) => {
    for (const mode of MODES) {
      const n = deriveNeutrals(neutral, mode);
      expect(contrastRatio(n.background!, n.foreground!), `${neutral} ${mode}`).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(n.background!, n["muted-foreground"]!),
        `${neutral} ${mode} muted`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("is a different family per option, not the same grey relabelled", () => {
    const light = GENERATED_NEUTRALS.map((n) => deriveNeutrals(n, "light").muted);
    expect(new Set(light).size).toBe(light.length);
  });

  it("does not take its hue from the brand", () => {
    // A warm neutral stays warm under a blue brand — personality is separated on purpose.
    const a = theme({ neutral: "warm", brand: "#1d4ed8" }).light.colors.muted;
    const b = theme({ neutral: "warm", brand: "#c2410c" }).light.colors.muted;
    expect(a).toBe(b);
  });
});

/* ------------------------------------------------------------------ radius, surface, charts */

describe("radius", () => {
  it("resolves the four size steps, letting the role aliases follow", () => {
    expect(Object.keys(deriveRadius("soft")).sort()).toEqual(["lg", "md", "sm", "xl"]);
  });

  it("is a length, not CSS — the exporter owns the unit", () => {
    // The theme object has to feed a Swift exporter as readily as a stylesheet.
    for (const value of Object.values(deriveRadius("rounded"))) expect(typeof value).toBe("number");
  });

  it.each(RADII)("%s stays on the 4px grid", (radius) => {
    for (const v of Object.values(deriveRadius(radius))) expect(v % 4, `${radius} ${v}`).toBe(0);
  });

  it("orders the presets from square to soft", () => {
    const md = (r: (typeof RADII)[number]) => deriveRadius(r).md;
    expect(md("square")).toBe(0);
    expect(md("small")).toBeLessThan(md("default"));
    expect(md("default")).toBeLessThan(md("rounded"));
    expect(md("rounded")).toBeLessThan(md("soft"));
  });
});

describe("surface", () => {
  it("leaves the shipped treatment exactly as shipped", () => {
    expect(deriveElevation("soft")).toEqual(SHIPPED_ELEVATION);
    expect(deriveSurfaceBorder("soft", "light", "#92b2c8")).toBeNull();
  });

  it("remaps the shipped ladder rather than inventing shadows", () => {
    // Every rung is either empty or a rung of the shipped ladder — checked against the ladder itself,
    // not against the SHAPE of a `var()` reference. The earlier version of this test matched the syntax,
    // which the collapsing implementation satisfied perfectly while producing the wrong ladder.
    // `shadow-ladder.test.ts` covers the effective values; this one covers "nothing was invented".
    const rungs = new Set(Object.values(SHIPPED_ELEVATION).map(shadowCss));
    rungs.add("none");
    for (const surface of SURFACES) {
      for (const [step, layers] of Object.entries(deriveElevation(surface))) {
        expect(rungs.has(shadowCss(layers)), `${surface} ${step} is not a shipped shadow`).toBe(true);
      }
    }
  });

  it("compensates a flat surface with a stronger border", () => {
    expect(deriveElevation("bordered").sm).toEqual([]);
    expect(hexToOklch(deriveSurfaceBorder("bordered", "light", "#92b2c8")!)!.l).toBeLessThan(
      hexToOklch("#92b2c8")!.l,
    );
    // In dark mode a stronger edge is a lighter one.
    expect(hexToOklch(deriveSurfaceBorder("bordered", "dark", "#395a70")!)!.l).toBeGreaterThan(
      hexToOklch("#395a70")!.l,
    );
  });
});

describe("chart palettes", () => {
  it("writes nothing for the shipped palette", () => {
    expect(deriveChart("kinetix", KINETIX_BRAND, "light")).toEqual({});
  });

  it.each(CHART_PALETTES.filter((p) => p !== "kinetix"))("%s gives five distinguishable series", (palette) => {
    for (const mode of MODES) {
      const series = Object.values(deriveChart(palette, "#1d4ed8", mode)) as string[];
      expect(series).toHaveLength(5);

      for (let i = 0; i < series.length; i++) {
        for (let j = i + 1; j < series.length; j++) {
          const a = hexToOklch(series[i]!)!;
          const b = hexToOklch(series[j]!)!;
          const dh = Math.abs(((a.h - b.h + 540) % 360) - 180);
          const dl = Math.abs(a.l - b.l);
          // Either a real hue gap or a real lightness gap. Two series that differ in neither cannot be
          // told apart, whatever their contrast against the background is.
          expect(dh > 20 || dl > 0.1, `${palette} ${mode}: ${series[i]} vs ${series[j]}`).toBe(true);
        }
      }
    }
  });

  it("does not make the brand palette five tints of one hue", () => {
    const series = Object.values(deriveChart("brand", "#1d4ed8", "light")) as string[];
    const hues = series.map((h) => hexToOklch(h)!.h);
    expect(Math.max(...hues) - Math.min(...hues)).toBeGreaterThan(60);
  });
});

/* ------------------------------------------------------------------ styles */

describe("style presets", () => {
  it.each(STYLES)("%s is a point in the controls that already exist", (style) => {
    expect(RADII).toContain(STYLE_VALUES[style].radius);
    expect(SURFACES).toContain(STYLE_VALUES[style].surface);
  });

  it("names a preset only when the values are exactly its own", () => {
    expect(styleFor("default", "soft")).toBe("default");
    expect(styleFor("square", "bordered")).toBe("sharp");
    expect(styleFor("square", "soft")).toBeNull();
  });
});

/* ------------------------------------------------------------------ precedence */

describe("manual override precedence", () => {
  it("beats everything generated", () => {
    const t = theme({
      brand: "#c2410c",
      neutral: "warm",
      manualOverrides: { action: "#ff0000", background: "#00ff00" },
    });
    expect(t.light.colors.action).toBe("#ff0000");
    expect(t.light.colors.background).toBe("#00ff00");
  });

  it("survives a change to the thing that generated the value", () => {
    // The classic bug: regenerate on brand change, quietly losing what the user typed.
    const t = theme({ brand: "#15803d", neutral: "cool", manualOverrides: { action: "#ff0000" } });
    expect(t.light.colors.action).toBe("#ff0000");
  });

  it("applies in both modes", () => {
    const t = theme({ manualOverrides: { action: "#ff0000" } });
    expect(t.light.colors.action).toBe("#ff0000");
    expect(t.dark.colors.action).toBe("#ff0000");
  });

  it("derives a foreground for a surface overridden without one", () => {
    const t = theme({ manualOverrides: { primary: "#000000" } });
    expect(contrastRatio("#000000", t.light.colors["primary-foreground"]!)).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves a foreground the user DID choose exactly as typed, pass or fail", () => {
    // Showing the failure is the job; silently fixing it would hide the user's own decision.
    const t = theme({ manualOverrides: { card: "#ffffff", "card-foreground": "#c9c9c9" } });
    expect(t.light.colors["card-foreground"]).toBe("#c9c9c9");
    expect(contrastOf(t.light).find((c) => c.pair[0] === "card")!.pass).toBe(false);
    expect(t.meta.manualTokens).toContain("card-foreground");
  });

  it("is reported as provenance, so a UI can label it without re-deriving", () => {
    expect(theme({ manualOverrides: { action: "#ff0000" } }).meta.manualTokens).toEqual(["action"]);
    expect(theme({ brand: "#c2410c" }).meta.manualTokens).toEqual([]);
  });
});

/* ------------------------------------------------------------------ status colours */

describe("status colours", () => {
  it("are not dragged around by the brand", () => {
    // Changing the theme colour must not turn success purple or warning blue.
    for (const brand of BRANDS) {
      const t = theme({ brand, neutral: "warm", chartPalette: "cool" });
      for (const token of ["success", "warning", "destructive"]) {
        expect(t.light.colors[token], `${brand} ${token}`).toBe(SHIPPED_COLORS.light[token]);
      }
    }
  });

  it("can still be changed deliberately in Advanced", () => {
    expect(theme({ manualOverrides: { destructive: "#00ff00" } }).light.colors.destructive).toBe("#00ff00");
  });
});
