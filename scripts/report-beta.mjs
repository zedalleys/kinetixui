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
    /**
     * Why this component's PRODUCT or API is still beta, in its own words, from the manifest.
     *
     * Verification gaps are reported separately below and are never listed here. A component can be
     * lifecycle stable with an experimental SwiftUI implementation: one statement is about whether the API
     * is settled, the other about how much automated evidence stands behind a port. Conflating them is how
     * "beta" came to mean "nobody ran the release chore".
     */
    lifecycleBlocker: c.lifecycleReason ?? null,
  }));

if (JSON_OUT) {
  console.log(JSON.stringify({ total: beta.length, stableNeeds: STABLE_NEEDS, components: beta }, null, 2));
} else if (!beta.length) {
  console.log("\nNo components are lifecycle beta.\n");
} else {
  console.log(`\n${beta.length} component(s) have lifecycle "beta".\n`);
  console.log("Lifecycle blockers are about the product and the API. Verification gaps are about how much");
  console.log("automated evidence stands behind each port — a verification gap is NOT a reason to stay beta.\n");
  for (const e of beta) {
    console.log(`${"=".repeat(70)}`);
    console.log(`${e.slug}  —  lifecycle beta since ${e.since}\n`);
    console.log("  Lifecycle blockers");
    const reason = e.lifecycleBlocker ?? "none recorded — that is itself a gap";
    for (const line of reason.split(". ")) {
      if (line.trim()) console.log(`    - ${line.trim().replace(/\.$/, "")}`);
    }
    console.log("\n  Verification gaps (not lifecycle blockers)");
    for (const p of e.implementations) {
      const v = e.perPlatform[p];
      const missing = v.missingForStable.filter((k) => k !== "published");
      console.log(
        `    ${p.padEnd(9)} verification ${String(v.verification).padEnd(13)} ${missing.length ? `missing: ${missing.join(", ")}` : "complete"}`,
      );
    }
    const guidance = Object.entries(e.guidance);
    if (guidance.length) console.log(`\n  Platform guidance: ${guidance.map(([p, t]) => `${p} ${t}`).join(", ")}`);
    console.log("");
  }
  console.log("Lifecycle statuses are unchanged by this report — graduating one is a deliberate decision.\n");
}
