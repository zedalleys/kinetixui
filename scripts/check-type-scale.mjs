/**
 * check-type-scale.mjs — the web type scale must stay relative, and must stay the canonical one.
 *
 *   node scripts/check-type-scale.mjs
 *
 * Two failures this exists to prevent, both of which had already happened:
 *
 *  1. A font size or line height silently returns to an absolute unit. px does not follow the
 *     reader's browser font-size setting, so a token emitted in px is text that cannot be made
 *     bigger — WCAG 1.4.4. Measured before this guard existed: 1,357 rendered elements across 115
 *     Storybook stories carried a type-scale class, and every one of them was pinned at 200% text.
 *
 *  2. The Tailwind scale and the canonical tokens drift. `packages/ui/tailwind.config.ts` is what
 *     `text-body-md` actually compiles to, and it was a hand-written copy of the token values with
 *     nothing checking it. That is how it kept its px values after globals.css would have moved.
 *
 * This is a semantic check, not a substring ban. Only `fontSize.*` and `lineHeight.*` are required
 * to be relative; letter-spacing, spacing, radii and border widths are legitimately absolute, and
 * the native platforms have their own units (sp, Dynamic Type, TextScaler) which this does not read.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");

/** The unit a web font size or line height may be expressed in, and why it is allowed. */
const RELATIVE = /^(0|-?\d*\.?\d+(rem|em))$/;
const REM_BASE = 16;
const expected = (n) => (Number(n) === 0 ? "0" : `${Number((Number(n) / REM_BASE).toFixed(4))}rem`);

const prim = JSON.parse(read("tokens/primitives/typography.json"));
const errors = [];

/* ── 1. the canonical scale, converted, is what the web artifacts must contain ─────────────── */

const WEB = [
  { file: "packages/tokens/dist/web/globals.css", kind: "css", prefix: "--font-size-", group: "fontSize" },
  { file: "packages/tokens/dist/web/globals.css", kind: "css", prefix: "--line-height-", group: "lineHeight" },
  { file: "registry/kinetixui/globals.css", kind: "css", prefix: "--font-size-", group: "fontSize" },
  { file: "registry/kinetixui/globals.css", kind: "css", prefix: "--line-height-", group: "lineHeight" },
];

for (const { file, prefix, group } of WEB) {
  const text = read(file);
  for (const [step, def] of Object.entries(prim[group])) {
    const m = text.match(new RegExp(`${prefix}${step}:\\s*([^;]+);`));
    if (!m) {
      errors.push(`${file}: ${prefix}${step} is missing — the canonical scale declares ${group}.${step}.`);
      continue;
    }
    const got = m[1].trim();
    if (!RELATIVE.test(got)) {
      errors.push(
        `${file}: ${prefix}${step} is ${got}, an absolute unit.\n` +
          `      source: tokens/primitives/typography.json ${group}.${step} = ${def.$value}\n` +
          `      expected: ${expected(def.$value)} — a font size in px cannot follow the reader's text setting.`,
      );
    } else if (got !== expected(def.$value)) {
      errors.push(
        `${file}: ${prefix}${step} is ${got} but the canonical value is ${def.$value}.\n` +
          `      source: tokens/primitives/typography.json ${group}.${step}\n` +
          `      expected: ${expected(def.$value)}`,
      );
    }
  }
}

/* ── 2. the Tailwind scale is the canonical scale ──────────────────────────────────────────── */

const sem = JSON.parse(read("tokens/semantic/typography.json")).text;
const ref = (s) => s.slice(s.indexOf(".") + 1, -1);
const cfg = read("packages/ui/tailwind.config.ts");
const CFG = "packages/ui/tailwind.config.ts";

for (const [step, def] of Object.entries(sem)) {
  const v = def.$value;
  const m = cfg.match(new RegExp(`"${step}":\\s*\\["([^"]+)",\\s*\\{\\s*lineHeight:\\s*"([^"]+)"`));
  if (!m) {
    errors.push(`${CFG}: the type scale has no "${step}" step, but tokens/semantic/typography.json declares text.${step}.`);
    continue;
  }
  const [, size, lh] = m;
  const wantSize = expected(prim.fontSize[ref(v.fontSize)].$value);
  const wantLh = expected(prim.lineHeight[ref(v.lineHeight)].$value);
  for (const [label, got, want, group, token] of [
    ["font size", size, wantSize, "fontSize", ref(v.fontSize)],
    ["line height", lh, wantLh, "lineHeight", ref(v.lineHeight)],
  ]) {
    if (!RELATIVE.test(got)) {
      errors.push(
        `${CFG}: text-${step} ${label} is ${got}, an absolute unit.\n` +
          `      source: tokens/primitives/typography.json ${group}.${token} = ${prim[group][token].$value}\n` +
          `      expected: ${want} — this table is what text-${step} compiles to, so px here pins the text` +
          ` even when the tokens are relative.`,
      );
    } else if (got !== want) {
      errors.push(
        `${CFG}: text-${step} ${label} is ${got}, which is not the canonical value.\n` +
          `      source: tokens/primitives/typography.json ${group}.${token} = ${prim[group][token].$value}\n` +
          `      expected: ${want}`,
      );
    }
  }
}

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
const steps = Object.keys(sem).length;
console.log(
  `check:type-scale ok — ${steps} steps relative and matching the canonical scale in ` +
    `tailwind.config.ts, globals.css and the registry bundle.`,
);
