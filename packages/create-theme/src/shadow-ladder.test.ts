import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, type PresetConfig } from "@kinetixui/create-preset";
import { SHIPPED_ELEVATION } from "./contract";
import { deriveElevation } from "./engine";
import { resolveCreateTheme } from "./resolve";
import { exportCss, shadowCss } from "./exporters/css";

/**
 * The elevation ladder, and the bug that made these tests necessary.
 *
 * `elevated` used to emit `--shadow-sm: var(--shadow-md)` alongside `--shadow-md: var(--shadow-lg)` and
 * `--shadow-lg: var(--shadow-xl)`. That reads like a shift but is not one: custom properties substitute
 * at computed-value time, so each reference resolves against the *overridden* property declared beside it
 * and the whole ladder collapses onto `xl`. Confirmed in Chromium — sm, md and lg all computed to the xl
 * value, which meant "Elevated" gave every tier the heaviest shadow.
 *
 * The old test asserted only that the emitted values matched `var(--shadow-*)`, which the broken version
 * did perfectly. These assert the EFFECTIVE ladder instead, through a resolver that reproduces the
 * substitution rule the browser applies.
 *
 * Since the extraction the resolved theme carries shadow LAYERS rather than CSS strings, so an alias is
 * no longer merely absent — there is no value in the type that could express one. These tests stay
 * anyway: the exporter is where a reference could reappear, and this is the file that would notice.
 */

const design = (over: Partial<PresetConfig> = {}): PresetConfig => ({ ...DEFAULT_PRESET, ...over });
const ladder = (step: "sm" | "md" | "lg" | "xl") => shadowCss(SHIPPED_ELEVATION[step]);

/* ------------------------------------------------------------------ one source */

/** Every `--shadow-*` declaration in the shipped stylesheet — the values a consumer actually has. */
function shippedShadows(): Record<string, string> {
  const css = readFileSync(new URL("../../tokens/dist/web/extras.css", import.meta.url), "utf8");
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/^\s*--(shadow-[a-z-]+):\s*([^;]+);/gm)) out[m[1]!] = m[2]!.trim();
  return out;
}

describe("the ladder Create reads", () => {
  it("is byte-identical to the shipped stylesheet's", () => {
    // This is what makes "one source" true rather than intended: Create formats the same DTCG token data
    // style-dictionary generates extras.css from, so a change to the tokens moves both or fails here.
    const shipped = shippedShadows();
    for (const step of ["sm", "md", "lg", "xl"] as const) {
      expect(ladder(step), step).toBe(shipped[`shadow-${step}`]);
    }
  });

  it("holds four distinct values, so a shift is a real change", () => {
    expect(new Set((["sm", "md", "lg", "xl"] as const).map(ladder)).size).toBe(4);
  });
});

/* ------------------------------------------------------------------ the resolved theme */

describe("Elevated", () => {
  it("resolves to layers, which cannot reference another property", () => {
    // The structural guarantee. There is no string in the resolved elevation at all, so the collapse is
    // not merely fixed — it is unexpressible, whatever order a consumer's stylesheet puts declarations in.
    for (const layers of Object.values(deriveElevation("elevated"))) {
      for (const layer of layers) {
        expect(JSON.stringify(layer)).not.toContain("var(");
      }
    }
    expect(exportCss(resolveCreateTheme(design({ surface: "elevated" })))).not.toMatch(/--shadow-[a-z]+:\s*var\(/);
  });

  it("shifts each tier onto the ORIGINAL next rung", () => {
    const e = deriveElevation("elevated");
    expect(shadowCss(e.sm)).toBe(ladder("md"));
    expect(shadowCss(e.md)).toBe(ladder("lg"));
    expect(shadowCss(e.lg)).toBe(ladder("xl"));
    // xl has nothing above it, so it keeps its own value and the exporter writes nothing for it.
    expect(shadowCss(e.xl)).toBe(ladder("xl"));
  });

  it("does not collapse — sm, md and lg stay three different shadows", () => {
    const e = deriveElevation("elevated");
    expect(new Set([e.sm, e.md, e.lg].map(shadowCss)).size).toBe(3);
  });

  it("is the same in both appearances, because the ladder is not themed", () => {
    const t = resolveCreateTheme(design({ surface: "elevated" }));
    expect(t.dark.elevation).toEqual(t.light.elevation);
  });
});

/* ------------------------------------------------------------------ effective values */

/**
 * Resolve custom properties the way a browser does: later declarations win, then every `var()` is
 * substituted against the *resolved* map until nothing changes.
 *
 * This is the piece the old test was missing. Run the broken implementation through it and sm, md and lg
 * all come back as the xl value — which is exactly what Chromium did.
 */
function computed(declarations: Record<string, string>[]): Record<string, string> {
  const flat: Record<string, string> = Object.assign({}, ...declarations);
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const [key, value] of Object.entries(flat)) {
      const next = value.replace(/var\(\s*--([a-z0-9-]+)\s*\)/g, (whole, name: string) => flat[name] ?? whole);
      if (next !== value) {
        flat[key] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return flat;
}

/** The copied block, parsed back out of the CSS the exporter actually hands the user. */
function copiedDeclarations(over: Partial<PresetConfig>): Record<string, string> {
  const css = exportCss(resolveCreateTheme(design(over)));
  const end = css.indexOf(".dark");
  const root = css.slice(css.indexOf(":root"), end === -1 ? undefined : end);
  const out: Record<string, string> = {};
  for (const m of root.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  return out;
}

describe("effective values in a consumer-like environment", () => {
  it("gives the intended ladder once the copied CSS is applied over the shipped tokens", () => {
    // Shipped stylesheet first, the pasted override second — the order a consumer's project produces.
    const effective = computed([shippedShadows(), copiedDeclarations({ surface: "elevated" })]);

    expect(effective["shadow-sm"]).toBe(ladder("md"));
    expect(effective["shadow-md"]).toBe(ladder("lg"));
    expect(effective["shadow-lg"]).toBe(ladder("xl"));
    expect(effective["shadow-xl"]).toBe(ladder("xl"));
  });

  it("would have caught the collapse", () => {
    // The old output, run through the same resolver. Kept as an executable record of the defect: if
    // someone reintroduces an alias chain, this is the shape it takes.
    const broken = {
      "shadow-sm": "var(--shadow-md)",
      "shadow-md": "var(--shadow-lg)",
      "shadow-lg": "var(--shadow-xl)",
    };
    const effective = computed([shippedShadows(), broken]);

    expect(effective["shadow-sm"]).toBe(ladder("xl"));
    expect(effective["shadow-md"]).toBe(ladder("xl"));
    expect(effective["shadow-lg"]).toBe(ladder("xl"));
  });
});

/* ------------------------------------------------------------------ the other treatments */

describe("the other surface treatments still behave", () => {
  it("soft writes nothing — it is the shipped behaviour", () => {
    expect(deriveElevation("soft")).toEqual(SHIPPED_ELEVATION);
    expect(exportCss(resolveCreateTheme(design({ surface: "soft" })))).toBe("");
  });

  it.each(["flat", "bordered"] as const)("%s removes every tier, with no references left behind", (surface) => {
    const effective = computed([shippedShadows(), copiedDeclarations({ surface })]);
    for (const step of ["sm", "md", "lg", "xl"] as const) {
      expect(effective[`shadow-${step}`], step).toBe("none");
    }
  });

  it("bordered keeps the stronger border alongside the flattening", () => {
    const decls = copiedDeclarations({ surface: "bordered" });
    expect(decls.border).toBeDefined();
    expect(decls["shadow-sm"]).toBe("none");
  });
});

/* ------------------------------------------------------------------ durability */

describe("every surface treatment survives export", () => {
  it.each(["flat", "bordered", "elevated"] as const)("%s produces output that reproduces it", (surface) => {
    // The claim is not "the CSS mentions a shadow" but "applying this CSS elsewhere gives the same ladder
    // the resolved theme describes" — which is what the preview renders from. Assert the two against
    // each other, through the substitution rule a browser applies.
    const effective = computed([shippedShadows(), copiedDeclarations({ surface })]);
    const resolved = resolveCreateTheme(design({ surface })).light.elevation;

    for (const step of ["sm", "md", "lg", "xl"] as const) {
      expect(effective[`shadow-${step}`], `${surface} ${step}`).toBe(shadowCss(resolved[step]));
    }
  });
});
