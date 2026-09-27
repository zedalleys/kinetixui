import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * `@kinetixui/iot/functions` is documented as importable without React — from a server route, a
 * worker, a CLI, a test with no renderer. This is the assertion behind that sentence.
 *
 * It is static rather than a runtime import check on purpose. `import "./index"` inside this suite
 * would pass even if a React import crept in, because Vitest resolves React here regardless: the
 * package's own devDependencies provide it. The failure mode being guarded is a consumer's install,
 * where React may genuinely be absent — so the only honest check is on the source.
 *
 * It covers `src/functions` and `src/types` together, because the functions barrel re-exports the
 * models and a React import in a type module would travel just as far.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const roots = [here, path.resolve(here, "../types")];

/** Any form of pulling React in: static import, `export … from`, `require`, dynamic `import()`. */
const REACT_IMPORT = /(?:from|import|require)\s*\(?\s*["'](react|react-dom)(?:\/[^"']*)?["']/;

function sourceFiles(): { file: string; source: string }[] {
  const found: { file: string; source: string }[] = [];
  for (const root of roots) {
    for (const name of readdirSync(root)) {
      if (!name.endsWith(".ts") && !name.endsWith(".tsx")) continue;
      if (name.endsWith(".test.ts") || name.endsWith(".test.tsx")) continue;
      found.push({
        file: `${path.basename(root)}/${name}`,
        source: readFileSync(path.join(root, name), "utf8"),
      });
    }
  }
  return found.sort((a, b) => a.file.localeCompare(b.file));
}

describe("the functions subpath is React-free", () => {
  const files = sourceFiles();

  /** If this reads zero, the scan below is asserting nothing at all. */
  it("found the source to scan", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(files.map((f) => f.file)).toContain("functions/index.ts");
    expect(files.map((f) => f.file)).toContain("types/device.ts");
  });

  it("imports neither react nor react-dom anywhere under functions/ or types/", () => {
    for (const { file, source } of files) {
      expect(REACT_IMPORT.test(source), `${file} imports React — it would break @kinetixui/iot/functions`).toBe(false);
    }
  });

  /** `.tsx` under these directories would mean a component had been filed in the pure half. */
  it("contains no JSX files", () => {
    for (const { file } of files) {
      expect(file.endsWith(".tsx"), `${file} is JSX and does not belong in the React-free half`).toBe(false);
    }
  });

  /** A counter-assertion: the pattern must actually match a React import when one is present. */
  it("uses a pattern that catches the thing it is looking for", () => {
    expect(REACT_IMPORT.test(`import * as React from "react";`)).toBe(true);
    expect(REACT_IMPORT.test(`import { useState } from 'react'`)).toBe(true);
    expect(REACT_IMPORT.test(`export { x } from "react-dom/client";`)).toBe(true);
    expect(REACT_IMPORT.test(`const R = require("react");`)).toBe(true);
    expect(REACT_IMPORT.test(`await import("react")`)).toBe(true);
    // And must not fire on prose that merely mentions it — every module here has such a comment.
    expect(REACT_IMPORT.test(`// nothing here imports React or touches the DOM`)).toBe(false);
    expect(REACT_IMPORT.test(`import type { KinetixDevice } from "../types/device";`)).toBe(false);
  });
});
