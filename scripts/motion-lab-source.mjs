/**
 * motion-lab-source.mjs — the Motion Lab's source is held to MOTION.md's motion discipline.
 *
 *   node scripts/motion-lab-source.mjs
 *   node scripts/motion-lab-source.mjs --overrides '{"path":"<content>"}'   substitute file CONTENT (controls only)
 *
 * ── Why this file exists ───────────────────────────────────────────────────
 *
 * MOTION.md's rules — no `transition-all`, no CSS-default easings, every animated property named, layout
 * properties only with a recorded reason, durations and curves from tokens rather than literals — are
 * enforced by `apps/web/src/lib/motion-contract.test.ts`, whose `SCANNED` list is `packages/ui/src/components`
 * and `packages/iot/src`. **`apps/web` is not in it.** So the website's own motion has never been held to the
 * discipline the two library packages are held to, and a lab whose entire subject is motion is the worst place
 * for that to stay true.
 *
 * This gate covers the lab's files only. Widening it to the whole website is a separate slice with its own
 * backlog: a first pass over `apps/web/src` found literal easings and raw millisecond durations in existing
 * marketing components, and quietly fixing those here would be exactly the scope creep the brief forbids. The
 * finding is recorded in M5.25-FINAL-ENGINEERING-REPORT.md.
 *
 * `--overrides` substitutes file content in memory, so the negative controls can prove each clause fails
 * without writing a deliberate defect to disk. The CLI never passes it in normal use.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

/** Every file the lab owns. Listed rather than globbed, so a new lab file is a deliberate addition here too. */
const FILES = [
  "apps/web/src/lib/motion-lab/spring.ts",
  "apps/web/src/lib/motion-lab/variants.ts",
  "apps/web/src/lib/motion-lab/use-track-indicator.ts",
  "apps/web/src/components/motion-lab/lab-segmented-control.tsx",
  "apps/web/src/components/motion-lab/lab-tabs.tsx",
  "apps/web/src/components/motion-lab/lab-slider.tsx",
  "apps/web/src/components/motion-lab/motion-lab.tsx",
  "apps/web/src/app/labs/motion/page.tsx",
  "apps/web/src/app/labs/motion/motion-lab.css",
];

/**
 * Layout properties the lab animates, each with the reason, in the same shape as
 * `motion-contract.test.ts`'s ALLOWED map. An entry that no longer matches anything fails too, so a resolved
 * exemption cannot linger as a stale permission.
 */
const LAYOUT_ALLOWED = {
  "inset-inline-start":
    "the indicator's leading edge; a physical transform cannot mirror under RTL, which is the whole reason the `inset` technique is the default",
  "inset-inline-end": "the indicator's trailing edge, for the same reason",
  "inset-block-start": "the indicator's cross axis, so a wrapped strip's indicator stays on the chosen item's row",
  "inset-block-end": "the indicator's cross axis, for the same reason",
  "block-size": "the slider's tick marks grow as the thumb passes them, which is the cue",
};

const overrides = (() => {
  const i = process.argv.indexOf("--overrides");
  if (i === -1) return {};
  try {
    return JSON.parse(process.argv[i + 1]);
  } catch {
    console.error("motion-lab-source: --overrides must be JSON mapping a repo-relative path to file content");
    process.exit(2);
  }
})();

const read = (path) => (Object.hasOwn(overrides, path) ? overrides[path] : readFileSync(`${root}${path}`, "utf8"));

const failures = [];
const fail = (clause, path, detail) => failures.push(`${clause.padEnd(26)} ${path} — ${detail}`);

/** Every clause reads a POPULATION first. A clause that silently covers no file is a clause that cannot fail. */
const sources = FILES.map((path) => ({ path, src: read(path) }));
if (sources.length === 0 || sources.some((s) => typeof s.src !== "string" || s.src.length === 0)) {
  console.error("motion-lab-source: one of the lab's files is missing or empty — the gate cannot run over nothing");
  process.exit(2);
}

/** Comments explain the rules; they must not be mistaken for breaking them. Stripped before every clause. */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/(?<![:/])\/\/[^\n"'`]*$/gm, "");

/**
 * Splits a CSS value list on top-level commas only.
 *
 * `transition-delay: var(--kx-lab-start-delay, 0ms), var(--kx-lab-end-delay, 0ms)` is TWO delays, and a plain
 * `split(",")` makes it four fragments, two of which are `0ms)`. The first version of this gate reported five
 * untokenised durations for exactly that reason — a false positive on correct source, which is the failure
 * mode that teaches a reader to ignore a gate.
 */
const topLevelParts = (value) => {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
};

/** A value is tokenised when every one of its top-level parts is a token variable or a lab variable. */
const isTokenised = (value) => topLevelParts(value).every((part) => /^var\(\s*--(?:easing|duration|kx-lab)/.test(part));

const LAYOUT = /^(?:width|height|min-width|min-height|max-width|max-height|inline-size|block-size|top|left|right|bottom|inset(?:-[a-z]+)*|margin(?:-[a-z]+)*|padding(?:-[a-z]+)*|gap|flex(?:-[a-z]+)?)$/;

for (const { path, src } of sources) {
  const code = strip(src);

  // 1. `transition-all`, and its longhand twin `transition-property: all`.
  if (/transition-all\b/.test(code)) fail("transition-all", path, "animates every animatable property; name the ones that change");
  if (/transition-property:\s*all\b/.test(code)) fail("transition-all", path, "`transition-property: all` is `transition-all` spelled out");
  // The shorthand spelling. Found by its own negative control: the two rules above read the Tailwind utility
  // and the longhand, and `transition: all 300ms` — the plainest way anyone writes this defect in CSS — went
  // straight through a clause whose entire purpose is to stop it.
  for (const [, value] of code.matchAll(/(?:^|[;{\s])transition:\s*([^;"'`}]+)/g)) {
    if (topLevelParts(value).some((part) => /^all\b/.test(part))) fail("transition-all", path, `\`transition: ${value.trim().slice(0, 48)}\` animates every animatable property`);
  }

  // 2. The `transition` shorthand with no property named. `transition: opacity 200ms ...` is fine;
  //    `transition: 200ms ...` animates everything.
  for (const [, value] of code.matchAll(/(?<![-\w])transition:\s*([^;"'`}]+)/g)) {
    const first = value.trim().split(/\s+/)[0];
    if (/^(?:\d|var\(|cubic-bezier|ease|linear|step)/.test(first)) fail("unnamed-transition", path, `\`transition: ${value.trim().slice(0, 48)}\` names no property`);
  }

  // 3. CSS-default and arbitrary easings. The five tokens are the vocabulary. Captured and then tested, rather
  //    than excluded by a lookahead: the lookahead version reported every correct `var(--easing-*)` as a
  //    finding, and a clause that cannot be read cannot be trusted.
  for (const [, value] of code.matchAll(/(?:transition-timing-function|animation-timing-function):\s*([^;"'`}]+)/g)) {
    if (!isTokenised(value)) fail("untokenised-easing", path, `timing function \`${value.trim().slice(0, 56)}\` — use var(--easing-*)`);
  }
  for (const [match] of code.matchAll(/\bease-(?:in-out|in|out)\b|\bease-\[[^\]]*\]/g)) {
    fail("untokenised-easing", path, `${match} — use ease-standard / ease-enter / ease-exit / ease-emphasized / ease-linear`);
  }

  // 4. Raw durations. Every duration must be a token variable or a Tailwind duration utility; `0ms` and
  //    `0.01ms` are the two exceptions, because "no interpolation" and the reduced-motion floor are not tiers.
  for (const [, value] of code.matchAll(/(?:transition-duration|animation-duration|transition-delay|animation-delay):\s*([^;"'`}]+)/g)) {
    for (const part of topLevelParts(value)) {
      if (/^var\(\s*--(?:duration|kx-lab)/.test(part)) continue;
      if (/^0(?:\.01)?m?s$/.test(part) || part === "0") continue;
      fail("untokenised-duration", path, `\`${part}\` in \`${value.trim().slice(0, 48)}\` is not a tier`);
    }
  }
  for (const [, value] of code.matchAll(/"transition:\s*[a-z-]+\s+(\d+m?s)/g)) {
    fail("untokenised-duration", path, `inline transition uses the literal ${value}`);
  }

  // 5. Layout-property animation, allowed only with a recorded reason.
  const named = new Set();
  for (const [, list] of code.matchAll(/transition-property:\s*([^;"'`}]+)/g)) for (const prop of topLevelParts(list)) named.add(prop);
  for (const [, list] of code.matchAll(/transition-\[([^\]]+)\]/g)) for (const prop of topLevelParts(list)) named.add(prop);
  for (const prop of named) {
    if (!LAYOUT.test(prop)) continue;
    if (!Object.hasOwn(LAYOUT_ALLOWED, prop)) fail("layout-property", path, `animates \`${prop}\` with no recorded reason`);
  }
}

// 6. The allowlist cannot go stale: an entry nothing matches must be removed.
const everyNamed = new Set();
for (const { src } of sources) {
  const code = strip(src);
  for (const [, list] of code.matchAll(/transition-property:\s*([^;"'`}]+)/g)) for (const p of topLevelParts(list)) everyNamed.add(p);
  for (const [, list] of code.matchAll(/transition-\[([^\]]+)\]/g)) for (const p of topLevelParts(list)) everyNamed.add(p);
}
for (const prop of Object.keys(LAYOUT_ALLOWED)) {
  if (!everyNamed.has(prop)) fail("stale-exemption", "tokens(this file)", `\`${prop}\` is excused and animated nowhere — remove the entry`);
}

// 7. A reduced-motion form must exist for the lab, in the engine and in the stylesheet, and the override must
//    be OR-ed with the system preference rather than replacing it. The exact expression is asserted, because
//    `reduceQuery.matches && reduceOverride` would also read as "reduced motion is handled".
const engine = strip(read("apps/web/src/lib/motion-lab/use-track-indicator.ts"));
if (!/reduceQuery\.matches\s*\|\|\s*reduceOverride/.test(engine)) {
  fail("one-way-reduction", "apps/web/src/lib/motion-lab/use-track-indicator.ts", "the effective preference must be `system OR override`, so the page can add reduction and never remove it");
}
if (!/!reduced\(\)/.test(engine)) {
  fail("reduced-not-enforced", "apps/web/src/lib/motion-lab/use-track-indicator.ts", "`travels` must be gated on the effective preference: a rAF-driven spring is invisible to CSS, so the floor cannot be left to the stylesheet");
}
const css = read("apps/web/src/app/labs/motion/motion-lab.css");
if (!/@media \(prefers-reduced-motion: reduce\)/.test(css)) {
  fail("reduced-not-enforced", "apps/web/src/app/labs/motion/motion-lab.css", "no reduced-motion block for the layers CSS owns outright");
}
if (!/@media \(forced-colors: active\)/.test(css)) {
  fail("forced-colours", "apps/web/src/app/labs/motion/motion-lab.css", "no forced-colours block: the indicator must give way to the system selection pair");
}

if (failures.length) {
  console.error(`motion-lab-source: ${failures.length} finding(s) across ${sources.length} file(s)\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`motion-lab-source ok — ${sources.length} files, 7 clauses, ${Object.keys(LAYOUT_ALLOWED).length} recorded layout exemptions`);
