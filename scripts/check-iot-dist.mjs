#!/usr/bin/env node
/**
 * The React-free guarantee, asserted on the built artifact.
 *
 * `packages/iot/src/functions/react-free.test.ts` walks the *source* import graph, which is the check
 * that runs on every developer's machine and fails fastest. This one runs over `dist` — the thing npm
 * actually ships — so a build step, a chunking decision or a stray `--external` change cannot put
 * React back into the pure entry point without being caught.
 *
 * The two are complementary rather than redundant, and it is worth knowing which way round:
 *
 * - The **source** guard is stricter. It fails on a React import even if the import is unused, because
 *   it reads intent. (Verified: adding an unused `import * as React` to `functions/battery.ts` fails
 *   the source guard and *passes* this one — esbuild tree-shakes it out, so the artifact is genuinely
 *   clean and this check is right not to complain.)
 * - This **dist** guard is the one that speaks for the published package. It fails when React survives
 *   bundling, which is the only case a consumer can actually observe.
 *
 * Neither subsumes the other, so both run.
 *
 * Four properties:
 *
 * 1. `dist/functions/index.js` and every chunk it reaches carry no reference to React.
 * 2. `dist/react/index.js` does reach React — a counter-assertion, so that a build which silently
 *    emitted nothing cannot pass rule 1 by being empty.
 * 3. Every path the `exports` map promises exists.
 * 4. No orphaned chunk is left in `dist` to be published. `tsup` names chunks by content hash, so
 *    without `--clean` an earlier build's chunks accumulate and `files: ["dist"]` would ship them.
 *
 * Run after `pnpm build:iot`. Exits non-zero with the reason on the first failure.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pkgDir = path.join(root, "packages/iot");
const distDir = path.join(pkgDir, "dist");

const problems = [];
const fail = (message) => problems.push(message);

if (!existsSync(distDir)) {
  console.error("check:iot-dist — packages/iot/dist is missing. Run `pnpm build:iot` first.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));

/** Any reference to React at all: an import specifier, or the jsx-runtime a compiled component pulls. */
const REACT_REFERENCE = /["'](react|react-dom)(\/[^"']*)?["']/;

/** Relative specifiers a built file imports, which for tsup output means its sibling chunks. */
function relativeImports(source) {
  const found = new Set();
  for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.[^"']+)["']/g)) found.add(match[1]);
  return [...found];
}

/** Every dist file reachable from an entry, following relative imports transitively. */
function closureFrom(entryRelative) {
  const entry = path.join(distDir, entryRelative);
  if (!existsSync(entry)) {
    fail(`${entryRelative} does not exist — the build did not produce it`);
    return [];
  }
  const seen = new Set();
  const queue = [entry];
  const files = [];
  while (queue.length > 0) {
    const absolute = queue.shift();
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    const source = readFileSync(absolute, "utf8");
    files.push({ file: path.relative(distDir, absolute).split(path.sep).join("/"), source });
    for (const specifier of relativeImports(source)) {
      const resolved = path.resolve(path.dirname(absolute), specifier);
      if (existsSync(resolved)) queue.push(resolved);
      else fail(`${path.relative(distDir, absolute)} imports ${specifier}, which does not exist in dist`);
    }
  }
  return files;
}

// 1. The pure entry point, and everything it reaches, must be free of React.
const functionsClosure = closureFrom("functions/index.js");
if (functionsClosure.length === 0) {
  fail("the functions closure is empty — nothing was verified");
}
for (const { file, source } of functionsClosure) {
  const match = REACT_REFERENCE.exec(source);
  if (match) {
    fail(
      `dist/${file} references ${match[1]} and is reachable from @kinetixui/iot/functions — ` +
        `the subpath is documented as importable without React`,
    );
  }
}

// 2. Counter-assertion: the React entry point must reach React, or rule 1 proves nothing.
const reactClosure = closureFrom("react/index.js");
if (!reactClosure.some(({ source }) => REACT_REFERENCE.test(source))) {
  fail(
    "dist/react/index.js reaches no React import — either the build emitted nothing, or this check " +
      "would pass rule 1 vacuously",
  );
}

// 3. Every path the exports map promises has to resolve, or a consumer's import fails at install time.
for (const [subpath, entry] of Object.entries(manifest.exports ?? {})) {
  const targets = typeof entry === "string" ? [entry] : Object.values(entry);
  for (const target of targets) {
    if (typeof target !== "string" || !target.startsWith("./dist/")) continue;
    if (!existsSync(path.join(pkgDir, target))) {
      fail(`exports["${subpath}"] points at ${target}, which the build did not produce`);
    }
  }
}

// 4. No orphaned chunk: everything in dist must be reachable from an entry, or it is published dead weight.
const entryFiles = ["index.js", "functions/index.js", "react/index.js"];
const reachable = new Set();
for (const entry of entryFiles) {
  for (const { file } of closureFrom(entry)) reachable.add(file);
}
for (const name of readdirSync(distDir)) {
  if (!name.startsWith("chunk-") || !name.endsWith(".js")) continue;
  if (!reachable.has(name)) {
    fail(
      `dist/${name} is not reachable from any entry point — a stale chunk from an earlier build that ` +
        `\`files: ["dist"]\` would publish. The build needs --clean.`,
    );
  }
}

if (problems.length > 0) {
  console.error("check:iot-dist failed:");
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}

const chunkCount = readdirSync(distDir).filter((n) => n.startsWith("chunk-") && n.endsWith(".js")).length;
console.log(
  `check:iot-dist ok — @kinetixui/iot/functions closure is React-free ` +
    `(${functionsClosure.length} files), /react reaches React, ${Object.keys(manifest.exports ?? {}).length} ` +
    `export paths resolve, ${chunkCount} chunks all reachable.`,
);
