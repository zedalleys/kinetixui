/**
 * check-grid.mjs — KinetixUI's spatial grid: an 8-unit base with a 4-unit half-step.
 *
 *   node scripts/check-grid.mjs
 *
 * The grid governs spacing, layout and control sizing — NOT typography, and not 1–2px hairlines or
 * optical nudges. Every multiple of 4 is on the grid (8 is the base step, the other multiples of 4 are the
 * half-steps). This check keeps it that way without rewriting anything that already works:
 *
 *   1. tokens — every `spacing.*` value, and every `radius.*` value except `none` and `full`, is a
 *      multiple of 4 (tokens/primitives/dimension.json).
 *   2. library — packages/ui/src/components must not gain a NEW arbitrary pixel value (`p-[13px]`,
 *      `gap-[22px]`, `size-[18px]`…) that is not a multiple of 4. The few that exist are listed in
 *      EXCEPTIONS with the reason, and a line can opt out with a `grid-ok` comment. A stale exception
 *      (the value is gone) also fails, so the list only shrinks.
 *   3. site — apps/web/src is reported, not enforced: its illustrative demo frames use one-off sizes.
 *
 * Tailwind's `.5` steps (2/6/10/14px) are deliberately not policed: they are the optical spacing the
 * components already use between an icon and its label. Only arbitrary values are.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const errors = [];

// ── 1. tokens ───────────────────────────────────────────────────────────────────────────────────
const dim = JSON.parse(readFileSync(join(root, "tokens/primitives/dimension.json"), "utf8"));
// a token value, following a `{radius.md}`-style alias to the step it points at
const resolve = (t, group, seen = 0) => {
  const ref = typeof t.$value === "string" && t.$value.match(/^\{([\w-]+)\.([\w-]+)\}$/);
  if (!ref) return Number(t.$value);
  if (seen > 3 || ref[1] !== group || !dim[group][ref[2]]) {
    errors.push(`${group} alias "${t.$value}" does not point at a step in ${group}`);
    return NaN;
  }
  return resolve(dim[group][ref[2]], group, seen + 1);
};
const value = (t, group = "spacing") => resolve(t, group);
const spacing = Object.entries(dim.spacing).map(([k, t]) => [k, value(t)]);
for (const [k, v] of spacing) if (v % 4 !== 0) errors.push(`spacing.${k} = ${v} is not a multiple of 4`);
for (const [k, t] of Object.entries(dim.radius)) {
  if (k === "none" || k === "full") continue;
  if (value(t, "radius") % 4 !== 0) errors.push(`radius.${k} = ${value(t, "radius")} is not a multiple of 4`);
}
const base = spacing.filter(([, v]) => v % 8 === 0).length;
const half = spacing.length - base;

// ── 2 + 3. source ───────────────────────────────────────────────────────────────────────────────
const PROPS = "p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y|h|w|size|min-h|min-w|max-h|max-w|inset|top|bottom|left|right|start|end|basis";
const ARBITRARY = new RegExp(`(?:^|[\\s"'\`:!-])(?:${PROPS})-\\[(\\d+(?:\\.\\d+)?)px\\]`, "g");

/** file:value → why it is allowed. Justify, don't just add. */
const EXCEPTIONS = {
  "button.tsx:18": "icon size from the design source (Material-style 18px glyph in a 40px control)",
  "checkbox.tsx:18": "checkbox box is 18px in the design source (Material-style)",
  "radio-group.tsx:18": "radio ring is 18px in the design source (Material-style)",
};

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", "dist", ".next", "stories"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name.endsWith(".tsx")) yield p;
  }
}

function scan(dir) {
  const hits = []; // { file, value, line }
  for (const file of walk(dir)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((text, i) => {
      if (text.includes("grid-ok")) return;
      ARBITRARY.lastIndex = 0;
      let m;
      while ((m = ARBITRARY.exec(text))) {
        const px = parseFloat(m[1]);
        if (px % 4 !== 0) hits.push({ file: file.split(/[\\/]/).pop(), path: file, value: px, line: i + 1 });
      }
    });
  }
  return hits;
}

const lib = scan(join(root, "packages/ui/src/components"));
const used = new Set();
for (const h of lib) {
  const key = `${h.file}:${h.value}`;
  if (key in EXCEPTIONS) used.add(key);
  else errors.push(`${h.path.replace(root, "").replace(/\\/g, "/")}:${h.line} — arbitrary ${h.value}px is off the 4-unit grid (use a spacing token / a multiple of 4, or add a justified EXCEPTION, or a \`grid-ok\` comment)`);
}
for (const key of Object.keys(EXCEPTIONS)) if (!used.has(key)) errors.push(`stale exception "${key}" — that value is gone; remove it from EXCEPTIONS in scripts/check-grid.mjs`);

const site = scan(join(root, "apps/web/src"));

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  console.error(`\ncheck:grid failed (${errors.length}).`);
  process.exit(1);
}
console.log(
  `check:grid ok — ${spacing.length} spacing steps on the grid (${base} base × 8, ${half} half-step × 4); ` +
    `library: ${lib.length} justified off-grid value(s), no new ones; site (report only): ${site.length} one-off value(s).`,
);
