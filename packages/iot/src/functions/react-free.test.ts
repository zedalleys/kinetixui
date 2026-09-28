import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * `@kinetixui/iot/functions` is documented as importable without React — from a server route, a
 * worker, a CLI, a test with no renderer. This is the assertion behind that sentence.
 *
 * ## Why it walks the import graph rather than listing a directory
 *
 * It is static rather than a runtime import check on purpose. `import "./index"` inside this suite
 * would pass even if a React import crept in, because Vitest resolves React here regardless: the
 * package's own devDependencies provide it. The failure mode being guarded is a consumer's install,
 * where React may genuinely be absent — so the only honest check is on the source.
 *
 * But scanning `src/functions` and `src/types` as flat directories checks the wrong thing. It asks
 * "do the files I expected to be here import React", when the question is "can React be reached from
 * the entry point". Those differ in three ways that matter:
 *
 * - a file in a **subdirectory** (`functions/adapters/mqtt.ts`) is invisible to a flat listing;
 * - a file that imports `../react/device-status-badge` pulls React in **transitively**, and a scan
 *   for the literal specifier `"react"` never sees it;
 * - a file nobody imports is scanned anyway, so the guard reports on code that does not ship.
 *
 * So this resolves the actual closure from `functions/index.ts`, following relative imports, and
 * asserts three properties over every file it can reach. Recursion through the graph is what makes
 * subdirectories and indirection work — there is no directory listing left to fall out of date.
 *
 * It is a closure walk over relative specifiers, not a dependency analyser: it does not resolve
 * bare specifiers into `node_modules`, because it does not need to. Any bare specifier other than
 * the ones on the allowlist below is itself a failure.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, "..");
const entryPoint = path.join(here, "index.ts");

/** Directories the React-free half is allowed to live in, relative to `src/`. */
const ALLOWED_DIRS = ["functions", "types"];

/**
 * Bare specifiers the pure half may import.
 *
 * Empty, deliberately. This module has zero runtime dependencies, so *any* bare import reachable
 * from `functions/index.ts` is a change worth failing on — including a Node builtin, which would
 * make the subpath unusable in a browser or edge runtime where this is documented to work.
 */
const ALLOWED_BARE_IMPORTS: readonly string[] = [];

/** Any form of pulling React in: static import, `export … from`, `require`, dynamic `import()`. */
const REACT_IMPORT = /(?:from|import|require)\s*\(?\s*["'](react|react-dom)(?:\/[^"']*)?["']/;

/**
 * Globals the pure half must not reach for.
 *
 * `window`, `document`, `localStorage`, `sessionStorage` and `HTMLElement` are browser-only, and a
 * reference to one is a portability break that no type-check would catch. `navigator` is in the list
 * for a different reason: Node 21+ provides a real one, so this is not about whether it resolves but
 * about a module of pure functions having no business reading its environment at all.
 *
 * Word-boundary matched and comment-stripped, so the prose in these modules ("nothing here touches
 * the DOM") does not fire it.
 */
const BROWSER_GLOBAL = /\b(?:window|document|navigator|localStorage|sessionStorage|HTMLElement)\b/;

/**
 * Every import specifier in a source file, from all four syntactic forms.
 *
 * Comments are stripped first. These modules explain themselves at length, and English puts a quoted
 * word after "from" often enough to matter — `cannot tell "equal" from "unknown"` in `firmware.ts`
 * reads as an import of a package called `unknown` otherwise. Prose is not code.
 */
function importSpecifiers(source: string): string[] {
  const found: string[] = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)["']([^"']+)["']/g;
  for (const match of stripComments(source).matchAll(pattern)) found.push(match[1]);
  return found;
}

/** Strip line and block comments, so prose mentioning a global is not mistaken for a reference. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/** Resolve a relative specifier the way the bundler does: exact, then `.ts`/`.tsx`, then `/index`. */
function resolveRelative(fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
  for (const candidate of candidates) {
    if (existsSync(candidate) && !candidate.endsWith(path.sep)) {
      try {
        if (readFileSync(candidate).length >= 0) return candidate;
      } catch {
        // a directory, not a file — keep looking
      }
    }
  }
  return null;
}

type Reached = {
  /** Path relative to `src/`, e.g. `functions/battery.ts`. */
  file: string;
  absolute: string;
  source: string;
  /** Bare (non-relative) specifiers this file imports. */
  bareImports: string[];
};

/**
 * Every file reachable from `functions/index.ts` through relative imports, plus the bare specifiers
 * they pull. Unresolvable relative imports are reported rather than skipped — a typo that silently
 * shrank the graph would silently shrink the guarantee.
 */
function reachableFromFunctionsEntry(): { files: Reached[]; unresolved: string[] } {
  const files: Reached[] = [];
  const unresolved: string[] = [];
  const seen = new Set<string>();
  const queue = [entryPoint];

  while (queue.length > 0) {
    const absolute = queue.shift() as string;
    if (seen.has(absolute)) continue;
    seen.add(absolute);

    const source = readFileSync(absolute, "utf8");
    const specifiers = importSpecifiers(source);
    const bareImports: string[] = [];

    for (const specifier of specifiers) {
      if (specifier.startsWith(".")) {
        const resolved = resolveRelative(absolute, specifier);
        if (resolved === null) {
          unresolved.push(`${path.relative(srcRoot, absolute)} -> ${specifier}`);
          continue;
        }
        queue.push(resolved);
      } else {
        bareImports.push(specifier);
      }
    }

    files.push({
      file: path.relative(srcRoot, absolute).split(path.sep).join("/"),
      absolute,
      source,
      bareImports,
    });
  }

  return { files: files.sort((a, b) => a.file.localeCompare(b.file)), unresolved };
}

describe("the functions subpath is React-free", () => {
  const { files, unresolved } = reachableFromFunctionsEntry();

  /** If the walk collapsed, everything below would pass by reaching nothing. */
  it("walked a graph that actually contains the module", () => {
    expect(unresolved, "every relative import must resolve, or the graph is incomplete").toEqual([]);
    expect(files.length).toBeGreaterThan(10);
    const names = files.map((f) => f.file);
    expect(names).toContain("functions/index.ts");
    expect(names).toContain("functions/battery.ts");
    expect(names).toContain("functions/time.ts");
    // Reached only because the functions barrel re-exports the models — proof the walk is transitive
    // rather than a directory listing wearing a graph's clothes.
    expect(names).toContain("types/device.ts");
    expect(names).toContain("types/telemetry.ts");
  });

  it("imports neither react nor react-dom anywhere in that graph", () => {
    for (const { file, source } of files) {
      expect(REACT_IMPORT.test(source), `${file} imports React — it would break @kinetixui/iot/functions`).toBe(false);
    }
  });

  /**
   * The transitive rule. A file under `react/` may be React-free today (`react/cn.ts` is), so
   * scanning its contents for the string "react" proves nothing about tomorrow. Confining the graph
   * to `functions/` and `types/` is what makes the boundary hold: reaching out of those directories
   * fails here whether or not the file it reaches imports React yet.
   */
  it("reaches no file outside functions/ and types/", () => {
    for (const { file } of files) {
      const dir = file.split("/")[0];
      expect(
        ALLOWED_DIRS.includes(dir),
        `${file} is reachable from the functions entry point but lives outside ${ALLOWED_DIRS.join("/")}/ — ` +
          `anything it imports now travels into @kinetixui/iot/functions`,
      ).toBe(true);
    }
  });

  it("pulls no bare dependency, not even a Node builtin", () => {
    for (const { file, bareImports } of files) {
      for (const specifier of bareImports) {
        expect(
          ALLOWED_BARE_IMPORTS.includes(specifier),
          `${file} imports "${specifier}" — the functions subpath has zero runtime dependencies and ` +
            `must stay importable from a browser, a worker and an edge runtime`,
        ).toBe(true);
      }
    }
  });

  it("references no browser-only global", () => {
    for (const { file, source } of files) {
      const code = stripComments(source);
      const match = BROWSER_GLOBAL.exec(code);
      expect(match?.[0], `${file} references the browser-only global \`${match?.[0]}\``).toBe(undefined);
    }
  });

  /** `.tsx` anywhere in the graph would mean a component had been filed in the pure half. */
  it("contains no JSX files", () => {
    for (const { file } of files) {
      expect(file.endsWith(".tsx"), `${file} is JSX and does not belong in the React-free half`).toBe(false);
    }
  });

  /**
   * Counter-assertions. Every rule above is a pattern that could quietly stop matching; these prove
   * each one still fires on the thing it exists to catch, and does not fire on the prose that
   * describes it. Without these, a broken regex reads as a clean bill of health.
   */
  describe("the patterns catch what they are looking for", () => {
    it("detects every form of a React import", () => {
      expect(REACT_IMPORT.test(`import * as React from "react";`)).toBe(true);
      expect(REACT_IMPORT.test(`import { useState } from 'react'`)).toBe(true);
      expect(REACT_IMPORT.test(`export { x } from "react-dom/client";`)).toBe(true);
      expect(REACT_IMPORT.test(`const R = require("react");`)).toBe(true);
      expect(REACT_IMPORT.test(`await import("react")`)).toBe(true);
      // And must not fire on prose that merely mentions it — every module here has such a comment.
      expect(REACT_IMPORT.test(`// nothing here imports React or touches the DOM`)).toBe(false);
      expect(REACT_IMPORT.test(`import type { KinetixDevice } from "../types/device";`)).toBe(false);
    });

    it("collects specifiers from every import form, relative and bare", () => {
      const source = [
        `import a from "./a";`,
        `import type { B } from "../types/b";`,
        `export { c } from "./c";`,
        `const d = require("some-pkg");`,
        `await import("node:fs");`,
      ].join("\n");
      expect(importSpecifiers(source)).toEqual(["./a", "../types/b", "./c", "some-pkg", "node:fs"]);
    });

    /**
     * The false positive this walk actually hit: `firmware.ts` contains the sentence `cannot tell
     * "equal" from "unknown"`, which is prose, not an import of a package called `unknown`. A scanner
     * that cannot tell those apart fails on documentation and gets loosened until it stops working.
     */
    it("reads no import out of prose that happens to say from", () => {
      expect(importSpecifiers(`// a caller that cannot tell "equal" from "unknown" will report wrongly`)).toEqual([]);
      expect(importSpecifiers(`/* imported from "somewhere" in an earlier draft */`)).toEqual([]);
      expect(importSpecifiers(`/** Normalised from \`"v1.4.0"\` to "1.4.0". */`)).toEqual([]);
      // Real code beside a comment that mentions one is still collected.
      expect(importSpecifiers(`// not from "react"\nimport { x } from "./x";`)).toEqual(["./x"]);
    });

    it("detects a browser global in code but not in prose", () => {
      expect(BROWSER_GLOBAL.test(`const w = window.innerWidth;`)).toBe(true);
      expect(BROWSER_GLOBAL.test(`document.querySelector("a")`)).toBe(true);
      expect(BROWSER_GLOBAL.test(`if (navigator.onLine) {}`)).toBe(true);
      expect(BROWSER_GLOBAL.test(stripComments(`// nothing here touches the document or window`))).toBe(false);
      expect(BROWSER_GLOBAL.test(stripComments(`/* no navigator access */`))).toBe(false);
      // A word that merely contains one must not fire it.
      expect(BROWSER_GLOBAL.test(`const documented = 1;`)).toBe(false);
    });

    it("resolves a relative specifier to the file the bundler would pick", () => {
      expect(resolveRelative(entryPoint, "./battery")).toBe(path.join(here, "battery.ts"));
      expect(resolveRelative(entryPoint, "../types")).toBe(path.join(srcRoot, "types", "index.ts"));
      expect(resolveRelative(entryPoint, "./does-not-exist")).toBe(null);
    });

    /**
     * The whole point, asserted directly: were a functions module to import a React component by a
     * relative path, the graph would leave the allowed directories and the rule above would fail.
     * This proves the confinement rule fires without editing a shipped file.
     */
    it("would leave the allowed directories if functions imported a component", () => {
      const reactModule = resolveRelative(entryPoint, "../react/device-status-badge");
      expect(reactModule, "the component this rule guards against should exist").not.toBe(null);
      const dir = path.relative(srcRoot, reactModule as string).split(path.sep)[0];
      expect(ALLOWED_DIRS.includes(dir)).toBe(false);
      // And that file really is the React one, so the rule is guarding a live hazard.
      expect(REACT_IMPORT.test(readFileSync(reactModule as string, "utf8"))).toBe(true);
    });
  });
});
