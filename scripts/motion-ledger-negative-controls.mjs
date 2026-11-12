/**
 * Negative controls for the composed native motion ledger — `scripts/native-motion-ledger.mjs`, and
 * the clauses in `check-motion-tokens.mjs` that read it.
 *
 * Each clause here is a claim that some arrangement of the ledger FAILS, and a claim like that is
 * worth nothing until it has been watched to fail. Two of the clauses exist because the arrangement
 * they describe was measured PASSING on `00e2781c`:
 *
 *   - a fourth ledger platform produced zero errors from the contract gate, because that gate
 *     carried a hardcoded three-key allowlist and skipped anything missing from it;
 *   - any role could opt out of naming a duration/easing pairing by declaring `reducedForm: "rest"`,
 *     a field the contract author writes.
 *
 * Both of those are reproduced below as controls that FAILED BEFORE and pass now, which is the only
 * evidence that the fix is a fix. The rest watch the new clauses fire.
 *
 * Every control mutates the ledger or a contract file IN MEMORY — the ledger through
 * `composeLedger`'s seams, the contract files through `motionErrors`' `--overrides` hook. Nothing on
 * disk is touched, so the whole script is a few milliseconds and safe to run over a dirty tree.
 *
 *   node scripts/motion-ledger-negative-controls.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { motionErrors } from "./check-motion-tokens.mjs";
import { composeLedger } from "./native-motion-ledger.mjs";
import { DIRECTION_TERMS, KNOWN_GAPS, PLATFORMS } from "./native-motion-spec.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTRACT = "tokens/contracts/motion.json";
const EXEMPTIONS = "tokens/contracts/motion-exemptions.json";
const load = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

/** The real ledger, deep-copied so a control cannot leak into the next one. RegExp survives this. */
const ledger = () => structuredClone(PLATFORMS);
const terms = () => structuredClone(DIRECTION_TERMS);
const gaps = () => structuredClone(KNOWN_GAPS);

/**
 * Anchors the controls mutate. Asserted to exist before anything runs, so a ledger that has moved on
 * makes this suite say so rather than quietly testing nothing.
 */
const ANCHOR = { platform: "SwiftUI", family: "loop", role: "loop", member: "Spinner.swift", gapped: "Dialog.swift" };

/** A family name no platform declares, derived rather than chosen, so a ledger that grows a family of
 *  that name cannot quietly turn the dead-vocabulary control into a no-op. */
const DECLARED = new Set(Object.values(PLATFORMS).flatMap((p) => Object.keys(p.families ?? {})));
const UNCLAIMED = (() => {
  for (let i = 0; ; i++) {
    const name = i ? `no-such-family-${i}` : "no-such-family";
    if (!DECLARED.has(name) && !(name in DIRECTION_TERMS)) return name;
  }
})();

const controls = [
  // ── the composition's own coherence ──────────────────────────────────────────────────────────
  {
    name: "a platform that does not say which contract platform it is",
    expect: /platform SwiftUI declares no contractPlatform/,
    ledger: (l) => void delete l.SwiftUI.contractPlatform,
  },
  {
    name: "two platforms claiming the same contract platform",
    expect: /platforms SwiftUI and Compose both declare contractPlatform "swiftui"/,
    ledger: (l) => void (l.Compose.contractPlatform = "swiftui"),
  },
  {
    name: "a family that does not say which role it implements",
    expect: /the SwiftUI loop family names no contractRole/,
    ledger: (l) => void delete l.SwiftUI.families.loop.contractRole,
  },
  {
    name: "a contractRole:null exemption with no reason",
    expect: /the SwiftUI loop family declares `contractRole: null` with no `roleExemption`/,
    ledger: (l) => void (l.SwiftUI.families.loop.contractRole = null),
  },
  {
    name: "a family whose name has no direction vocabulary",
    expect: /the loop family has no direction vocabulary in DIRECTION_TERMS/,
    terms: (t) => void delete t.loop,
  },
  {
    /* The name is COMPUTED, not hardcoded. An earlier version used "carousel", which PR #573 adds as a
     * real family — so on the integrated tree this control mutated a name that was declared, the clause
     * correctly stayed quiet, and the control asserted nothing. A control that picks a name the ledger
     * might later claim is a control that can retire itself in silence. `UNCLAIMED` is derived from the
     * ledger and asserted to be unclaimed in the preconditions below. */
    name: "direction vocabulary for a family no platform declares",
    expect: new RegExp(`DIRECTION_TERMS describes a "${UNCLAIMED}" family that no platform declares`),
    terms: (t) => void (t[UNCLAIMED] = { forward: /forward/i, reverse: /reverse/i }),
  },
  {
    name: "one file in two families",
    expect: /SwiftUI\/Spinner\.swift is a member of both the disclosure and loop families/,
    ledger: (l) => void l.SwiftUI.families.disclosure.members.push(ANCHOR.member),
  },
  {
    name: "a helper that is also one of its own members",
    expect: /is the loop family's helper and also one of its members/,
    ledger: (l) => void l.SwiftUI.families.loop.members.push("KinetixLoopMotion.swift"),
  },
  {
    name: "a file that is both wired up and a declared gap",
    expect: /SwiftUI\/Dialog\.swift is listed in KNOWN_GAPS and is also a member of the loop family/,
    ledger: (l) => void l.SwiftUI.families.loop.members.push(ANCHOR.gapped),
  },

  // ── the contract gate's clause 6, reading the composition ────────────────────────────────────
  {
    /* The measured fail-open. On `00e2781c` this produced ZERO errors. */
    name: "a FOURTH ledger platform the contract does not mention (measured passing before)",
    expect: /the native ledger wires ReactNative disclosure .*which the contract's "disclosure" role does not mention on react-native/,
    ledger: (l) => void (l.ReactNative = {
      contractPlatform: "react-native",
      dir: "packages/ui-react-native/src",
      families: { disclosure: { contractRole: "disclosure", helper: "KinetixDisclosureMotion.tsx", members: [] } },
    }),
  },
  {
    name: "a contractRole naming a role the contract does not define",
    expect: /the SwiftUI loop family says it implements the "no-such-role" motion role, which tokens\/contracts\/motion\.json does not define/,
    ledger: (l) => void (l.SwiftUI.families.loop.contractRole = "no-such-role"),
  },

  // ── the pairing exemption ────────────────────────────────────────────────────────────────────
  {
    /* The measured self-service exemption. On `00e2781c` this produced ZERO errors. */
    name: "a role buying the pairing exemption with reducedForm alone (measured passing before)",
    expect: /role "ambient-glow" is a transition but names no duration or no easing/,
    contract: (c) => void (c.roles["ambient-glow"] = {
      status: "observed",
      reducedForm: "rest",
      intent: "a fabricated decorative glow, to prove the exemption is no longer self-service",
      consumers: [{ platform: "react", file: "packages/ui/src/components/button.tsx", expects: ["Button"] }],
    }),
  },
  {
    name: "a role declaring the exemption without the register carrying it",
    expect: /role "ambient-glow" declares `pairingExempt`, which motion-exemptions\.json does not register/,
    contract: (c) => void (c.roles["ambient-glow"] = {
      status: "observed",
      reducedForm: "rest",
      intent: "x",
      pairingExempt: { reason: "it loops, honest" },
      consumers: [{ platform: "react", file: "packages/ui/src/components/button.tsx", expects: ["Button"] }],
    }),
  },
  {
    name: "the register line dropped while the role keeps its exemption",
    expect: /role "loop" declares `pairingExempt`, which motion-exemptions\.json does not register/,
    exemptions: (x) => void (x.pairingExempt.roles = []),
  },
  {
    name: "the role's exemption dropped while the register keeps the line",
    expect: /motion-exemptions\.json registers "loop" as exempt from naming a duration\/easing pairing, but that role does not declare/,
    contract: (c) => void delete c.roles.loop.pairingExempt,
  },
  {
    name: "an exemption declared with no reason",
    expect: /role "loop" declares `pairingExempt` with no reason/,
    contract: (c) => void (c.roles.loop.pairingExempt = {}),
  },
];

// ── preconditions: every anchor these controls mutate must still exist ─────────────────────────
const p = PLATFORMS[ANCHOR.platform];
const fails = [];
if (!p) fails.push(`the ledger has no ${ANCHOR.platform} platform`);
else {
  if (!p.contractPlatform) fails.push(`${ANCHOR.platform} declares no contractPlatform, so the tree is already failing`);
  const f = p.families?.[ANCHOR.family];
  if (!f) fails.push(`${ANCHOR.platform} has no ${ANCHOR.family} family`);
  else {
    if (f.contractRole !== ANCHOR.role) fails.push(`${ANCHOR.platform}/${ANCHOR.family} no longer implements "${ANCHOR.role}"`);
    if (!(f.members ?? []).includes(ANCHOR.member)) fails.push(`${ANCHOR.member} is no longer a ${ANCHOR.family} member`);
  }
  if (!PLATFORMS.Compose) fails.push("the ledger has no Compose platform");
  if (!(ANCHOR.gapped in (KNOWN_GAPS[ANCHOR.platform] ?? {}))) fails.push(`${ANCHOR.gapped} is no longer a declared gap`);
  if (!DIRECTION_TERMS[ANCHOR.family]) fails.push(`the ${ANCHOR.family} family has no direction vocabulary to remove`);
}
if (DECLARED.has(UNCLAIMED) || UNCLAIMED in DIRECTION_TERMS) fails.push(`"${UNCLAIMED}" is already a declared family, so the dead-vocabulary control would assert nothing`);
if (!load(CONTRACT).roles[ANCHOR.role]?.pairingExempt) fails.push(`the "${ANCHOR.role}" role no longer declares pairingExempt`);
if (!(load(EXEMPTIONS).pairingExempt?.roles ?? []).includes(ANCHOR.role)) fails.push(`the register no longer carries "${ANCHOR.role}"`);
if (fails.length) {
  console.error(`motion ledger controls — the anchors have moved, so these controls would test nothing:\n  ${fails.join("\n  ")}`);
  process.exit(1);
}
if (composeLedger().errors.length || motionErrors().length) {
  console.error("motion ledger controls — the tree is already failing; fix that first.");
  process.exit(1);
}

// ── run ────────────────────────────────────────────────────────────────────────────────────────
let failed = 0;
for (const c of controls) {
  const platforms = ledger(), directionTerms = terms(), knownGaps = gaps();
  c.ledger?.(platforms);
  c.terms?.(directionTerms);
  c.knownGaps?.(knownGaps);

  /* The composition's own clauses are watched through `composeLedger` directly, because its seams are
   * what the mutation reaches. The contract clauses are watched through `motionErrors`, which calls
   * the composition itself — so a control that mutates only the contract files proves the whole path,
   * CLI hook included. */
  let errors;
  if (c.contract || c.exemptions) {
    const contract = load(CONTRACT), exemptions = load(EXEMPTIONS);
    c.contract?.(contract);
    c.exemptions?.(exemptions);
    errors = motionErrors({ [CONTRACT]: JSON.stringify(contract), [EXEMPTIONS]: JSON.stringify(exemptions) });
  } else if (c.terms || c.knownGaps) {
    errors = composeLedger({ platforms, directionTerms, knownGaps }).errors;
  } else {
    // Through the contract gate, so the clause is proven where it actually runs.
    errors = motionErrors({}, platforms);
  }

  if (errors.some((e) => c.expect.test(e))) {
    console.log(`  ✓ ${c.name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${c.name}: not caught. ${errors.length} error(s): ${errors.join(" | ").slice(0, 400) || "none"}`);
  }
}

if (failed) {
  console.error(`\nmotion ledger controls — ${failed} of ${controls.length} control(s) did not fire.`);
  process.exit(1);
}
console.log(
  `\nmotion ledger controls — all ${controls.length} fire. The ledger cannot lose a platform's contract ` +
    `name, name a role that does not exist, declare an exemption without a reason or a register line, ` +
    `or add a platform the contract is never checked against.`,
);
