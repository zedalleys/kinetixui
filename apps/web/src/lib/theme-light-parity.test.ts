// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `.theme-light` forces the light contract on a subtree inside a dark page: Create's light preview, the
 * Theming page's light preview, the chart previews. It is hand-written, and it can only do that job for
 * the tokens it re-declares. Any token `.dark` redefines that is missing here leaks the DARK value into
 * the light preview, because a custom property inherits its computed value from the nearest declaring
 * ancestor, and on a dark page that is `<html class="dark">`.
 *
 * That happened: `--action`, `--focus`, `--link`, `--brand`, `--surface-grouped`, the two `semantic-*`
 * container colours and every `--shadow-focus*` ring were missing, and a light preview on a dark page
 * drew dark-theme buttons and a dark-theme focus ring (measured in Chromium, see
 * docs/audits/COLOR-THEMING-MATURITY-AUDIT.md §10).
 *
 * The block must cover every `.dark` token, and say what `:root` says. A literal is accepted where
 * `:root` aliases a primitive, as long as the literal is that primitive's value — the block already
 * writes `--primary` as `224 76% 48%` rather than `var(--azure-700)`.
 */

const repoRoot = resolve(process.cwd(), "../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

/** `--name: value;` pairs inside the first `selector { … }` block of a stylesheet. */
function declarations(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no "${selector} {" block`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const out = new Map<string, string>();
  // strip comments first: several token values carry long /** … */ notes containing `;`
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1]!, m[2]!.trim().replace(/\s+/g, " "));
  }
  return out;
}

const dist = "packages/tokens/dist/web";
const root = new Map([...declarations(read(`${dist}/globals.css`), ":root"), ...declarations(read(`${dist}/extras.css`), ":root")]);
const dark = new Map([...declarations(read(`${dist}/globals.dark.css`), ".dark"), ...declarations(read(`${dist}/extras.dark.css`), ".dark")]);
const themeLight = declarations(read("apps/web/src/app/globals.css"), ".theme-light");

/** One hop through a primitive alias: `var(--azure-700)` -> `224 76% 48%`. */
const resolveOnce = (value: string) => {
  const m = value.match(/^var\((--[\w-]+)\)$/);
  return m && root.has(m[1]!) && !/^var\(/.test(root.get(m[1]!)!) ? root.get(m[1]!)! : value;
};

describe(".theme-light re-declares the whole dark-overridden contract", () => {
  it("finds the real stylesheets", () => {
    expect(dark.size).toBeGreaterThan(40);
    expect(themeLight.size).toBeGreaterThan(40);
  });

  it("declares every token .dark redefines", () => {
    const missing = [...dark.keys()].filter((name) => !themeLight.has(name));
    expect(missing, "add these to .theme-light in apps/web/src/app/globals.css").toEqual([]);
  });

  it("gives each one its :root (light) value", () => {
    const wrong = [...dark.keys()]
      .filter((name) => themeLight.has(name) && root.has(name))
      .filter((name) => resolveOnce(themeLight.get(name)!) !== resolveOnce(root.get(name)!))
      .map((name) => `${name}: .theme-light "${themeLight.get(name)}" vs :root "${root.get(name)}"`);
    expect(wrong).toEqual([]);
  });
});
