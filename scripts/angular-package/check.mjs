/**
 * check.mjs — is `@kinetixui/angular` ready to be a real npm package?
 *
 *   node scripts/angular-package/check.mjs            build, simulate, install, typecheck, build
 *   node scripts/angular-package/check.mjs --contract stop after the artifact contract (no network)
 *
 * The package is deliberately unpublishable: it carries `private: true` and is absent from
 * `release/publish-packages.json`, and PR-time release checks assert both. This proves the other
 * half — that the artifact behind those locks is genuinely usable — without removing them.
 *
 * ## Publication simulation
 *
 * The repository's package manifest is never modified. `dist/` is copied to a temp directory and
 * *that copy* gets the two publication locks removed: `private` deleted and `publishConfig` added.
 * Nothing else is changed. If the resulting tarball is a valid npm artifact, then flipping those
 * exact switches in PR #227 produces a valid npm artifact, and the simulation says so without ever
 * making the repository publishable.
 *
 * The tarball is then validated by the release tooling's own `validatePackedArtifact` — the same
 * function that gates `@kinetixui/{tokens,ui,cli}` — rather than an Angular-only reimplementation.
 * An Angular package that would fail the real release gate fails here.
 *
 * ## Clean consumer
 *
 * A generated Angular application in a temp directory outside the workspace installs that tarball
 * the way npm would, then typechecks and runs a production AOT build. It has no `paths` mapping and
 * no link to this repository, so nothing resolves through the monorepo: if the package's own
 * `exports`, `typings` or partial-compiled FESM are wrong, the build fails.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run, runRootScript, packageManagerCommand } from "../release/exec.mjs";
import { describePackage, readTarball } from "../release/tar.mjs";
import { validatePackedArtifact } from "../release/artifacts.mjs";
import { consumerFiles, EXERCISED } from "./fixture.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const pkgDir = path.join(root, "packages", "ui-angular");
const contractOnly = process.argv.includes("--contract");
const step = (message) => console.log(`\n▸ ${message}`);
const detail = (message) => console.log(`  ${message}`);

/** Paths a consumer must find inside the tarball, on top of everything the manifest declares. */
const REQUIRE_FILES = ["styles.css", "fesm2022/kinetixui-angular.mjs", "types/kinetixui-angular.d.ts"];

/** Nothing from the repository's working tree may reach the package. */
const FORBIDDEN = [
  { pattern: /\.spec\.[cm]?[jt]s$/, why: "test file" },
  { pattern: /(^|\/)test-setup\./, why: "test harness" },
  { pattern: /(^|\/)examples\//, why: "example source" },
  { pattern: /(^|\/)usage\//, why: "website usage source" },
  { pattern: /(^|\/)stories\//, why: "story" },
  { pattern: /(^|\/)\.turbo\//, why: "build cache" },
  { pattern: /(^|\/)node_modules\//, why: "dependency tree" },
  { pattern: /(^|\/)coverage\//, why: "coverage output" },
  { pattern: /^(vitest|tsconfig|ng-package)\./, why: "repository config" },
  { pattern: /(^|\/)scripts\//, why: "repository script" },
];

const errors = [];
const fail = (message) => errors.push(message);

/**
 * A spawnable npm. The consumer is installed with npm rather than pnpm on purpose — it must be an
 * ordinary node_modules tree with no workspace semantics anywhere near it. Node will not spawn a
 * `.cmd` without a shell, and this does not use one, so on Windows npm's own JavaScript entry point
 * is run instead. On Linux, where CI runs, `npm` is a real executable.
 */
function resolveNpm() {
  const execpath = process.env.npm_execpath;
  if (execpath && /npm-cli\.[cm]?js$/i.test(execpath) && existsSync(execpath)) {
    return { file: process.execPath, prefix: [execpath] };
  }
  if (process.platform !== "win32") return { file: "npm", prefix: [] };
  for (const dir of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    if (!existsSync(path.join(dir, "npm.cmd"))) continue;
    const js = path.join(dir, "node_modules", "npm", "bin", "npm-cli.js");
    if (existsSync(js)) return { file: process.execPath, prefix: [js] };
  }
  throw new Error("Could not find an npm that can be spawned without a shell.");
}

// ── 1. build ────────────────────────────────────────────────────────────────
step("Building the Angular package (ng-packagr)");
await runRootScript("build:angular", { cwd: root });
const dist = path.join(pkgDir, "dist");
const built = JSON.parse(readFileSync(path.join(dist, "package.json"), "utf8"));
detail(`built ${built.name}@${built.version}`);

// The locks this PR must not remove. Asserted against the real, unmodified artifact.
if (built.private !== true) fail(`the built package lost "private": true — the repository must stay unpublishable`);
const source = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
if (source.private !== true) fail(`packages/ui-angular/package.json lost "private": true`);
const allowlist = JSON.parse(readFileSync(path.join(root, "release", "publish-packages.json"), "utf8"));
if (allowlist.packages.some((entry) => entry.name === built.name)) {
  fail(`${built.name} is in release/publish-packages.json — this PR must not make it publishable`);
}
detail(`private: true preserved, and absent from the publish allowlist`);

// ── 1b. public API snapshot ─────────────────────────────────────────────────
// Every exported symbol, selector, input and output, in a file review can diff. Once a symbol is
// on npm, removing it is a breaking change whether or not anyone meant to export it.
step("Checking the public API snapshot");
try {
  const { stdout } = await run(process.execPath, [path.join(root, "scripts", "angular-package", "api-snapshot.mjs"), "--check"], { cwd: root });
  detail(stdout.trim());
} catch (error) {
  fail(String(error.stdout || error.stderr || error.message).trim());
}

// ── 1c. DOM access ──────────────────────────────────────────────────────────
/**
 * KinetixUI does not currently claim Angular SSR support, and this does not start claiming it.
 * What it does assert is the property that makes SSR possible later, and that is worth keeping
 * either way: the components reach the DOM through the element they were injected with
 * (`el.nativeElement.ownerDocument.defaultView`), never through a global. A bare `window` or
 * `document` — especially at module scope — is what turns a library into one that cannot be
 * rendered anywhere but a browser tab.
 */
step("Checking DOM access (no global browser objects)");
{
  const fesm = readFileSync(path.join(dist, "fesm2022", "kinetixui-angular.mjs"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const globals = ["window", "document", "navigator", "localStorage", "sessionStorage", "matchMedia", "ResizeObserver", "MutationObserver", "IntersectionObserver"];
  const found = globals.filter((name) => new RegExp(`(^|[^.\\w$])${name}\\b`).test(fesm));
  if (found.length > 0) {
    fail(
      `the bundle reaches global browser objects (${found.join(", ")}). Reach the DOM through the ` +
        `injected element instead — a global makes the package unusable outside a browser.`,
    );
  } else {
    detail("no global browser objects; DOM access goes through the injected element");
  }
}

// ── 2. publication simulation ───────────────────────────────────────────────
step("Simulating publication (a temp copy — the repository is not modified)");
const staging = mkdtempSync(path.join(tmpdir(), "kinetixui-angular-sim-"));
const stageDir = path.join(staging, "package");
cpSync(dist, stageDir, { recursive: true });

const staged = JSON.parse(readFileSync(path.join(stageDir, "package.json"), "utf8"));
delete staged.private; // lock 1
staged.publishConfig = { access: "public", provenance: true }; // lock 2
writeFileSync(path.join(stageDir, "package.json"), `${JSON.stringify(staged, null, 2)}\n`);
detail("removed `private`, added publishConfig — nothing else");

const npm = resolveNpm();
let tarballPath;
try {
  const { stdout } = await run(npm.file, [...npm.prefix, "pack", "--pack-destination", staging, "--json"], { cwd: stageDir });
  const [packed] = JSON.parse(stdout.slice(stdout.indexOf("[")));
  tarballPath = path.join(staging, packed.filename);
  detail(`packed ${packed.filename}`);
} catch (error) {
  fail(`npm pack failed on the simulated package: ${String(error.stderr || error.message).trim()}`);
}

// ── 3. artifact contract ────────────────────────────────────────────────────
step("Validating the packed artifact");
let paths = [];
if (tarballPath) {
  const bytes = readFileSync(tarballPath);
  const described = describePackage(readTarball(bytes));
  paths = described.paths;

  // The release tooling's own validator: manifest identity, public access, every declared
  // exports/typings/module target present, required files present, no workspace protocol.
  errors.push(
    ...validatePackedArtifact({
      name: built.name,
      version: built.version,
      requireFiles: REQUIRE_FILES,
      paths,
      manifest: described.manifest,
      manifestError: described.manifestError,
    }),
  );

  for (const file of paths) {
    const hit = FORBIDDEN.find((rule) => rule.pattern.test(file));
    if (hit) fail(`${built.name}: the tarball contains ${file} (${hit.why}) — consumers do not need it`);
  }

  const size = bytes.length;
  const unpacked = described.paths.length > 0 ? readTarball(bytes).reduce((sum, entry) => sum + entry.size, 0) : 0;
  detail(`${paths.length} files · ${(size / 1024).toFixed(1)} KB packed · ${(unpacked / 1024).toFixed(1)} KB unpacked`);
  for (const file of paths) detail(`  ${file}`);

  // Supply chain: a package that runs nothing on install.
  const m = described.manifest ?? {};
  for (const hook of ["preinstall", "install", "postinstall", "prepare", "prepublish", "prepublishOnly"]) {
    if (m.scripts?.[hook]) fail(`${built.name}: the packed manifest defines a "${hook}" script — the package must be inert on install`);
  }
  // A published artifact must not carry a path from the machine that built it — including in the
  // sourcemap, whose `sources` are the easiest place for one to hide.
  const suspicious = /(^|[^A-Za-z])(\/Users\/|\/home\/|[A-Z]:\\\\|file:\/\/)/;
  for (const file of paths.filter((p) => /\.(mjs|map|d\.ts|css)$/.test(p) || p === "package.json")) {
    const entry = readTarball(bytes).find((e) => e.path === `package/${file}`);
    const text = entry ? entry.data.toString("utf8") : "";
    if (suspicious.test(text)) fail(`${built.name}: ${file} contains an absolute local path`);
  }
}

if (errors.length > 0) report();
if (contractOnly) {
  step("Contract only (--contract): skipping the clean-consumer build");
  finish();
}

// ── 4. clean consumer ───────────────────────────────────────────────────────
step("Installing into a clean Angular application outside the workspace");
const consumer = mkdtempSync(path.join(tmpdir(), "kinetixui-angular-app-"));
try {
  for (const [file, contents] of Object.entries(consumerFiles())) {
    const target = path.join(consumer, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  detail(`generated a consumer app in ${consumer}`);

  // @kinetixui/tokens is a peer, and the consumer needs the real one: pack the workspace copy so
  // the styles resolve from an installed package rather than from this repository.
  const { file: pm, prefix } = packageManagerCommand();
  const { stdout: tokensOut } = await run(pm, [...prefix, "pack", "--pack-destination", staging], {
    cwd: path.join(root, "packages", "tokens"),
  });
  const tokensTarball = path.join(staging, path.basename(tokensOut.trim().split(/\r?\n/).filter(Boolean).pop()));
  detail(`packed @kinetixui/tokens for the peer`);

  await run(npm.file, [...npm.prefix, "install", "--no-audit", "--no-fund", "--loglevel=error", tarballPath, tokensTarball], { cwd: consumer });
  detail("npm install succeeded with no workspace link");

  // Resolution must go through the package, not the repository.
  await run(
    process.execPath,
    [
      "-e",
      `const { createRequire } = require("node:module");
       const r = createRequire(${JSON.stringify(path.join(consumer, "index.cjs"))});
       const p = r.resolve("@kinetixui/angular/package.json");
       if (p.includes("packages${path.sep === "\\" ? "\\\\" : "/"}ui-angular")) throw new Error("resolved to the workspace, not the tarball: " + p);
       const m = r("@kinetixui/angular/package.json");
       if (m.private) throw new Error("the installed package is private");`,
    ],
    { cwd: consumer },
  );
  detail("resolves to the installed tarball, not the workspace");

  step("Type-checking and building the consumer (production AOT)");
  await run(npm.file, [...npm.prefix, "run", "build"], { cwd: consumer });
  detail("ng build --configuration production succeeded");

  // A build that succeeded does not prove the stylesheets resolved — an unresolvable `@import` can
  // pass through as a no-op and leave every component unstyled. Read the emitted CSS and check that
  // a token definition, an extras-only token and an Angular component class all actually arrived.
  const outDir = path.join(consumer, "dist", "browser");
  const cssFiles = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith(".css")) : [];
  if (cssFiles.length === 0) fail("the consumer build emitted no CSS — the stylesheets did not reach the bundle");
  const css = cssFiles.map((f) => readFileSync(path.join(outDir, f), "utf8")).join("\n");
  const cssChecks = [
    ["--background:", "a token from @kinetixui/tokens/css"],
    ["--text-body-md:", "a token that only exists in @kinetixui/tokens/css/extras"],
    [".kx-btn", "a component class from @kinetixui/angular/styles.css"],
    ["--shadow-focus:", "the focus ring the extras sheet defines"],
  ];
  for (const [needle, what] of cssChecks) {
    if (!css.includes(needle)) fail(`the consumer's built CSS is missing ${needle} (${what})`);
  }
  if (errors.length === 0) detail(`styles resolved: token contract + extras + component classes are all in the bundle`);
  detail("exercised:");
  for (const item of EXERCISED) detail(`  · ${item}`);
} catch (error) {
  fail(`clean-consumer validation failed: ${String(error.stderr || error.stdout || error.message).trim().split("\n").slice(-12).join("\n  ")}`);
} finally {
  rmSync(consumer, { recursive: true, force: true });
}

finish();

function finish() {
  rmSync(staging, { recursive: true, force: true });
  if (errors.length > 0) report();
  console.log(
    contractOnly
      ? `\n✓ @kinetixui/angular's packed artifact is a valid npm package.\n` +
          `  The clean-consumer build was skipped (--contract), so this does not prove a consumer can use it.\n` +
          `  It remains private: true and absent from release/publish-packages.json, so it cannot be published.`
      : `\n✓ @kinetixui/angular is publication-ready: the artifact is a valid npm package and a clean ` +
          `Angular application builds against it.\n` +
          `  It remains private: true and absent from release/publish-packages.json, so it cannot be published.`,
  );
  process.exit(0);
}

function report() {
  rmSync(staging, { recursive: true, force: true });
  console.error(`\n✗ Angular publication-readiness failed:\n`);
  for (const error of errors) console.error(`  ${error}`);
  console.error("");
  process.exit(1);
}
