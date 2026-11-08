/**
 * contrast-negative-controls.mjs — proof that `check:contrast` can see the value
 * it is judging.
 *
 * Codex found, on 2026-11-05 at `0e85529`, that the gate composited a tint and
 * rounded each channel to an 8-bit integer *before* measuring. Rounding moves a
 * channel by up to 0.5/255, and dark `on-info-container` on `info`@0.1 over
 * `muted` sat 0.0153 under the bar, so the rounding carried it across: the gate
 * printed `4.50:1 AA` for a pair whose true ratio is 4.4847:1. Every other row
 * in the file was unaffected, which is what made it hard to see — the gate was
 * green, and the one row it was wrong about looked like the others.
 *
 * Two things were then changed: the measurement (threshold now applied to the
 * unrounded composite, rounding kept for the printed hex) and the token (dark
 * `on-info-container` moved from `blue.100` to the new `blue.75`). Those two
 * repairs can hide each other. With the token fixed, a gate that still rounds
 * stays green — so the gate alone proves nothing about the measurement, and a
 * later change that reintroduced the rounding would go unnoticed until some
 * other pair drifted onto the knife edge.
 *
 * So these controls pin both halves, by mutating the real source and running the
 * real gate:
 *
 *   token-reverted            dark `on-info-container` back to `blue.100`. The
 *                             corrected gate MUST fail on it. This is the
 *                             assertion the old gate could not make.
 *   token-reverted-and-rounds  the same token, plus the rounding restored in the
 *                             measurement. The gate MUST pass — which is the
 *                             original defect, reproduced on demand. A control
 *                             that must pass looks odd, but it is the only thing
 *                             that proves the rounding was the blindfold rather
 *                             than a coincidence of this one pair.
 *
 * Each mutation is written as bytes, wrapped in try/finally, restored from the
 * bytes read before it, and verified by SHA-256 — never `git checkout --`, which
 * would throw away someone's unstaged edits and then report the mismatch it had
 * just caused. The gate reads the token JSON directly, so no rebuild is needed
 * and the whole script costs a few seconds.
 *
 * Usage: pnpm check:contrast-negative-controls
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const GATE = ["scripts/check-contrast.mjs"];
const TOKEN = "tokens/semantic/color.dark.json";
const SCRIPT = "scripts/check-contrast.mjs";

const sha = (f) => createHash("sha256").update(readFileSync(resolve(f))).digest("hex");
const runGate = () => spawnSync("node", GATE, { encoding: "utf8" });

/** One source edit, asserted before it is written: a mutation that silently no-ops is a control that proves nothing. */
const edit = (file, from, to) => {
  const text = readFileSync(resolve(file), "utf8");
  if (!text.includes(from)) throw new Error(`${file}: the text this control mutates is not there any more:\n  ${from.split("\n")[0]}`);
  writeFileSync(resolve(file), text.replace(from, to));
};

const REVERT_TOKEN = [TOKEN, `"on-info-container": {\n      "$value": "{color.blue.75}"`, `"on-info-container": {\n      "$value": "{color.blue.100}"`];
const RESTORE_ROUNDING = [SCRIPT, "const blendedCh = over(S[fill], S[surface], alpha);", "const blendedCh = over(S[fill], S[surface], alpha).map(Math.round);"];

const CONTROLS = [
  {
    name: "token-reverted",
    what: "dark on-info-container back to blue.100, the value Codex measured at 4.4847:1",
    mutations: [REVERT_TOKEN],
    expect: "fail",
    row: /on-info-container.*FAIL/,
  },
  {
    name: "token-reverted-and-rounds",
    what: "the same token, plus the round-before-compare defect restored",
    mutations: [REVERT_TOKEN, RESTORE_ROUNDING],
    expect: "pass",
    row: /on-info-container.*4\.50\d*:1\s+AA/,
  },
];

let failures = 0;

// The gate must pass untouched first: a control that fails everything proves nothing.
process.stdout.write("baseline — the gate as it ships\n");
const baseline = runGate();
if (baseline.status === 0) {
  console.log("  ok    the unmutated gate passes\n");
} else {
  console.log("  FAIL  the unmutated gate does not pass — every control below is meaningless\n");
  failures++;
}

console.log("negative controls — each restores part of the 2026-11-05 defect");
for (const { name, what, mutations, expect, row } of CONTROLS) {
  const before = new Map(mutations.map(([f]) => [f, { text: readFileSync(resolve(f), "utf8"), hash: sha(f) }]));
  let run;
  try {
    for (const [file, from, to] of mutations) edit(file, from, to);
    run = runGate();
  } finally {
    for (const [file, { text, hash }] of before) {
      writeFileSync(resolve(file), text);
      if (sha(file) !== hash) {
        console.log(`  ** NOT RESTORED **       ${file} did not come back byte-for-byte`);
        failures++;
      }
    }
  }

  const out = `${run.stdout}${run.stderr}`;
  const printed = out.split("\n").filter((l) => /on-info-container/.test(l) && /over #33|over #334261/.test(l)).map((l) => l.trim());
  const line = printed[printed.length - 1];
  const ok = expect === "fail" ? run.status !== 0 && row.test(out) : run.status === 0 && row.test(out);

  if (ok) {
    console.log(`  gate ${expect === "fail" ? "fails" : "passes"}, as it must  ${name} — ${what}`);
    if (line) console.log(`      ${line}`);
  } else {
    console.log(`  ** NOT AS REQUIRED **    ${name} — ${what}`);
    console.log(`      expected the gate to ${expect}; it exited ${run.status}`);
    if (line) console.log(`      it printed: ${line}`);
    failures++;
  }
}

if (failures) {
  console.error(`\n✗ contrast negative controls: ${failures} control(s) did not behave as required`);
  process.exit(1);
}
console.log(
  "\ncontrast negative controls ok — the corrected gate fails on the real value of the pair it used to " +
    "pass, and reintroducing the rounding makes it green again on that same pair. The measurement and the " +
    "token are both pinned, and neither repair can quietly stand in for the other.",
);
