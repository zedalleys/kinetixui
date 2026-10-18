/**
 * gen-verification.mjs — what each implementation has actually been verified to do, derived from the tests.
 *
 *   node scripts/gen-verification.mjs           write verification.json
 *   node scripts/gen-verification.mjs --check   fail if it is stale (CI)
 *
 * ── The distinction this file exists to make ────────────────────────────────
 *
 * Three different things were being said with one word, and the website printed the wrong one:
 *
 *   COMPONENT LIFECYCLE       is the component's API settled? (`beta` / `stable` / `deprecated`, per
 *                             component, in components.manifest.json). Unchanged by this file.
 *   PACKAGE MATURITY          is the offering a product yet? (`platformDefinitions[p].maturity`.) A product
 *                             decision. Unchanged by this file.
 *   VERIFICATION MATURITY     how much automated evidence stands behind THIS implementation on THIS
 *                             platform. Computed here, from the tests, and never hand-written.
 *
 * `@kinetixui/ui` is a stable, published package whose catalogue is verified to beta. Both are true, and
 * collapsing them into "React — Beta" would tell a reader the package is beta, which it is not.
 *
 * ── How evidence is derived ─────────────────────────────────────────────────
 *
 *   1. A test file states what kind of verification a passage performs:
 *
 *        // kx-verify: interaction
 *
 *   2. Which components that claim covers is read out of the passage's own code — the KinetixUI symbols it
 *      actually calls. A marker cannot claim a component its passage does not exercise, and deleting a test
 *      removes the evidence on the next run.
 *
 * The split matters. The KIND is a judgement about a test and cannot be inferred from source; the COVERAGE
 * is a fact about the source and must never be typed by hand, because that is the kind of list that rots.
 *
 * Three rules, each because the naive version over-claimed:
 *
 *   PASSAGE SCOPE.  A marker applies from its own line to the next marker, never to the whole file. A
 *                   1,100-line suite that exercises twenty components and checks RTL on three must report
 *                   RTL for three.
 *   DERIVED SUITES. `kx-verify-covers:` names a durable source of subjects — a story directory, a shared
 *                   fixture — for suites that take their subjects from a listing rather than from imports.
 *                   It is never a hand-written list of component names.
 *   STRICT SYMBOLS. Off React, a symbol must carry the `Kinetix`/`Kx` prefix. That is what stops Angular's
 *                   own `FormControl` from being read as coverage of the KinetixUI `form` component.
 *
 * Every positive result carries its source: `path:firstLine-lastLine`. "Why does this say RTL verified?" is
 * answerable from the generated file without reading this script.
 *
 * There is deliberately no N/A escape. A kind that does not apply to a component is simply not verified,
 * which reads as a gap — and a gap that someone has to look at is safer than a gap someone can dismiss.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * `--root=<dir>` points the scanner at a different tree. Only the guardrail tests use it: they build a tiny
 * fixture repository and assert this script REJECTS it, which is the only way to prove the checks are not
 * vacuous. Nothing in CI passes it.
 */
const ROOT_ARG = process.argv.find((a) => a.startsWith("--root="));
const root = ROOT_ARG ? ROOT_ARG.slice("--root=".length).replace(/\/?$/, "/") : fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");
const CHECK = process.argv.includes("--check");
const OUT = "verification.json";

const manifest = JSON.parse(read("components.manifest.json"));
const components = manifest.components;
const defs = manifest.platformDefinitions;
const platforms = Object.keys(defs);

/**
 * The evidence kinds. A closed list on purpose: an unknown kind is an error, so `accesibility` cannot
 * quietly become a seventh category that nothing ever checks.
 *
 *   build          compiles in its platform's CI. Derived from the manifest, never claimed by a test.
 *   interaction    a test drives the component and asserts what it did.
 *   accessibility  a test asserts the semantics assistive technology receives, or runs an accessibility
 *                  engine over the rendered result.
 *   rtl            a test asserts behaviour or layout under right-to-left direction.
 *   largeText      a test asserts behaviour at an increased text scale.
 *   visual         a test compares rendered output against a stored reference.
 *   published      a consumer can install it from its distribution channel. Derived from the manifest's
 *                  declared distribution state — never from the network, which would make CI flaky, and
 *                  never from "a package file exists", which proves nothing.
 */
/**
 * `reducedMotion` means: this component has executable evidence that the reader's reduced-motion
 * setting suppresses its movement, that the state change still lands on the correct final state, and
 * that BOTH directions were exercised. It is one bit per component per platform, and the `sources`
 * paths are what tell a reader how strong the evidence is — a Flutter widget test that measures
 * rendered geometry and a SwiftUI unit test that asserts a resolver are both truthful entries and are
 * not the same proof. See the headers of scripts/motion.mjs and scripts/check-native-motion.mjs.
 */
export const KINDS = ["build", "interaction", "accessibility", "rtl", "largeText", "reducedMotion", "visual", "published"];
/** The kinds a test may claim. The other two are facts about the repository, not about a test. */
const CLAIMABLE = KINDS.filter((k) => k !== "build" && k !== "published");

const MARKER = /kx-verify:\s*([a-zA-Z, ]+)\s*$/;
const COVERS = /kx-verify-covers:\s*(\S+)/;

/**
 * Where each platform's evidence lives. `extra` files are suites that are not themselves unit tests.
 *
 * `environment` is where a suite runs, recorded on its `sources` entry: jsdom and the native test hosts (XCTest,
 * Robolectric, flutter_test) are headless; the `extra` browser suites run in Chromium. It is a fact about the
 * file, not a claim in it, and it decides the tier (see EVIDENCE_LEVELS): interaction and accessibility observed
 * in a runtime environment make a part Runtime verified, the same two run headless make it Headless verified.
 *
 * `runs` is the CI step that executes the `dirs` suites, matched exactly and only when the step is unconditional
 * (the same rules as the block suites). A suite no step runs is not evidence: its markers are still checked, and
 * it records nothing. `runs.scripts` are the package scripts that command goes through, each of which must be exactly
 * the next command (see suiteRuns). An `extra` script must itself be run by a workflow step, directly or through its
 * package script.
 */
// `pnpm test:angular` reaches Vitest through two package scripts, and each must be exactly the next command.
const ANGULAR_SUITE_SCRIPTS = [
  { pkg: "package.json", name: "test:angular", is: "pnpm --filter @kinetixui/angular test" },
  { pkg: "packages/ui-angular/package.json", name: "test", is: "vitest run" },
];
const TEST_SOURCES = {
  React: { dirs: ["packages/ui/src"], match: /\.test\.tsx$/, environment: "jsdom", runs: { workflow: "ci.yml", command: "pnpm --filter @kinetixui/ui test", scripts: [{ pkg: "packages/ui/package.json", name: "test", is: "vitest run" }] }, extra: ["scripts/a11y-browser.mjs", "scripts/large-text.mjs", "scripts/motion.mjs"], extraEnvironment: "chromium" },
  Angular: { dirs: ["packages/ui-angular/src"], match: /\.spec\.ts$/, environment: "jsdom", runs: { workflow: "ci.yml", command: "pnpm test:angular", scripts: ANGULAR_SUITE_SCRIPTS }, extra: ["scripts/angular-browser.mjs", "scripts/angular-overlays.mjs", "scripts/angular-collections.mjs", "scripts/angular-layout.mjs"], extraEnvironment: "chromium" },
  SwiftUI: { dirs: ["packages/ui-swiftui/Tests"], match: /\.swift$/, environment: "xctest", runs: { workflow: "native-swiftui.yml", command: "swift test" } },
  Compose: { dirs: ["packages/ui-compose/ui/src/test"], match: /\.kt$/, environment: "robolectric", runs: { workflow: "native-compose.yml", command: "./gradlew :ui:testDebugUnitTest" } },
  Flutter: { dirs: ["packages/ui-flutter/test"], match: /_test\.dart$/, environment: "flutter_test", runs: { workflow: "native-flutter.yml", command: "flutter test" } },
};

// Hoisted above the evidence passes, which call the workflow readers below before this point is reached.
//
// An allowlist, not a list of shell tricks to reject: a command counts only when it starts with one of these
// programs. A builtin (`exit`, `set`, `builtin exit`), an assignment prefix (`X=1 exit 0`), a keyword or a
// function definition starts with none of them, so it cannot pass.
const PROGRAMS = new Set(["pnpm", "npm", "npx", "yarn", "corepack", "node", "swift", "xcodebuild", "./gradlew", "gradle", "flutter", "dart", "cd", "mkdir", "cp", "echo", "printf", "cat", "ls", "git", "curl", "tar", "sleep", "sed"]);
const plainCommand = (c) => PROGRAMS.has(c.split(/\s+/)[0]);
/** One run line that is nothing but plain commands: not rejected by commandsOf, and every command an allowed program. */
const plainLine = (line) => {
  const l = line.replace(/\s+#.*$/, "").trim();
  return !l.endsWith("\\") && commandsOf([l]).length > 0;
};
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The extractor lives in its own module so large-text.mjs can check its claim with the same function
// that awards the evidence, instead of a regex that resembles it. Re-exported here because
// apps/web/src/lib/verification-guardrails.test.ts and this file's own callers import it from here.
import { coverageForRoot, pascal, slugify } from "./covered-slugs.mjs";
// The ladder and the rules that place evidence on it live in one module, shared with the tests that hold it.
import { EVIDENCE_LEVELS, HEADLESS_ENVIRONMENTS, RUNTIME_ENVIRONMENTS, TIER_KINDS, levelFrom, skipIn } from "./evidence-levels.mjs";
export { EVIDENCE_LEVELS, HEADLESS_ENVIRONMENTS, RUNTIME_ENVIRONMENTS, TIER_KINDS, levelFrom, skipIn };

// Built from the manifest of the tree being scanned, which under `--root=<dir>` is the fixture's and not
// this repository's. An extractor wired to the repo would answer questions about the fixture with the
// wrong slugs: a fixture component would read as "no KinetixUI component used", and repo-only names would
// resolve to slugs the fixture has never heard of.
const { STEMS, coveredSlugs } = coverageForRoot(root);

/**
 * The subjects a `kx-verify-covers:` target names. Both forms read the repository, never a written list:
 *
 *   a glob   `packages/ui/src/stories/*.stories.tsx` — one file per component, so the filenames are the set.
 *   a file   `packages/ui-flutter/test/smoke_test.dart` — a shared fixture, so the components IT uses are
 *            the set. A suite that pumps `inlineWidgets()` really does cover every widget in that list.
 */
function slugsFromCovers(target, platform) {
  const abs = `${root}/${target}`;
  if (!target.includes("*")) {
    if (!existsSync(abs) || statSync(abs).isDirectory()) return null;
    return [...coveredSlugs(read(target), platform)];
  }
  const at = target.lastIndexOf("/");
  const dir = target.slice(0, at);
  const suffix = target.slice(at + 1).replace(/^\*/, "");
  if (!existsSync(`${root}/${dir}`)) return null;
  return readdirSync(`${root}/${dir}`)
    .filter((f) => f.endsWith(suffix))
    .map((f) => slugify(f))
    .filter((slug) => components[slug]);
}

/**
 * Does any workflow actually execute this script?
 *
 * Matched by the script's own path and by the `check:*` package script that wraps it, because a workflow
 * step runs `pnpm check:large-text` rather than naming the file.
 */
function runsInCI(script) {
  const dir = `${root}/.github/workflows`;
  if (!existsSync(dir)) return true; // nothing to check against; not this file's job to invent one
  const pkg = JSON.parse(read("package.json"));
  const wrappers = Object.entries(pkg.scripts ?? {})
    .filter(([, cmd]) => cmd.includes(script.replace(/^scripts\//, "")))
    .map(([name]) => name);
  const needles = [script, ...wrappers];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .some((f) => {
      const body = readFileSync(`${dir}/${f}`, "utf8");
      return needles.some((n) => body.includes(n));
    });
}

/**
 * Does every React export resolve to its own component?
 *
 * Stems are derived from slugs, so `pascal("input-otp")` is `InputOtp` — and the real export is `InputOTP`.
 * A prefix match is deliberate (`TabsTrigger` is coverage of `tabs`), and the longest stem wins, so
 * `InputOTP` fell through to `Input` and every assertion written about the OTP field silently credited the
 * text field instead. Not an omission: a false claim, on the component that was never tested.
 *
 * The cure is a declaration — `sourceNames.React` in the manifest, next to the claim — and this is the
 * check that makes the declaration necessary rather than optional. An export that resolves to no slug at
 * all fails too: it is evidence quietly going nowhere, and the next test written against it would read as
 * having proved nothing.
 */
function exportAttributionErrors() {
  const out = [];
  const dir = `${root}/packages/ui/src/components`;
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".tsx")) continue;
    const slug = file.replace(/\.tsx$/, "");
    if (!components[slug]) continue;
    const src = readFileSync(`${dir}/${file}`, "utf8");
    const exported = new Set();
    for (const block of src.matchAll(/^export \{([^}]*)\}/gm)) {
      for (const part of block[1].split(",")) {
        // `x as Y` exports under Y; a type-only export is not a component.
        const name = part.trim().replace(/^type\s+/, "").split(" as ").pop().trim();
        if (/^[A-Z][A-Za-z0-9]*$/.test(name)) exported.add(name);
      }
    }
    for (const name of exported) {
      const hit = STEMS.find((stem) => name.startsWith(stem.stem));
      if (!hit) {
        out.push(
          `${file}: exports ${name}, which matches no component stem — a test using it would credit ` +
            `nothing. Declare it as "sourceNames": { "React": "${name}" } on a slug in components.manifest.json.`,
        );
      } else if (hit.slug !== slug && !components[hit.slug]) {
        out.push(`${file}: exports ${name}, attributed to the unknown slug ${hit.slug}`);
      } else if (hit.slug !== slug && !exportedElsewhere(hit.slug, name)) {
        out.push(
          `${file}: exports ${name}, which the stem "${hit.stem}" credits to ${hit.slug} rather than to ` +
            `${slug} — every claim made about ${name} would land on the wrong component. Declare ` +
            `"sourceNames": { "React": "${name}" } on ${slug} in components.manifest.json.`,
        );
      }
    }
  }
  return out;
}

/**
 * `AvatarGroup` lives in avatar.tsx and is the `avatar-group` component: a file may host the export of a
 * neighbouring slug, and that attribution is correct rather than a mistake. The test is whether the name
 * belongs to that slug's own vocabulary.
 */
function exportedElsewhere(slug, name) {
  const names = new Set([pascal(slug), ...Object.values(components[slug].sourceNames ?? {}).map((n) => pascal(n))]);
  return [...names].some((n) => name.startsWith(n));
}

function walk(dir, match, acc = []) {
  const abs = `${root}/${dir}`;
  if (!existsSync(abs)) return acc;
  for (const name of readdirSync(abs)) {
    const rel = `${dir}/${name}`;
    if (statSync(`${root}/${rel}`).isDirectory()) walk(rel, match, acc);
    else if (match.test(name)) acc.push(rel);
  }
  return acc;
}

/**
 * Split a file into marked passages, keeping line numbers so every result can point at its evidence. A
 * passage runs from its marker to the next marker or the end of the file; text before the first marker
 * belongs to no passage and contributes nothing.
 */
export function passages(text) {
  const lines = text.split("\n");
  const out = [];
  let current = null;
  const close = (endLine) => {
    if (current) {
      current.end = endLine;
      out.push(current);
    }
  };
  lines.forEach((line, i) => {
    const m = line.match(MARKER);
    if (m) {
      close(i);
      current = { kinds: m[1].split(",").map((k) => k.trim()).filter(Boolean), covers: null, body: [], start: i + 1 };
      return;
    }
    const c = current && line.match(COVERS);
    if (c) {
      current.covers = c[1];
      return;
    }
    if (current) current.body.push(line);
  });
  close(lines.length);
  return out;
}

const errors = [];
/** slug → platform → kind → Set(source ref) */
const evidence = {};
const record = (slug, platform, kind, source) => {
  const byKind = ((evidence[slug] ??= {})[platform] ??= {});
  (byKind[kind] ??= new Set()).add(source);
};
/** platform → the files that contributed, and what each claims */
const sources = {};
/** file → the environment its suite runs in, for every file that recorded evidence */
const fileEnvironment = {};
/** Evidence a test states but that earns nothing: a skipped test, or a suite no CI step executes. */
const uncredited = [];

errors.push(...exportAttributionErrors());

for (const platform of platforms) {
  const spec = TEST_SOURCES[platform];
  sources[platform] = [];
  if (!spec) {
    errors.push(`${platform}: declared in platformDefinitions but gen-verification.mjs has no evidence source for it`);
    continue;
  }
  const files = [...spec.dirs.flatMap((d) => walk(d, spec.match)), ...(spec.extra ?? [])].sort();
  const suitesRun = spec.runs ? suiteRuns(spec.runs) : false;
  for (const script of spec.extra ?? []) {
    // A standalone script is evidence only if CI runs it. The suites found by `dirs` are covered by
    // `pnpm test`; an `extra` script has no such home, and one was added here, published `largeText` for
    // five components, and was executed by nothing — so the controls could have regressed to a fixed size
    // while CI stayed green and the site still showed them verified. A claim with nothing that breaks when
    // it stops being true is the one thing this file exists to prevent, so it is checked rather than
    // remembered.
    if (!runsInCI(script)) {
      errors.push(
        `${script}: listed as a ${platform} evidence source but no workflow in .github/workflows runs it — ` +
          `add it to a job (and to that workflow's path filters), or the evidence it publishes is unenforced`,
      );
    }
  }
  for (const file of files) {
    if (!existsSync(`${root}/${file}`)) {
      errors.push(`${file}: listed as a ${platform} evidence source but does not exist`);
      continue;
    }
    const claims = passages(read(file));
    if (!claims.length) continue;
    const isExtra = (spec.extra ?? []).includes(file);
    // The unit suites run through their package's CI step, a browser script through a step of its own. An
    // unexecuted suite's markers are still checked below; it just records nothing.
    const executed = isExtra ? runsInWorkflowStep(file) : suitesRun;
    if (!executed) uncredited.push({ ref: file, reason: isExtra ? "no unconditional CI step runs this script" : `no unconditional CI step runs \`${spec.runs?.command ?? "its suite"}\`` });

    const fileKinds = new Set();
    const fileSlugs = new Set();
    for (const claim of claims) {
      const where = `${file}:${claim.start}-${claim.end}`;
      const unknown = claim.kinds.filter((k) => !KINDS.includes(k));
      if (unknown.length) {
        errors.push(`${where}: kx-verify names unknown kind(s) ${unknown.join(", ")} — allowed: ${CLAIMABLE.join(", ")}`);
        continue;
      }
      const underived = claim.kinds.filter((k) => !CLAIMABLE.includes(k));
      if (underived.length) {
        errors.push(`${where}: "${underived.join(", ")}" is derived from the repository, not claimed by a test`);
        continue;
      }
      let slugs;
      if (claim.covers) {
        slugs = slugsFromCovers(claim.covers, platform);
        if (slugs === null) {
          errors.push(`${where}: kx-verify-covers points at ${claim.covers}, which does not exist`);
          continue;
        }
        if (!slugs.length) {
          errors.push(`${where}: kx-verify-covers ${claim.covers} resolves to no component — the claim covers nothing`);
          continue;
        }
      } else {
        slugs = [...coveredSlugs(claim.body.join("\n"), platform)];
        if (!slugs.length) {
          errors.push(`${where}: claims ${claim.kinds.join(", ")} but the passage uses no KinetixUI component`);
          continue;
        }
      }
      if (!executed) continue;
      const skipped = skipIn(file, claim.body.join("\n"));
      if (skipped) {
        uncredited.push({ ref: where, reason: `skips a test (\`${skipped}\`)` });
        continue;
      }
      for (const k of claim.kinds) fileKinds.add(k);
      for (const slug of slugs) {
        fileSlugs.add(slug);
        for (const k of claim.kinds) record(slug, platform, k, where);
      }
    }
    if (fileKinds.size) {
      const environment = isExtra ? spec.extraEnvironment : spec.environment;
      fileEnvironment[file] = environment;
      sources[platform].push({ file, environment, kinds: [...fileKinds].sort(), components: [...fileSlugs].sort() });
    }
  }
}

/* ── the two kinds that are facts about the repository, not about a test ──── */
for (const [slug, c] of Object.entries(components)) {
  for (const platform of c.platforms) {
    record(slug, platform, "build", `${defs[platform].dir} (compiled by CI)`);
    const dist = defs[platform].distribution;
    if (dist?.published) record(slug, platform, "published", `${dist.channel}: ${dist.coordinate}`);
  }
}

// Evidence for something not declared would be a contradiction between two generated files.
for (const [slug, per] of Object.entries(evidence)) {
  for (const platform of Object.keys(per)) {
    if (!components[slug].platforms.includes(platform)) {
      errors.push(
        `${slug}: a ${platform} test exercises it, but the manifest does not declare ${platform} — declare the platform, or the test is exercising something else`,
      );
    }
  }
}

/* ── blocks ───────────────────────────────────────────────────────────────────
 *
 * A block is a composition, and the evidence for its parts is not evidence for it: a tested Button says
 * nothing about whether the sign-in form that contains it submits. So blocks get their own records, built
 * by the same rules as components and kept apart from them.
 *
 *   SOURCE         blocks.manifest.json names one file per platform. The file must exist. A block is
 *                  implemented on a platform only when the manifest names its OWN file there; the
 *                  components it composes being available proves nothing.
 *   BUILD          that file sits where a named CI job compiles it (BLOCK_BUILD), and the workflow really
 *                  runs that command. A job that stops running it takes the record with it.
 *   INTERACTION /  claimed per passage with `kx-verify-block: <kind>` — a marker distinct from `kx-verify:`,
 *   ACCESSIBILITY  so a block test can never add evidence to the components it happens to render, and a
 *                  component test can never add evidence to a block. A passage in a block's own source
 *                  file covers that block; elsewhere, the blocks it covers are read from the block symbols
 *                  it uses (`OrderSummaryBlock`, `block("order-summary")`), or from
 *                  `kx-verify-covers: blocks.manifest.json` for a suite that walks the whole manifest.
 *
 * Where a test ran is a fact about the file, not a claim in it, and it decides what the evidence is worth.
 * Only an observed runtime — a real browser here; a simulator, emulator or device for native — can make a
 * block Runtime verified. Headless runs (jsdom, Robolectric, flutter_test) are recorded with their
 * environment and never lift the block above Build verified: they prove the logic and the semantics tree, not what a
 * person on a device meets. No native block has simulator, emulator or device evidence today.
 */
const BLOCK_KINDS = ["interaction", "accessibility"];
const PUBLISHED_BLOCK = new Set(["beta", "stable", "deprecated"]);
const BLOCK_MARKER = /kx-verify-block:\s*([a-zA-Z, ]+)\s*$/;
/** Where block evidence lives per platform, and the environment each file runs in (derived, never claimed). */
// `runs`: the workflow step that executes the suite. A test is evidence only while CI runs it, so a suite whose
// step is gone keeps its markers checked but records nothing. The browser suite is gated by runsInWorkflowStep.
const BLOCK_TEST_SOURCES = {
  React: [
    { dir: "apps/web/src", match: /\.test\.tsx$/, environment: "jsdom", runs: { workflow: "ci.yml", command: "pnpm --filter @kinetixui/web test", scripts: [{ pkg: "apps/web/package.json", name: "test", is: "vitest run" }] } },
    { file: "scripts/blocks-runtime-browser.mjs", environment: "chromium" },
  ],
  Angular: [{ dir: "packages/ui-angular/src", match: /\.spec\.ts$/, environment: "jsdom", runs: { workflow: "ci.yml", command: "pnpm test:angular", scripts: ANGULAR_SUITE_SCRIPTS } }],
  SwiftUI: [{ dir: "packages/ui-swiftui/Tests", match: /\.swift$/, environment: "xctest", runs: { workflow: "native-swiftui.yml", command: "swift test" } }],
  Compose: [
    { dir: "packages/ui-compose/ui/src/test", match: /\.kt$/, environment: "robolectric", runs: { workflow: "native-compose.yml", command: "./gradlew :ui:testDebugUnitTest" } },
  ],
  Flutter: [{ dir: "packages/ui-flutter/test", match: /_test\.dart$/, environment: "flutter_test", runs: { workflow: "native-flutter.yml", command: "flutter test" } }],
};
/** The CI step that compiles a platform's block files. `under` is the directory that step compiles. */
const BLOCK_BUILD = {
  React: { under: "apps/web/src/", workflow: "ci.yml", run: "pnpm build:web", what: "Next.js production build of apps/web" },
  // `pnpm build:angular` (ng-packagr) compiles from src/public-api.ts only, and nothing there imports a block, so it
  // is not this. check:angular-blocks compiles the blocks themselves, and only the files its tsconfig lists: a
  // block left out of `program` is not compiled and stays Source present. Vitest transpiles without
  // type-checking, so the block spec never counts as a build.
  Angular: {
    under: "packages/ui-angular/src/examples/blocks/",
    workflow: "ci.yml",
    run: "pnpm check:angular-blocks",
    what: "ngc strict-template compile of packages/ui-angular/tsconfig.blocks.json",
    program: "packages/ui-angular/tsconfig.blocks.json",
    script: "scripts/angular-package/compile-blocks.mjs",
  },
  SwiftUI: { under: "packages/ui-swiftui/", workflow: "native-swiftui.yml", run: "swift test", what: "swift test compiles the test target" },
  Compose: { under: "packages/ui-compose/", workflow: "native-compose.yml", run: "./gradlew :ui:testDebugUnitTest", what: "Gradle compiles the unit-test source set" },
  Flutter: { under: "packages/ui-flutter/", workflow: "native-flutter.yml", run: "flutter test", what: "flutter test compiles the test directory" },
};

/**
 * Is `file` one the build compiles? Without a `program`, everything under `under` is. With one, only the
 * tsconfig's `files` are: a glob `include` would let a block in by accident, so a program that has one
 * compiles nothing as far as evidence goes.
 */
function inProgram(build, file) {
  if (!build.program) return true;
  if (!existsSync(`${root}/${build.program}`)) return false;
  const tsconfig = JSON.parse(read(build.program));
  if (tsconfig.include?.length) return false;
  const dir = build.program.replace(/[^/]+$/, "");
  return (tsconfig.files ?? []).some((f) => `${dir}${f.replace(/^\.\//, "")}` === file);
}

/**
 * Does CI run this build? The step must run `build.run` exactly. When the build names a `script`, `run` is a
 * package.json wrapper, and the wrapper must itself be exactly `node <script>`: a step that still says
 * `pnpm check:angular-blocks` proves nothing once the wrapper is repointed at `echo` or `true`.
 */
function buildRuns(build) {
  if (!workflowRuns(build.workflow, build.run)) return false;
  if (!build.script) return true;
  if (!existsSync(`${root}/${build.script}`)) return false;
  const name = build.run.match(/^pnpm (\S+)$/)?.[1];
  const wrapped = name && JSON.parse(read("package.json")).scripts?.[name];
  if (typeof wrapped !== "string") return false;
  const cmds = commandsOf([wrapped]);
  return cmds.length === 1 && [`node ${build.script}`, `node ./${build.script}`].includes(cmds[0]);
}

/**
 * Does a workflow STEP run this script, directly or through a package.json wrapper? Stricter than runsInCI, which
 * accepts a mention anywhere in a workflow: a block evidence source can make a block Runtime verified, so a path
 * filter or a comment naming it must not count. Only a `run:` line does, and a wrapper only as a whole command
 * name (`pnpm check:blocks-runtime`, not `pnpm check:blocks-runtime-old`).
 */
function runsInWorkflowStep(script) {
  const dir = `${root}/.github/workflows`;
  if (!existsSync(dir)) return false;
  const pkg = JSON.parse(read("package.json"));
  // the script exactly, optionally pointed at a server with `--base <url>`; any other argument (`--help`) may
  // change what it does, so it is not a run of it
  const direct = (c) => [`node ${script}`, `node ./${script}`].some((p) => c === p || new RegExp(`^${escapeRe(p)} --base https?://\\S+$`).test(c));
  // a wrapper counts only when it EXECUTES the script, not when its text merely names it
  const wrappers = Object.entries(pkg.scripts ?? {})
    .filter(([, cmd]) => commandsOf([cmd]).some(direct))
    .map(([name]) => new RegExp(`^(?:pnpm|npm|yarn)(?:\\s+run)?(?:\\s+-s)?\\s+${escapeRe(name)}$`));
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .some((f) =>
      commandsOf(runCommands(readFileSync(`${dir}/${f}`, "utf8"))).some(
        (c) => direct(c) || wrappers.some((w) => w.test(c)),
      ),
    );
}

/**
 * The commands a list of run lines executes: split on `&&`, trailing comments dropped. A command
 * is matched from its start, so `echo 'swift test'` or `# swift test` is not a run of `swift test`.
 */
function commandsOf(lines) {
  // Only `&&` chains count, because only there does every command's failure decide the exit status. `a || b`
  // masks a's failure or runs b only when a failed, `a; b` exits with b's status (a package script runs without
  // `-e`), and a pipe, background job or substitution changes what the exit status means, so such a line counts
  // as nothing.
  return lines
    .map((l) => l.replace(/\s+#.*$/, ""))
    .filter((l) => !/\|\||(?<!\|)\|(?!\|)|&(?!&)|;|`|\$\(/.test(l.replace(/&&/g, "")))
    .map((l) => l.split(/&&/).map((c) => c.trim()).filter(Boolean))
    .filter((cmds) => cmds.every(plainCommand))
    .flat();
}

/**
 * Is the `run:` at line `at` inside a step or a job that carries an `if:` or `continue-on-error:`? Read by indentation: the step is the
 * nearest `- ` item above it, the job the mapping that holds that step's `steps:`. Conditions are not evaluated;
 * any condition at all means the step may be skipped, and a skipped step is not evidence.
 */
function conditional(lines, at) {
  const indentOf = (l) => l.search(/\S/);
  const keyIndent = indentOf(lines[at].replace(/-\s+/, (d) => " ".repeat(d.length)));
  // the step: the closest item line above (or on) the run whose dash sits left of the run key
  let dash = -1;
  for (let j = at; j >= 0; j--) {
    const m = lines[j].match(/^(\s*)-\s/);
    if (m && m[1].length < keyIndent) {
      dash = j;
      break;
    }
  }
  if (dash < 0) return false;
  const dashIndent = indentOf(lines[dash]);
  const stepKeys = dashIndent + 2;
  const within = (from, indent, test) => {
    for (let j = from; j < lines.length; j++) {
      if (j > from && lines[j].trim() && indentOf(lines[j]) <= indent) break;
      if (test(lines[j])) return true;
    }
    return false;
  };
  // `continue-on-error` lets a failing step pass, which is the same as not knowing whether it ran clean
  const ifAt = (n) => (l) => new RegExp(`^\\s{${n}}(?:if|continue-on-error):`).test(l.replace(/^(\s*)-\s/, (_, sp) => `${sp}  `));
  if (within(dash, dashIndent, ifAt(stepKeys))) return true;
  // the job: the line above `steps:` that opens the mapping `steps:` belongs to
  for (let j = dash; j >= 0; j--) {
    const m = lines[j].match(/^(\s*)steps:\s*$/);
    if (!m) continue;
    const jobKeys = m[1].length;
    for (let k = j; k >= 0; k--) {
      if (lines[k].trim() && indentOf(lines[k]) < jobKeys) return within(k, indentOf(lines[k]), ifAt(jobKeys));
    }
    return false;
  }
  return false;
}

/**
 * The command lines of a workflow's `run:` steps, including the body of a block scalar. A literal `run: |` keeps
 * its lines; a folded `run: >` is one line, as YAML joins it. Comment lines dropped.
 */
function runCommands(yaml) {
  const out = [];
  let block = null; // { indent of the `run:` key, folded?, lines } while a block scalar is being read
  const flush = () => {
    // A body is evidence only when it is a flat list of plain commands. Control flow (`if false; then … fi`), an
    // early `exit 0`, `set +e`, a continuation or a masked line decide which of its commands run and whether a
    // failure reaches the step's status, so one such line makes the whole body count as nothing.
    if (block) {
      const body = block.folded ? [block.lines.join(" ")] : block.lines;
      if (body.every(plainLine)) out.push(...body);
    }
    block = null;
  };
  const lines = yaml.split("\n");
  for (const [i, line] of lines.entries()) {
    const indent = line.search(/\S/);
    if (block) {
      if (indent === -1) continue;
      if (indent > block.indent) {
        if (!line.trim().startsWith("#")) block.lines.push(line.trim());
        continue;
      }
      flush();
    }
    const m = line.match(/^(\s*)(?:-\s+)?run:\s*(.*)$/);
    if (!m) continue;
    if (conditional(lines, i)) continue; // a step or job that may be skipped proves nothing ran
    const scalar = m[2].match(/^([|>])[-+]?\s*$/);
    if (scalar) block = { indent: line.indexOf("run:"), folded: scalar[1] === ">", lines: [] };
    else out.push(m[2]);
  }
  flush();
  return out;
}

/**
 * Does CI run this test suite? The step must run `runs.command` exactly, and every package script it goes through
 * (`runs.scripts`, in order) must itself be exactly the next command: a step that still says `pnpm test:angular`
 * proves nothing once the wrapper is repointed at `echo`, `true` or `vitest run || true`.
 */
function suiteRuns(runs) {
  if (!workflowRuns(runs.workflow, runs.command)) return false;
  return (runs.scripts ?? []).every(({ pkg, name, is }) => {
    if (!existsSync(`${root}/${pkg}`)) return false;
    const script = JSON.parse(read(pkg)).scripts?.[name];
    // exactly, as the CI step is matched: any chain, mask or extra flag (`vitest run --help`) is not a run of it
    return typeof script === "string" && script.trim() === is;
  });
}

function workflowRuns(workflow, command) {
  const path = `${root}/.github/workflows/${workflow}`;
  if (!existsSync(path)) return false;
  return commandsOf(runCommands(readFileSync(path, "utf8"))).some((c) => c === command); // exactly: an extra flag (`swift test --help`) can turn it into a no-op
}

export function blockPassages(text) {
  const lines = text.split("\n");
  const out = [];
  let current = null;
  lines.forEach((line, i) => {
    const m = line.match(BLOCK_MARKER);
    if (m) {
      if (current) out.push({ ...current, end: i });
      // `kx-verify-block: end` closes a passage without opening one, so an unmarked test that follows a
      // marked one in a shared suite is not swept into its claim.
      const kinds = m[1].split(",").map((k) => k.trim()).filter(Boolean);
      current = kinds.length === 1 && kinds[0] === "end" ? null : { kinds, covers: null, body: [], start: i + 1 };
      return;
    }
    const c = current && line.match(COVERS);
    if (c) current.covers = c[1];
    else if (current) current.body.push(line);
  });
  // a file ending in a newline splits into a last empty string, which is not a line of the file
  if (current) out.push({ ...current, end: lines.at(-1) === "" ? lines.length - 1 : lines.length });
  return out;
}

const blocksManifest = existsSync(`${root}/blocks.manifest.json`) ? JSON.parse(read("blocks.manifest.json")).blocks : {};
const blockSlugs = Object.keys(blocksManifest);
/** file → { slug, platform } for every manifest-named block source */
const blockFileOwner = new Map();
for (const [slug, b] of Object.entries(blocksManifest)) {
  for (const [platform, file] of Object.entries(b.sources ?? {})) {
    if (!platforms.includes(platform)) errors.push(`${slug}: blocks.manifest.json names a source for unknown platform ${platform}`);
    else blockFileOwner.set(file, { slug, platform });
  }
}

/** The blocks a passage in a shared suite exercises, read from the symbols it uses. */
function blocksNamedIn(body) {
  const found = new Set();
  for (const slug of blockSlugs) {
    const symbol = new RegExp(`\\b${pascal(slug)}Block\\b`);
    // `block(page, "receipt")`: the slug as any argument of a call to a function named `block`
    const call = new RegExp(`\\bblock\\([^)]*["'\`]${slug}["'\`]`);
    if (symbol.test(body) || call.test(body)) found.add(slug);
  }
  return [...found];
}

/** slug → platform → { source, build, interaction, accessibility } — each a list of { ref, environment? } */
const blockEvidence = {};
const blockRecord = (slug, platform, kind, entry) => {
  const per = ((blockEvidence[slug] ??= {})[platform] ??= {});
  const list = (per[kind] ??= []);
  if (!list.some((e) => e.ref === entry.ref)) list.push(entry);
};

for (const [slug, b] of Object.entries(blocksManifest)) {
  for (const [platform, file] of Object.entries(b.sources ?? {})) {
    if (!platforms.includes(platform)) continue;
    if (!existsSync(`${root}/${file}`)) {
      errors.push(`${slug}: blocks.manifest.json names ${file} as its ${platform} source, which does not exist`);
      continue;
    }
    blockRecord(slug, platform, "source", { ref: file });
    const build = BLOCK_BUILD[platform];
    if (build && file.startsWith(build.under) && inProgram(build, file) && buildRuns(build)) {
      blockRecord(slug, platform, "build", { ref: `.github/workflows/${build.workflow}: ${build.run} (${build.what})` });
    }
  }
}

for (const platform of platforms) {
  for (const spec of BLOCK_TEST_SOURCES[platform] ?? []) {
    const files = spec.file ? (existsSync(`${root}/${spec.file}`) ? [spec.file] : []) : walk(spec.dir, spec.match);
    if (spec.file && files.length && spec.environment === "chromium" && !runsInWorkflowStep(spec.file)) {
      errors.push(`${spec.file}: a ${platform} block evidence source that no workflow step in .github/workflows runs`);
    }
    const ran = spec.runs ? suiteRuns(spec.runs) : true;
    for (const file of files.sort()) {
      const claims = blockPassages(read(file));
      for (const claim of claims) {
        const where = `${file}:${claim.start}-${claim.end}`;
        const unknown = claim.kinds.filter((k) => !BLOCK_KINDS.includes(k));
        if (unknown.length) {
          errors.push(`${where}: kx-verify-block names ${unknown.join(", ")} — a block test may claim only ${BLOCK_KINDS.join(", ")}`);
          continue;
        }
        const owner = blockFileOwner.get(file);
        let slugs;
        if (owner) {
          if (owner.platform !== platform) {
            errors.push(`${where}: this is the ${owner.platform} source of ${owner.slug}, read as ${platform} evidence`);
            continue;
          }
          slugs = [owner.slug];
        } else if (claim.covers === "blocks.manifest.json") {
          // every PUBLISHED block this platform implements: a draft is never rendered, so a suite that walks
          // the manifest cannot have reached it
          slugs = blockSlugs.filter((b) => PUBLISHED_BLOCK.has(blocksManifest[b].status) && blocksManifest[b].sources?.[platform]);
        } else if (claim.covers) {
          errors.push(`${where}: kx-verify-covers ${claim.covers} — a block passage may only cover blocks.manifest.json`);
          continue;
        } else {
          slugs = blocksNamedIn(claim.body.join("\n"));
        }
        if (!slugs.length) {
          errors.push(`${where}: claims ${claim.kinds.join(", ")} for a block but uses no block`);
          continue;
        }
        const skipped = skipIn(file, claim.body.join("\n"));
        if (skipped) {
          uncredited.push({ ref: where, reason: `skips a test (\`${skipped}\`)` });
          continue;
        }
        if (!ran) uncredited.push({ ref: where, reason: `no unconditional CI step runs \`${spec.runs.command}\`` });
        for (const slug of slugs) {
          if (!blocksManifest[slug].sources?.[platform]) {
            errors.push(`${where}: exercises ${slug} on ${platform}, which blocks.manifest.json does not implement there`);
            continue;
          }
          if (ran) for (const k of claim.kinds) blockRecord(slug, platform, k, { ref: where, environment: spec.environment });
        }
      }
    }
  }
}

/**
 * The level a block's evidence earns on a platform. The same ladder as the /use-cases pages; exported so the
 * guardrail tests hold this function to the rule rather than to a copy of it.
 */
export function blockLevelFrom(per) {
  const envs = (kind) => (per?.[kind] ?? []).map((e) => e.environment);
  return levelFrom({ implemented: !!per?.source?.length, build: !!per?.build?.length, interaction: envs("interaction"), accessibility: envs("accessibility") });
}

// Every environment must be classified, or a new test host could slip between the tiers unnoticed.
const KNOWN_ENVIRONMENTS = new Set([...RUNTIME_ENVIRONMENTS, ...HEADLESS_ENVIRONMENTS]);
for (const [file, env] of Object.entries(fileEnvironment)) {
  if (!KNOWN_ENVIRONMENTS.has(env)) errors.push(`${file}: runs in "${env}", which is neither a runtime nor a headless environment — classify it before it can earn a tier`);
}
for (const [slug, per] of Object.entries(blockEvidence)) {
  for (const [platform, kinds] of Object.entries(per)) {
    for (const kind of TIER_KINDS) {
      for (const e of kinds[kind] ?? []) {
        if (!KNOWN_ENVIRONMENTS.has(e.environment)) errors.push(`${slug} (${platform}): ${e.ref} runs in "${e.environment}", which is neither a runtime nor a headless environment`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.map((e) => `  x ${e}`).join("\n"));
  console.error(`\ngen:verification failed — ${errors.length} problem(s).`);
  process.exit(1);
}

/** Only verified kinds are recorded; an absent key means "no evidence", which is not the same as "fails". */
const byComponent = {};
for (const slug of Object.keys(components).sort()) {
  const per = evidence[slug];
  if (!per) continue;
  byComponent[slug] = Object.fromEntries(
    platforms
      .filter((p) => per[p])
      .map((p) => [p, Object.fromEntries(KINDS.filter((k) => per[p][k]).map((k) => [k, [...per[p][k]].sort()]))]),
  );
}

const totals = Object.fromEntries(
  platforms.map((p) => [
    p,
    Object.fromEntries(KINDS.map((k) => [k, Object.values(byComponent).filter((per) => per[p]?.[k]).length])),
  ]),
);

/**
 * Every catalogue component's level on every platform, with the environments behind its interaction and
 * accessibility evidence: the one place a component's level is decided. The site reads it; it never recomputes.
 */
const envsOf = (refs) => [...new Set((refs ?? []).map((r) => fileEnvironment[r.replace(/:\d+-\d+$/, "")]).filter(Boolean))].sort();
const componentLevels = {};
for (const slug of Object.keys(components).sort()) {
  componentLevels[slug] = Object.fromEntries(
    platforms.map((p) => {
      const per = byComponent[slug]?.[p] ?? {};
      const row = {};
      for (const k of TIER_KINDS) if (envsOf(per[k]).length) row[k] = envsOf(per[k]);
      const level = levelFrom({ implemented: components[slug].platforms.includes(p), build: !!per.build, interaction: row.interaction, accessibility: row.accessibility });
      return [p, { level, ...row }];
    }),
  );
}
const levelTotals = (rows) =>
  Object.fromEntries(platforms.map((p) => [p, Object.fromEntries(EVIDENCE_LEVELS.map((l) => [l, rows.filter((r) => r[p].level === l).length]))]));
const componentLevelTotals = levelTotals(Object.values(componentLevels));

/** What a reader should know is missing, said as facts derived from the records rather than written by hand. */
function blockLimitations(per) {
  if (!per?.source?.length) return [];
  const out = [];
  if (!per.build?.length) out.push("no CI step compiles this file");
  for (const kind of BLOCK_KINDS) {
    const list = per[kind] ?? [];
    if (!list.length) out.push(`no ${kind} test`);
    else if (!list.some((e) => RUNTIME_ENVIRONMENTS.includes(e.environment))) {
      const envs = [...new Set(list.map((e) => e.environment))].sort().join(", ");
      out.push(`${kind} tested headless only (${envs}), not observed in a browser or on a device`);
    }
  }
  return out;
}

const byBlock = {};
for (const slug of blockSlugs) {
  const per = blockEvidence[slug] ?? {};
  byBlock[slug] = {
    title: blocksManifest[slug].title,
    platforms: Object.fromEntries(
      platforms.map((p) => {
        const e = per[p];
        const row = { level: blockLevelFrom(e) };
        for (const k of ["source", "build", ...BLOCK_KINDS]) if (e?.[k]?.length) row[k] = [...e[k]].sort((a, b) => a.ref.localeCompare(b.ref));
        const limits = blockLimitations(e);
        if (limits.length) row.limitations = limits;
        return [p, row];
      }),
    ),
  };
}
const blockTotals = levelTotals(Object.values(byBlock).map((b) => b.platforms));

const data = {
  $schema: "https://kinetixui.com/schema/verification.json",
  $description:
    "What each implementation has actually been verified to do, and where that evidence lives. GENERATED by " +
    "`pnpm gen:verification` from the test files themselves: each marked passage declares the KIND of " +
    "verification it performs, and the components it covers are read from the KinetixUI symbols that passage " +
    "calls (or, for a shared suite, from the directory or fixture it names). Every value is a list of source " +
    "references, so any positive result can be traced. This is NOT package maturity and NOT component " +
    "lifecycle — see platformDefinitions and `status` in components.manifest.json for those.",
  // 2: the Headless verified tier, generated component levels, and `uncredited`. See docs/VERIFICATION-EVIDENCE-TIERS.md.
  schemaVersion: 2,
  kinds: KINDS,
  claimableKinds: CLAIMABLE,
  evidenceLevels: EVIDENCE_LEVELS,
  runtimeEnvironments: RUNTIME_ENVIRONMENTS,
  headlessEnvironments: HEADLESS_ENVIRONMENTS,
  totals,
  componentLevelTotals,
  sources,
  components: byComponent,
  componentLevels,
  uncredited: uncredited.sort((a, b) => a.ref.localeCompare(b.ref)),
  blockKinds: BLOCK_KINDS,
  blockTotals,
  blocks: byBlock,
};

const body = JSON.stringify(data, null, 2) + "\n";
if (CHECK) {
  const current = existsSync(`${root}/${OUT}`) ? read(OUT) : "";
  if (current !== body) {
    console.error(`  x ${OUT} is stale — run \`pnpm gen:verification\``);
    process.exit(1);
  }
} else {
  writeFileSync(`${root}/${OUT}`, body);
}

const line = platforms
  .map((p) => `${p} ${KINDS.map((k) => `${k}:${totals[p][k]}`).join(" ")}`)
  .join("\n  ");
const levelLine = platforms
  .map((p) => `${p} ${Object.entries(componentLevelTotals[p]).map(([l, n]) => `${l}:${n}`).join(" ")}`)
  .join("\n  ");
const blockLine = platforms
  .map((p) => `${p} ${Object.entries(blockTotals[p]).map(([l, n]) => `${l}:${n}`).join(" ")}`)
  .join("\n  ");
console.log(
  `${CHECK ? "check:verification ok" : "gen:verification"} — evidence for ${Object.keys(byComponent).length} components\n  ${line}\n` +
    `component levels (${Object.keys(componentLevels).length}):\n  ${levelLine}\n` +
    `blocks (${blockSlugs.length}):\n  ${blockLine}` +
    (uncredited.length ? `\nuncredited: ${uncredited.length}` : ""),
);
