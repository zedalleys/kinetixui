// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decodePreset, encodePreset } from "@kinetixui/create-preset";
import {
  NOTHING_TO_OVERRIDE,
  exportCss,
  resolveCreateTheme,
  shadowCss,
  type AcceptedToken,
} from "@kinetixui/create-theme";
import {
  DEFAULT_CREATE_CONFIG,
  configKey,
  createReducer,
  currentStyle,
  isDefaultConfig,
  type CreateConfig,
} from "./config";
import { configToPreset, presetToConfig, randomizeConfig } from "./preset";
import {
  SHIPPED_TOKENS,
  effectiveValue,
  overridesToText,
  resolveTheme,
  textToOverrides,
} from "./theme-adapter";

/**
 * The workspace side of the seam.
 *
 * The derivation moved to `@kinetixui/create-theme` and is tested there, against designs. What is left in
 * the app is the reducer, the local/portable boundary, and the three things the adapter adds: the active
 * appearance, the inline preview style, and the memoized CSS. These are the tests for exactly that —
 * including the one that matters most, that the preview and the copied CSS never disagree.
 */

const cfg = (over: Partial<CreateConfig> = {}): CreateConfig => ({ ...DEFAULT_CREATE_CONFIG, ...over });

/* ------------------------------------------------------------------ the reducer */

describe("the reducer", () => {
  it("applies a style's dimensions, and only those", () => {
    const next = createReducer(DEFAULT_CREATE_CONFIG, { type: "set-style", style: "sharp" });
    expect(next.radius).toBe("square");
    expect(next.surface).toBe("bordered");
    expect(currentStyle(next)).toBe("sharp");
  });

  it("stops naming a style once a dimension is changed, without fighting the user", () => {
    let s = createReducer(DEFAULT_CREATE_CONFIG, { type: "set-style", style: "sharp" });
    s = createReducer(s, { type: "set-radius", radius: "soft" });

    expect(currentStyle(s)).toBeNull();
    // The change stuck — no hidden style value is reasserted on the next resolve.
    expect(s.radius).toBe("soft");
    expect(s.surface).toBe("bordered");
    expect(resolveTheme(s).light.radius.md).toBe(20);
  });

  it("removes an override when it is cleared", () => {
    let s = createReducer(DEFAULT_CREATE_CONFIG, { type: "set-override", token: "action", hex: "#ff0000" });
    expect(resolveTheme(s).light.colors.action).toBe("#ff0000");

    s = createReducer(s, { type: "set-override", token: "action", hex: null });
    expect(resolveTheme(s).light.colors.action).toBe(SHIPPED_TOKENS.light.action);
    expect(isDefaultConfig(s)).toBe(true);
  });

  it("returns every dimension at once on reset", () => {
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
    expect(resolveTheme(s).cssIsEmpty).toBe(true);
  });

  it("reports the default as default, and anything else as not", () => {
    expect(isDefaultConfig(DEFAULT_CREATE_CONFIG)).toBe(true);
    for (const over of [
      { brand: "#ff0000" },
      { neutral: "warm" as const },
      { radius: "soft" as const },
      { surface: "flat" as const },
      { chartPalette: "cool" as const },
      { manualOverrides: { primary: "#ff0000" } },
    ]) {
      expect(isDefaultConfig(cfg(over)), JSON.stringify(over)).toBe(false);
    }
    // Case is an authoring detail, not a change.
    expect(isDefaultConfig(cfg({ brand: DEFAULT_CREATE_CONFIG.brand.toUpperCase() }))).toBe(true);
  });

  it("gives one memo key for two configs built differently", () => {
    const a = cfg({ brand: "#c2410c", manualOverrides: { primary: "#ff0000", border: "#00ff00" } });
    const b: CreateConfig = {
      ...DEFAULT_CREATE_CONFIG,
      manualOverrides: { border: "#00ff00", primary: "#ff0000" },
      brand: "#c2410c",
    };
    expect(configKey(a)).toBe(configKey(b));
    expect(resolveTheme(a).css).toBe(resolveTheme(b).css);
  });

  it("holds no unserializable value anywhere in the config", () => {
    const config = cfg({ manualOverrides: { primary: "#ff0000" } });
    expect(JSON.parse(JSON.stringify(config))).toEqual(config);
  });
});

/* ------------------------------------------------------------------ the active appearance */

describe("the active appearance", () => {
  it("is whichever mode the preview is showing, and nothing else changes with it", () => {
    const light = resolveTheme(cfg({ neutral: "warm" }));
    const dark = resolveTheme(cfg({ neutral: "warm", mode: "dark" }));

    expect(light.active).toBe(light.light);
    expect(dark.active).toBe(dark.dark);
    // `mode` is a preview control, not a design decision: the resolved theme and the CSS are identical.
    expect(light.css).toBe(dark.css);
    expect(light.light).toEqual(dark.light);
  });

  it("reports the contrast of the appearance on screen", () => {
    const t = resolveTheme(cfg({ manualOverrides: { card: "#ffffff", "card-foreground": "#c9c9c9" } }));
    expect(t.contrast.find((c) => c.pair[0] === "card")!.pass).toBe(false);
    expect(t.manualTokens.has("card-foreground")).toBe(true);
  });

  it("reads back the resolved value of a token", () => {
    expect(effectiveValue(resolveTheme(cfg({ manualOverrides: { action: "#ff0000" } })), "action")).toBe("#ff0000");
  });
});

/* ------------------------------------------------------------------ preview vs. output */

describe("the preview and the copied CSS agree", () => {
  it("writes every colour inline, because the preview is a scoped theme", () => {
    // Unlike the copied CSS, which is a diff, the preview root has to define every token it uses or the
    // page's own theme shows through.
    const t = resolveTheme(cfg());
    for (const token of Object.keys(t.active.colors)) expect(t.style[`--${token}`], token).toBeTruthy();
  });

  it("writes radius and elevation only where the design changes them", () => {
    // So a default workspace previews the real shipped ladders, and Reset leaves nothing behind.
    expect(resolveTheme(cfg()).style["--shadow-sm"]).toBeUndefined();
    expect(resolveTheme(cfg()).style["--radius-md"]).toBeUndefined();
    expect(resolveTheme(cfg({ radius: "soft" })).style["--radius-md"]).toBe("20px");
  });

  it.each(["flat", "bordered", "elevated"] as const)("%s previews what the CSS would reproduce", (surface) => {
    // The durability rule at the seam: whatever the preview shows for a surface treatment, the exported
    // CSS has to carry. The engine's own tests assert the ladder; this asserts the two front ends of it.
    const t = resolveTheme(cfg({ surface }));
    for (const step of ["sm", "md", "lg"] as const) {
      expect(t.style[`--shadow-${step}`], `${surface} ${step}`).toBe(shadowCss(t.active.elevation[step]));
    }
    expect(JSON.stringify(t.style)).not.toContain("var(--shadow");
  });

  it("hands Copy CSS exactly what the shared exporter produces", () => {
    const config = cfg({ brand: "#7e22ce", neutral: "stone", surface: "elevated" });
    expect(resolveTheme(config).css).toBe(exportCss(resolveCreateTheme(configToPreset(config))));
  });

  it("shows a message rather than empty output when there is nothing to override", () => {
    // The message is the workspace's, not the exporter's — a file of CSS must not contain it.
    const t = resolveTheme(DEFAULT_CREATE_CONFIG);
    expect(t.cssIsEmpty).toBe(true);
    expect(t.css).toBe(NOTHING_TO_OVERRIDE);
    expect(exportCss(resolveCreateTheme(configToPreset(DEFAULT_CREATE_CONFIG)))).toBe("");
  });
});

/* ------------------------------------------------------------------ the raw editor */

describe("the raw editor round trip", () => {
  it("renders overrides as rows and reads them back", () => {
    const overrides: Partial<Record<AcceptedToken, string>> = { primary: "#ff0000", border: "#00ff00" };
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

/* ------------------------------------------------------------------ local vs. portable */

describe("the local/portable boundary", () => {
  it("drops mode and scene on the way out", () => {
    const preset = configToPreset(cfg({ mode: "dark", previewScene: "form", brand: "#c2410c" }));
    expect(preset).not.toHaveProperty("mode");
    expect(preset).not.toHaveProperty("previewScene");
    expect(preset.brand).toBe("#c2410c");
  });

  it("keeps the opener's own mode and scene on the way in", () => {
    // Opening a shared link should not move you into someone else's dark mode.
    const config = presetToConfig(configToPreset(cfg({ brand: "#c2410c" })), { mode: "dark", previewScene: "form" });
    expect(config.mode).toBe("dark");
    expect(config.previewScene).toBe("form");
    expect(config.brand).toBe("#c2410c");
  });

  it("falls back to the shipped defaults when there is no workspace state", () => {
    expect(presetToConfig(configToPreset(DEFAULT_CREATE_CONFIG))).toEqual(DEFAULT_CREATE_CONFIG);
  });

  it("resolves a decoded preset to exactly the theme its config resolves to", () => {
    // The parity the whole architecture rests on: a link reproduces the design, not merely the fields.
    for (const config of [
      cfg({ brand: "#c2410c", neutral: "warm" }),
      cfg({ radius: "soft", surface: "elevated", chartPalette: "cool" }),
      cfg({ manualOverrides: { action: "#ff0000", border: "#00ff00" } }),
    ]) {
      const decoded = decodePreset(encodePreset(configToPreset(config)));
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(resolveCreateTheme(decoded.config)).toEqual(resolveCreateTheme(configToPreset(config)));
      }
    }
  });
});

/* ------------------------------------------------------------------ randomize */

describe("randomize, at the workspace boundary", () => {
  it("leaves the workspace's own state alone", () => {
    const after = randomizeConfig(cfg({ mode: "dark", previewScene: "form" }), () => 0.5);
    expect(after.mode).toBe("dark");
    expect(after.previewScene).toBe("form");
  });

  it("clears manual overrides rather than randomizing them", () => {
    const after = randomizeConfig(cfg({ manualOverrides: { action: "#ff0000" } }), () => 0.5);
    expect(after.manualOverrides).toEqual({});
  });

  it("produces a config the workspace can hold as-is", () => {
    const after = randomizeConfig(DEFAULT_CREATE_CONFIG, () => 0.5);
    expect(Object.keys(after).sort()).toEqual(Object.keys(DEFAULT_CREATE_CONFIG).sort());
    expect(isDefaultConfig(after)).toBe(false);
  });
});
