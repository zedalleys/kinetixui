// @vitest-environment node
import { describe, expect, it } from "vitest";
import { routeRedirects } from "../../../next.config.mjs";
import { publicRoutes } from "../seo";
import { mainNav, docsNav, allDocsLinks } from "../site";
import {
  ACCEPTED_TOKENS,
  checkContrast,
  deriveForegrounds,
  parsePaletteText,
  toCssBlock,
} from "../theme-builder";
import { contrastRatio } from "../color-math";
import {
  DEFAULT_CREATE_CONFIG,
  createReducer,
  isDefaultConfig,
  type CreateConfig,
} from "./config";
import { DEFAULT_TOKENS, defaultThemeInput, resolveTheme } from "./theme-adapter";

const withInput = (themeInput: string, rest: Partial<CreateConfig> = {}): CreateConfig => ({
  ...DEFAULT_CREATE_CONFIG,
  themeInput,
  ...rest,
});

/* ------------------------------------------------------------------ routing */

describe("the routes Create replaced", () => {
  // There is no middleware and there are no route handlers, so next.config's `redirects()` is the whole
  // mechanism. Asserting the exported table checks the thing that actually ships, without a server.
  it.each(["/colors", "/theme-builder"])("%s redirects to /create, permanently", (source) => {
    const rule = routeRedirects.find((r) => r.source === source);
    expect(rule, `${source} has no redirect`).toBeDefined();
    expect(rule!.destination).toBe("/create");
    // 308, not 307: these pages are not coming back, and a temporary redirect would keep both URLs indexed.
    expect(rule!.permanent).toBe(true);
  });

  it("does not also serve a page at a redirected path", () => {
    // A page file at /colors would win over the redirect and quietly restore the duplicate builder.
    for (const { source } of routeRedirects) expect(publicRoutes()).not.toContain(source);
  });
});

describe("navigation and the sitemap", () => {
  it("puts Create in the primary navigation", () => {
    expect(mainNav.find((i) => i.href === "/create")?.title).toBe("Create");
  });

  it("no longer offers Colors or a theme builder as a top-level destination", () => {
    for (const href of ["/colors", "/theme-builder"]) {
      expect(mainNav.map((i) => i.href)).not.toContain(href);
    }
    expect(mainNav.map((i) => i.title)).not.toContain("Colors");
  });

  it("keeps the colour reference, under Docs", () => {
    // The page moved; the knowledge did not go anywhere. Redirecting /colors into a builder while also
    // deleting the ramp notes would have lost the only place they are written down.
    expect(allDocsLinks.map((i) => i.href)).toContain("/docs/colors");
    const styling = docsNav.find((g) => g.title === "Styling");
    expect(styling?.items.map((i) => i.href)).toContain("/docs/colors");
  });

  it("indexes /create and /docs/colors, and neither redirected route", () => {
    const routes = publicRoutes();
    expect(routes).toContain("/create");
    expect(routes).toContain("/docs/colors");
    expect(routes).not.toContain("/colors");
    expect(routes).not.toContain("/theme-builder");
  });
});

/* ------------------------------------------------------------------ config */

describe("CreateConfig", () => {
  it("starts on the shipped theme, in light, with a scene chosen", () => {
    expect(DEFAULT_CREATE_CONFIG).toEqual({ mode: "light", themeInput: "", previewScene: "dashboard" });
    expect(isDefaultConfig(DEFAULT_CREATE_CONFIG)).toBe(true);
  });

  it("reset returns every field, appearance included", () => {
    let state = DEFAULT_CREATE_CONFIG;
    state = createReducer(state, { type: "set-mode", mode: "dark" });
    state = createReducer(state, { type: "set-theme-input", value: "primary,#ff0000" });
    expect(isDefaultConfig(state)).toBe(false);

    expect(createReducer(state, { type: "reset" })).toEqual(DEFAULT_CREATE_CONFIG);
  });

  it("treats whitespace-only input as untouched, so Reset does not look enabled for nothing", () => {
    expect(isDefaultConfig(withInput("   \n  "))).toBe(true);
    expect(isDefaultConfig(withInput("primary,#ff0000"))).toBe(false);
  });

  it("returns the same object when an action changes nothing", () => {
    // Cheap identity guarantee: the workspace memoizes on the config, so a no-op must not invalidate it.
    const s = DEFAULT_CREATE_CONFIG;
    expect(createReducer(s, { type: "set-mode", mode: "light" })).toBe(s);
    expect(createReducer(s, { type: "set-scene", scene: "dashboard" })).toBe(s);
  });
});

/* ------------------------------------------------------------------ defaults */

describe("defaults", () => {
  it("covers every token the parser accepts, in both modes", () => {
    // This is what makes Create usable with no input at all. A gap here is a token that silently falls
    // back to whatever the page around it happens to be.
    for (const mode of ["light", "dark"] as const) {
      for (const token of ACCEPTED_TOKENS) {
        expect(DEFAULT_TOKENS[mode][token], `${mode} is missing ${token}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("differs between light and dark on the surfaces you would notice", () => {
    for (const token of ["background", "foreground", "card", "border"] as const) {
      expect(DEFAULT_TOKENS.light[token]).not.toBe(DEFAULT_TOKENS.dark[token]);
    }
  });

  it("passes its own contrast check in both modes", () => {
    // If the shipped theme failed the tool's own accessibility panel, one of the two would be wrong.
    for (const mode of ["light", "dark"] as const) {
      const failing = checkContrast(DEFAULT_TOKENS[mode]).filter((c) => !c.pass);
      expect(failing.map((f) => f.pair.join("/"))).toEqual([]);
    }
  });

  it("round-trips through the parser it is meant to be edited in", () => {
    const text = defaultThemeInput("dark");
    const parsed = parsePaletteText(text);
    expect(parsed.errors).toEqual([]);
    expect(parsed.unknownTokens).toEqual([]);
    expect(parsed.values).toEqual(DEFAULT_TOKENS.dark);
  });
});

/* ------------------------------------------------------------------ resolving a theme */

describe("resolveTheme", () => {
  it("renders the default theme when nothing has been typed", () => {
    const t = resolveTheme(DEFAULT_CREATE_CONFIG);
    expect(t.values).toEqual(DEFAULT_TOKENS.light);
    expect(t.hasErrors).toBe(false);
    expect(t.contrast.length).toBeGreaterThan(0);
    expect(t.cssIsDefault).toBe(true);
    expect(t.css).toContain("--background:");
  });

  it("lays overrides over the defaults instead of replacing them", () => {
    const t = resolveTheme(withInput("primary,#ff0000"));
    expect(t.values.primary).toBe("#ff0000");
    // Everything not mentioned keeps its Kinetix value — the reason the preview never goes half-blank.
    expect(t.values.background).toBe(DEFAULT_TOKENS.light.background);
    // Black, not white: pure red is 5.25:1 against black and only 4.0:1 against white.
    expect(t.overrides).toEqual({ primary: "#ff0000", "primary-foreground": "#000000" });
  });

  it("derives a readable foreground for a colour set without one", () => {
    expect(resolveTheme(withInput("primary,#ffffff")).values["primary-foreground"]).toBe("#000000");
    expect(resolveTheme(withInput("primary,#000000")).values["primary-foreground"]).toBe("#ffffff");
  });

  it("changing appearance changes the theme and nothing else", () => {
    const light = resolveTheme(withInput("primary,#ff0000"));
    const dark = resolveTheme(withInput("primary,#ff0000", { mode: "dark" }));

    expect(dark.values.background).toBe(DEFAULT_TOKENS.dark.background);
    expect(light.values.background).toBe(DEFAULT_TOKENS.light.background);
    // The override survives the switch — appearance picks the base, it does not discard your work.
    expect(dark.values.primary).toBe("#ff0000");
    expect(dark.overrides).toEqual(light.overrides);
  });

  it("keeps the valid rows when a row is invalid, and names the bad one", () => {
    const t = resolveTheme(withInput("primary,#ff0000\nbackground,not-a-colour\nborder,#00ff00"));
    expect(t.values.primary).toBe("#ff0000");
    expect(t.values.border).toBe("#00ff00");
    // The bad row falls back rather than rendering `undefined` into a custom property.
    expect(t.values.background).toBe(DEFAULT_TOKENS.light.background);
    expect(t.hasErrors).toBe(true);
    expect(t.parsed.errors.join(" ")).toMatch(/not-a-colour/);
  });

  it("reports a name it does not recognize without failing the rest", () => {
    const t = resolveTheme(withInput("primary,#ff0000\nsparkle,#123456"));
    expect(t.parsed.unknownTokens).toEqual(["sparkle"]);
    expect(t.parsed.errors).toEqual([]);
    expect(t.hasErrors).toBe(true);
    expect(t.values.primary).toBe("#ff0000");
  });

  it("never produces an undefined custom property", () => {
    for (const input of ["", "garbage", "primary,#ff0000\nnonsense", "   ", "token,hex"]) {
      const style = resolveTheme(withInput(input)).style;
      expect(Object.values(style).every((v) => typeof v === "string" && v.length > 0)).toBe(true);
      expect(JSON.stringify(style)).not.toContain("undefined");
    }
  });

  it("emits HSL channels, the shape hsl(var(--x)) expects", () => {
    expect(resolveTheme(withInput("primary,#ff0000")).style["--primary"]).toBe("0 100% 50%");
  });

  it("shows a failing contrast pair rather than correcting it", () => {
    // Deliberately unreadable: grey text on a white card. PR 2 may offer to fix this; PR 1 must not
    // quietly do it, or the panel is reporting a theme the user did not choose.
    const t = resolveTheme(withInput("card,#ffffff\ncard-foreground,#c9c9c9"));
    const pair = t.contrast.find((c) => c.pair[0] === "card")!;
    expect(pair.pass).toBe(false);
    expect(pair.ratio).toBeCloseTo(contrastRatio("#ffffff", "#c9c9c9"), 5);
    expect(t.values["card-foreground"]).toBe("#c9c9c9");
  });
});

/* ------------------------------------------------------------------ output */

describe("generated CSS", () => {
  it("is the user's overrides once there are any", () => {
    const t = resolveTheme(withInput("primary,#ff0000"));
    expect(t.cssIsDefault).toBe(false);
    expect(t.css).toBe(":root {\n  --primary: 0 100% 50%;\n  --primary-foreground: 0 0% 0%;\n}");
  });

  it("is byte-identical to what the engine produces directly", () => {
    // The CLI (`kinetixui theme build`) is a 1:1 port of this engine over the same input format, so what
    // Create shows for a given set of rows has to be what the engine emits for them — not a second
    // formatter that happens to look similar today.
    const rows = "primary,#1d4ed8\nbackground,#ffffff\nborder,#92b2c8";
    expect(resolveTheme(withInput(rows)).css).toBe(toCssBlock(deriveForegrounds(parsePaletteText(rows).values)));
  });

  it("does not change with the appearance when the user set every value", () => {
    const rows = "primary,#ff0000\nprimary-foreground,#ffffff";
    expect(resolveTheme(withInput(rows, { mode: "dark" })).css).toBe(resolveTheme(withInput(rows)).css);
  });
});
