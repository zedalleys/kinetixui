#!/usr/bin/env node
/**
 * The SwiftUI publish route's dry-run guard, measured rather than read.
 *
 * `check-native-publish-preflight.mjs` proves, structurally, that this step cannot run unless
 * GitHub Actions evaluates `if: ${{ inputs.dry_run == false }}` to true. That is the gate. What it
 * cannot prove, because no amount of reading shell text can, is what the step then *does* with the
 * value it receives — so the in-script guard is defense in depth, and this is the measurement of it.
 *
 * It runs the real step body — extracted from the workflow by name, never a copy, so the control
 * cannot drift from the thing it measures — against every value `dry_run` can actually arrive as,
 * and counts the pushes. The two pieces of evidence are complementary: the structural check says
 * nothing can reach this step uninvited, and this says that if something ever did, only the exact
 * string `false` would publish.
 *
 * What the pre-fix guard did, measured on main at d5390810: `false` → 2 pushes (correct), `true` →
 * 0 (correct), and **empty, unset, `False` and `yes` → 2 pushes each**. Only the exact string
 * `true` stopped it. The table below is the requirement that replaces that behaviour.
 *
 * Nothing is pushed and no remote is contacted: `git` and `node` are replaced by stubs on PATH, and
 * the stub records a marker instead of pushing. The stubs are built in a fresh temp directory at run
 * time, deliberately — a stored stub can lose its executable bit, and a stub that never executes
 * reports "0 pushes" for every value, which reads as a perfect pass. The `false` row is the
 * self-check that catches exactly that.
 */
import { readFileSync, writeFileSync, mkdtempSync, chmodSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = `${dirname(dirname(dirname(fileURLToPath(import.meta.url))))}/`;
const WORKFLOW = ".github/workflows/publish-swiftui.yml";
const STEP = "Push to mirror";

/** The required behaviour. `false` is the only value that may publish. */
const REQUIRED = [
  { label: "false", value: "false", pushes: 2 },
  { label: "true", value: "true", pushes: 0 },
  { label: "empty", value: "", pushes: 0 },
  { label: "unset", value: null, pushes: 0 },
  { label: "False", value: "False", pushes: 0 },
  { label: "yes", value: "yes", pushes: 0 },
];

/**
 * Pull the step's `run:` block out of the workflow text. Done by hand rather than with a YAML
 * parser because this gate runs on a bare checkout in the publish workflows, where there are no
 * dependencies to import.
 */
const extractStepBody = (text) => {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === `- name: ${STEP}`);
  if (start === -1) throw new Error(`${WORKFLOW} has no step named "${STEP}". If it was renamed, rename it here too: a control that cannot find its subject must fail, not pass.`);
  const runAt = lines.findIndex((line, i) => i > start && /^\s*run: \|\s*$/.test(line));
  const nextStep = lines.findIndex((line, i) => i > start && /^      - /.test(line));
  if (runAt === -1 || (nextStep !== -1 && runAt > nextStep)) throw new Error(`the "${STEP}" step no longer has a \`run: |\` block.`);
  const indent = lines[runAt].match(/^\s*/)[0].length + 2;
  const body = [];
  for (let i = runAt + 1; i < lines.length; i += 1) {
    if (lines[i].trim() !== "" && lines[i].match(/^\s*/)[0].length < indent) break;
    body.push(lines[i].slice(indent));
  }
  return `${body.join("\n")}\n`;
};

const workdir = mkdtempSync(join(tmpdir(), "swiftui-dry-run-polarity-"));
try {
  const body = extractStepBody(readFileSync(`${root}${WORKFLOW}`, "utf8"));
  writeFileSync(join(workdir, "step.sh"), body);

  // `git push` records a marker in $PUSH_LOG instead of pushing. Everything else the body calls is
  // answered just well enough for it to keep going.
  const stubs = join(workdir, "bin");
  execFileSync("mkdir", ["-p", stubs]);
  writeFileSync(join(stubs, "git"), `#!/bin/sh
case "$1" in
  push) echo "PUSH-REACHED $*" >> "$PUSH_LOG" ;;
  rev-parse) echo 0000000000000000000000000000000000000000 ;;
esac
exit 0
`);
  writeFileSync(join(stubs, "node"), "#!/bin/sh\nexit 0\n");
  chmodSync(join(stubs, "git"), 0o755);
  chmodSync(join(stubs, "node"), 0o755);

  const rows = REQUIRED.map((requirement) => {
    const row = requirement;
    const log = join(workdir, `push-${row.label}.log`);
    writeFileSync(log, "");
    const env = { PATH: `${stubs}:${process.env.PATH}`, PUSH_LOG: log, MIRROR: "https://example.invalid/mirror.git", VERSION: "9.9.9", HOME: workdir };
    if (row.value !== null) env.DRY_RUN = row.value;
    try {
      execFileSync("bash", [join(workdir, "step.sh")], { env, stdio: "ignore" });
    } catch {
      // A non-zero exit is a legitimate outcome: what is asserted is how far it got.
    }
    const pushes = readFileSync(log, "utf8").split("\n").filter((line) => line.startsWith("PUSH-REACHED")).length;
    return { ...row, pushes, pushesRequired: row.pushes };
  });

  for (const row of rows) console.log(`  DRY_RUN=${row.label.padEnd(6)} → ${row.pushes} push(es), required ${row.pushes === row.pushesRequired ? row.pushes : row.pushesRequired}`);

  const live = rows.find((row) => row.label === "false");
  if (live.pushes !== 2) {
    console.error(`::error::Broken control: with DRY_RUN=false the step reached ${live.pushes} pushes, expected 2. The stubs are not intercepting \`git\`, so every other row is a false all-clear and this run proves nothing.`);
    process.exit(1);
  }

  const wrong = rows.filter((row) => row.pushes !== row.pushesRequired);
  if (wrong.length) {
    for (const row of wrong) {
      console.error(`::error::DRY_RUN=${row.label} reached ${row.pushes} push(es); the guard must allow ${row.pushesRequired}. Only an exact \`false\` may publish: a mirror tag cannot be moved once a consumer has resolved it.`);
    }
    process.exit(1);
  }

  console.log(`PASS: the SwiftUI publish step fails closed — only DRY_RUN=false reaches the mirror pushes, and the ${rows.length - 1} other values stop. Stubbed git, nothing pushed, no remote contacted.`);
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
