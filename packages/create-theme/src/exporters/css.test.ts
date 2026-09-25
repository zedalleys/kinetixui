import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, type PresetConfig } from "@kinetixui/create-preset";
import { SHIPPED_ELEVATION } from "../contract";
import { resolveCreateTheme } from "../resolve";
import { cssExporter, exportCss, shadowCss } from "./css";

/**
 * The web CSS exporter.
 *
 * It replaced a CSS builder that lived inside the /create workspace, so the first thing these assert is
 * that nothing changed: the same design produces the same block, down to ordering. The rest is the
 * exporter's own contract — diff only, both appearances, HSL channels, and nothing a preset could talk it
 * into emitting.
 */

const design = (over: Partial<PresetConfig> = {}): PresetConfig => ({ ...DEFAULT_PRESET, ...over });
const css = (over: Partial<PresetConfig> = {}) => exportCss(resolveCreateTheme(design(over)));

describe("the default design", () => {
  it("emits nothing at all", () => {
    // Not an empty `:root {}` — no change, no CSS. The workspace shows its own "nothing to override"
    // message rather than making the exporter invent one.
    expect(css()).toBe("");
  });

  it("emits nothing for a design that only restates the defaults", () => {
    expect(css({ radius: "default", surface: "soft", neutral: "kinetix", chartPalette: "kinetix" })).toBe("");
  });
});

describe("diff, not dump", () => {
  it("contains only what differs from the shipped theme", () => {
    const out = css({ manualOverrides: { action: "#ff0000" } });
    expect(out).toContain("--action: 0 100% 50%");
    // Untouched tokens are the consumer's existing values; repeating them hides the actual change.
    expect(out).not.toContain("--muted:");
  });

  it("emits only the changed token, in each appearance it changes", () => {
    // An override is not mode-dependent, so it differs from the shipped value in both — and both blocks
    // hold exactly one declaration.
    const out = css({ manualOverrides: { border: "#ff0000" } });
    expect(out.split("\n").filter((l) => l.trim().startsWith("--"))).toEqual([
      "  --border: 0 100% 50%;",
      "  --border: 0 100% 50%;",
    ]);
    expect(out).toContain(":root {\n  --border: 0 100% 50%;\n}");
    expect(out).toContain(".dark {\n  --border: 0 100% 50%;\n}");
  });
});

describe("both appearances", () => {
  it("carries a :root and a .dark, because one design describes both", () => {
    const out = css({ neutral: "warm" });
    expect(out).toContain(":root {");
    expect(out).toContain(".dark {");
    // The two blocks must not be the same values — dark is derived, not inverted.
    expect(out.slice(out.indexOf(":root"), out.indexOf(".dark"))).not.toBe(out.slice(out.indexOf(".dark")));
  });

  it("takes different selectors when an exporter is asked for them", () => {
    const out = exportCss(resolveCreateTheme(design({ neutral: "warm" })), {
      rootSelector: "[data-theme='acme']",
      darkSelector: "[data-theme='acme'].dark",
    });
    expect(out).toContain("[data-theme='acme'] {");
    expect(out).toContain("[data-theme='acme'].dark {");
  });

  it("omits a block that has nothing in it", () => {
    // A radius change is mode-independent, so there is no dark block to write.
    const out = css({ radius: "rounded" });
    expect(out).toContain(":root {");
    expect(out).not.toContain(".dark {");
  });
});

describe("every durable control survives the round trip", () => {
  // The durability rule, as a test: a control whose effect does not survive Copy CSS must not ship.
  it.each<[string, Partial<PresetConfig>, RegExp]>([
    ["brand", { brand: "#c2410c" }, /--action:/],
    ["neutral", { neutral: "warm" }, /--background:/],
    ["radius", { radius: "rounded" }, /--radius-md: 12px;/],
    ["flat surface", { surface: "flat" }, /--shadow-sm: none;/],
    ["chart palette", { chartPalette: "categorical" }, /--chart-1:/],
    ["manual override", { manualOverrides: { border: "#ff0000" } }, /--border:/],
  ])("%s", (_name, over, pattern) => {
    expect(css(over)).toMatch(pattern);
  });

  it("emits radius once, not per appearance", () => {
    const out = css({ radius: "soft" });
    expect(out.match(/--radius-md:/g)).toHaveLength(1);
    expect(out).toContain("--radius-md: 20px;");
  });

  it("emits neutral surfaces in both appearances", () => {
    const out = css({ neutral: "cool" });
    const dark = out.slice(out.indexOf(".dark"));
    expect(dark).toContain("--background:");
    expect(dark).toContain("--foreground:");
  });
});

describe("elevated", () => {
  /**
   * The bug this exporter exists to make impossible.
   *
   * `--shadow-sm: var(--shadow-md)` alongside `--shadow-md: var(--shadow-lg)` reads like a shift and is
   * not one: custom properties substitute at computed-value time, so every reference resolves against the
   * overridden property beside it and the whole ladder collapses onto `xl`.
   */
  it("emits the literal layers of the rung above, never a reference", () => {
    const out = css({ surface: "elevated" });
    expect(out).not.toContain("var(--shadow");
    expect(out).toContain(`--shadow-sm: ${shadowCss(SHIPPED_ELEVATION.md)};`);
    expect(out).toContain(`--shadow-md: ${shadowCss(SHIPPED_ELEVATION.lg)};`);
    expect(out).toContain(`--shadow-lg: ${shadowCss(SHIPPED_ELEVATION.xl)};`);
  });

  it("leaves the top rung alone, because nothing sits above it", () => {
    expect(css({ surface: "elevated" })).not.toContain("--shadow-xl:");
  });
});

describe("format", () => {
  it("emits colours as HSL channels, the shape the library reads", () => {
    expect(css({ manualOverrides: { action: "#ff0000" } })).toContain("--action: 0 100% 50%;");
  });

  it("emits radius with a unit, because CSS needs one and the theme object does not carry it", () => {
    expect(css({ radius: "square" })).toContain("--radius-md: 0px;");
  });

  it("is deterministic and order-stable", () => {
    const d = design({ brand: "#7e22ce", neutral: "stone", radius: "rounded" });
    expect(new Set(Array.from({ length: 4 }, () => exportCss(resolveCreateTheme(d)))).size).toBe(1);
  });

  it("sorts colour declarations by token name, within each block", () => {
    const out = css({ neutral: "warm" });
    for (const block of out.split("\n\n")) {
      const colours = [...block.matchAll(/^ {2}--([a-z0-9-]+):/gm)]
        .map((m) => m[1]!)
        .filter((n) => !n.startsWith("radius-") && !n.startsWith("shadow-"));
      expect(colours.length, block.slice(0, 20)).toBeGreaterThan(1);
      expect(colours).toEqual([...colours].sort());
    }
  });
});

describe("what it refuses to write", () => {
  it("never emits a property that is not a known token", () => {
    // The codec's allowlist already refused anything else; this is the second wall.
    const out = css({
      brand: "#c2410c",
      neutral: "warm",
      radius: "soft",
      surface: "elevated",
      chartPalette: "warm",
      manualOverrides: { action: "#ff0000", border: "#00ff00" },
    });
    for (const [, name] of out.matchAll(/^ {2}--([a-z0-9-]+):/gm)) {
      expect(name, `${name} is not a token this exporter should write`).toMatch(
        /^(radius|shadow|chart)-[a-z0-9]+$|^[a-z-]+$/,
      );
    }
  });

  it("carries no comment, no preset payload and no user text", () => {
    const out = css({ brand: "#c2410c", manualOverrides: { action: "#ff0000" } });
    expect(out).not.toContain("/*");
    expect(out).not.toContain("KX1_");
  });

  it("emits no native code and claims no platform", () => {
    const out = css({ brand: "#c2410c", radius: "soft", surface: "elevated" }).toLowerCase();
    for (const claim of ["swiftui", "compose", "flutter", "struct", "@composable", "themedata"]) {
      expect(out, claim).not.toContain(claim);
    }
  });
});

describe("the exporter interface", () => {
  it("names its target and is the same function", () => {
    expect(cssExporter.target).toBe("web-css");
    expect(cssExporter.export(resolveCreateTheme(design({ neutral: "warm" })))).toBe(css({ neutral: "warm" }));
  });
});

describe("shadowCss", () => {
  it("writes an empty layer list as none, not as an empty value", () => {
    expect(shadowCss([])).toBe("none");
  });

  it("writes a bare 0 for a zero offset, matching the generated stylesheet", () => {
    expect(shadowCss(SHIPPED_ELEVATION.sm)).toBe("0 1px 2px 0 #0000000d");
  });
});
