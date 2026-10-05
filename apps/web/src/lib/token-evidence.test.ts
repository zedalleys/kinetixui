// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EVIDENCE_TOKEN, excerpt, repoRoot, tokenEvidence, type OutputBlock } from "./token-evidence";

/**
 * /docs/tokens shows one semantic token traced from its DTCG source to each platform's generated file. The page
 * reads those lines at build time, so they cannot be stale; what this file proves is that they are RIGHT —
 * every code line is a line of the file it names, and every platform's literal is the same colour as the
 * source resolves to, in both themes. A generator that emitted the wrong value on one platform, or a doc that
 * quoted a file that no longer says that, fails here.
 */

const root = repoRoot();
const read = (p: string) => readFileSync(join(root, p), "utf8");

type Rgb = [number, number, number];
const hex = (h: string): Rgb => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i.exec(h);
  if (!m) throw new Error(`not a #rrggbb[aa] colour: ${h}`);
  return [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
};

/** The alpha of a `#rrggbbaa` source value as the generators print it (two decimals), or null for an opaque one. */
const alphaOf = (h: string): number | null => {
  const m = /^#[0-9a-f]{6}([0-9a-f]{2})$/i.exec(h);
  return m ? Math.round((parseInt(m[1]!, 16) / 255) * 100) / 100 : null;
};

/**
 * `#rrggbb` → the CSS output's HSL channel triplet, e.g. `224 76% 48%`. Written independently of the generator's
 * transform (testing a transform with itself proves nothing); the integer rounding is the output's format.
 */
function hslChannels([r8, g8, b8]: Rgb): string {
  const [r, g, b] = [r8 / 255, g8 / 255, b8 / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Whether a generated declaration line holds the colour `want`, in that platform's notation. CSS is compared
 * as HSL channels exactly (its integer rounding is lossy, so converting back to RGB would need a loose
 * tolerance); the native notations within one channel step, because SwiftUI's components are rounded to three
 * decimals.
 */
function expectHolds(line: string, vars: Map<string, string>, want: string, what: string): void {
  const css = /^\s*--[\w-]+:\s*(.+?);?$/.exec(line);
  if (css) {
    let value = css[1]!.trim();
    for (let hop = 0; hop < 6; hop++) {
      const ref = /^var\((--[\w-]+)\)$/.exec(value);
      if (!ref) break;
      value = vars.get(ref[1]!) ?? `(undefined ${ref[1]})`;
    }
    const a = alphaOf(want);
    expect(value, what).toBe(`${hslChannels(hex(want))}${a === null ? "" : ` / ${a}`}`);
    return;
  }
  let got: Rgb;
  const a = alphaOf(want);
  let m = /Color\(red: ([\d.]+), green: ([\d.]+), blue: ([\d.]+)(?:, opacity: ([\d.]+))?\)/.exec(line);
  if (m && a !== null) expect(Number(m[4]), `${what} opacity`).toBeCloseTo(a, 2);
  if (m) got = [m[1], m[2], m[3]].map((v) => Math.round(Number(v) * 255)) as Rgb;
  else if ((m = /Color\(0x([0-9a-f]{2})([0-9a-f]{6})\)/i.exec(line))) {
    if (a !== null) expect(parseInt(m[1]!, 16) / 255, `${what} alpha`).toBeCloseTo(a, 2);
    got = hex(`#${m[2]}`);
  }
  else throw new Error(`no colour literal in ${JSON.stringify(line)}`);
  got.forEach((c, i) => expect(Math.abs(c - hex(want)[i]!), `${what} channel ${i}: ${got} vs ${hex(want)}`).toBeLessThanOrEqual(1));
}

/** Every `--name: value;` in a stylesheet, so a `var(--azure-700)` reference can be followed. */
const declared = (file: string) =>
  [...read(file).matchAll(/^\s+(--[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1]!, m[2]!.trim()] as const);
/** `.dark` redefines the semantic layer over `:root`, so a dark reference resolves dark-first. */
const cssVars = {
  light: new Map(declared("packages/tokens/dist/web/globals.css")),
  dark: new Map([...declared("packages/tokens/dist/web/globals.css"), ...declared("packages/tokens/dist/web/globals.dark.css")]),
};

/** The declaration lines of an output block, per theme: [light, dark]. Comments, headers and braces are not values. */
function declarations(out: OutputBlock): [string, string] {
  const decls = out.lines.filter((l) => l.trim() && !/^(\/\/|\/\*)/.test(l.trim()) && !l.trim().endsWith("{") && l.trim() !== "}");
  // the web light excerpt also carries the primitive the token references; the token is the last light line
  return [decls[decls.length - 2]!, decls[decls.length - 1]!];
}

describe(`/docs/tokens evidence — color.${EVIDENCE_TOKEN}`, () => {
  const evidence = tokenEvidence(EVIDENCE_TOKEN);

  it("covers the four platforms the token build writes, light and dark", () => {
    expect(evidence.outputs.map((o) => o.platform)).toEqual(["Web", "iOS", "Android", "Flutter"]);
    for (const out of evidence.outputs) expect(out.files).toHaveLength(2);
  });

  it("quotes the DTCG source as written", () => {
    const light = JSON.parse(read("tokens/semantic/color.light.json")).color[EVIDENCE_TOKEN].$value;
    const dark = JSON.parse(read("tokens/semantic/color.dark.json")).color[EVIDENCE_TOKEN].$value;
    expect(evidence.source.find((r) => r.theme === "light")?.value).toBe(light);
    expect(evidence.source.find((r) => r.theme === "dark")?.value).toBe(dark);
    // the token is an alias, which is the point of the section: it has to resolve through a primitive
    expect(light).toMatch(/^\{color\.[\w.-]+\}$/);
    expect(evidence.source.filter((r) => r.theme === "both").length).toBeGreaterThan(0);
  });

  it("every code line is a line of the generated file it names", () => {
    for (const out of evidence.outputs) {
      const files = out.files.map((f) => read(f).split("\n"));
      let current = -1;
      for (const line of out.lines) {
        const named = out.files.findIndex((f) => line.includes(f.replace("packages/tokens/dist/", "")));
        if (named >= 0) {
          current = named;
          continue;
        }
        if (!line.trim()) continue;
        expect(current, `${out.platform}: a code line before any file label`).toBeGreaterThanOrEqual(0);
        // a declaration is shown without its generated doc comment, so it must be a prefix of a real line
        expect(
          files[current]!.some((l) => l === line || l.startsWith(`${line} /**`)),
          `${out.platform}: ${JSON.stringify(line)} is not in ${out.files[current]}`,
        ).toBe(true);
      }
    }
  });

  it("every platform holds the colour the source resolves to, in both themes", () => {
    for (const out of evidence.outputs) {
      const [light, dark] = declarations(out);
      expectHolds(light, cssVars.light, evidence.resolved.light, `${out.platform} light`);
      expectHolds(dark, cssVars.dark, evidence.resolved.dark, `${out.platform} dark`);
    }
    // and light and dark really differ, or the dark-mode half of the section shows nothing
    expect(evidence.resolved.light).not.toBe(evidence.resolved.dark);
  });

  it("fails loudly rather than rendering an empty block", () => {
    expect(() => tokenEvidence("no-such-token")).toThrow(/defines no color\.no-such-token/);
    expect(() => excerpt(":root {\n  --a: 1;\n}\n", "x.css", ":root {", /--b:/)).toThrow(/has no/);
    // a member after the block's closing brace is not inside the block
    expect(() => excerpt(":root {\n}\n  --b: 1;\n", "x.css", ":root {", /--b:/)).toThrow(/has no/);
  });
});

/**
 * The same proof for the whole semantic colour contract, not just the token the page shows: every semantic
 * colour exists in each platform's generated semantic set, light and dark, and holds the colour the source
 * resolves to. The page can therefore swap its example token without anyone re-checking by hand, and a
 * generator change that drops or mis-transforms a role on one platform fails here.
 */
describe("semantic colour contract — every role on every platform", () => {
  const names = Object.keys(JSON.parse(read("tokens/semantic/color.light.json")).color).filter((n) => n !== "semantic");

  it("finds a real contract to check", () => {
    expect(names.length).toBeGreaterThan(40);
  });

  it.each(names)("color.%s", (name) => {
    const evidence = tokenEvidence(name);
    for (const out of evidence.outputs) {
      const [light, dark] = declarations(out);
      expectHolds(light, cssVars.light, evidence.resolved.light, `${name} ${out.platform} light`);
      expectHolds(dark, cssVars.dark, evidence.resolved.dark, `${name} ${out.platform} dark`);
    }
  });
});
