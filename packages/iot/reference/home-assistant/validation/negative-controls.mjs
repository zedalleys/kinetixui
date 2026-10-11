/* global console */
// Proves the validation harness can fail. Each control restores one pre-change behaviour (or breaks one
// harness guard) in a source file, requires the validation tests to fail on assertions, and restores the
// file. Run only in a disposable checkout with no concurrent edits or tests.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../../..");
const run = () => spawnSync("pnpm", ["exec", "vitest", "run", "reference/home-assistant/validation/validation.test.ts"], { cwd: root, encoding: "utf8", timeout: 120_000 });
const controls = [
  // Held changes, reverted one at a time: the harness must notice each on a device.
  ["offline-wording-reverted (iot-offline-request-wording)", "src/functions/control.ts",
    'return "Device offline. The requested change is not confirmed. Showing the last known setting";', "return REQUEST_OPEN;"],
  // No control for the held summarizeDeviceState "command not confirmed" wording: from ledger-derived state
  // an open value request is always counted as "requested but not confirmed" first, so that branch cannot
  // be reached through a device and is proven by unit tests only (docs/iot/REAL-DEVICE-VALIDATION.md).
  ["report-ignores-receivedAt (iot-lifecycle-edges)", "src/functions/device-ledger.ts",
    'const event: KinetixCommandLifecycleEvent = { type: "report", value, receivedAt: at };', 'const event: KinetixCommandLifecycleEvent = { type: "report", value };'],
  ["acknowledgement-confirms (iot-device-ledger)", "src/functions/device-ledger.ts",
    '? { type: "acknowledge", commandId: signal.commandId }', '? { type: "confirm", commandId: signal.commandId }'],
  // Harness guards.
  ["no-test-device-attestation", "reference/home-assistant/validation/runner.ts",
    "const attested = Boolean(options.testDevice) && options.testDevice === options.entityId;", "const attested = true;"],
  ["notes-not-screened", "reference/home-assistant/validation/runner.ts",
    "const sensitive = findSensitive(note, secrets());", "const sensitive: string[] = [];"],
  ["simulation-counts-as-pass", "reference/home-assistant/validation/evidence.ts",
    'if (source === "simulation") return "simulation-only";', ""],
];

if (run().status !== 0) throw new Error("Baseline failed; negative controls not run");
for (const [name, file, before, after] of controls) {
  const target = path.join(root, file);
  const original = readFileSync(target, "utf8");
  if (original.split(before).length !== 2) throw new Error(`Mutation anchor is not unique: ${name}`);
  try {
    writeFileSync(target, original.replace(before, after));
    const result = run();
    const output = result.stdout + result.stderr;
    if (result.error || result.status === 0 || !/Tests\s+\d+ failed/.test(output)) throw new Error(`Negative control did not fail assertions: ${name}`);
    console.log(`${name}: ${output.match(/Tests\s+[^\n]+/)?.[0].trim()}`);
  } finally {
    writeFileSync(target, original);
  }
}
if (run().status !== 0) throw new Error("Restored baseline failed");
console.log("Restored baseline: PASS; sources restored byte-for-byte");
process.exitCode = 0;
