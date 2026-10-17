// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * Mutation tests for `check:motion-tokens`.
 *
 * Each case breaks exactly one thing in an in-memory copy of a real file (the script's `--overrides`)
 * and asserts the specific complaint, so a guard that fails for the wrong reason, or stops failing,
 * is noticed. The repository on disk is never touched.
 */

const repoRoot = join(process.cwd(), "../..");
const script = join(repoRoot, "scripts/check-motion-tokens.mjs");
const read = (p: string) => readFileSync(join(repoRoot, p), "utf8");
const dir = mkdtempSync(join(tmpdir(), "motion-tokens-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(overrides: Record<string, string> = {}): { code: number; out: string } {
  const file = join(dir, `${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(file, JSON.stringify(overrides));
  try {
    const out = execFileSync(process.execPath, [script, "--overrides", file], { encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status: number; stderr: string; stdout: string };
    return { code: err.status, out: `${err.stdout}${err.stderr}` };
  }
}

/** Replace one occurrence in a real file, and fail loudly if the anchor is gone. */
function mutate(path: string, from: string, to: string): Record<string, string> {
  const src = read(path);
  expect(src, `${path} no longer contains the mutation anchor "${from}"`).toContain(from);
  return { [path]: src.replace(from, to) };
}

const MOTION = "tokens/primitives/motion.json";
const CONTRACT = "tokens/contracts/motion.json";
const ANGULAR = "packages/ui-angular/src/styles.css";

describe("check:motion-tokens", () => {
  it("passes on the repository as it is", () => {
    const { code, out } = run();
    expect(code, out).toBe(0);
  });

  it("refuses a duration the native formats cannot read", () => {
    // "0.2s" is legal DTCG and valid CSS, and the native formats turned it into NaN.
    const { code, out } = run(mutate(MOTION, '"200ms"', '"0.2s"'));
    expect(code).toBe(1);
    expect(out).toMatch(/duration\.fast: "0\.2s" is not an integer ms value/);
  });

  it("catches a vendored native file that drifted from the source", () => {
    const { code, out } = run(
      mutate("packages/ui-swiftui/Sources/KinetixUI/KinetixMotion.swift", "milliseconds(500)", "milliseconds(400)"),
    );
    expect(code).toBe(1);
    expect(out).toMatch(/KinetixMotion\.swift: duration "slow" is 400, the source says 500ms/);
  });

  it("catches a native easing that drifted from the source", () => {
    const { code, out } = run(
      mutate(
        "packages/ui-compose/ui/src/main/kotlin/com/kinetixui/tokens/KinetixMotion.kt",
        "CubicBezierEasing(0.2f, 0f, 0f, 1f)",
        "CubicBezierEasing(0.2f, 0f, 0.1f, 1f)",
      ),
    );
    expect(code).toBe(1);
    expect(out).toMatch(/easing "emphasized" is \(0\.2, 0, 0\.1, 1\)/);
  });

  it("catches a CSS variable that is not a token, which the browser silently drops", () => {
    const { code, out } = run(mutate(ANGULAR, "box-shadow var(--duration-instant)", "box-shadow var(--duration-normal)"));
    expect(code).toBe(1);
    expect(out).toMatch(/--duration-normal is not a motion token/);
  });

  it("catches a Tailwind tier utility that does not exist", () => {
    const { code, out } = run(
      mutate("packages/ui/src/components/toggle.tsx", "transition-colors", "transition-colors duration-normal"),
    );
    expect(code).toBe(1);
    expect(out).toMatch(/toggle\.tsx: duration-normal is not a motion tier/);
  });

  it("catches a native symbol that is not a token", () => {
    const { code, out } = run(
      mutate("packages/ui-flutter/lib/src/kinetix_switch_motion.dart", "KinetixDuration.instant", "KinetixDuration.quick"),
    );
    expect(code).toBe(1);
    expect(out).toMatch(/KinetixDuration\.quick is not a motion token/);
  });

  it("makes a tier that moves to the MX1 proposal update its recorded decision", () => {
    const tokens = mutate(MOTION, '"500ms"', '"400ms"');
    const { code, out } = run(tokens);
    expect(code).toBe(1);
    expect(out).toMatch(/tier "slow" says it kept its value against the MX1 proposal, but it is now 400ms/);
  });

  it("fails when a proven consumer stops using its role's pairing", () => {
    const { code, out } = run(
      mutate(
        "packages/ui/src/components/switch.tsx",
        "transition-[inset-inline-start] duration-instant",
        "transition-[inset-inline-start] duration-fast",
      ),
    );
    expect(code).toBe(1);
    expect(out).toMatch(/selection-control", react consumer .*switch\.tsx: no longer contains "transition-\[inset-inline-start\] duration-instant ease-standard"/);
  });

  it("fails when a recorded deviation has been aligned but not removed", () => {
    const { code, out } = run(mutate(ANGULAR, "inset-inline-start var(--duration-base)", "inset-inline-start var(--duration-instant)"));
    expect(code).toBe(1);
    expect(out).toMatch(/angular deviation .* no longer contains .*if it was aligned, remove the deviation/);
  });

  it("refuses a consumer that names a token outside its role", () => {
    const contract = JSON.parse(read(CONTRACT));
    contract.roles.disclosure.consumers[0].expects.push("duration-base");
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract) });
    expect(code).toBe(1);
    expect(out).toMatch(/expects duration "base", which is not one of the role's \(fast\)/);
  });

  it("refuses a proven role whose evidence does not exist", () => {
    const { code, out } = run(mutate(CONTRACT, '"scripts/loop-motion.mjs"', '"scripts/loop-motion-gone.mjs"'));
    expect(code).toBe(1);
    expect(out).toMatch(/role "loop" cites evidence scripts\/loop-motion-gone\.mjs, which does not exist/);
  });

  it("refuses a proven transition role on a single platform", () => {
    const contract = JSON.parse(read(CONTRACT));
    contract.roles.overlay.status = "proven";
    contract.roles.overlay.consumers = contract.roles.overlay.consumers.slice(0, 1);
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract) });
    expect(code).toBe(1);
    expect(out).toMatch(/role "overlay" is proven but has consumers on fewer than two platforms/);
  });

  it("refuses a token group the contract still calls untokenised", () => {
    const motion = JSON.parse(read(MOTION));
    motion.stagger = { base: { $type: "duration", $value: "50ms", $description: "x" } };
    const { code, out } = run({ [MOTION]: JSON.stringify(motion) });
    expect(code).toBe(1);
    expect(out).toMatch(/"stagger" is now a token group in motion\.json but the contract still lists it as untokenised/);
  });
});
