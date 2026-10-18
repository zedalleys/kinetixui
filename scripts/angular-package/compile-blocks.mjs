/**
 * compile-blocks.mjs — the Angular blocks, compiled the way a reader's app would compile them.
 *
 *   pnpm check:angular-blocks
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * `pnpm build:angular` (ng-packagr) compiles what src/public-api.ts reaches, and nothing there imports
 * src/examples/blocks: a type error in a block still built. The block spec runs them through Vitest, which
 * transpiles without type-checking. So nothing compiled the code a reader copies from /blocks, and
 * create-account.ts had shipped a template binding that strict templates reject.
 *
 * This runs ngc over packages/ui-angular/tsconfig.blocks.json: the library's strict compiler options and
 * strictTemplates, in full compilation mode, with no emit. gen:verification credits Angular blocks with Build
 * verified from this step, and only for the files that tsconfig lists.
 *
 * ── What it checks ───────────────────────────────────────────────────────────
 *   1. tsconfig.blocks.json lists every Angular block in blocks.manifest.json, by file and without globs, and
 *      nothing that is not one. A block left out is not compiled, so it must not be credited.
 *   2. Negative control: a copy of a block with one template binding of the wrong type must FAIL to compile.
 *      A gate that cannot fail proves nothing, so this runs every time, before the real pass.
 *   3. The real pass: every block compiles with no error.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pkg = path.join(root, "packages/ui-angular");
const tsconfigPath = path.join(pkg, "tsconfig.blocks.json");
const ngc = path.join(
  path.dirname(createRequire(path.join(pkg, "package.json")).resolve("@angular/compiler-cli/package.json")),
  "bundles/src/bin/ngc.js",
);

const fail = (msg) => {
  console.error(`check:angular-blocks failed — ${msg}`);
  process.exit(1);
};
const compile = (project) => spawnSync(process.execPath, [ngc, "-p", project], { cwd: pkg, encoding: "utf8" });

// 1. the program is exactly the manifest's Angular blocks
const manifest = JSON.parse(readFileSync(path.join(root, "blocks.manifest.json"), "utf8")).blocks;
const expected = Object.values(manifest)
  .map((b) => b.sources?.Angular)
  .filter(Boolean)
  .map((f) => path.relative(pkg, path.join(root, f)))
  .sort();
const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8"));
if (tsconfig.include?.length) fail("tsconfig.blocks.json must list files one by one; `include` would compile whatever matches");
const listed = [...(tsconfig.files ?? [])].sort();
const missing = expected.filter((f) => !listed.includes(f));
const extra = listed.filter((f) => !expected.includes(f));
if (missing.length) fail(`tsconfig.blocks.json leaves out ${missing.join(", ")}`);
if (extra.length) fail(`tsconfig.blocks.json lists ${extra.join(", ")}, which blocks.manifest.json does not declare as an Angular block`);

// 2. negative control: a wrong-typed template binding must be rejected
const planted = path.join(pkg, "node_modules/.cache/kx-blocks-negative");
rmSync(planted, { recursive: true, force: true });
mkdirSync(planted, { recursive: true });
try {
  const source = readFileSync(path.join(pkg, "src/examples/blocks/create-account.ts"), "utf8");
  const broken = source
    .replaceAll("'../../lib/", `'${path.relative(planted, path.join(pkg, "src/lib")).split(path.sep).join("/")}/`)
    .replace('[value]="percent()"', `[value]="'not a number'"`);
  if (broken === source || !broken.includes(`[value]="'not a number'"`)) fail("the negative control could not plant its error in create-account.ts");
  writeFileSync(path.join(planted, "planted-block.ts"), broken);
  writeFileSync(
    path.join(planted, "tsconfig.json"),
    JSON.stringify({ extends: path.relative(planted, tsconfigPath), files: ["planted-block.ts"], include: [] }),
  );
  const control = compile(path.join(planted, "tsconfig.json"));
  const output = `${control.stdout}${control.stderr}`;
  if (control.status === 0) fail("negative control: a block binding a string to a number input compiled — the gate cannot fail");
  if (!/planted-block\.ts/.test(output) || !/TS2322/.test(output)) fail(`negative control failed for an unexpected reason:\n${output}`);
  console.log("  ✓ negative control: a wrong-typed template binding is rejected (TS2322)");
} finally {
  rmSync(planted, { recursive: true, force: true });
}

// 3. the real pass
const result = compile(tsconfigPath);
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
if (result.status !== 0) fail("ngc reported errors in the Angular blocks");
console.log(`check:angular-blocks ok — ${expected.length} Angular blocks compile with strict templates`);
