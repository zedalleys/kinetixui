/**
 * gen-verification.mjs — what has actually been verified, derived from the tests themselves.
 *
 *   node scripts/gen-verification.mjs           write verification.json
 *   node scripts/gen-verification.mjs --check   fail if it is stale (CI)
 *
 * The problem this exists to fix: `components.manifest.json` could say a component ships on SwiftUI, and
 * `check:platform-source` could confirm a file with that name exists — and the website would then print
 * "SwiftUI · stable" beside React's tests and a browser axe suite. A filename is not evidence, and the word
 * "stable" was doing work that nothing in the repository backed up.
 *
 * Evidence is therefore DERIVED, not declared:
 *
 *   1. A test file states what kind of verification it performs:
 *
 *        // kx-verify: interaction
 *
 *   2. Which components that claim covers is read out of the file's own code — the KinetixUI symbols it
 *      actually calls. A marker cannot claim a component the file does not exercise, and deleting a test
 *      removes its evidence on the next run.
 *
 * The split matters. The KIND of verification is a judgement about a test suite and cannot be inferred from
 * source; the COVERAGE is a fact about the source and must never be typed by hand, because that is exactly
 * the kind of list that rots.
 *
 * Two refinements, both there because the naive version would over-claim:
 *
 *   SCOPE.  A marker applies from its own line until the next marker, not to the whole file. A 1,100-line
 *           file that tests twenty components and checks RTL on three of them must not report RTL for all
 *           twenty, so the RTL block carries its own marker.
 *
 *   SUITES. Some suites take their subjects from a directory rather than from imports — the axe pass mounts
 *           every Storybook story and names no component at all. `kx-verify-covers:` points at that
 *           directory, and coverage is the components it really contains. A component with no story gets no
 *           coverage from it.
 *
 * `build` is not a marker. Every declared implementation is compiled by its platform's CI — that is what
 * `check:platform-source` plus native-*.yml already prove — so it is derived from the manifest.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");
const CHECK = process.argv.includes("--check");
const OUT = "verification.json";

const manifest = JSON.parse(read("components.manifest.json"));
const components = manifest.components;
const platforms = Object.keys(manifest.platformDefinitions);

/**
 * The evidence the maturity ladder is built from. A closed list on purpose: an unknown kind is an error, so
 * a typo cannot quietly become a category nothing ever checks.
 *
 *   build          the implementation compiles in its platform's CI. Derived, never claimed.
 *   interaction    a test drives the component and asserts what it did.
 *   accessibility  a test asserts the semantics assistive technology receives (roles, names, states), or
 *                  runs an accessibility engine over the rendered result.
 *   rtl            a test asserts behaviour or layout under right-to-left direction.
 *   largeText      a test asserts behaviour at an increased text scale.
 *   visual         a test compares rendered output against a stored reference. Nothing in this repository
 *                  does this yet; the kind exists so the gap is visible rather than unrepresentable.
 */
export const KINDS = ["build", "interaction", "accessibility", "rtl", "largeText", "visual"];
const MARKER = /kx-verify:\s*([a-zA-Z, ]+)/;
const COVERS = /kx-verify-covers:\s*(\S+)/;

/** Where each platform's evidence lives. `extra` files are suites that are not themselves unit tests. */
const TEST_SOURCES = {
  React: { dirs: ["packages/ui/src"], match: /\.test\.tsx$/, extra: ["scripts/a11y-browser.mjs"] },
  Angular: { dirs: ["packages/ui-angular/src"], match: /\.spec\.ts$/ },
  SwiftUI: { dirs: ["packages/ui-swiftui/Tests"], match: /\.swift$/ },
  Compose: { dirs: ["packages/ui-compose/ui/src/test"], match: /\.kt$/ },
  Flutter: { dirs: ["packages/ui-flutter/test"], match: /_test\.dart$/ },
};

/** "alert-dialog" → "AlertDialog". The same spelling `check-platform-source.mjs` uses. */
const pascal = (slug) => slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
/** "AlertDialog" / "alert_dialog" → "alert-dialog", for reading a slug back out of a filename. */
const slugify = (name) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/\.stories$/, "")
    .replace(/_/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

/**
 * slug → the symbol stems that mean it, longest first.
 *
 * A stem matches a symbol by PREFIX, so `KinetixTabsTrigger` counts as coverage of `tabs` — a sub-component
 * is part of its component, and requiring an exact name would report a fully tested Tabs as untested.
 *
 * Prefix matching alone would also give `KinetixButtonGroup` to `button`, which is a different component
 * with its own row. Longest stem wins, so it goes to `button-group` and only there.
 */
const STEMS = [];
for (const slug of Object.keys(components)) {
  const names = new Set([pascal(slug), ...Object.values(components[slug].sourceNames ?? {}).map((n) => pascal(n))]);
  for (const stem of names) STEMS.push({ slug, stem });
}
STEMS.sort((a, b) => b.stem.length - a.stem.length);

/**
 * Every KinetixUI symbol a passage USES — rendered, called or constructed — rather than merely mentions. A
 * component named in a comment, or referenced only as a type, has not been tested.
 *
 * The patterns differ by platform, and the reason is worth stating because getting it wrong produced a real
 * false positive. Angular, SwiftUI, Compose and Flutter prefix every export (`KxField`, `KinetixCard`), so a
 * bare mention of a prefixed name is unambiguous and counts. React does not prefix, so only real usage
 * counts there — `<Button`, `Button(` — and a prefix is never required.
 *
 * Requiring the prefix off React is what stops `FormControl` and `FormGroup`, which are Angular's own form
 * classes, from being read as coverage of the KinetixUI `form` component. They are not the same `Form`.
 */
const PREFIXED_USED = [/\b(?:Kinetix|Kx)([A-Z][A-Za-z0-9]*)/g];
// React is mostly unprefixed, but not entirely — `KinetixDirectionProvider` is its real export name — so it
// gets the prefixed pattern too.
const REACT_USED = [/<\s*([A-Z][A-Za-z0-9]*)/g, /\b([A-Z][A-Za-z0-9]*)\s*[({]/g, ...PREFIXED_USED];

function coveredSlugs(text, platform = "React") {
  const out = new Set();
  for (const re of platform === "React" ? REACT_USED : PREFIXED_USED) {
    for (const m of text.matchAll(re)) {
      const hit = STEMS.find((s) => m[1].startsWith(s.stem));
      if (hit) out.add(hit.slug);
    }
  }
  return out;
}

/**
 * The subjects a `kx-verify-covers:` target names. Two forms, both read off disk:
 *
 *   a glob   `packages/ui/src/stories/*.stories.tsx` — one file per component, so the filenames are the set.
 *   a file   `packages/ui-flutter/test/smoke_test.dart` — a shared fixture, so the components IT uses are
 *            the set. A suite that pumps `inlineWidgets()` really does cover every widget in that list, and
 *            attributing it to the one widget the suite happens to name by hand would under-report it.
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
 * Split a file into marked passages. Each `kx-verify:` line opens a passage that runs to the next marker or
 * to the end of the file; text before the first marker belongs to no passage and contributes nothing.
 */
function passages(text) {
  const lines = text.split("\n");
  const out = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(MARKER);
    if (m) {
      if (current) out.push(current);
      current = { kinds: m[1].split(",").map((k) => k.trim()).filter(Boolean), covers: null, body: [] };
      continue;
    }
    const c = current && line.match(COVERS);
    if (c) {
      current.covers = c[1];
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) out.push(current);
  return out;
}

const errors = [];
/** slug → platform → Set(kind) */
const evidence = {};
/** platform → the files that contributed, and what each claims */
const sources = {};

for (const platform of platforms) {
  const spec = TEST_SOURCES[platform];
  sources[platform] = [];
  if (!spec) {
    errors.push(`${platform}: declared in platformDefinitions but gen-verification.mjs has no evidence source for it`);
    continue;
  }
  const files = [...spec.dirs.flatMap((d) => walk(d, spec.match)), ...(spec.extra ?? [])].sort();
  for (const file of files) {
    if (!existsSync(`${root}/${file}`)) {
      errors.push(`${file}: listed as a ${platform} evidence source but does not exist`);
      continue;
    }
    const text = read(file);
    const claims = passages(text);
    if (!claims.length) continue;

    const fileKinds = new Set();
    const fileSlugs = new Set();
    for (const claim of claims) {
      const unknown = claim.kinds.filter((k) => !KINDS.includes(k));
      if (unknown.length) {
        errors.push(`${file}: kx-verify names unknown kind(s) ${unknown.join(", ")} — allowed: ${KINDS.join(", ")}`);
        continue;
      }
      if (claim.kinds.includes("build")) {
        errors.push(`${file}: "build" is derived from the manifest and its platform's CI, not claimed by a test`);
        continue;
      }
      let slugs;
      if (claim.covers) {
        slugs = slugsFromCovers(claim.covers, platform);
        if (slugs === null) {
          errors.push(`${file}: kx-verify-covers points at ${claim.covers}, which does not exist`);
          continue;
        }
        if (!slugs.length) {
          errors.push(`${file}: kx-verify-covers ${claim.covers} matches no component — the claim covers nothing`);
          continue;
        }
      } else {
        slugs = [...coveredSlugs(claim.body.join("\n"), platform)];
        if (!slugs.length) {
          errors.push(`${file}: a kx-verify block claims ${claim.kinds.join(", ")} but uses no KinetixUI component`);
          continue;
        }
      }
      for (const k of claim.kinds) fileKinds.add(k);
      for (const slug of slugs) {
        fileSlugs.add(slug);
        const set = ((evidence[slug] ??= {})[platform] ??= new Set());
        for (const k of claim.kinds) set.add(k);
      }
    }
    if (fileKinds.size) {
      sources[platform].push({ file, kinds: [...fileKinds].sort(), components: [...fileSlugs].sort() });
    }
  }
}

// `build` for every declared implementation: its platform's CI compiles the package it lives in.
for (const [slug, c] of Object.entries(components)) {
  for (const platform of c.platforms) ((evidence[slug] ??= {})[platform] ??= new Set()).add("build");
}

// Evidence for something that is not declared would be a contradiction between two generated files.
for (const [slug, per] of Object.entries(evidence)) {
  for (const platform of Object.keys(per)) {
    if (!components[slug].platforms.includes(platform)) {
      errors.push(
        `${slug}: a ${platform} test exercises it, but the manifest does not declare ${platform} — declare the platform, or the test is exercising something else`,
      );
    }
  }
}

if (errors.length) {
  console.error(errors.map((e) => `  x ${e}`).join("\n"));
  console.error(`\ngen:verification failed — ${errors.length} problem(s).`);
  process.exit(1);
}

const byComponent = {};
for (const slug of Object.keys(components).sort()) {
  const per = evidence[slug];
  if (!per) continue;
  byComponent[slug] = Object.fromEntries(
    platforms.filter((p) => per[p]).map((p) => [p, Object.fromEntries(KINDS.map((k) => [k, per[p].has(k)]))]),
  );
}

const totals = Object.fromEntries(
  platforms.map((p) => [
    p,
    Object.fromEntries(KINDS.map((k) => [k, Object.values(byComponent).filter((per) => per[p]?.[k]).length])),
  ]),
);

const data = {
  $schema: "https://kinetixui.com/schema/verification.json",
  $description:
    "What each platform implementation has actually been verified to do. GENERATED by `pnpm gen:verification` " +
    "from the test files themselves: each marked passage declares the KIND of verification it performs, and the " +
    "components it covers are read from the KinetixUI symbols that passage calls (or, for a suite, from the " +
    "directory it names). `build` is derived from the manifest, because a declared implementation is compiled by " +
    "its platform's CI. Edit the tests, not this file — a marker on a passage that tests nothing is an error, " +
    "not free coverage.",
  kinds: KINDS,
  totals,
  sources,
  components: byComponent,
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
  .map((p) => `${p} ${KINDS.filter((k) => k !== "build").map((k) => `${k}:${totals[p][k]}`).join(" ")}`)
  .join("  ·  ");
console.log(`${CHECK ? "check:verification ok" : "gen:verification"} — ${Object.keys(byComponent).length} components with evidence\n  ${line}`);
