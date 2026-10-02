/**
 * check-native-motion.mjs — the ledger of native motion, and who answers to the reader's setting.
 *
 *   node scripts/check-native-motion.mjs
 *
 * ── This is a SECONDARY guard, and the distinction matters ────────────────
 *
 * It does not verify accessibility. It cannot: a file containing the word
 * `accessibilityReduceMotion` proves nothing about what happens on screen, and treating that as
 * evidence is the exact failure the web motion gate was built to stop. The PRIMARY proof lives in
 * the platforms' own test suites, run by their own CI:
 *
 *   Flutter   `test/disclosure_motion_test.dart` — renders, drives the clock by hand, and measures a
 *             real intermediate height mid-transition. The strongest evidence in the slice.
 *   Compose   `DisclosureMotionTest.kt` — Robolectric composes for real; asserts the spec's duration
 *             and easing, and that the state change still completes with animations off.
 *   SwiftUI   `DisclosureMotionTests.swift` — the resolver's contract. That package has no
 *             view-inspection library, so nothing there can render; the limit is stated, not hidden.
 *
 * What THIS catches is the bookkeeping those tests cannot: a component that starts animating and
 * never gets wired to the reader's preference, a family member quietly dropped from the contract, a
 * direction tested in one direction only, and a stale ledger. Those are structural facts about which
 * files reference what, which is exactly what a source check is good for and all it is claimed to be.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `--root=<dir>` scans a fixture tree instead of this repository, which is what makes the clauses
 * below testable. Every clause here is a claim that some arrangement of source FAILS, and a claim
 * like that is worth nothing until it has been watched to fail — see
 * `apps/web/src/lib/native-motion-guard.test.ts`, which builds a passing fixture and then breaks one
 * thing at a time.
 */
const argRoot = process.argv.slice(2).find((a) => a.startsWith("--root="))?.slice("--root=".length);
const root = argRoot ? resolve(argRoot) : fileURLToPath(new URL("..", import.meta.url));
const read = (p) => (existsSync(`${root}/${p}`) ? readFileSync(`${root}/${p}`, "utf8") : null);

import { DIRECTION_TERMS, KNOWN_GAPS, PLATFORMS, testNames } from "./native-motion-spec.mjs";

const errors = [];
const summary = [];

for (const [name, p] of Object.entries(PLATFORMS)) {
  const dir = `${root}/${p.dir}`;
  if (!existsSync(dir)) {
    errors.push(`${name}: source directory ${p.dir} is missing.`);
    continue;
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(p.ext));
  const animated = files.filter((f) => p.animates.test(readFileSync(`${dir}/${f}`, "utf8")));
  const gaps = KNOWN_GAPS[name] ?? {};
  const families = Object.entries(p.families);
  const helpers = families.map(([, f]) => f.helper);
  const wired = families.flatMap(([, f]) => f.members);

  for (const [familyName, family] of families) {
    // 1. The helper must exist — it is what the family's members delegate to.
    if (!files.includes(family.helper)) {
      errors.push(`${name}: the ${familyName} motion helper ${family.helper} is missing from ${p.dir}.`);
    }

    // 2. Every member must reach the reader's setting, directly or through its helper.
    for (const member of family.members) {
      const src = read(`${p.dir}/${member}`);
      if (src === null) {
        errors.push(`${name}: declared ${familyName} member ${member} does not exist.`);
        continue;
      }
      const routed = p.preference.test(src) || src.includes(family.helper.replace(p.ext, ""));
      if (!routed) {
        errors.push(
          `${name}/${member}: in the ${familyName} family but reaches neither the platform preference nor ${family.helper}.\n` +
            `      A family's reduced-motion contract is only as good as its least-wired member.`,
        );
      }

      // 3. A member that resolves a DIRECTIONAL animation must choose the direction from state.
      //    SwiftUI's Collapsible hardcoded `.expanding`, so the exit curve the resolver defines was
      //    unreachable and a collapse was never animated at all. Only families with an asymmetric
      //    pair are checked: a switch is symmetric and has no second direction to name.
      if (family.directions) {
        const [forward, reverse] = family.directions;
        if (forward.test(src) && !reverse.test(src)) {
          errors.push(
            `${name}/${member}: names the expanding direction but never the collapsing one.\n` +
              `      Opening and closing have different curves; selecting one unconditionally means the\n` +
              `      other is dead code. Choose the direction from state.`,
          );
        }
      }
    }

    // 4. The family's test must exercise both directions, in that family's own vocabulary.
    const test = read(family.test);
    if (test === null) {
      errors.push(`${name}: no reduced-motion test for the ${familyName} family at ${family.test}.`);
      continue;
    }
    const names = testNames(name, test);
    if (names.length === 0) {
      errors.push(`${name}: ${family.test} declares no recognisable tests — the direction check has nothing to read.`);
      continue;
    }
    const terms = DIRECTION_TERMS[familyName];
    if (!terms) {
      errors.push(`${name}: the ${familyName} family has no direction vocabulary in DIRECTION_TERMS.`);
      continue;
    }
    for (const [dirName, re] of Object.entries(terms)) {
      if (!names.some((n) => re.test(n))) {
        errors.push(
          `${name}: no test in ${family.test} is NAMED for the ${dirName} direction.\n` +
            `      The two directions are separate transitions, so proving one says nothing about the\n` +
            `      other. Found: ${names.slice(0, 6).map((n) => `"${n}"`).join(", ")}${names.length > 6 ? ", …" : ""}`,
        );
      }
    }
  }

  // 5. An animated component must belong to a family, be a helper, or be a declared gap. This is the
  //    clause that fires on the commit which adds motion without wiring it up.
  for (const f of animated) {
    if (wired.includes(f) || helpers.includes(f)) continue;
    if (!(f in gaps)) {
      errors.push(
        `${name}/${f}: animates, but is in no motion family and is not listed in KNOWN_GAPS.\n` +
          `      Either wire it to the reader's setting, or record why it is still outstanding — silence is not a decision.`,
      );
    }
  }

  // 6. The ledger must not go stale in either direction: an entry whose file is gone, no longer
  //    animates, or has since been wired up is a dead entry.
  for (const f of Object.keys(gaps)) {
    if (!files.includes(f)) errors.push(`${name}: KNOWN_GAPS lists ${f}, which does not exist.`);
    else if (!animated.includes(f)) errors.push(`${name}: KNOWN_GAPS lists ${f}, but it no longer animates — remove the entry.`);
    else if (wired.includes(f)) errors.push(`${name}: KNOWN_GAPS lists ${f}, which is now in a motion family — remove the entry.`);
  }

  // The resolvers reference the animation primitives themselves, but they are not components;
  // counting them would inflate the inventory the PR reports.
  const animatedComponents = animated.filter((f) => !helpers.includes(f));
  summary.push({
    name,
    animated: animatedComponents.length,
    family: wired.length,
    gaps: Object.keys(gaps).length,
  });
}

console.log("native motion — animated components, and who answers to the reader's setting\n");
console.log(`  ${"platform".padEnd(9)} ${"animated".padStart(8)} ${"in family".padStart(9)} ${"declared gaps".padStart(13)}`);
for (const s of summary) {
  console.log(`  ${s.name.padEnd(9)} ${String(s.animated).padStart(8)} ${String(s.family).padStart(9)} ${String(s.gaps).padStart(13)}`);
}

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
const covered = summary.reduce((n, s) => n + s.family, 0);
const outstanding = summary.reduce((n, s) => n + s.gaps, 0);
console.log(
  `\ncheck:native-motion ok — ${covered} component(s) across 3 platforms wired to the reader's setting and ` +
    `tested in both directions; ${outstanding} animated component(s) remain declared gaps, which is a roadmap and not a failure.\n` +
    `  This is a bookkeeping guard. The behavioural proof is in the platforms' own suites — see the header.`,
);
