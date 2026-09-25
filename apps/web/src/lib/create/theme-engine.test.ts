// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../color-math";
import { hexToOklch, oklchToHex } from "../color/oklch";
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
  deriveNeutrals,
  deriveRadius,
  deriveSurface,
  foregroundFor,
  styleFor,
  type Mode,
} from "./theme-engine";
import {
  DEFAULT_CREATE_CONFIG,
  configKey,
  createReducer,
  currentStyle,
  isDefaultConfig,
  type CreateConfig,
} from "./config";
import { SHIPPED_TOKENS, overridesToText, resolveTheme, textToOverrides } from "./theme-adapter";

const MODES: Mode[] = ["light", "dark"];

/** A saturated colour at a given hue — used to sweep the wheel. */
const oklchToHexForTest = (h: number) => oklchToHex({ l: 0.55, c: 0.2, h });
const cfg = (over: Partial<CreateConfig> = {}): CreateConfig => ({ ...DEFAULT_CREATE_CONFIG, ...over });

/** Every brand colour worth checking a rule against: two neutrals-adjacent, the rest around the wheel. */
const BRANDS = ["#1d4ed8", "#c2410c", "#15803d", "#7e22ce", "#eab308", "#0f766e", "#111111", "#f5f5f5"];

/* ------------------------------------------------------------------ determinism */

describe("determinism", () => {
  it("resolves the same config to the same theme every time", () => {
    const config = cfg({ brand: "#c2410c", neutral: "warm", radius: "soft", surface: "elevated", chartPalette: "cool" });
    const runs = Array.from({ length: 4 }, () => JSON.stringify(resolveTheme(config).light.colors));
    expect(new Set(runs).size).toBe(1);
  });

  it("does not depend on how the config object was built", () => {
    const a = cfg({ brand: "#c2410c", manualOverrides: { primary: "#ff0000", border: "#00ff00" } });
    const b: CreateConfig = { ...DEFAULT_CREATE_CONFIG, manualOverrides: { border: "#00ff00", primary: "#ff0000" }, brand: "#c2410c" };
    expect(configKey(a)).toBe(configKey(b));
    expect(resolveTheme(a).css).toBe(resolveTheme(b).css);
  });

  it("holds no unserializable value anywhere in the config", () => {
    const round = JSON.parse(JSON.stringify(cfg({ manualOverrides: { primary: "#ff0000" } })));
    expect(round).toEqual(cfg({ manualOverrides: { primary: "#ff0000" } }));
  });
});

/* ------------------------------------------------------------------ the default */

describe("the default config", () => {
  it("generates nothing, so the preview is the real shipped theme", () => {
    for (const mode of MODES) {
      expect(resolveTheme(cfg({ mode })).active.colors).toEqual(SHIPPED_TOKENS[mode]);
    }
  });

  it("produces no CSS, because there is nothing to override", () => {
    const t = resolveTheme(DEFAULT_CREATE_CONFIG);
    expect(t.cssIsEmpty).toBe(true);
    expect(t.css).toContain("Nothing to override");
  });

  it("passes its own contrast panel in both modes", () => {
    for (const mode of MODES) {
      const failing = resolveTheme(cfg({ mode })).contrast.filter((c) => !c.pass);
      expect(failing.map((f) => f.pair.join("/"))).toEqual([]);
    }
  });

  it("is reported as default, and anything else is not", () => {
    expect(isDefaultConfig(DEFAULT_CREATE_CONFIG)).toBe(true);
    expect(isDefaultConfig(cfg({ brand: "#ff0000" }))).toBe(false);
    expect(isDefaultConfig(cfg({ neutral: "warm" }))).toBe(false);
    expect(isDefaultConfig(cfg({ radius: "soft" }))).toBe(false);
    expect(isDefaultConfig(cfg({ surface: "flat" }))).toBe(false);
    expect(isDefaultConfig(cfg({ chartPalette: "cool" }))).toBe(false);
    expect(isDefaultConfig(cfg({ manualOverrides: { primary: "#ff0000" } }))).toBe(false);
    // Case is an authoring detail, not a change.
    expect(isDefaultConfig(cfg({ brand: KINETIX_BRAND.toUpperCase() }))).toBe(true);
  });
});

/* ------------------------------------------------------------------ brand */

describe("brand roles", () => {
  it.each(MODES)("fills every seeded role in %s", (mode) => {
    const roles = deriveBrandRoles("#c2410c", mode);
    for (const token of [
      "brand", "brand-foreground", "action", "action-foreground", "action-hover",
      "action-pressed", "link", "focus", "primary", "primary-foreground", "ring", "accent", "accent-foreground",
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
    expect(resolveTheme(cfg({ brand: "nope" })).active.colors).toEqual(SHIPPED_TOKENS.light);
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
        const surface = deriveBrandRoles(`#${((h * 7919 + l * 977) | 0).toString(16).padStart(6, "0").slice(0, 6)}`, "light");
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
  const WHEEL = Array.from({ length: 24 }, (_, i) => oklchToHexForTest(i * 15));

  it.each(["light", "dark"] as Mode[])("clears AA in %s for every hue and every neutral", (mode) => {
    const failures: string[] = [];
    for (const brand of [...WHEEL, ...BRANDS]) {
      for (const neutral of NEUTRALS) {
        const t = resolveTheme(cfg({ brand, neutral, mode }));
        for (const c of t.contrast) {
          if (!c.pass) failures.push(`${mode} ${brand}/${neutral} ${c.pair.join("/")} ${c.ratio.toFixed(2)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

/* ------------------------------------------------------------------ neutrals */

describe("neutrals", () => {
  it("generates nothing for the shipped palette", () => {
    expect(deriveNeutrals("kinetix", "light")).toEqual({});
    expect(deriveNeutrals("kinetix", "dark")).toEqual({});
  });

  it.each(NEUTRALS.filter((n) => n !== "kinetix"))("%s covers the whole surface family", (neutral) => {
    for (const mode of MODES) {
      const n = deriveNeutrals(neutral, mode);
      for (const token of ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "muted", "muted-foreground", "border", "input"]) {
        expect(n[token], `${neutral} ${mode} ${token}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it.each(NEUTRALS.filter((n) => n !== "kinetix"))("%s stays neutral — never a visible colour", (neutral) => {
    for (const mode of MODES) {
      for (const hex of Object.values(deriveNeutrals(neutral, mode))) {
        // 0.02 is about where a tint stops reading as grey. Warm must not look orange (§18).
        expect(hexToOklch(hex!)!.c, `${neutral} ${mode} ${hex}`).toBeLessThan(0.02);
      }
    }
  });

  it.each(NEUTRALS.filter((n) => n !== "kinetix"))("%s keeps body text readable in both modes", (neutral) => {
    for (const mode of MODES) {
      const n = deriveNeutrals(neutral, mode);
      expect(contrastRatio(n.background!, n.foreground!), `${neutral} ${mode}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(n.background!, n["muted-foreground"]!), `${neutral} ${mode} muted`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("is a different family per option, not the same grey relabelled", () => {
    const light = NEUTRALS.filter((n) => n !== "kinetix").map((n) => deriveNeutrals(n, "light").muted);
    expect(new Set(light).size).toBe(light.length);
  });

  it("does not take its hue from the brand", () => {
    // A warm neutral stays warm under a blue brand — personality is separated on purpose (§17).
    const a = resolveTheme(cfg({ neutral: "warm", brand: "#1d4ed8" })).light.colors.muted;
    const b = resolveTheme(cfg({ neutral: "warm", brand: "#c2410c" })).light.colors.muted;
    expect(a).toBe(b);
  });
});

/* ------------------------------------------------------------------ radius, surface, charts */

describe("radius", () => {
  it("writes only the four size steps, letting the role aliases follow", () => {
    expect(Object.keys(deriveRadius("soft")).sort()).toEqual(["radius-lg", "radius-md", "radius-sm", "radius-xl"]);
  });

  it.each(RADII)("%s stays on the 4px grid", (radius) => {
    for (const v of Object.values(deriveRadius(radius))) {
      expect(Number.parseInt(v!, 10) % 4, `${radius} ${v}`).toBe(0);
    }
  });

  it("orders the presets from square to soft", () => {
    const md = (r: (typeof RADII)[number]) => Number.parseInt(deriveRadius(r)["radius-md"]!, 10);
    expect(md("square")).toBe(0);
    expect(md("small")).toBeLessThan(md("default"));
    expect(md("default")).toBeLessThan(md("rounded"));
    expect(md("rounded")).toBeLessThan(md("soft"));
  });
});

describe("surface", () => {
  it("writes nothing for the shipped treatment", () => {
    expect(deriveSurface("soft", "light", "#92b2c8")).toEqual({});
  });

  it("remaps the shipped ladder rather than inventing shadows", () => {
    // Every value is either `none` or a reference to a token that already exists (§29).
    for (const surface of SURFACES) {
      for (const [token, value] of Object.entries(deriveSurface(surface, "light", "#92b2c8"))) {
        if (token === "border") continue;
        expect(value === "none" || /^var\(--shadow-(sm|md|lg|xl)\)$/.test(value!), `${surface} ${token}=${value}`).toBe(true);
      }
    }
  });

  it("compensates a flat surface with a stronger border", () => {
    const bordered = deriveSurface("bordered", "light", "#92b2c8");
    expect(bordered["shadow-sm"]).toBe("none");
    expect(hexToOklch(bordered.border!)!.l).toBeLessThan(hexToOklch("#92b2c8")!.l);
    // In dark mode a stronger edge is a lighter one.
    expect(hexToOklch(deriveSurface("bordered", "dark", "#395a70").border!)!.l).toBeGreaterThan(hexToOklch("#395a70")!.l);
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
          const a = hexToOklch(series[i])!;
          const b = hexToOklch(series[j])!;
          const dh = Math.abs(((a.h - b.h + 540) % 360) - 180);
          const dl = Math.abs(a.l - b.l);
          // Either a real hue gap or a real lightness gap. Two series that differ in neither cannot be
          // told apart, whatever their contrast against the background is (§32).
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
    const values = STYLE_VALUES[style];
    expect(RADII).toContain(values.radius);
    expect(SURFACES).toContain(values.surface);
  });

  it("applies both dimensions when selected", () => {
    const next = createReducer(DEFAULT_CREATE_CONFIG, { type: "set-style", style: "sharp" });
    expect(next.radius).toBe("square");
    expect(next.surface).toBe("bordered");
    expect(currentStyle(next)).toBe("sharp");
  });

  it("stops naming a preset once a dimension is changed, without fighting the user", () => {
    let s = createReducer(DEFAULT_CREATE_CONFIG, { type: "set-style", style: "sharp" });
    s = createReducer(s, { type: "set-radius", radius: "soft" });

    expect(currentStyle(s)).toBeNull();
    // The change stuck — no hidden preset value is reasserted on the next resolve.
    expect(s.radius).toBe("soft");
    expect(s.surface).toBe("bordered");
    expect(resolveTheme(s).light.vars["radius-md"]).toBe("20px");
  });

  it("names a preset again if the user lands back on its values", () => {
    expect(styleFor("default", "soft")).toBe("default");
    expect(styleFor("square", "bordered")).toBe("sharp");
    expect(styleFor("square", "soft")).toBeNull();
  });
});

/* ------------------------------------------------------------------ precedence */

describe("manual override precedence", () => {
  it("beats everything generated", () => {
    const t = resolveTheme(cfg({ brand: "#c2410c", neutral: "warm", manualOverrides: { action: "#ff0000", background: "#00ff00" } }));
    expect(t.light.colors.action).toBe("#ff0000");
    expect(t.light.colors.background).toBe("#00ff00");
  });

  it("survives a change to the thing that generated the value", () => {
    // The classic bug: regenerate on brand change, quietly losing what the user typed.
    let s = cfg({ manualOverrides: { action: "#ff0000" } });
    s = createReducer(s, { type: "set-brand", hex: "#15803d" });
    s = createReducer(s, { type: "set-neutral", neutral: "cool" });
    expect(resolveTheme(s).light.colors.action).toBe("#ff0000");
  });

  it("applies in both modes", () => {
    const t = resolveTheme(cfg({ manualOverrides: { action: "#ff0000" } }));
    expect(t.light.colors.action).toBe("#ff0000");
    expect(t.dark.colors.action).toBe("#ff0000");
  });

  it("derives a foreground for a surface overridden without one", () => {
    const t = resolveTheme(cfg({ manualOverrides: { primary: "#000000" } }));
    expect(contrastRatio("#000000", t.light.colors["primary-foreground"])).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves a foreground the user DID choose exactly as typed, pass or fail", () => {
    // Showing the failure is the job; silently fixing it would hide the user's own decision (§15).
    const t = resolveTheme(cfg({ manualOverrides: { card: "#ffffff", "card-foreground": "#c9c9c9" } }));
    expect(t.light.colors["card-foreground"]).toBe("#c9c9c9");
    expect(t.contrast.find((c) => c.pair[0] === "card")!.pass).toBe(false);
    expect(t.manualTokens.has("card-foreground")).toBe(true);
  });

  it("removes an override when it is cleared", () => {
    let s = createReducer(DEFAULT_CREATE_CONFIG, { type: "set-override", token: "action", hex: "#ff0000" });
    expect(resolveTheme(s).light.colors.action).toBe("#ff0000");
    s = createReducer(s, { type: "set-override", token: "action", hex: null });
    expect(resolveTheme(s).light.colors.action).toBe(SHIPPED_TOKENS.light.action);
    expect(isDefaultConfig(s)).toBe(true);
  });
});

/* ------------------------------------------------------------------ output */

describe("generated CSS", () => {
  it("contains only what differs from the shipped theme", () => {
    const t = resolveTheme(cfg({ manualOverrides: { action: "#ff0000" } }));
    expect(t.css).toContain("--action: 0 100% 50%");
    // Untouched tokens are the consumer's existing values; repeating them hides the actual change.
    expect(t.css).not.toContain("--muted:");
  });

  it("carries both appearances, because one config describes both", () => {
    const t = resolveTheme(cfg({ neutral: "warm" }));
    expect(t.css).toContain(":root {");
    expect(t.css).toContain(".dark {");
    // The two blocks must not be the same values — dark is derived, not inverted (§37).
    const root = t.css.slice(t.css.indexOf(":root"), t.css.indexOf(".dark"));
    const dark = t.css.slice(t.css.indexOf(".dark"));
    expect(root).not.toBe(dark);
  });

  it("emits radius once, not per appearance", () => {
    const css = resolveTheme(cfg({ radius: "soft" })).css;
    expect(css.match(/--radius-md:/g)).toHaveLength(1);
    expect(css).toContain("--radius-md: 20px;");
  });

  it("emits every Simple-mode control that has been changed", () => {
    // §104: a control whose effect does not survive Copy CSS must not ship. This is that rule, as a test.
    const checks: [Partial<CreateConfig>, RegExp][] = [
      [{ brand: "#c2410c" }, /--action:/],
      [{ neutral: "warm" }, /--background:/],
      [{ radius: "rounded" }, /--radius-md:/],
      [{ surface: "flat" }, /--shadow-sm:/],
      [{ surface: "elevated" }, /--shadow-sm: var\(--shadow-md\)/],
      [{ chartPalette: "categorical" }, /--chart-1:/],
      [{ manualOverrides: { border: "#ff0000" } }, /--border:/],
    ];
    for (const [over, pattern] of checks) {
      expect(resolveTheme(cfg(over)).css, JSON.stringify(over)).toMatch(pattern);
    }
  });

  it("emits colours as HSL channels, the shape the library reads", () => {
    expect(resolveTheme(cfg({ manualOverrides: { action: "#ff0000" } })).css).toContain("0 100% 50%");
  });

  it("is deterministic and order-stable", () => {
    const config = cfg({ brand: "#7e22ce", neutral: "stone", radius: "rounded" });
    expect(new Set(Array.from({ length: 4 }, () => resolveTheme(config).css)).size).toBe(1);
  });
});

/* ------------------------------------------------------------------ advanced editor bridge */

describe("the raw editor round trip", () => {
  it("renders overrides as rows and reads them back", () => {
    const overrides = { primary: "#ff0000", border: "#00ff00" };
    const text = overridesToText(overrides);
    expect(text).toBe("primary,#ff0000\nborder,#00ff00");
    expect(textToOverrides(text).values).toEqual(overrides);
  });

  it("still reports the parser's own errors", () => {
    const parsed = textToOverrides("primary,#ff0000\nbackground,nope\nsparkle,#123456");
    expect(parsed.values).toEqual({ primary: "#ff0000" });
    expect(parsed.errors.join(" ")).toMatch(/nope/);
    expect(parsed.unknownTokens).toEqual(["sparkle"]);
  });
});

/* ------------------------------------------------------------------ reset */

describe("reset", () => {
  it("returns every dimension at once", () => {
    let s = cfg({
      mode: "dark",
      previewScene: "form",
      brand: "#7e22ce",
      neutral: "warm",
      radius: "soft",
      surface: "elevated",
      chartPalette: "cool",
      manualOverrides: { action: "#ff0000", border: "#00ff00" },
    });
    s = createReducer(s, { type: "reset" });

    expect(s).toEqual(DEFAULT_CREATE_CONFIG);
    expect(isDefaultConfig(s)).toBe(true);
    expect(resolveTheme(s).cssIsEmpty).toBe(true);
  });
});

/* ------------------------------------------------------------------ status colours */

describe("status colours", () => {
  it("are not dragged around by the brand", () => {
    // Changing the theme colour must not turn success purple or warning blue (§33).
    for (const brand of BRANDS) {
      const t = resolveTheme(cfg({ brand, neutral: "warm", chartPalette: "cool" }));
      for (const token of ["success", "warning", "destructive"]) {
        expect(t.light.colors[token], `${brand} ${token}`).toBe(SHIPPED_TOKENS.light[token]);
      }
    }
  });

  it("can still be changed deliberately in Advanced", () => {
    expect(resolveTheme(cfg({ manualOverrides: { destructive: "#00ff00" } })).light.colors.destructive).toBe("#00ff00");
  });
});
