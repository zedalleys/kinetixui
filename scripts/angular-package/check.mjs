/**
 * check.mjs — is `@kinetixui/angular` ready to be a real npm package?
 *
 *   node scripts/angular-package/check.mjs            build, simulate, install, typecheck, build
 *   node scripts/angular-package/check.mjs --contract stop after the artifact contract (no network)
 *   node scripts/angular-package/check.mjs --negative=<id> break one documented stylesheet step and
 *                                                     require the gate to fail for that reason
 *   node scripts/angular-package/check.mjs --list-negatives
 *
 * The package is activated: public, allowlisted, and in its own release cohort. This proves the
 * artifact behind that decision is one a consumer can actually use, and that the activation is
 * coherent — a package that is public but unlisted, or listed in the core cohort, is worse than
 * either end state.
 *
 * What it does not do is publish. That happens when the Version Packages release runs.
 *
 * The tarball is validated by the release tooling's own `validatePackedArtifact` — the same
 * function that gates `@kinetixui/{tokens,ui,cli}` — rather than an Angular-only reimplementation.
 * An Angular package that would fail the real release gate fails here.
 *
 * ## Clean consumer
 *
 * A generated Angular application in a temp directory outside the workspace installs that tarball
 * the way npm would, then typechecks and runs a production AOT build. It has no `paths` mapping and
 * no link to this repository, so nothing resolves through the monorepo: if the package's own
 * `exports`, `typings` or partial-compiled FESM are wrong, the build fails.
 *
 * ## Documented stylesheet
 *
 * The consumer's global stylesheet is the css fence from /docs/angular, verbatim, and the README
 * (the npm package page) must load the same sheets. The built app is then opened in Chromium: a
 * build that succeeds proves nothing about a sheet the recipe forgot, because a missing token only
 * shows up as a computed value. Light needs a focus ring (extras), `.dark` must change the surface
 * (tokens/css/dark) and the dark ring must be the dark composite (extras/dark).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run, runRootScript, packageManagerCommand } from "../release/exec.mjs";
import { describePackage, readTarball } from "../release/tar.mjs";
import { validatePackedArtifact } from "../release/artifacts.mjs";
import { consumerFiles, EXERCISED, importsOf, STYLESHEET_SOURCES, stylesheetFence } from "./fixture.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const pkgDir = path.join(root, "packages", "ui-angular");
const contractOnly = process.argv.includes("--contract");

/**
 * Negative controls: each removes one step from the documented recipe, in memory only, and names
 * the failure the gate must report. `both` edits the docs fence and the README alike, so the parity
 * check passes and the rendered check has to catch it; `readme` edits only the README.
 */
const NEGATIVES = {
  "no-extras": {
    both: '@import "@kinetixui/tokens/css/extras";\n',
    expect: /no visible focus ring/,
  },
  "no-dark": {
    both: '@import "@kinetixui/tokens/css/dark";\n',
    expect: /`\.dark` did not change the card surface/,
  },
  "no-extras-dark": {
    both: '@import "@kinetixui/tokens/css/extras/dark";\n',
    expect: /dark focus ring is not the dark composite/,
  },
  "readme-drift": {
    readme: '@import "@kinetixui/tokens/css/extras";\n',
    expect: /README and \/docs\/angular load different stylesheets/,
  },
};
if (process.argv.includes("--list-negatives")) {
  console.log(Object.keys(NEGATIVES).join("\n"));
  process.exit(0);
}
const negativeId = process.argv.find((arg) => arg.startsWith("--negative="))?.slice("--negative=".length);
const negative = negativeId ? NEGATIVES[negativeId] : undefined;
if (negativeId && !negative) throw new Error(`Unknown negative control ${negativeId}`);
if (negative && contractOnly && !negative.readme) throw new Error(`--negative=${negativeId} needs the consumer build; drop --contract`);
const step = (message) => console.log(`\n▸ ${message}`);
const detail = (message) => console.log(`  ${message}`);

/**
 * Angular's coverage, read from the canonical manifest rather than restated here. It was hard-coded as
 * "31 of 98" and had already been overtaken — a number in a success message is still a published claim.
 */
const CATALOGUE = JSON.parse(readFileSync(new URL("../../components.manifest.json", import.meta.url), "utf8"));
const CATALOGUE_SIZE = Object.keys(CATALOGUE.components).length;
const ANGULAR_IMPLEMENTED = Object.values(CATALOGUE.components).filter((c) => (c.platforms ?? []).includes("Angular")).length;
const ANGULAR_MATURITY = CATALOGUE.platformDefinitions.Angular.maturity;

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
/** The pack directory; assigned once packing starts, so an early report has nothing to clean up. */
let staging;

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

// ── 0. documented stylesheet ────────────────────────────────────────────────
step("Reading the documented global stylesheet");
const documented = {};
for (const [key, file] of Object.entries(STYLESHEET_SOURCES)) {
  try {
    let fence = stylesheetFence(readFileSync(path.join(root, file), "utf8"), file);
    const drop = negative?.both ?? (key === "readme" ? negative?.readme : undefined);
    if (drop) {
      if (fence.split(drop).length !== 2) throw new Error(`negative control ${negativeId}: ${JSON.stringify(drop)} must occur once in ${file}`);
      fence = fence.replace(drop, "");
    }
    documented[key] = fence;
  } catch (error) {
    fail(error.message);
  }
}
if (documented.docs && documented.readme) {
  const docsImports = importsOf(documented.docs);
  const readmeImports = importsOf(documented.readme);
  if (docsImports.join("\n") !== readmeImports.join("\n")) {
    fail(
      `README and /docs/angular load different stylesheets — a reader gets a different app depending on ` +
        `where they copied from.\n    ${STYLESHEET_SOURCES.docs}: ${docsImports.join(", ")}\n    ` +
        `${STYLESHEET_SOURCES.readme}: ${readmeImports.join(", ")}`,
    );
  } else {
    detail(`docs and README agree: ${docsImports.join(", ")}`);
  }
}
if (errors.length > 0) report();

// ── 1. build ────────────────────────────────────────────────────────────────
step("Building the Angular package (ng-packagr)");
await runRootScript("build:angular", { cwd: root });
const dist = path.join(pkgDir, "dist");
const built = JSON.parse(readFileSync(path.join(dist, "package.json"), "utf8"));
detail(`built ${built.name}@${built.version}`);

// The activation, asserted against the real artifact. A half-activated package — public but
// unlisted, or listed inside the core cohort — is worse than either end state, so these check the
// whole set rather than any one switch.
if (built.private === true) fail(`the built package still carries "private": true — it cannot be published`);
const source = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
if (source.private === true) fail(`packages/ui-angular/package.json is still private`);
if (source.publishConfig?.access !== "public") fail(`packages/ui-angular/package.json needs publishConfig.access: "public"`);
if (source.publishConfig?.provenance !== true) fail(`packages/ui-angular/package.json needs publishConfig.provenance: true`);
const allowlist = JSON.parse(readFileSync(path.join(root, "release", "publish-packages.json"), "utf8"));
const entry = allowlist.packages.find((candidate) => candidate.name === built.name);
if (!entry) fail(`${built.name} is not in release/publish-packages.json, so a release would never publish it`);
if (entry && entry.releaseGroup !== "angular") {
  fail(`${built.name} is in release group "${entry.releaseGroup}" — it must release independently of core`);
}
if (entry && entry.artifactDirectory !== "packages/ui-angular/dist") {
  fail(`${built.name} must pack from packages/ui-angular/dist, not ${entry.artifactDirectory ?? "its workspace root"}`);
}
const changesets = JSON.parse(readFileSync(path.join(root, ".changeset", "config.json"), "utf8"));
if (changesets.fixed.some((group) => group.includes(built.name))) {
  fail(`${built.name} is still in the Changesets fixed group; it would drag the core cohort into its releases`);
}
if (errors.length === 0) detail(`public, allowlisted in the "angular" cohort, packing from ${entry.artifactDirectory}`);

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

// ── 2. pack the real artifact ───────────────────────────────────────────────
// There is no staging copy and no manifest edit any more. The package is activated, so what
// ng-packagr wrote into `dist/` is exactly what a release uploads — packing anything else would
// be checking a thing that never ships.
step("Packing the artifact the release would publish");
staging = mkdtempSync(path.join(tmpdir(), "kinetixui-angular-pack-"));
const stageDir = dist;
detail(`packing ${path.relative(root, dist).split(path.sep).join("/")} unmodified`);

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
  for (const [file, contents] of Object.entries(consumerFiles({ styles: documented.docs }))) {
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

  step("Rendering the consumer in Chromium (documented stylesheet, light and dark)");
  await checkRenderedStyles(outDir);
  detail("exercised:");
  for (const item of EXERCISED) detail(`  · ${item}`);
} catch (error) {
  fail(`clean-consumer validation failed: ${String(error.stderr || error.stdout || error.message).trim().split("\n").slice(-12).join("\n  ")}`);
} finally {
  rmSync(consumer, { recursive: true, force: true });
}

finish();

function finish() {
  if (staging) rmSync(staging, { recursive: true, force: true });
  if (errors.length > 0) report();
  if (negative) {
    console.error(`\n✗ Negative control ${negativeId}: the gate PASSED with the documented step removed.\n`);
    process.exit(1);
  }
  console.log(
    contractOnly
      ? `\n✓ @kinetixui/angular's packed artifact is a valid npm package.\n` +
          `  The clean-consumer build was skipped (--contract), so this does not prove a consumer can use it.`
      : `\n✓ @kinetixui/angular is publication-ready: the artifact is a valid npm package and a clean ` +
          `Angular application builds against it.\n` +
          `  This says nothing about maturity: Angular is ${ANGULAR_MATURITY}, at ${ANGULAR_IMPLEMENTED} of ${CATALOGUE_SIZE} components. See RELEASING.md.`,
  );
  process.exit(0);
}

function report() {
  if (staging) rmSync(staging, { recursive: true, force: true });
  if (negative) {
    const hit = errors.find((error) => negative.expect.test(error));
    if (hit) {
      console.log(`\nPASS: negative control ${negativeId} fails the gate as expected:\n  ${hit.split("\n")[0]}`);
      process.exit(0);
    }
    console.error(`\n✗ Negative control ${negativeId}: the gate failed, but not with ${negative.expect}:\n`);
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }
  console.error(`\n✗ Angular publication-readiness failed:\n`);
  for (const error of errors) console.error(`  ${error}`);
  console.error("");
  process.exit(1);
}

/**
 * The trailing alpha of the `--shadow-focus` halo a token sheet declares, e.g. `0.32` — read from the
 * tokens that were packed for the consumer, so the expectation follows the token source.
 */
function focusHaloAlpha(sheet) {
  const css = readFileSync(path.join(root, "packages", "tokens", "dist", "web", sheet), "utf8");
  const match = css.match(/--shadow-focus:[^;]*\/\s*([\d.]+)\)\s*;/);
  if (!match) throw new Error(`could not read the --shadow-focus halo alpha from ${sheet}`);
  return match[1];
}

/**
 * Serve the production build and read computed styles in Chromium. Each assertion names the sheet
 * whose absence would cause it, because that is the fix a reader needs.
 */
async function checkRenderedStyles(outDir) {
  const { createServer } = await import("node:http");
  const { chromium } = await import("playwright");
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
  const server = createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.join(outDir, path.normalize(name));
    if (!file.startsWith(outDir) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForSelector("button.kx-btn");
    if (pageErrors.length > 0) fail(`the consumer threw on load: ${pageErrors.join("; ")}`);

    const read = () =>
      page.evaluate(async () => {
        // The ring and surface transition on the motion tokens; read the settled values, not a frame.
        // Transitions only: the spinner's animation is infinite and never finishes.
        const transitions = document.getAnimations().filter((animation) => animation instanceof CSSTransition);
        await Promise.all(transitions.map((animation) => animation.finished.catch(() => undefined)));
        const active = document.activeElement;
        const card = document.querySelector("kx-card");
        return {
          background: getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
          focused: active instanceof HTMLButtonElement && active.classList.contains("kx-btn"),
          focusVisible: active instanceof Element && active.matches(":focus-visible"),
          ring: active ? getComputedStyle(active).boxShadow : "none",
          card: card ? getComputedStyle(card).backgroundColor : "",
        };
      });

    // A keyboard user's first Tab lands on the first button, which must draw its focus ring.
    await page.keyboard.press("Tab");
    const light = await read();
    if (!light.background) fail("--background is undefined in the rendered app (load @kinetixui/tokens/css)");
    if (!light.focused || !light.focusVisible) {
      fail("the first Tab did not give a KinetixUI button keyboard focus, so the focus ring could not be checked");
    } else if (light.ring === "none") {
      fail(
        "the focused button has no visible focus ring in light mode: .kx-btn:focus-visible removes the outline " +
          "and draws var(--shadow-focus), which only @kinetixui/tokens/css/extras defines",
      );
    }

    await page.evaluate(() => document.documentElement.classList.add("dark"));
    const dark = await read();
    if (dark.card === light.card) {
      fail(`\`.dark\` did not change the card surface (${light.card} in both) — @kinetixui/tokens/css/dark is not loaded`);
    }
    const darkAlpha = focusHaloAlpha("extras.dark.css");
    if (dark.ring !== "none" && !dark.ring.includes(`, ${darkAlpha})`)) {
      fail(
        `the dark focus ring is not the dark composite (expected a ${darkAlpha} halo, got "${dark.ring}") — ` +
          "@kinetixui/tokens/css/extras/dark is not loaded",
      );
    }
    detail(`light: focus ring "${light.ring}", card ${light.card}`);
    detail(`dark:  focus ring "${dark.ring}", card ${dark.card} (halo ${darkAlpha} from extras.dark.css)`);
    if (focusHaloAlpha("extras.css") === darkAlpha) {
      fail("extras.css and extras.dark.css declare the same focus halo, so the dark-ring check cannot tell them apart");
    }
  } finally {
    await browser.close();
    server.close();
  }
}
