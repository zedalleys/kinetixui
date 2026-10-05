import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, type PresetConfig } from "@kinetixui/create-preset";
import { contrastRatio, hslChannelsToHex } from "./color-math";
import { ROLE_DEFAULTS } from "./contract";
import { exportCompose } from "./exporters/compose";
import { exportCss } from "./exporters/css";
import { exportFlutter } from "./exporters/flutter";
import { exportSwiftUi } from "./exporters/swiftui";
import { SHIPPED_COLORS, resolveCreateTheme, type ResolvedCreateTheme } from "./resolve";
import type { Mode } from "./engine";

/**
 * One design, one meaning — on every output.
 *
 * Audit P1-3: pinning `primary` in Advanced gave the scoped preview a blue button (it writes every role
 * as a value), the copied CSS a green one (`--action: var(--primary)` follows on a real page), and the
 * native exports a blue one again (they wrote `action` as the shipped reference). This file applies each
 * output the way its platform would and asserts that the interactive roles land on the colour the
 * resolver says, so the three cannot drift apart again.
 */

const ROLES = ["primary", "primary-foreground", "action", "action-foreground", "link", "focus", "ring", "brand"] as const;

const DESIGNS: [string, Partial<PresetConfig>][] = [
  ["primary pinned", { manualOverrides: { primary: "#047857" } }],
  ["primary and its foreground pinned", { manualOverrides: { primary: "#047857", "primary-foreground": "#ffffff" } }],
  ["ring pinned", { manualOverrides: { ring: "#b91c1c" } }],
  ["action pinned on its own", { manualOverrides: { action: "#047857" } }],
  ["primary and action pinned apart", { manualOverrides: { primary: "#047857", action: "#7c3aed" } }],
  ["brand seed", { brand: "#c2410c" }],
  ["brand seed, then primary pinned", { brand: "#c2410c", manualOverrides: { primary: "#047857" } }],
  ["brand seed, focus pinned, ring pinned", { brand: "#c2410c", manualOverrides: { focus: "#7c3aed", ring: "#b91c1c" } }],
];

const design = (d: Partial<PresetConfig>): PresetConfig => ({ ...DEFAULT_PRESET, ...d, manualOverrides: { ...d.manualOverrides } });

/** Two colours are the same output when they differ only by a format's rounding (integer HSL, 3-dp Swift). */
const same = (a: string, b: string) => contrastRatio(a, b) < 1.03;

/* ------------------------------------------------------------------ the web, as a browser would see it */

const dist = (file: string) => readFileSync(new URL(`../../tokens/dist/web/${file}`, import.meta.url), "utf8");

function declarations(css: string, selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "g");
  for (const block of css.matchAll(re)) {
    const body = block[1]!.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  }
  return out;
}

const shippedRoot = { ...declarations(dist("globals.css"), ":root"), ...declarations(dist("extras.css"), ":root") };
const shippedDark = { ...declarations(dist("globals.dark.css"), ".dark"), ...declarations(dist("extras.dark.css"), ".dark") };

/**
 * The computed value of a custom property on `<html>`: the shipped stylesheet, then the exported block
 * appended after it (same specificity, later wins), with `var()` chains followed to the channels.
 */
function webValue(theme: ResolvedCreateTheme, mode: Mode, role: string): string {
  const exported = exportCss(theme);
  const decls = {
    ...shippedRoot,
    ...(mode === "dark" ? shippedDark : {}),
    ...declarations(exported, ":root"),
    ...(mode === "dark" ? declarations(exported, ".dark") : {}),
  };
  let value = decls[`--${role}`];
  for (let hop = 0; value && hop < 8; hop++) {
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    if (!ref) break;
    value = decls[ref[1]!];
  }
  if (!value) throw new Error(`--${role} does not resolve`);
  return hslChannelsToHex(value);
}

/* ------------------------------------------------------------------ the native exports, field by field */

const camel = (token: string) => token.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Every `field: value` / `field = value` in the export, light block first, dark block second. */
function nativeValues(source: string, token: string, literal: (v: string) => string | null): Record<Mode, string> | null {
  const field = camel(token);
  const hits = [...source.matchAll(new RegExp(`^\\s*${field}\\s*[:=]\\s*([^,\\n]+),?$`, "gm"))].map((m) => m[1]!.trim());
  if (hits.length === 0) return null;
  expect(hits, `${field} appears once per appearance`).toHaveLength(2);
  const read = (value: string, mode: Mode) => literal(value) ?? SHIPPED_COLORS[mode][token]!;
  return { light: read(hits[0]!, "light"), dark: read(hits[1]!, "dark") };
}

const swiftLiteral = (v: string) => {
  const m = v.match(/Color\(red: ([\d.]+), green: ([\d.]+), blue: ([\d.]+)\)/);
  if (!m) return null;
  return `#${m.slice(1, 4).map((c) => Math.round(Number(c) * 255).toString(16).padStart(2, "0")).join("")}`;
};
const argbLiteral = (v: string) => v.match(/Color\(0x[fF]{2}([0-9a-fA-F]{6})\)/)?.[1]?.toLowerCase().replace(/^/, "#") ?? null;

const NATIVE: [string, (t: ResolvedCreateTheme) => string, (v: string) => string | null][] = [
  ["SwiftUI", exportSwiftUi, swiftLiteral],
  ["Compose", exportCompose, argbLiteral],
  ["Flutter", exportFlutter, argbLiteral],
];

/* ------------------------------------------------------------------ the assertions */

describe("an interactive role means the same colour in the preview, the CSS and every native export", () => {
  for (const [name, d] of DESIGNS) {
    describe(name, () => {
      const theme = resolveCreateTheme(design(d));

      for (const mode of ["light", "dark"] as const) {
        it(`${mode}: the copied CSS, applied over the shipped stylesheet, computes the resolved roles`, () => {
          for (const role of ROLES) {
            const want = theme[mode].colors[role]!;
            const got = webValue(theme, mode, role);
            expect(same(got, want), `--${role}: page ${got} vs resolved ${want}`).toBe(true);
          }
        });
      }

      for (const [platform, exporter, literal] of NATIVE) {
        it(`${platform}: every exported interactive field is the resolved colour`, () => {
          const source = exporter(theme);
          for (const role of [...ROLES, "action-hover", "action-pressed"]) {
            const values = nativeValues(source, role, literal);
            if (!values) continue; // the platform has no such field (Compose has no `ring`)
            for (const mode of ["light", "dark"] as const) {
              const want = theme[mode].colors[role]!;
              expect(same(values[mode], want), `${platform} ${mode} ${role}: ${values[mode]} vs ${want}`).toBe(true);
            }
          }
        });
      }
    });
  }
});

describe("the role-default rule", () => {
  it("is the token source's own alias graph, in both modes", () => {
    for (const mode of ["light", "dark"] as const) {
      const source = JSON.parse(readFileSync(new URL(`../../../tokens/semantic/color.${mode}.json`, import.meta.url), "utf8"));
      const aliases: Record<string, string> = {};
      const walk = (node: Record<string, unknown>, path: string[]) => {
        for (const [key, value] of Object.entries(node)) {
          if (key.startsWith("$") || typeof value !== "object" || value === null) continue;
          const v = (value as { $value?: unknown }).$value;
          const ref = typeof v === "string" ? v.match(/^\{color\.([\w-]+)\}$/) : null;
          if (ref && path.length === 1 && path[0] === "color") aliases[key] = ref[1]!;
          walk(value as Record<string, unknown>, [...path, key]);
        }
      };
      walk(source, []);
      // Every semantic role that is a plain alias of another semantic role, and nothing else.
      const roleAliases = Object.fromEntries(Object.entries(aliases).filter(([, to]) => !/-\d+$/.test(to) && !/^(azure|blue|green|taupe|cream|amber|red|neutral|static)\b/.test(to)));
      expect(roleAliases, mode).toEqual(ROLE_DEFAULTS);
    }
  });

  it("follows the source only when the role itself is not pinned", () => {
    const t = resolveCreateTheme(design({ manualOverrides: { primary: "#047857", link: "#7c3aed" } }));
    expect(t.light.colors.action).toBe("#047857");
    expect(t.light.colors.link).toBe("#7c3aed");
  });

  it("regenerates the native hover and pressed fills from a hand-set action", () => {
    const t = resolveCreateTheme(design({ manualOverrides: { primary: "#047857" } }));
    for (const mode of ["light", "dark"] as const) {
      const c = t[mode].colors;
      expect(c["action-hover"]).not.toBe(SHIPPED_COLORS[mode]["action-hover"]);
      expect(c["action-pressed"]).not.toBe(SHIPPED_COLORS[mode]["action-pressed"]);
      // the fills belong to the action they sit under, not to the shipped blue
      expect(contrastRatio(c["action-hover"]!, c.action!)).toBeLessThan(1.6);
    }
  });

  it("keeps the label readable on rest, hover and pressed for a hand-set action", () => {
    const t = resolveCreateTheme(design({ manualOverrides: { primary: "#047857" } }));
    for (const mode of ["light", "dark"] as const) {
      const c = t[mode].colors;
      for (const fill of ["action", "action-hover", "action-pressed"]) {
        expect(contrastRatio(c[fill]!, c["action-foreground"]!), `${mode} ${fill}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("leaves a foreground the user set exactly as typed", () => {
    const t = resolveCreateTheme(design({ manualOverrides: { primary: "#047857", "action-foreground": "#123456" } }));
    expect(t.light.colors["action-foreground"]).toBe("#123456");
    const u = resolveCreateTheme(design({ manualOverrides: { primary: "#047857", "primary-foreground": "#123456" } }));
    expect(u.light.colors["action-foreground"]).toBe("#123456");
  });

  it("changes nothing for the default design", () => {
    const t = resolveCreateTheme(DEFAULT_PRESET);
    expect(t.light.colors).toEqual(SHIPPED_COLORS.light);
    expect(t.dark.colors).toEqual(SHIPPED_COLORS.dark);
  });
});
