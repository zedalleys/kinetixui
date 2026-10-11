/* global console, WebSocket, setInterval, clearInterval */
/**
 * Server-only real-device validation CLI. Bundle with tsup as documented in docs/iot/REAL-DEVICE-VALIDATION.md.
 * The only place a `live-provider` evidence record is produced: a native WebSocket to the operator's endpoint.
 */
import process from "node:process";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { createValidationRun } from "./dist/runner.js";

const env = process.env;
if (!env.HA_WS_URL || !env.HA_ENTITY_ID || !env.HA_ACCESS_TOKEN) {
  console.error("Set server-side HA_WS_URL, HA_ENTITY_ID and HA_ACCESS_TOKEN. No connection attempted.");
  process.exit(1);
}
const kind = env.KX_DEVICE_KIND;
if (kind !== "physical" && kind !== "virtual") {
  console.error("Set KX_DEVICE_KIND to physical or virtual. No connection attempted.");
  process.exit(1);
}
let commit;
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  console.error("Run from a git checkout so the record names its commit. No connection attempted.");
  process.exit(1);
}
const outDir = path.resolve(env.KX_EVIDENCE_DIR ?? "validation-records");

let run;
try {
  run = createValidationRun({
    source: "live-provider",
    endpoint: env.HA_WS_URL,
    allowLoopback: env.HA_ALLOW_LOOPBACK_WS === "1",
    entityId: env.HA_ENTITY_ID,
    getToken: () => env.HA_ACCESS_TOKEN ?? "",
    connect: (url) => new WebSocket(url),
    now: Date.now,
    nextCommandId: randomUUID,
    timeoutMs: env.KX_TIMEOUT_MS ? Number(env.KX_TIMEOUT_MS) : undefined,
    testDevice: env.KX_TEST_DEVICE,
    device: { kind, makeModel: env.KX_DEVICE_MODEL, firmware: env.KX_DEVICE_FIRMWARE, transport: env.KX_DEVICE_TRANSPORT },
    integration: env.KX_HA_INTEGRATION,
    commit,
    node: process.versions.node,
    save: (name, json) => {
      mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, name);
      writeFileSync(file, json, { flag: "wx" });
      return file;
    },
  });
} catch {
  console.error("Invalid validation configuration. See docs/iot/REAL-DEVICE-VALIDATION.md.");
  process.exit(1);
}

run.session.start();
console.log(`Live provider run (${kind} device). Commands are refused until KX_TEST_DEVICE names the entity.`);
console.log(run.attested ? "Test device attested." : "Test device NOT attested: on/off will be refused.");
console.log("Commands: status, cases, case <id>, on, off, observe matches|differs [note], end, save, quit");
const input = createInterface({ input: process.stdin, output: process.stdout });
const timer = setInterval(() => run.session.tick(), 100);
let stopped = false;
const stop = () => {
  if (stopped) return;
  stopped = true;
  clearInterval(timer);
  run.session.stop();
  input.close();
};
input.on("line", (line) => {
  if (line.trim() === "quit") return stop();
  for (const out of run.handle(line)) console.log(out);
});
input.on("close", stop);
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
