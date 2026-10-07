import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyDeviceSignals, createDeviceLedger, requestDeviceChange, type KinetixDeviceSignal } from "./index";

/**
 * M4B boundary: KinetixUI owns device-interaction truth, not device infrastructure.
 *
 * These checks fail if provider or transport concepts reach the ledger, if the package starts importing
 * the reference adapter, or if the reference adapter would be published. The reference adapter's own
 * suite (`reference/home-assistant`) proves the other side: what it emits carries no provider vocabulary.
 */

const srcRoot = path.resolve(import.meta.dirname, "..");
const pkgRoot = path.resolve(srcRoot, "..");

/** Words that belong to a provider, a transport or a credential, never to the ledger's code. */
const PROVIDER_OR_TRANSPORT = /home.?assistant|entity_?id|mqtt|matter|websocket|zigbee|bluetooth|\btoken\b|password|secret|\burl\b|https?:|wss?:|fetch\(|setTimeout|setInterval/i;

const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const relativeImports = (text: string) => [...stripComments(text).matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => m[1]!);

/** The ledger's source and every source file it reaches. */
function ledgerClosure(): string[] {
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const spec of relativeImports(readFileSync(file, "utf8"))) {
      const base = path.resolve(path.dirname(file), spec);
      const resolved = [`${base}.ts`, path.join(base, "index.ts")].find(existsSync);
      if (resolved) visit(resolved);
    }
  };
  visit(path.join(srcRoot, "functions/device-ledger.ts"));
  return [...seen];
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("device ledger boundary", () => {
  it("has no provider, transport, credential or timer concept anywhere in the code it reaches", () => {
    const files = ledgerClosure();
    expect(files.map((f) => path.relative(srcRoot, f))).toContain("types/device-ledger.ts");
    const hits = files.flatMap((file) =>
      stripComments(readFileSync(file, "utf8"))
        .split("\n")
        .flatMap((line, i) => (PROVIDER_OR_TRANSPORT.test(line) ? [`${path.relative(srcRoot, file)}:${i + 1}: ${line.trim()}`] : [])),
    );
    expect(hits).toEqual([]);
  });

  it("never imports the reference adapter from the package source", () => {
    const offenders = walk(srcRoot)
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) => relativeImports(readFileSync(f, "utf8")).some((spec) => path.resolve(path.dirname(f), spec).startsWith(path.join(pkgRoot, "reference"))));
    expect(offenders).toEqual([]);
  });

  it("does not publish the reference adapter", () => {
    const manifest = JSON.parse(readFileSync(path.join(pkgRoot, "package.json"), "utf8")) as { files: string[]; exports: Record<string, unknown> };
    expect(manifest.files.some((entry) => entry.includes("reference"))).toBe(false);
    expect(JSON.stringify(manifest.exports)).not.toMatch(/reference/);
  });

  it("keeps only normalized fields: provider data riding on a signal never enters the ledger", () => {
    const ledger = createDeviceLedger({ devices: [{ deviceId: "lamp", capabilities: ["power"] }] });
    const requested = requestDeviceChange(ledger, { commandId: "c", deviceId: "lamp", capabilityId: "power", value: "on" }, 1_000).ledger;
    // Extra keys an adapter forgot to strip. The type forbids them; this checks the runtime too.
    const leaky = [
      { type: "acknowledgement", commandId: "c", haContextId: "01SYNTH", entityId: "light.lamp" },
      { type: "report", deviceId: "lamp", capabilityId: "power", value: "on", observedAt: 1_100, provider: "home-assistant", raw: { entity_id: "light.lamp" } },
      { type: "connectivity", deviceId: "lamp", state: "online", topic: "zigbee2mqtt/lamp" },
    ] as unknown as KinetixDeviceSignal[];
    const { ledger: next } = applyDeviceSignals(requested, leaky, 1_200);
    expect(next.devices.lamp!.capabilities.power!.stage).toBe("confirmed");
    expect(JSON.stringify(next)).not.toMatch(/haContextId|entityId|entity_id|home-assistant|provider|raw|topic|zigbee/);
  });
});
