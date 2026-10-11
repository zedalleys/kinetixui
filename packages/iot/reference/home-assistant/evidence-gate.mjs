/* global console */
/** Release gate for the held @kinetixui/iot changesets. Bundle with tsup as documented in docs/iot/REAL-DEVICE-VALIDATION.md. */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { releaseGate, validateEvidenceRecord } from "./dist/evidence.js";

const dir = path.join(import.meta.dirname, "validation/records");
const records = readdirSync(dir).filter((f) => f.endsWith(".json")).map((name) => ({ name, record: JSON.parse(readFileSync(path.join(dir, name), "utf8")) }));
for (const { name, record } of records) {
  for (const error of validateEvidenceRecord(record)) console.log(`INVALID ${name}: ${error}`);
}
const gate = releaseGate(records);
for (const row of gate.rows) console.log(`${row.id}  ${row.status}${row.evidence.length ? `  (${row.evidence.join(", ")})` : ""}`);
console.log(gate.ready ? "Device evidence complete for the held IoT changesets." : "Device evidence incomplete: the held IoT changesets stay held.");
process.exitCode = gate.ready ? 0 : 1;
