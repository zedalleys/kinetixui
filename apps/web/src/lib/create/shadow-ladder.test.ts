// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SHADOW_LADDER, deriveSurface } from "./theme-engine";
import { DEFAULT_CREATE_CONFIG, type CreateConfig } from "./config";
import { resolveTheme } from "./theme-adapter";

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
 */

const cfg = (over: Partial<CreateConfig> = {}): CreateConfig => ({ ...DEFAULT_CREATE_CONFIG, ...over });

/* ------------------------------------------------------------------ one source */

/** Every `--shadow-*` declaration in the shipped stylesheet — the values a consumer actually has. */
function shippedShadows(): Record<string, string> {
  const css = readFileSync(new URL("../../../../../packages/tokens/dist/web/extras.css", import.meta.url), "utf8");
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/^\s*--(shadow-[a-z-]+):\s*([^;]+);/gm)) out[m[1]] = m[2].trim();
  return out;
}

describe("the ladder Create reads", () => {
  it("is byte-identical to the shipped stylesheet's", () => {
    // This is what makes "one source" true rather than intended: Create formats the same DTCG token data
    // style-dictionary generates extras.css from, so a change to the tokens moves both or fails here.
    const shipped = shippedShadows();
    for (const step of ["sm", "md", "lg", "xl"] as const) {
      expect(SHADOW_LADDER[step], step).toBe(shipped[`shadow-${step}`]);
    }
  });

  it("holds four distinct values, so a shift is a real change", () => {
    expect(new Set(Object.values(SHADOW_LADDER)).size).toBe(4);
  });
});

/* ------------------------------------------------------------------ the emitted block */

describe("Elevated", () => {
  it("emits literals, never a reference to a property it also overrides", () => {
    // The structural guarantee. With no `var()` in the block, the collapse is not merely fixed — it is
    // unexpressible, whatever order a consumer's stylesheet puts the declarations in.
    const emitted = deriveSurface("elevated", "light", "#92b2c8");
    for (const [token, value] of Object.entries(emitted)) {
      expect(value, `${token} still references another custom property`).not.toMatch(/var\(/);
    }
    expect(resolveTheme(cfg({ surface: "elevated" })).css).not.toMatch(/--shadow-[a-z]+:\s*var\(/);
  });

  it("shifts each tier onto the ORIGINAL next rung", () => {
    const emitted = deriveSurface("elevated", "light", "#92b2c8");
    expect(emitted["shadow-sm"]).toBe(SHADOW_LADDER.md);
    expect(emitted["shadow-md"]).toBe(SHADOW_LADDER.lg);
    expect(emitted["shadow-lg"]).toBe(SHADOW_LADDER.xl);
    // xl keeps its own value, so it is not written at all.
    expect(emitted["shadow-xl"]).toBeUndefined();
  });

  it("does not collapse — sm, md and lg stay three different shadows", () => {
    const e = deriveSurface("elevated", "light", "#92b2c8");
    expect(new Set([e["shadow-sm"], e["shadow-md"], e["shadow-lg"]]).size).toBe(3);
  });

  it("is the same in both appearances, because the ladder is not themed", () => {
    expect(deriveSurface("elevated", "dark", "#395a70")).toEqual(deriveSurface("elevated", "light", "#92b2c8"));
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
      const next = value.replace(/var\(\s*--([a-z0-9-]+)\s*\)/g, (whole, name) => flat[name] ?? whole);
      if (next !== value) {
        flat[key] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return flat;
}

/** The copied block, parsed back out of the CSS Create actually hands the user. */
function copiedDeclarations(config: CreateConfig): Record<string, string> {
  const css = resolveTheme(config).css;
  const root = css.slice(css.indexOf(":root"), css.indexOf(".dark") === -1 ? undefined : css.indexOf(".dark"));
  const out: Record<string, string> = {};
  for (const m of root.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

describe("effective values in a consumer-like environment", () => {
  it("gives the intended ladder once the copied CSS is applied over the shipped tokens", () => {
    // Shipped stylesheet first, the pasted override second — the order a consumer's project produces.
    const effective = computed([shippedShadows(), copiedDeclarations(cfg({ surface: "elevated" }))]);

    expect(effective["shadow-sm"]).toBe(SHADOW_LADDER.md);
    expect(effective["shadow-md"]).toBe(SHADOW_LADDER.lg);
    expect(effective["shadow-lg"]).toBe(SHADOW_LADDER.xl);
    expect(effective["shadow-xl"]).toBe(SHADOW_LADDER.xl);
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

    expect(effective["shadow-sm"]).toBe(SHADOW_LADDER.xl);
    expect(effective["shadow-md"]).toBe(SHADOW_LADDER.xl);
    expect(effective["shadow-lg"]).toBe(SHADOW_LADDER.xl);
    expect(new Set(Object.values(effective).slice(0, 3)).size).toBe(1);
  });

  it("matches what the scoped preview applies", () => {
    // The preview writes the same values inline, so the two cannot drift: one resolve, two consumers.
    const theme = resolveTheme(cfg({ surface: "elevated" }));
    expect(theme.style["--shadow-sm"]).toBe(SHADOW_LADDER.md);
    expect(theme.style["--shadow-md"]).toBe(SHADOW_LADDER.lg);
    expect(theme.style["--shadow-lg"]).toBe(SHADOW_LADDER.xl);
    // Inline styles are a single declaration block with no cascade, so this is also collapse-proof.
    expect(JSON.stringify(theme.style)).not.toContain("var(--shadow");
  });
});

/* ------------------------------------------------------------------ the other treatments */

describe("the other surface treatments still behave", () => {
  it("soft writes nothing — it is the shipped behaviour", () => {
    expect(deriveSurface("soft", "light", "#92b2c8")).toEqual({});
    expect(resolveTheme(cfg({ surface: "soft" })).cssIsEmpty).toBe(true);
  });

  it.each(["flat", "bordered"] as const)("%s removes every tier, with no references left behind", (surface) => {
    const effective = computed([shippedShadows(), copiedDeclarations(cfg({ surface }))]);
    for (const step of ["sm", "md", "lg", "xl"] as const) {
      expect(effective[`shadow-${step}`], step).toBe("none");
    }
  });

  it("bordered keeps the stronger border alongside the flattening", () => {
    const decls = copiedDeclarations(cfg({ surface: "bordered" }));
    expect(decls.border).toBeDefined();
    expect(decls["shadow-sm"]).toBe("none");
  });
});

/* ------------------------------------------------------------------ §104 */

describe("§104 — every surface treatment survives Copy CSS", () => {
  it.each(["flat", "bordered", "elevated"] as const)("%s produces output that reproduces it", (surface) => {
    const css = resolveTheme(cfg({ surface })).css;
    expect(css).toMatch(/--shadow-sm:/);

    // The claim is not "the CSS mentions a shadow" but "applying this CSS elsewhere gives the same
    // ladder the preview showed". Assert the two against each other.
    const effective = computed([shippedShadows(), copiedDeclarations(cfg({ surface }))]);
    const preview = resolveTheme(cfg({ surface })).style;
    for (const step of ["sm", "md", "lg"] as const) {
      expect(effective[`shadow-${step}`], `${surface} ${step}`).toBe(preview[`--shadow-${step}`]);
    }
  });
});
