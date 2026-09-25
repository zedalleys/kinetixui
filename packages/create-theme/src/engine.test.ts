import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, type PresetConfig } from "@kinetixui/create-preset";
import { contrastRatio, guaranteedContrast } from "./color-math";
import { adjust, hexToOklch, oklchToHex } from "./oklch";
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
  interactionStates,
  styleFor,
  HOVER_FRACTION,
  PRESSED_FRACTION,
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
      expect(guaranteedContrast(r.action!, r["action-foreground"]!), `${hex} ${mode}`).toBeGreaterThanOrEqual(4.5);
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

  it("moves hover the same FRACTION of the way to the backdrop on every hue", () => {
    // The reason states are not derived with opacity: an alpha blend moves yellow and blue differently.
    // The invariant is the fraction travelled, not the absolute lightness delta — those differ because a
    // darker action colour has further to go.
    //
    // It holds for every hue that keeps full amplitude. A hue whose label cannot follow the full move
    // travels less, on purpose (see `interactionStates`), so those are measured separately below rather
    // than folded into a spread that would hide both facts.
    const travelled = BRANDS.map((hex) => {
      const action = hexToOklch(deriveBrandRoles(hex, "light").action!)!;
      const { hover, scale } = interactionStates(action, "light");
      return { scale, fraction: (hexToOklch(hover)!.l - action.l) / (1 - action.l) };
    });

    const full = travelled.filter((t) => t.scale === 1).map((t) => t.fraction);
    expect(full.length).toBeGreaterThan(3);
    expect(Math.max(...full) - Math.min(...full)).toBeLessThan(0.01);
    for (const fraction of full) expect(fraction).toBeCloseTo(HOVER_FRACTION, 2);
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
        expect(guaranteedContrast(surface.action, surface["action-foreground"]!)).toBeGreaterThanOrEqual(4.5);
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
 * The label stays readable in every interaction state.
 *
 * A button's text sits on `action` at rest, on `action-hover` under the pointer and on `action-pressed`
 * while held. The foreground used to be chosen against the resting fill alone, and the states are derived
 * by moving that fill 10% and 16% toward the background — which, in light mode, moves it toward the same
 * near-white the label is. 96 of 256 sampled themes fell below AA somewhere in that sequence, the worst
 * at 3.37:1, including the shipped blue passed through the generator.
 *
 * It surfaced from the SwiftUI exporter: its committed fixture is run through the Swift-side contrast
 * suite, whose pair list mirrors `check:contrast` — which holds the hand-tuned SHIPPED theme to these
 * pairs, and which generated themes had never been held to anywhere.
 *
 * Two changes fixed it, both in `engine.ts`: the foreground is scored by its worst contrast across all
 * three surfaces rather than the resting one, and the state movement scales back in fixed steps when
 * even the best foreground cannot follow it. See `interactionStates`.
 */
const STATE_SWEEP = [
  ...Array.from({ length: 72 }, (_, i) => oklchToHex({ l: 0.55, c: 0.2, h: i * 5 })),
  ...Array.from({ length: 24 }, (_, i) => oklchToHex({ l: 0.8, c: 0.12, h: i * 15 })),
  ...Array.from({ length: 24 }, (_, i) => oklchToHex({ l: 0.3, c: 0.12, h: i * 15 })),
  ...BRANDS,
];

describe("the action label is readable in every state", () => {
  it.each(MODES)("clears AA on action, hover and pressed for every hue in %s", (mode) => {
    const failures: string[] = [];
    for (const brand of STATE_SWEEP) {
      const r = deriveBrandRoles(brand, mode);
      const fg = r["action-foreground"]!;
      for (const [state, surface] of [
        ["action", r.action!],
        ["hover", r["action-hover"]!],
        ["pressed", r["action-pressed"]!],
      ] as const) {
        const ratio = guaranteedContrast(surface, fg);
        if (ratio < 4.5) failures.push(`${brand} ${state} ${ratio.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("holds across every neutral too, since a neutral does not touch these roles", () => {
    const failures: string[] = [];
    // The default brand is excluded because at the default brand nothing is generated — the resolve uses
    // the shipped contract verbatim, so this would be asserting the hand-tuned tokens rather than the
    // engine. Those have their own gate in `pnpm check:contrast`, which measures the HSL channels the
    // pipeline actually stores instead of a hex the contract table rounds them to.
    for (const brand of BRANDS.filter((b) => b !== KINETIX_BRAND)) {
      for (const neutral of NEUTRALS) {
        for (const mode of MODES) {
          const c = theme({ brand, neutral })[mode].colors;
          for (const state of ["action", "action-hover", "action-pressed"] as const) {
            const ratio = guaranteedContrast(c[state]!, c["action-foreground"]!);
            if (ratio < 4.5) failures.push(`${brand}/${neutral}/${mode} ${state} ${ratio.toFixed(2)}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  /**
   * The exact colours that used to fail, kept as named cases.
   *
   * A sweep proves the rule holds; these prove the specific defect is gone, and name it in the output if
   * it ever comes back. Ratios are the pre-fix worst-pair values.
   */
  it.each<[brand: string, mode: Mode, before: number]>([
    ["#946900", "light", 3.37],
    ["#c2410c", "light", 3.52],
    ["#15803d", "light", 3.41],
    ["#0f766e", "light", 3.64],
    ["#c5256d", "light", 3.67],
    ["#7e22ce", "dark", 4.32],
    ["#c2410c", "dark", 4.44],
    ["#1d4ed8", "light", 4.29],
  ])("%s in %s was %s:1 at its worst and now clears AA", (brand, mode, before) => {
    const r = deriveBrandRoles(brand, mode);
    const fg = r["action-foreground"]!;
    const worst = Math.min(
      ...[r.action!, r["action-hover"]!, r["action-pressed"]!].map((s) => guaranteedContrast(s, fg)),
    );
    expect(before).toBeLessThan(4.5);
    expect(worst).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the state model survives the fix", () => {
  it("still moves toward the backdrop, and pressed still moves further than hover", () => {
    for (const brand of STATE_SWEEP) {
      for (const mode of MODES) {
        const r = deriveBrandRoles(brand, mode);
        const action = hexToOklch(r.action!)!.l;
        const hover = hexToOklch(r["action-hover"]!)!.l;
        const pressed = hexToOklch(r["action-pressed"]!)!.l;
        const toward = mode === "light" ? 1 : -1;

        // Direction is never inverted to buy contrast — a light-mode hover always lightens.
        expect((hover - action) * toward, `${brand} ${mode} hover direction`).toBeGreaterThanOrEqual(0);
        expect((pressed - action) * toward, `${brand} ${mode} pressed direction`).toBeGreaterThanOrEqual(
          (hover - action) * toward,
        );
      }
    }
  });

  it("keeps full movement wherever the label can follow it", () => {
    // Scaling back is the last resort, not the normal case: most hues are untouched.
    const scales = STATE_SWEEP.flatMap((brand) =>
      MODES.map((mode) => interactionStates(hexToOklch(deriveBrandRoles(brand, mode).action!)!, mode).scale),
    );
    const full = scales.filter((s) => s === 1).length;
    expect(full / scales.length).toBeGreaterThan(0.6);
  });

  it("almost never gives up the hover entirely", () => {
    // Scale 0 means a button with no hover feedback — AA-correct and a real loss. It is reachable, for a
    // mid-lightness teal whose label already sits within 0.2 of the bar at rest, and it must stay rare.
    // If a change makes it common, the fix is the action band or the candidate set, not this threshold.
    const scales = STATE_SWEEP.flatMap((brand) =>
      MODES.map((mode) => interactionStates(hexToOklch(deriveBrandRoles(brand, mode).action!)!, mode).scale),
    );
    expect(scales.filter((s) => s === 0).length / scales.length).toBeLessThan(0.01);
  });

  it("scales hover and pressed by the same factor, never independently", () => {
    // The 10:16 ratio is the model. A tight hue loses amplitude, not the shape of the behaviour.
    //
    // Asserted by recomputing both states from the scale the engine reports, and comparing exactly.
    // Measuring the ratio back out of the two hex values instead would be fighting 8-bit output: at a
    // small scale the whole hover step is a couple of channel steps, and quantisation dominates.
    const BACKDROP = { light: 1, dark: 0.15 } as const;
    for (const brand of STATE_SWEEP) {
      for (const mode of MODES) {
        const action = hexToOklch(deriveBrandRoles(brand, mode).action!)!;
        const { hover, pressed, scale } = interactionStates(action, mode);
        const at = (fraction: number) =>
          oklchToHex(adjust(action, { dl: (BACKDROP[mode] - action.l) * fraction }));

        expect(hover, `${brand} ${mode} hover`).toBe(at(HOVER_FRACTION * scale));
        expect(pressed, `${brand} ${mode} pressed`).toBe(at(PRESSED_FRACTION * scale));
      }
    }
  });
});

describe("the fix changed only what was broken", () => {
  it("leaves the action colour itself untouched", () => {
    // `action` is what the design picked, band-clamped. Readability is bought from the foreground and
    // the state amplitude, never by moving the colour the user chose.
    for (const brand of STATE_SWEEP) {
      for (const mode of MODES) {
        const source = hexToOklch(brand)!;
        const [lo, hi] = mode === "light" ? [0.42, 0.62] : [0.66, 0.84];
        const expected = oklchToHex(adjust(source, { dl: Math.min(Math.max(source.l, lo!), hi!) - source.l }));
        expect(deriveBrandRoles(brand, mode).action, `${brand} ${mode}`).toBe(expected);
      }
    }
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
      expect(guaranteedContrast(n.background!, n.foreground!), `${neutral} ${mode}`).toBeGreaterThanOrEqual(4.5);
      expect(
        guaranteedContrast(n.background!, n["muted-foreground"]!),
        `${neutral} ${mode} muted`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(GENERATED_NEUTRALS)("%s keeps muted text readable ON the muted surface, with margin", (neutral) => {
    // The pair the ladder used to sit exactly on. At `muted-foreground` L 0.55 this ranged 4.45–4.56
    // depending on the family's tint, so the web's rounding pushed some of it under; the ladder now
    // asks for 0.535, which clears with room. The margin is the assertion — landing on 4.5 is what made
    // this fragile in the first place.
    for (const mode of MODES) {
      const n = deriveNeutrals(neutral, mode);
      expect(
        guaranteedContrast(n.muted!, n["muted-foreground"]!),
        `${neutral} ${mode}`,
      ).toBeGreaterThan(4.6);
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
