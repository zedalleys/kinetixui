/* global console, WebSocket, setInterval, clearInterval */
/** Server-only operator CLI. Bundle with tsup as documented in LIVE-VALIDATION.md. */
import process from "node:process";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { createLiveSession } from "./dist/live-session.js";

// No browser server, arbitrary URL proxy, persistence, raw-frame logging or automatic device command.
const endpoint = process.env.HA_WS_URL;
const entity = process.env.HA_ENTITY_ID;
if (!endpoint || !entity || !process.env.HA_ACCESS_TOKEN) {
  console.error("Set server-side HA_WS_URL, HA_ENTITY_ID and HA_ACCESS_TOKEN. No connection attempted.");
  process.exit(1);
}
let session;
try {
  session = createLiveSession({
    endpoint,
    allowLoopback: process.env.HA_ALLOW_LOOPBACK_WS === "1",
    entities: { [entity]: { deviceId: "validation-device", capabilityId: "power" } },
    getToken: () => process.env.HA_ACCESS_TOKEN ?? "",
    connect: url => new WebSocket(url),
    now: Date.now,
    nextCommandId: randomUUID,
  });
} catch {
  console.error("Invalid validation configuration. See LIVE-VALIDATION.md.");
  process.exit(1);
}
session.start();
console.log("Live access attempted; this is not physical proof. Commands: status, on, off, quit.");
const input = createInterface({ input: process.stdin, output: process.stdout });
const timer = setInterval(() => session.tick(), 100);
let stopped = false;
const stop = () => { if (stopped) return; stopped = true; clearInterval(timer); session.stop(); input.close(); };
input.on("line", line => {
  const command = line.trim();
  if (command === "quit") stop();
  else if (command === "on" || command === "off") console.log({ dispatched: session.request("validation-device", command) });
  else if (command === "status") console.log(JSON.stringify({ session: session.status(), ledger: session.getLedger() }));
  else console.log("Commands: status, on, off, quit");
});
input.on("close", stop);
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
