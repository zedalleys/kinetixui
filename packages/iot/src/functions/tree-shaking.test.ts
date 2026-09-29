/**
 * The per-import cost floor of `functions/` and `types/`, asserted on the source.
 *
 * **Why this exists.** A module-level initialiser that a bundler cannot prove pure — `new Set(…)`,
 * `Object.keys(…)`, `[…].map(…)`, a helper called to build a registry — is kept even when nothing
 * imports it, and it keeps everything it references alive. After the 0.3 headless additions,
 * importing `clampBatteryLevel` alone cost 4,939 B (the pairing-failure registry, the metric registry
 * and two lookup tables rode along) and one control grew from 4.03 KB to 10.3 KB. Annotating those
 * with `/* @__PURE__ *\/` took the same import to 65 B.
 *
 * Both halves matter, as `react/tree-shaking.test.ts` explains: the bundler drops an annotated call
 * only when its *arguments* are side-effect-free too, so every call and `new` reachable from a
 * top-level initialiser (outside a function body) needs its own annotation.
 *
 * This is a source-level guard, so it needs no bundler in CI. Allowed at the top level: literals,
 * arrow and function expressions, and calls annotated `/* @__PURE__ *\/`.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const srcDir = path.resolve(import.meta.dirname, "..");

function sources(dir: "functions" | "types") {
  const full = path.join(srcDir, dir);
  return readdirSync(full)
    .filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts") && !n.endsWith(".d.ts"))
    .sort()
    .map((n) => ({ name: `${dir}/${n}`, text: readFileSync(path.join(full, n), "utf8") }));
}

/** True when the node carries a `/* @__PURE__ *\/` (or `#__PURE__`) leading comment. */
function annotated(node: ts.Node, text: string): boolean {
  // Not `ts.getLeadingCommentRanges`: mid-line it reports the comment as trailing and skips it.
  return /[@#]__PURE__\s*\*\/\s*$/.test(text.slice(0, node.getStart()));
}

/** Impure-looking expressions reachable at module evaluation time, as `line: snippet`. */
export function unannotatedInitialisers(name: string, text: string): string[] {
  const file = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  const report = (node: ts.Node) => {
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
    found.push(`${name}:${line + 1}: ${node.getText(file).split("\n")[0]!.slice(0, 80)}`);
  };
  const visit = (node: ts.Node): void => {
    // Anything inside a function or class body runs on call, not on import.
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return;
    if (ts.isCallExpression(node) || ts.isNewExpression(node) || ts.isTaggedTemplateExpression(node)) {
      if (!annotated(node, text)) report(node);
    }
    ts.forEachChild(node, visit);
  };
  for (const stmt of file.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) if (d.initializer) visit(d.initializer);
    } else if (ts.isExpressionStatement(stmt)) {
      report(stmt);
    }
  }
  return found;
}

describe("functions/ and types/ tree-shake per import", () => {
  const files = [...sources("functions"), ...sources("types")];

  it("finds the modules at all", () => {
    // Vacuity guard: an empty list would pass every rule below.
    expect(files.length).toBeGreaterThanOrEqual(30);
  });

  it("has no top-level call, `new` or expression statement without a /* @__PURE__ */ annotation", () => {
    expect(files.flatMap((f) => unannotatedInitialisers(f.name, f.text))).toEqual([]);
  });

  it("detects the defects it exists to prevent", () => {
    const bad = (code: string) => unannotatedInitialisers("x.ts", code).length;
    expect(bad("export const X = Object.keys(R);")).toBe(1);
    expect(bad("const S = new Set(A);")).toBe(1);
    expect(bad("const M = /* @__PURE__ */ new Map(A.map((a) => [a, 1]));")).toBe(1); // inner call bare
    expect(bad("const T = { a: act('x') };")).toBe(1);
    expect(bad("Foo.displayName = 'x';")).toBe(1);
    expect(bad("const S = /* @__PURE__ */ new Set(A);")).toBe(0);
    expect(bad("const f = () => Object.keys(R);")).toBe(0);
    expect(bad("const L = ['a', 'b'] as const;")).toBe(0);
  });
});
