/* global console */
// Run only in a disposable checkout with no concurrent tests/edits. Each mutation must fail; restore always.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const source = path.join(import.meta.dirname, "live-session.ts");
const original = readFileSync(source, "utf8");
const run = () => spawnSync("pnpm", ["exec", "vitest", "run", "reference/home-assistant/live-session.test.ts"], {
  cwd: path.resolve(import.meta.dirname, "../.."), encoding: "utf8", timeout: 60_000,
});
const controls = [
  ["ack-as-confirmation", 'apply(translateHomeAssistantMessage(m as HomeAssistantMessage, { entities, commandIdForRequest: () => entry.commandId }));', 'apply([{ type: "result", commandId: entry.commandId!, outcome: "applied", value: "on" }]);'],
  ["old-session-callback", 'if (session === generation) receive(event.data);', 'receive(event.data);'],
  ["unknown-result-as-snapshot", 'if (!entry) return;', 'if (!entry) { apply(translateHomeAssistantMessage(m as HomeAssistantMessage, { entities })); return; }'],
  ["allow-insecure-remote", 'url.protocol !== "wss:"', 'false'],
  ["exclusive-request-deadline", 'if (now < entry.deadline) continue;', 'if (now <= entry.deadline) continue;'],
];
const baseline = run();
if (baseline.status !== 0) throw new Error("Baseline failed; negative controls not run");
try {
  for (const [name, before, after] of controls) {
    if (original.split(before).length !== 2) throw new Error(`Mutation anchor is not unique: ${name}`);
    writeFileSync(source, original.replace(before, after));
    const result = run();
    const output = result.stdout + result.stderr;
    if (result.error || result.status === 0 || !/Tests\s+\d+ failed/.test(output)) {
      throw new Error(`Negative control did not fail assertions: ${name}`);
    }
    console.log(`${name}: ${output.match(/Tests\s+[^\n]+/)?.[0].trim()}`);
    writeFileSync(source, original);
  }
} finally {
  writeFileSync(source, original);
}
const restored = run();
if (restored.status !== 0) throw new Error("Restored baseline failed");
console.log("Restored baseline: PASS; source restored byte-for-byte");
process.exitCode = 0;
