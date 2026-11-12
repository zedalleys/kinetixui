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
const REGISTER = "tokens/contracts/motion-consumers.json";
const EXEMPTIONS = "tokens/contracts/motion-exemptions.json";

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

  it("catches the registry stylesheet drifting from the source", () => {
    const { code, out } = run(mutate("registry/kinetixui/globals.css", "--duration-fast: 200ms", "--duration-fast: 999ms"));
    expect(code).toBe(1);
    expect(out).toMatch(/registry\/kinetixui\/globals\.css: duration "fast" is 999, the source says 200ms/);
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

  it("catches a suffixed CSS variable that only starts like a token", () => {
    const { code, out } = run(mutate(ANGULAR, "box-shadow var(--duration-instant)", "box-shadow var(--duration-instant-extra)"));
    expect(code).toBe(1);
    expect(out).toMatch(/--duration-instant-extra is not a motion token/);
  });

  it("catches a suffixed CSS easing variable", () => {
    const { code, out } = run(mutate(ANGULAR, "var(--easing-standard)", "var(--easing-standard2)"));
    expect(code).toBe(1);
    expect(out).toMatch(/--easing-standard2 is not a motion token/);
  });

  it("catches a Tailwind tier utility that does not exist", () => {
    const { code, out } = run(
      mutate("packages/ui/src/components/toggle.tsx", "motion-reduce:transition-none", "motion-reduce:transition-none duration-normal"),
    );
    expect(code).toBe(1);
    expect(out).toMatch(/toggle\.tsx: duration-normal is not a motion tier/);
  });

  it("catches a Tailwind easing utility that does not exist", () => {
    const { code, out } = run(
      mutate("packages/ui/src/components/switch.tsx", "duration-instant ease-standard", "duration-instant ease-smooth"),
    );
    expect(code).toBe(1);
    expect(out).toMatch(/switch\.tsx: ease-smooth is not a motion easing/);
  });

  it("catches a hyphenated easing utility that only starts like a token", () => {
    const { code, out } = run(
      mutate("packages/ui/src/components/switch.tsx", "duration-instant ease-standard", "duration-instant ease-standard-extra"),
    );
    expect(code).toBe(1);
    expect(out).toMatch(/switch\.tsx: ease-standard-extra is not a motion easing/);
  });

  it.each(["ease-standardExtra", "ease-standard_extra"])("reads the whole easing utility %s, not its token prefix", (typo) => {
    const { code, out } = run(mutate("packages/ui/src/components/switch.tsx", "duration-instant ease-standard", `duration-instant ${typo}`));
    expect(code).toBe(1);
    expect(out).toContain(`switch.tsx: ${typo} is not a motion easing`);
  });

  it("checks the Tailwind preset's animation shorthands", () => {
    const { code, out } = run(
      mutate("packages/ui/tailwind.config.ts", '"collapsible-down var(--duration-fast,', '"collapsible-down var(--duration-fats,'),
    );
    expect(code).toBe(1);
    expect(out).toMatch(/tailwind\.config\.ts: --duration-fats is not a motion token/);
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
    // There is no recorded deviation left to mutate: MX1b-2 aligned the last one, Angular's Switch thumb on
    // `base`. The case is built here instead, so the rule stays covered whether or not one exists — a
    // deviation that still claims the Angular stylesheet runs the thumb on `base` must fail.
    const contract = JSON.parse(read(CONTRACT));
    contract.roles["selection-control"].deviations.push({
      platform: "angular",
      file: "packages/ui-angular/src/styles.css",
      uses: "inset-inline-start var(--duration-base) var(--easing-standard)",
      reason: "built by this test: the thumb is on instant now, so this deviation should be rejected",
    });
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract) });
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

  /**
   * The loop clauses. Each of these passed before the exemption narrowed, which is the whole reason
   * they are here: `loop` was "proven" on zero consumers, so its platform coverage was unstated and
   * the identity register had nothing of its to hold.
   */
  it("refuses a proven loop role on fewer than two platforms", () => {
    const contract = JSON.parse(read(CONTRACT));
    contract.roles.loop.consumers = [];
    contract.roles.loop.deviations = [];
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract) });
    expect(code).toBe(1);
    expect(out).toMatch(/role "loop" is proven but has consumers on fewer than two platforms/);
  });

  it("refuses a loop consumer that names nothing to look for", () => {
    const contract = JSON.parse(read(CONTRACT));
    contract.roles.loop.consumers[0].expects = [];
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract) });
    expect(code).toBe(1);
    expect(out).toMatch(/names nothing to look for, so registering it proves nothing about the reduced form/);
  });

  it("notices a loop platform dropped from the contract", () => {
    const contract = JSON.parse(read(CONTRACT));
    const before = contract.roles.loop.consumers.length;
    contract.roles.loop.consumers = contract.roles.loop.consumers.filter(
      (c: { platform: string }) => c.platform !== "flutter",
    );
    expect(contract.roles.loop.consumers.length, "the flutter loop consumer anchor is gone").toBe(before - 1);
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract) });
    expect(code).toBe(1);
    expect(out).toMatch(/loop\|flutter\|packages\/ui-flutter\/lib\/src\/kinetix_loop_motion\.dart/);
  });

  it("refuses a deviation filed under a kind of departure that does not exist", () => {
    const contract = JSON.parse(read(CONTRACT));
    contract.roles.loop.deviations[0].departs = "vibes";
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract) });
    expect(code).toBe(1);
    expect(out).toMatch(/departs "vibes" is not a kind of deviation/);
  });

  it("refuses a reduced-form deviation that is really a token deviation", () => {
    const contract = JSON.parse(read(CONTRACT));
    contract.roles.loop.deviations[0].uses = "transition: stroke-dashoffset var(--duration-base) var(--easing-standard)";
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract) });
    expect(code).toBe(1);
    expect(out).toMatch(/already reaches for a token outside the role; record it as a token deviation/);
  });

  it("still refuses a reduced-form deviation whose source no longer says it", () => {
    const contract = JSON.parse(read(CONTRACT));
    contract.roles.loop.deviations[0].uses = ".kx-spinner { animation-duration: 4s; }";
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract) });
    expect(code).toBe(1);
    expect(out).toMatch(/no longer contains "\.kx-spinner \{ animation-duration: 4s; \}"/);
  });

  /**
   * Clause 6 — the contract and the native ledger must agree about which platforms have the motion.
   * The ledger side needs its own seam: it is a static ESM import, so `--overrides` (which replaces
   * file content) cannot reach it, and `motionErrors(overrides, ledgerPlatforms)` is what makes the
   * other half of the clause watchable. These cases call it in-process rather than through the CLI.
   */
  it("notices a native family the contract does not mention", async () => {
    const { motionErrors } = await import("../../../../scripts/check-motion-tokens.mjs");
    const contract = JSON.parse(read(CONTRACT));
    contract.roles.spatial.deviations = [];
    const errors: string[] = motionErrors({ [CONTRACT]: JSON.stringify(contract) });
    expect(errors.join("\n")).toMatch(
      /the native ledger wires SwiftUI slide .*which the contract's "spatial" role does not mention on swiftui/,
    );
  });

  it("notices a contract native entry that is no family's helper", async () => {
    const { motionErrors } = await import("../../../../scripts/check-motion-tokens.mjs");
    const contract = JSON.parse(read(CONTRACT));
    const swift = contract.roles.loop.consumers.find((c: { platform: string }) => c.platform === "swiftui");
    expect(swift, "the swiftui loop consumer anchor is gone").toBeTruthy();
    swift.file = "packages/ui-swiftui/Sources/KinetixUI/KinetixMotion.swift";
    const register = JSON.parse(read(REGISTER));
    register.identities = register.identities.map((i: string) =>
      i === "loop|swiftui|packages/ui-swiftui/Sources/KinetixUI/KinetixLoopMotion.swift"
        ? "loop|swiftui|packages/ui-swiftui/Sources/KinetixUI/KinetixMotion.swift"
        : i,
    );
    const errors: string[] = motionErrors({
      [CONTRACT]: JSON.stringify(contract),
      [REGISTER]: JSON.stringify(register),
    });
    expect(errors.join("\n")).toMatch(/names a native file that is no motion family's helper/);
  });

  it("refuses a native family that does not say which role it implements", async () => {
    const { motionErrors } = await import("../../../../scripts/check-motion-tokens.mjs");
    const { PLATFORMS } = await import("../../../../scripts/native-motion-spec.mjs");
    const ledger = structuredClone(PLATFORMS) as Record<
      string,
      { families: Record<string, { contractRole?: string }> }
    >;
    delete ledger.SwiftUI.families.loop.contractRole;
    const errors: string[] = motionErrors({}, ledger);
    expect(errors.join("\n")).toMatch(/the SwiftUI loop family names no contractRole/);
  });

  it("passes clause 6 on the ledger as it is", async () => {
    const { motionErrors } = await import("../../../../scripts/check-motion-tokens.mjs");
    expect(motionErrors()).toEqual([]);
  });

  /**
   * The composed ledger. Both gates read `scripts/native-motion-ledger.mjs` now, because each used to
   * read a different projection of the declarations and a fact belonging to neither was checked by
   * nobody. The two cases measured PASSING on `00e2781c` are marked; `scripts/
   * motion-ledger-negative-controls.mjs` carries the full set and runs in CI without a build.
   */
  it("holds a fourth ledger platform to the contract (zero errors before)", async () => {
    const { motionErrors } = await import("../../../../scripts/check-motion-tokens.mjs");
    const { PLATFORMS } = await import("../../../../scripts/native-motion-spec.mjs");
    const ledger = structuredClone(PLATFORMS) as Record<string, unknown>;
    ledger.ReactNative = {
      contractPlatform: "react-native",
      dir: "packages/ui-react-native/src",
      families: { disclosure: { contractRole: "disclosure", helper: "KinetixDisclosureMotion.tsx", members: [] } },
    };
    const errors: string[] = motionErrors({}, ledger);
    expect(errors.join("\n")).toMatch(
      /the native ledger wires ReactNative disclosure .*does not mention on react-native/,
    );
  });

  it("refuses a platform that does not say which contract platform it is", async () => {
    const { motionErrors } = await import("../../../../scripts/check-motion-tokens.mjs");
    const { PLATFORMS } = await import("../../../../scripts/native-motion-spec.mjs");
    const ledger = structuredClone(PLATFORMS) as Record<string, { contractPlatform?: string }>;
    delete ledger.SwiftUI.contractPlatform;
    const errors: string[] = motionErrors({}, ledger);
    expect(errors.join("\n")).toMatch(/platform SwiftUI declares no contractPlatform/);
  });

  it("refuses a contractRole naming a role the contract does not define", async () => {
    const { motionErrors } = await import("../../../../scripts/check-motion-tokens.mjs");
    const { PLATFORMS } = await import("../../../../scripts/native-motion-spec.mjs");
    const ledger = structuredClone(PLATFORMS) as Record<
      string,
      { families: Record<string, { contractRole?: string | null }> }
    >;
    ledger.SwiftUI.families.loop.contractRole = "no-such-role";
    const errors: string[] = motionErrors({}, ledger);
    expect(errors.join("\n")).toMatch(/says it implements the "no-such-role" motion role, which .* does not define/);
  });

  it("refuses a contractRole:null exemption with no reason", async () => {
    const { motionErrors } = await import("../../../../scripts/check-motion-tokens.mjs");
    const { PLATFORMS } = await import("../../../../scripts/native-motion-spec.mjs");
    const ledger = structuredClone(PLATFORMS) as Record<
      string,
      { families: Record<string, { contractRole?: string | null }> }
    >;
    ledger.SwiftUI.families.loop.contractRole = null;
    const errors: string[] = motionErrors({}, ledger);
    expect(errors.join("\n")).toMatch(/declares `contractRole: null` with no `roleExemption`/);
  });

  /** The pairing exemption, through the CLI, so the whole path including the register read is proven. */
  it("refuses a role that buys the pairing exemption with reducedForm alone (zero errors before)", () => {
    const contract = JSON.parse(read(CONTRACT));
    const register = JSON.parse(read(REGISTER));
    contract.roles["ambient-glow"] = {
      status: "observed",
      reducedForm: "rest",
      intent: "a fabricated decorative glow",
      consumers: [{ platform: "react", file: "packages/ui/src/components/button.tsx", expects: ["Button"] }],
    };
    register.identities.push("ambient-glow|react|packages/ui/src/components/button.tsx");
    register.identities.sort();
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract), [REGISTER]: JSON.stringify(register) });
    expect(code).toBe(1);
    expect(out).toMatch(/role "ambient-glow" is a transition but names no duration or no easing/);
  });

  it("refuses an exemption the register does not carry", () => {
    const exemptions = JSON.parse(read(EXEMPTIONS));
    exemptions.pairingExempt.roles = [];
    const { code, out } = run({ [EXEMPTIONS]: JSON.stringify(exemptions) });
    expect(code).toBe(1);
    expect(out).toMatch(/role "loop" declares `pairingExempt`, which motion-exemptions\.json does not register/);
  });

  it("refuses a register line whose role gave the exemption up", () => {
    const contract = JSON.parse(read(CONTRACT));
    delete contract.roles.loop.pairingExempt;
    const { code, out } = run({ [CONTRACT]: JSON.stringify(contract) });
    expect(code).toBe(1);
    expect(out).toMatch(/registers "loop" as exempt .* but that role does not declare/);
  });

  it("refuses a token group the contract still calls untokenised", () => {
    const motion = JSON.parse(read(MOTION));
    motion.stagger = { base: { $type: "duration", $value: "50ms", $description: "x" } };
    const { code, out } = run({ [MOTION]: JSON.stringify(motion) });
    expect(code).toBe(1);
    expect(out).toMatch(/"stagger" is now a token group in motion\.json but the contract still lists it as untokenised/);
  });
});
