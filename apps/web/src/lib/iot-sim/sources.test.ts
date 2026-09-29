import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const here = __dirname;
const scenarios = join(here, "../../examples/iot/scenarios");

const sourcesIn = (dir: string) =>
  readdirSync(dir)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f) && !/^test-/.test(f))
    .map((f) => ({ file: `${dir === here ? "iot-sim" : "scenarios"}/${f}`, code: stripComments(readFileSync(join(dir, f), "utf8")) }));

/** Comments may name what the code must not do; only code counts. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const files = [...sourcesIn(here), ...sourcesIn(scenarios)];

describe("simulation sources", () => {
  it("scans real files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each([
    ["Date.now", /\bDate\.now\s*\(/],
    ["Math.random", /\bMath\.random\b/],
    ["a no-argument new Date()", /new Date\(\s*\)/],
    ["fetch", /\bfetch\s*\(/],
    ["XMLHttpRequest", /\bXMLHttpRequest\b/],
    ["WebSocket / EventSource", /\b(WebSocket|EventSource)\b/],
    ["Bluetooth / MQTT / Matter clients", /navigator\.bluetooth|\bmqtt\b|\bmatter\.js\b|getUserMedia|RTCPeerConnection/i],
    ["network-capable imports", /from\s+["'](axios|ws|mqtt|node:http|node:https|node:net)["']/],
  ])("has no %s", (_name, pattern) => {
    const hits = files.filter((f) => pattern.test(f.code)).map((f) => f.file);
    expect(hits).toEqual([]);
  });

  it("creates timers only in the hook, and only inside an effect", () => {
    const withTimers = files.filter((f) => /\b(setInterval|setTimeout|requestAnimationFrame)\b/.test(f.code)).map((f) => f.file);
    expect(withTimers).toEqual(["iot-sim/use-simulation.ts"]);
    const hook = files.find((f) => f.file === "iot-sim/use-simulation.ts")!.code;
    const effect = hook.slice(hook.indexOf("useEffect("));
    expect(hook.slice(0, hook.indexOf("useEffect(")).includes("setInterval")).toBe(false);
    expect(effect).toMatch(/setInterval/);
    expect(effect).toMatch(/clearInterval/);
  });

  it("has no module-level side effects in the core (no top-level calls other than declarations)", () => {
    for (const { file, code } of files.filter((f) => f.file.startsWith("iot-sim/") && !f.file.includes("use-simulation"))) {
      // A top-level statement that is a bare call, e.g. `start();` or `window.x = ...`.
      expect(code, file).not.toMatch(/^(?:window|document|globalThis)\./m);
      expect(code, file).not.toMatch(/^[a-zA-Z_$][\w$]*\(.*\);$/m);
    }
  });

  it("marks the hook as a client module", () => {
    expect(readFileSync(join(here, "use-simulation.ts"), "utf8").startsWith('"use client"')).toBe(true);
  });
});
