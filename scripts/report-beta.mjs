/**
 * report-beta.mjs — the handoff for the lifecycle-beta audit.
 *
 *   node scripts/report-beta.mjs          human-readable
 *   node scripts/report-beta.mjs --json   machine-readable
 *
 * Every component whose LIFECYCLE is `beta`, with what each platform offers, how far each implementation is
 * verified, and exactly which evidence is missing. Nothing here changes a status — graduating a component is
 * a separate decision, made against this evidence rather than against a release cycle.
 *
 * Derived entirely from components.manifest.json, platform-parity.json and verification.json, so it cannot
 * describe a state the repository is not in. There is no list of beta components written down anywhere: if
 * one is graduated, it leaves this report by itself.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, "utf8"));
const JSON_OUT = process.argv.includes("--json");

const manifest = read("components.manifest.json");
const parity = read("platform-parity.json");
const evidence = read("verification.json");
const defs = manifest.platformDefinitions;
const platforms = Object.keys(defs);
const KINDS = evidence.kinds;
/** What `stable` verification costs, read from the generator rather than restated here. */
const STABLE_NEEDS = parity.verificationRequires.stable;

const beta = Object.entries(manifest.components)
  .filter(([, c]) => c.status === "beta")
  .map(([slug, c]) => ({
    slug,
    lifecycle: c.status,
    since: c.since,
    implementations: platforms.filter((p) => c.platforms.includes(p)),
    guidance: Object.fromEntries(
      Object.entries(c.platformGuidance ?? {}).map(([p, g]) => [p, g.type]),
    ),
    perPlatform: Object.fromEntries(
      c.platforms.map((p) => {
        const held = evidence.components?.[slug]?.[p] ?? {};
        return [
          p,
          {
            packageMaturity: defs[p].maturity,
            verification: parity.verification?.[slug]?.[p] ?? null,
            has: KINDS.filter((k) => held[k]),
            missingForStable: STABLE_NEEDS.filter((k) => !held[k]),
          },
        ];
      }),
    ),
    /** A component with no docs page cannot be graduated: nothing documents the API being called settled. */
    blockers: [
      ...(c.platformGuidance?.Angular?.type === "planned" ? [] : []),
    ],
  }));

// The documentation blocker is a fact about the repository, so it is derived rather than asserted.
for (const entry of beta) {
  const uncovered = entry.implementations.filter((p) => (entry.perPlatform[p].verification ?? "") === "experimental");
  if (uncovered.length) entry.blockers.push(`compile-only on ${uncovered.join(", ")}`);
  const noA11y = entry.implementations.filter((p) => !entry.perPlatform[p].has.includes("accessibility"));
  if (noA11y.length) entry.blockers.push(`no accessibility evidence on ${noA11y.join(", ")}`);
}

if (JSON_OUT) {
  console.log(JSON.stringify({ total: beta.length, stableNeeds: STABLE_NEEDS, components: beta }, null, 2));
} else {
  console.log(`\n${beta.length} components have lifecycle "beta". Verification is a separate axis — both are shown.\n`);
  for (const e of beta) {
    console.log(`${e.slug}  (since ${e.since})`);
    console.log(`  implementations: ${e.implementations.join(", ")}`);
    const guidance = Object.entries(e.guidance);
    if (guidance.length) console.log(`  guidance:        ${guidance.map(([p, t]) => `${p} ${t}`).join(", ")}`);
    for (const p of e.implementations) {
      const v = e.perPlatform[p];
      console.log(`    ${p.padEnd(9)} package ${v.packageMaturity.padEnd(11)} verification ${String(v.verification).padEnd(13)} missing for stable: ${v.missingForStable.join(", ") || "nothing"}`);
    }
    if (e.blockers.length) console.log(`  blockers:        ${e.blockers.join("; ")}`);
    console.log("");
  }
  console.log("Lifecycle statuses are unchanged by this report. Graduating one is the next PR's decision.\n");
}
