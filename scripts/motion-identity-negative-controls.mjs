/**
 * Negative controls for the motion consumer-identity register in `scripts/check-motion-tokens.mjs`.
 *
 * The register exists because of one measured hole: every other assertion in that gate reads the consumers
 * the contract HAS, so none of them can notice one that should be there and is not. On `a92de6e`, deleting
 * SwiftUI's entire `selection-control` consumer object left both `check:motion-tokens` and
 * `check:native-motion` green — four platforms remained, which still satisfies "proven needs two". A gate
 * that is supposed to catch a disappearance has to be shown catching one, or it is a comment with a test
 * runner attached.
 *
 * Each control mutates the contract or the register IN MEMORY and runs `motionErrors()` against the result
 * through its `--overrides` hook. Nothing on disk is touched, so unlike the source-mutating controls in
 * `docs-column-negative-controls.mjs` there is no restore to get wrong and no build to pay for: the whole
 * script is a few milliseconds and safe to run over a dirty tree.
 *
 * Two of the controls assert something stronger than "the gate failed". A retyped platform and a dropped
 * consumer both leave the named file untouched, so every OTHER assertion in the gate still passes on the
 * mutated contract — they are asserted to produce register errors and nothing else. That is the proof the
 * register is load-bearing rather than redundant with a check that already existed.
 *
 *   node scripts/motion-identity-negative-controls.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { motionErrors } from "./check-motion-tokens.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTRACT = "tokens/contracts/motion.json";
const REGISTER = "tokens/contracts/motion-consumers.json";

const load = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
/** A register error is one of the two the identity check raises; anything else came from another rule. */
const isRegisterError = (e) => e.includes("motion-consumers.json");

/** The identity this suite mutates: real, on a proven role with five platforms, so dropping it keeps that
 *  role legal under every pre-existing rule. If the contract stops carrying it, the suite says so rather
 *  than quietly testing nothing. */
const ROLE = "selection-control";
const PLATFORM = "swiftui";

const controls = [
  {
    name: "a dropped consumer",
    expect: /motion-consumers\.json holds "selection-control\|swiftui\|[^"]+", which the contract no longer lists/,
    only: true,
    mutate: (contract) => {
      contract.roles[ROLE].consumers = contract.roles[ROLE].consumers.filter((c) => c.platform !== PLATFORM);
    },
  },
  {
    name: "a retyped platform",
    expect: /the contract lists consumer "selection-control\|ios\|[^"]+", which motion-consumers\.json does not hold/,
    only: true,
    mutate: (contract) => {
      contract.roles[ROLE].consumers.find((c) => c.platform === PLATFORM).platform = "ios";
    },
  },
  {
    name: "a retyped file",
    expect: /motion-consumers\.json holds "selection-control\|swiftui\|[^"]+", which the contract no longer lists/,
    mutate: (contract) => {
      const c = contract.roles[ROLE].consumers.find((x) => x.platform === PLATFORM);
      c.file = "packages/ui-swiftui/Sources/KinetixUI/KinetixDisclosureMotion.swift";
    },
  },
  {
    name: "an unregistered addition",
    expect: /the contract lists consumer "selection-control\|swiftui\|packages\/ui-swiftui\/Sources\/KinetixUI\/KinetixMotion\.swift", which motion-consumers\.json does not hold/,
    mutate: (contract) => {
      contract.roles[ROLE].consumers.push({
        platform: PLATFORM,
        file: "packages/ui-swiftui/Sources/KinetixUI/KinetixMotion.swift",
        expects: ["KinetixDuration.instant", "KinetixEasing.standard"],
      });
    },
  },
  {
    name: "a register line for a consumer that was never in the contract",
    expect: /motion-consumers\.json holds "selection-control\|windows\|packages\/nowhere\.cs", which the contract no longer lists/,
    mutateRegister: (register) => {
      register.identities.push("selection-control|windows|packages/nowhere.cs");
    },
  },
];

const base = load(CONTRACT);
if (!base.roles[ROLE]?.consumers?.some((c) => c.platform === PLATFORM)) {
  console.error(
    `motion identity controls — the contract no longer carries a ${PLATFORM} consumer on "${ROLE}", ` +
      `so these controls would mutate nothing. Point them at an identity that exists.`,
  );
  process.exit(1);
}
if (motionErrors().length) {
  console.error("motion identity controls — the tree is already failing check:motion-tokens; fix that first.");
  process.exit(1);
}

let failed = 0;
for (const control of controls) {
  const contract = load(CONTRACT);
  const register = load(REGISTER);
  control.mutate?.(contract);
  control.mutateRegister?.(register);
  const errors = motionErrors({
    [CONTRACT]: JSON.stringify(contract),
    [REGISTER]: JSON.stringify(register),
  });

  const caught = errors.filter((e) => control.expect.test(e));
  const strays = errors.filter((e) => !isRegisterError(e));
  if (!caught.length) {
    failed += 1;
    console.error(`  ✗ ${control.name}: not caught. ${errors.length} error(s): ${errors.join(" | ") || "none"}`);
  } else if (control.only && strays.length) {
    failed += 1;
    console.error(
      `  ✗ ${control.name}: caught, but ${strays.length} non-register error(s) fired too, so this control ` +
        `does not isolate the register: ${strays.join(" | ")}`,
    );
  } else {
    console.log(`  ✓ ${control.name}${control.only ? " (register errors only)" : ""}`);
  }
}

if (failed) {
  console.error(`\nmotion identity controls — ${failed} of ${controls.length} control(s) did not fire.`);
  process.exit(1);
}
console.log(
  `\nmotion identity controls — all ${controls.length} fire. A consumer cannot leave the contract, change ` +
    `platform or change file, and cannot be added, without the register disagreeing.`,
);
