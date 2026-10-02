import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The motion contract.
 *
 * Motion in this package is entirely class strings — there is no CSS of its own and no animation
 * runtime — so the things that can silently go wrong are wiring, not behaviour: a token that never
 * reaches a utility, a component that animates on an untokenised default, or a reduced-motion rule
 * written in a way that breaks the very components it is meant to protect.
 *
 * These assert the contract rather than any particular duration. None of them pins a number, so
 * retuning a token in the DTCG source is still a one-file change.
 */

// vitest runs with apps/web as cwd; the repo root is two levels up from it. This contract test
// lives here rather than in packages/ui because it reads files from disk, and packages/ui is a
// browser package with no node types — the same reason marketing-claims and flutter-tokens sit here.
const repoRoot = resolve(process.cwd(), "../..");
const root = (p: string) => resolve(repoRoot, "packages/ui", p);
const repo = (p: string) => resolve(repoRoot, p);

const config = readFileSync(root("tailwind.config.ts"), "utf8");
const motion = JSON.parse(readFileSync(repo("tokens/primitives/motion.json"), "utf8"));
const componentDir = root("src/components");
const components = readdirSync(componentDir)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => [f, readFileSync(`${componentDir}/${f}`, "utf8")] as const);

describe("motion tokens reach the utilities", () => {
  /**
   * The gap this exists to stop reopening: `duration-instant` and the enter/exit/emphasized easings
   * were defined in the DTCG source and emitted into globals.css, but never wired here — so the one
   * duration meant for press feedback and the pair meant for directional motion were the ones no
   * component could actually name.
   */
  it("wires every duration token as a transitionDuration", () => {
    for (const name of Object.keys(motion.duration)) {
      expect(config, `duration token "${name}" is generated but unreachable as a utility`).toContain(
        `${name}: "var(--duration-${name})"`,
      );
    }
  });

  it("wires every easing token as a transitionTimingFunction", () => {
    for (const name of Object.keys(motion.easing)) {
      expect(config, `easing token "${name}" is generated but unreachable as a utility`).toContain(
        `${name}: "var(--easing-${name})"`,
      );
    }
  });
});

describe("reduced motion", () => {
  it("ships a prefers-reduced-motion base layer, since this package ships no CSS of its own", () => {
    expect(config).toContain("@media (prefers-reduced-motion: reduce)");
    expect(config).toContain("transition-duration");
    expect(config).toContain("animation-duration");
  });

  /**
   * The safety property, and the reason this is a blanket rule at all: shortening a duration still
   * arrives at the same end state, so a checked box is still checked and an IoT control still reads
   * confirmed rather than requested. Only the interpolation goes.
   */
  it("shortens motion rather than removing it, so no end state is lost", () => {
    const block = config.slice(config.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).toContain('"animation-duration": "0.01ms !important"');
    expect(block).toContain('"transition-duration": "0.01ms !important"');
  });

  /**
   * `animation: none` would be the obvious way to write this and it would be a bug: Radix unmounts
   * an overlay when its exit animation fires `animationend`, and an animation that never runs never
   * fires it — the overlay would stay in the tree for exactly the users who asked for less motion.
   */
  it("never uses animation:none, which would strand Radix overlays in the tree", () => {
    const block = config.slice(config.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).not.toMatch(/"?animation"?\s*:\s*"none/);
    expect(block).not.toMatch(/"?transition"?\s*:\s*"none/);
  });
});

describe("components name their motion", () => {
  const TOKEN_DURATION = /duration-(instant|fast|base|slow|slower)/;

  /**
   * Per class string, not per file. A file-wide check passes as soon as one element in it is
   * tokenised, which is how Sheet's overlay kept the plugin default while its content carried a
   * duration two lines below — the surface most likely to be missed is the one hiding behind a
   * sibling that is already right.
   */
  it("gives every animated surface a token duration rather than the plugin default", () => {
    let checked = 0;
    for (const [file, src] of components) {
      for (const literal of src.match(/"[^"\n]*"/g) ?? []) {
        if (!/animate-in|animate-out/.test(literal)) continue;
        checked++;
        expect(
          TOKEN_DURATION.test(literal),
          `${file} animates on an untokenised default duration: ${literal.slice(0, 120)}…`,
        ).toBe(true);
      }
    }
    expect(checked, "no animated class string found — the check is not looking at anything").toBeGreaterThan(0);
  });

  it("uses no raw numeric duration utilities, which bypass the token contract", () => {
    for (const [file, src] of components) {
      const raw = src.match(/duration-\d+/g);
      expect(raw, `${file} hardcodes ${raw?.join(", ")} instead of a motion token`).toBeNull();
    }
  });

  /**
   * `transition-all` animates every animatable property, including layout ones, which is both a
   * performance cost and a source of the jumping this pass is meant to remove. A component should
   * name what actually changes.
   */
  it("does not reach for transition-all", () => {
    for (const [file, src] of components) {
      expect(src, `${file} uses transition-all — name the properties that change instead`).not.toContain(
        "transition-all",
      );
    }
  });
});

/**
 * The motion suite's inventory and its evidence claim.
 *
 * Read through a subprocess for the same reason `native-motion-guard.test.ts` does: the spec is ESM
 * JavaScript, and importing it from TypeScript would either need a declaration file or become `any`
 * under `pnpm typecheck`.
 */
function motionStates<T>(expr: string): T {
  const states = resolve(repoRoot, "scripts/motion-states.mjs");
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import * as m from ${JSON.stringify(states)};
         import { readFileSync } from "node:fs";
         const motionSource = readFileSync(${JSON.stringify(resolve(repoRoot, "scripts/motion.mjs"))}, "utf8");
         process.stdout.write(JSON.stringify(${expr}));`,
      ],
      { encoding: "utf8" },
    ),
  ) as T;
}

describe("the motion inventory covers every family it claims", () => {
  it("declares a state for every member of every family", () => {
    expect(motionStates<string[]>("m.coverageErrors()")).toEqual([]);
  });

  it("fails when a family member has no declared state", () => {
    // The hole review found: `coverageErrors` defaulted to the disclosure family alone, so deleting
    // both switch states would have left this green while the evidence kept being awarded.
    const errors = motionStates<string[]>(
      "m.coverageErrors(m.MOTION_STATES.filter((s) => s.slug !== 'switch'))",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/switch: in the selection family with no declared motion state/);
  });

  it("checks families beyond the first, by name", () => {
    // A regression guard on the shape of the fix rather than its effect: if `coverageErrors` ever
    // went back to a single hard-coded family, this is what would notice.
    const families = motionStates<Record<string, string[]>>("m.MOTION_FAMILIES");
    expect(Object.keys(families).length).toBeGreaterThanOrEqual(2);
    expect(families.selection).toContain("switch");
  });
});

describe("the reducedMotion claim cannot drift from the work", () => {
  it("names exactly the components it exercises", () => {
    expect(motionStates<string[]>("m.subjectErrors(motionSource)")).toEqual([]);
  });

  it("fails when a named subject has no declared state", () => {
    const errors = motionStates<string[]>(
      "m.subjectErrors(motionSource, m.MOTION_STATES.filter((s) => s.slug !== 'switch'))",
    );
    expect(errors.join("\n")).toMatch(/switch: named as a subject .* but has no declared motion state/);
  });

  it("fails when an exercised component is not named as a subject", () => {
    // The other direction: the gate proving something the ledger does not record. Both matter,
    // because either way the words and the work have come apart.
    const errors = motionStates<string[]>(
      "m.subjectErrors(motionSource.replace(/<Switch>/g, 'Switch'))",
    );
    expect(errors.join("\n")).toMatch(/switch: has a declared motion state but is not named as a subject/);
  });

  it("fails when the evidence marker is gone altogether", () => {
    const errors = motionStates<string[]>("m.subjectErrors('// no marker here')");
    expect(errors.join("\n")).toMatch(/evidence marker is missing/);
  });
});
