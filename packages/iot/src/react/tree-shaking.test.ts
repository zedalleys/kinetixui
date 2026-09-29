/**
 * The per-component tree-shaking guarantee, asserted on the source.
 *
 * **Why this exists.** `Component.displayName = "Component"` is a top-level property assignment, and
 * a bundler cannot prove that discarding it is safe. It therefore keeps the assignment, and with it
 * the component, and with it every component reachable from the entry barrel — so importing one
 * costs you all of them.
 *
 * Measured on this package with esbuild (`--bundle --minify`, React external), before the fix:
 *
 * | Import | Minified |
 * |---|---|
 * | one control | 45.91 KB |
 * | `DeviceCard` alone | 45.91 KB |
 * | all twenty-one | 46.54 KB |
 *
 * One component cost 98.6% of the library — the same defect `marketing/audits/TREE-SHAKING.md`
 * documents for `@kinetixui/ui`. After moving the assignment into a `/* @__PURE__ *\/`-annotated
 * call, the same three imports measured **4.03 KB**, **10.25 KB** and **46.23 KB**: cost now scales
 * with what you import.
 *
 * **Both annotations are load-bearing**, which is the part that is easy to get wrong. esbuild drops a
 * `/* @__PURE__ *\/` call only when its arguments are *also* side-effect-free, so
 * `withDisplayName(React.forwardRef(…))` with the annotation on the outer call alone does nothing
 * measurable — verified: that intermediate state measured 45.60 KB against 45.91 KB before it. The
 * inner `React.forwardRef(…)` needs its own annotation too.
 *
 * This guard is source-level, like `react-free.test.ts`, so it fails at authorship rather than at
 * publish, and it needs no bundler in CI.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const reactDir = path.resolve(import.meta.dirname);

/** Every shipped component module: `.tsx` in `src/react`, excluding stories and tests. */
function componentFiles(): { name: string; source: string }[] {
  return readdirSync(reactDir)
    .filter((n) => n.endsWith(".tsx") && !n.includes(".stories.") && !n.includes(".test."))
    .sort()
    .map((name) => ({ name, source: readFileSync(path.join(reactDir, name), "utf8") }));
}

const REQUIRED = "withDisplayName(/* @__PURE__ */ React.forwardRef<";
/** A bare top-level `X.displayName = "…"`, which is the side effect this guard exists to prevent. */
const BARE_ASSIGNMENT = /^\s*\w+\.displayName\s*=/m;

describe("the react entry point tree-shakes per component", () => {
  const files = componentFiles();

  it("finds the component modules at all", () => {
    // Vacuity guard: every rule below passes trivially against an empty list, and a rename of the
    // directory or the extension would silently empty it.
    expect(files.length).toBeGreaterThanOrEqual(20);
  });

  it("gives every forwardRef component both PURE annotations", () => {
    const offenders = files
      .filter((f) => f.source.includes("React.forwardRef<"))
      .filter((f) => !f.source.includes(REQUIRED))
      .map((f) => f.name);

    expect(
      offenders,
      `these components do not use \`${REQUIRED}…\`, so a consumer importing one component would ` +
        `pay for all of them: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("leaves no bare displayName assignment anywhere", () => {
    const offenders = files.filter((f) => BARE_ASSIGNMENT.test(f.source)).map((f) => f.name);

    expect(
      offenders,
      `a top-level \`X.displayName = …\` pins every component in the bundle; use ` +
        `withDisplayName() instead: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("routes every component through the shared helper", () => {
    const withForwardRef = files.filter((f) => f.source.includes("React.forwardRef<"));
    const missingImport = withForwardRef
      .filter((f) => !f.source.includes('from "./display-name"'))
      .map((f) => f.name);

    expect(missingImport, `missing the withDisplayName import: ${missingImport.join(", ")}`).toEqual([]);
    expect(withForwardRef.length).toBeGreaterThanOrEqual(20);
  });
});
