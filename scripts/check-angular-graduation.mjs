/**
 * check-angular-graduation.mjs — the objective contract for moving @kinetixui/angular from Preview to Stable.
 *
 *   node scripts/check-angular-graduation.mjs           print the matrix; fail only on an untruth
 *   node scripts/check-angular-graduation.mjs --json    the same, as JSON
 *
 * ── What it guards ─────────────────────────────────────────────────────────
 *
 * `platformDefinitions.Angular.maturity` in components.manifest.json is a product decision, and nothing
 * stopped anyone from writing "stable" there. The obvious stand-in for a rule — "stable when nothing is
 * planned" — is the wrong one: it would graduate a package whose implemented components had never been
 * rendered in a browser, never been read by axe in one, and never been measured at a large text size,
 * because counting components says nothing about how they behave.
 *
 * So Stable is defined here as a set of criteria over the implemented catalogue, each computed from a
 * canonical source — the manifest, verification.json (itself generated from the tests), the rendered visual
 * gate registry, the CI workflows and the package README — and this script FAILS when:
 *
 *   - Angular is declared `stable` while any criterion is unmet, or
 *   - `catalogComplete` is declared true while Angular still has planned entries, or
 *   - a criterion that is always required (documentation truth, CI wiring) is false, at any maturity.
 *
 * While Angular is Preview, unmet graduation criteria are the roadmap, not a failure: they are printed, and
 * the exit code is 0. This fails on untruths, not on progress — the same rule check:platform-completeness
 * applies to planned entries.
 *
 * ── The reference ──────────────────────────────────────────────────────────
 *
 * "Maturity appropriate to Angular" needs a yardstick that is not invented here. It is React: the other web
 * implementation, declared Stable, and measured with the same instruments. For every component Angular
 * implements, Angular must hold every claimable evidence kind React holds for that component, and where
 * React's evidence for a kind comes from a real browser (a `scripts/` instrument: axe in Chromium, the
 * large-text pass, the motion pass) Angular's must too — jsdom evidence does not stand in for a browser.
 * As React's evidence grows, the bar rises with it; nothing here has to be edited for that to happen.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VISUAL_GATES } from "./visual-gates.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");
const manifest = JSON.parse(read("components.manifest.json"));
const verification = JSON.parse(read("verification.json"));
const def = manifest.platformDefinitions.Angular;
const components = manifest.components;
const slugs = Object.keys(components);

const implemented = slugs.filter((s) => (components[s].platforms ?? []).includes("Angular"));
const guidance = (s) => components[s].platformGuidance?.Angular;
const planned = slugs.filter((s) => guidance(s)?.type === "planned");
const equivalents = slugs.filter((s) => ["native-equivalent", "composition"].includes(guidance(s)?.type));

/** Evidence for one platform/component/kind: the source references verification.json lists. */
const evidence = (platform, slug, kind) => verification.components[slug]?.[platform]?.[kind] ?? [];
/** A real-browser instrument: the repository's browser passes live in scripts/, unit suites beside the code. */
const inBrowser = (refs) => refs.some((r) => r.startsWith("scripts/"));
const CLAIMABLE = verification.claimableKinds.filter((k) => k !== "visual");

/* ── criteria ────────────────────────────────────────────────────────────── */

/**
 * Each criterion is computed, never typed. `always` marks the ones that must hold at any maturity — they are
 * statements about the present, not gates to Stable. `gaps` lists what is missing, so the matrix doubles as
 * the work list for the next wave.
 */
const criteria = [];
const criterion = (dimension, id, text, gaps, { always = false, have, need } = {}) =>
  criteria.push({ dimension, id, text, met: gaps.length === 0, gaps, always, have, need });

// CATALOGUE
criterion("Catalogue", "no-planned-gaps", "No Angular entry is still planned", planned, { have: implemented.length + equivalents.length, need: slugs.length });
criterion(
  "Catalogue",
  "equivalents-justified",
  "Every native-equivalent / composition entry carries its reason",
  equivalents.filter((s) => (guidance(s).reason ?? "").trim().length < 40),
  { always: true },
);
criterion("Catalogue", "catalog-flag-truthful", "`catalogComplete` is true only when nothing is planned", def.catalogComplete && planned.length ? ["catalogComplete is true with planned entries"] : [], { always: true });

// BUILD / DISTRIBUTION
const ci = read(".github/workflows/ci.yml");
const pkgWorkflow = read(".github/workflows/angular-package.yml");
criterion(
  "Build",
  "build-evidence",
  "Every implemented component compiles in CI (strict AOT)",
  implemented.filter((s) => !evidence("Angular", s, "build").length),
);
criterion(
  "Build",
  "ci-wiring",
  "CI builds the package, checks its API snapshot and runs its tests; the consumer install/AOT check runs",
  [
    [ci, "pnpm build:angular"],
    [ci, "pnpm check:angular-api"],
    [ci, "pnpm test:angular"],
    [ci, "pnpm check:angular-graduation"],
    [pkgWorkflow, "pnpm check:angular-package"],
  ]
    .filter(([file, cmd]) => !file.includes(cmd))
    .map(([, cmd]) => `${cmd} is not run in CI`),
  { always: true },
);

// BEHAVIOUR, ACCESSIBILITY, RTL, LARGE TEXT, MOTION — parity with React, kind by kind
const DIMENSION = { interaction: "Behaviour", accessibility: "Accessibility", rtl: "RTL", largeText: "Large text", reducedMotion: "Motion" };
for (const kind of CLAIMABLE) {
  // A floor that holds regardless of React: every implemented Angular component is driven, and has its
  // semantics asserted.
  if (kind === "interaction" || kind === "accessibility") {
    criterion(DIMENSION[kind], `${kind}-floor`, `Every implemented component has \`${kind}\` evidence`, implemented.filter((s) => !evidence("Angular", s, kind).length), {
      have: implemented.filter((s) => evidence("Angular", s, kind).length).length,
      need: implemented.length,
    });
  }
  const owed = implemented.filter((s) => evidence("React", s, kind).length);
  criterion(
    DIMENSION[kind],
    `${kind}-parity`,
    `Angular holds \`${kind}\` evidence wherever React does`,
    owed.filter((s) => !evidence("Angular", s, kind).length),
    { have: owed.filter((s) => evidence("Angular", s, kind).length).length, need: owed.length },
  );
  const browserOwed = owed.filter((s) => inBrowser(evidence("React", s, kind)));
  if (browserOwed.length) {
    criterion(
      DIMENSION[kind],
      `${kind}-in-browser`,
      `…and from a real browser wherever React's is (${[...new Set(browserOwed.flatMap((s) => evidence("React", s, kind)).filter((r) => r.startsWith("scripts/")).map((r) => r.split(":")[0]))].join(", ")})`,
      browserOwed.filter((s) => !inBrowser(evidence("Angular", s, kind))),
      { have: browserOwed.filter((s) => inBrowser(evidence("Angular", s, kind))).length, need: browserOwed.length },
    );
  }
}
// VISUAL — the rendered state gates
const visuallyCovered = (platform) => new Set(VISUAL_GATES.flatMap((g) => g.covers[platform] ?? []));
const reactVisual = visuallyCovered("React");
const angularVisual = visuallyCovered("Angular");
const visualOwed = implemented.filter((s) => reactVisual.has(s));
criterion(
  "Visual",
  "visual-state-parity",
  `A rendered visual/state gate covers Angular wherever one covers React (${VISUAL_GATES.map((g) => g.command).join(", ")})`,
  visualOwed.filter((s) => !angularVisual.has(s)),
  { have: visualOwed.filter((s) => angularVisual.has(s)).length, need: visualOwed.length },
);
criterion(
  "Visual",
  "visual-gates-real",
  "Every visual gate the registry lists exists and is run in CI",
  VISUAL_GATES.filter((g) => !read(".github/workflows/a11y-browser.yml").includes(`pnpm ${g.command}`) || !JSON.parse(read("package.json")).scripts[g.command]).map((g) => g.command),
  { always: true },
);
criterion(
  "Visual",
  "visual-only-implemented",
  "A visual gate claims Angular only for components Angular implements",
  [...angularVisual].filter((s) => !implemented.includes(s)),
  { always: true },
);

// DOCUMENTATION — the README ships in the npm tarball, so its numbers are published claims
const readme = read("packages/ui-angular/README.md");
const api = JSON.parse(read("packages/ui-angular/public-api.json"));
const listed = [...readme.matchAll(/`([a-z][a-z-]*)`/g)].map((m) => m[1]).filter((s) => components[s]);
const rtlCount = implemented.filter((s) => evidence("Angular", s, "rtl").length).length;
const docGaps = [];
const say = (re, want, what) => {
  const m = readme.match(re);
  if (!m) docGaps.push(`README: no ${what} statement`);
  else if (String(m[1]) !== String(want)) docGaps.push(`README says ${m[1]} ${what}; the manifest/evidence says ${want}`);
};
say(/carries \*\*(\d+) of the \d+ entries/, implemented.length, "catalogue entries (intro)");
say(/^(\d+) components, as/m, implemented.length, "components (What it provides)");
say(/as \*\*(\d+) exported symbols\*\*/, api.exportedSymbols.length, "exported symbols");
say(/\*\*Preview, and (\d+) of \d+ entries/, implemented.length, "entries (Limitations)");
say(/\*\*(\d+) of \d+ implementations have\s+interaction and accessibility/, implemented.length, "implementations with interaction + accessibility evidence");
say(/(\d+) components? (?:has|have) RTL verification/, rtlCount, "components with RTL verification");
const missing = implemented.filter((s) => !listed.includes(s));
if (missing.length) docGaps.push(`README "Present today" list omits ${missing.join(", ")}`);
const preview = /\*\*Preview\.\*\*/.test(readme);
if (def.maturity === "preview" && !preview) docGaps.push("README does not label the package Preview");
if (def.maturity === "stable" && preview) docGaps.push("README still labels a Stable package Preview");
criterion("Documentation", "readme-truthful", "The package README's counts, list and maturity label match the manifest and evidence", docGaps, { always: true });

/* ── verdict ─────────────────────────────────────────────────────────────── */

const gating = criteria.filter((c) => !c.always);
const unmetGating = gating.filter((c) => !c.met);
const untruths = criteria.filter((c) => c.always && !c.met);
const stableClaimed = def.maturity === "stable";
const errors = [
  ...untruths.map((c) => `${c.dimension}: ${c.text} — ${c.gaps.join("; ")}`),
  ...(stableClaimed ? unmetGating.map((c) => `Angular is declared stable but "${c.text}" is unmet (${c.gaps.length}: ${c.gaps.join(", ")})`) : []),
];

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ maturity: def.maturity, implemented: implemented.length, planned: planned.length, equivalents: equivalents.length, criteria, errors }, null, 2));
} else {
  console.log(`Angular graduation contract — declared ${def.maturity}, ${implemented.length} implemented · ${equivalents.length} equivalent · ${planned.length} planned of ${slugs.length}\n`);
  let dim = "";
  for (const c of criteria) {
    if (c.dimension !== dim) console.log(`  ${(dim = c.dimension)}`);
    const tally = c.need !== undefined ? ` ${c.have}/${c.need}` : "";
    const tag = c.met ? "met " : c.always ? "FAIL" : "open";
    const gaps = c.met ? "" : `\n          missing: ${c.gaps.slice(0, 12).join(", ")}${c.gaps.length > 12 ? `, … +${c.gaps.length - 12}` : ""}`;
    console.log(`    ${tag} ${c.text}${tally}${gaps}`);
  }
  console.log(`\n${gating.length - unmetGating.length} of ${gating.length} graduation criteria met; ${criteria.filter((c) => c.always).length - untruths.length} of ${criteria.filter((c) => c.always).length} standing truths hold.`);
}
if (errors.length) {
  console.error(`\n✗ check:angular-graduation\n` + errors.map((e) => `  ${e}`).join("\n"));
  process.exit(1);
}
if (!process.argv.includes("--json")) {
  console.log(
    stableClaimed
      ? "\ncheck:angular-graduation ok — every graduation criterion is met, so Stable is earned."
      : `\ncheck:angular-graduation ok — Angular stays ${def.maturity}: ${unmetGating.length} graduation criteria are still open, which is a roadmap and not a failure.`,
  );
}
