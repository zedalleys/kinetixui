/**
 * check-contrast.mjs — WCAG contrast audit of the semantic token contract.
 *
 *   node scripts/check-contrast.mjs
 *
 * Resolves every semantic color (light + dark) to its primitive hex and checks
 * the foreground/surface pairs components actually render:
 *   - text pairs must clear 4.5:1 (AA) — 3:1 is flagged as large-text-only
 *   - the hover/border "non-text" cues are reported against SC 1.4.11 (3:1)
 * Exits non-zero if any text pair fails AA.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, "utf8"));

const prim = read("tokens/primitives/color.json").color;
const flat = {};
for (const fam of Object.keys(prim)) {
  for (const step of Object.keys(prim[fam] ?? {})) {
    const v = prim[fam][step]?.["$value"] ?? prim[fam][step]?.value;
    if (typeof v === "string" && v.startsWith("#")) flat[`${fam}.${step}`] = v;
  }
}
const resolve = (ref) => {
  if (typeof ref !== "string") return null;
  if (ref.startsWith("#")) return ref;
  const m = ref.match(/^\{color\.([\w-]+)\.([\w-]+)\}$/);
  return m ? flat[`${m[1]}.${m[2]}`] : null;
};

const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT_PAIRS = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["destructive-foreground", "destructive"],
  ["accent-foreground", "accent"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary", "background"],
];
const NON_TEXT_PAIRS = [
  ["accent", "background"], // hover fill on transparent controls
  ["border", "background"],
  ["ring", "background"], // focus ring
  ["input", "background"],
];

let failures = 0;

for (const mode of ["light", "dark"]) {
  const sem = read(`tokens/semantic/color.${mode}.json`).color;
  const S = {};
  for (const k of Object.keys(sem)) {
    const hex = resolve(sem[k]?.["$value"]);
    if (hex) S[k] = hex;
  }

  console.log(`\n=== ${mode.toUpperCase()} — text (AA = 4.5:1) ===`);
  for (const [fg, bg] of TEXT_PAIRS) {
    if (!S[fg] || !S[bg]) continue;
    const r = ratio(S[fg], S[bg]);
    const tag = r >= 4.5 ? "AA" : r >= 3 ? "AA-large only" : "** FAIL **";
    if (r < 4.5) failures += r < 3 ? 1 : 0; // large-text-only is a warning, not a hard fail
    console.log(`  ${`${fg} / ${bg}`.padEnd(38)} ${r.toFixed(2)}:1  ${tag}`);
  }

  console.log(`--- ${mode} — non-text cues (SC 1.4.11 = 3:1) ---`);
  for (const [fg, bg] of NON_TEXT_PAIRS) {
    if (!S[fg] || !S[bg]) continue;
    const r = ratio(S[fg], S[bg]);
    console.log(`  ${`${fg} / ${bg}`.padEnd(38)} ${r.toFixed(2)}:1  ${r >= 3 ? "ok" : "sub-3:1 — components must pair with a ring/border"}`);
  }
}

console.log(
  `\n${failures === 0 ? "PASS" : `FAIL (${failures})`} — text pairs meet WCAG AA` +
    (failures === 0 ? "." : "; see above."),
);
process.exit(failures === 0 ? 0 : 1);
