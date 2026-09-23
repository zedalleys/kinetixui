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

const root = fileURLToPath(new URL("..", import.meta.url));
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
export const KINDS = ["build", "interaction", "accessibility", "rtl", "largeText", "visual", "published"];
/** The kinds a test may claim. The other two are facts about the repository, not about a test. */
const CLAIMABLE = KINDS.filter((k) => k !== "build" && k !== "published");

const MARKER = /kx-verify:\s*([a-zA-Z, ]+)\s*$/;
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
/** "AlertDialog.stories.tsx" / "alert_dialog.dart" → "alert-dialog". */
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
 * A stem matches by PREFIX, so `KinetixTabsTrigger` counts as coverage of `tabs` — a sub-component is part
 * of its component, and an exact-name rule would report a fully tested Tabs as untested. Longest stem wins,
 * so `KinetixButtonGroup` goes to `button-group` and not also to `button`.
 */
const STEMS = [];
for (const slug of Object.keys(components)) {
  const names = new Set([pascal(slug), ...Object.values(components[slug].sourceNames ?? {}).map((n) => pascal(n))]);
  for (const stem of names) STEMS.push({ slug, stem });
}
STEMS.sort((a, b) => b.stem.length - a.stem.length);

const PREFIXED_USED = [/\b(?:Kinetix|Kx)([A-Z][A-Za-z0-9]*)/g];
// React is mostly unprefixed, but not entirely — `KinetixDirectionProvider` is its real export name.
const REACT_USED = [/<\s*([A-Z][A-Za-z0-9]*)/g, /\b([A-Z][A-Za-z0-9]*)\s*[({]/g, ...PREFIXED_USED];

export function coveredSlugs(text, platform = "React") {
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
    const claims = passages(read(file));
    if (!claims.length) continue;

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
      for (const k of claim.kinds) fileKinds.add(k);
      for (const slug of slugs) {
        fileSlugs.add(slug);
        for (const k of claim.kinds) record(slug, platform, k, where);
      }
    }
    if (fileKinds.size) {
      sources[platform].push({ file, kinds: [...fileKinds].sort(), components: [...fileSlugs].sort() });
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

const data = {
  $schema: "https://kinetixui.com/schema/verification.json",
  $description:
    "What each implementation has actually been verified to do, and where that evidence lives. GENERATED by " +
    "`pnpm gen:verification` from the test files themselves: each marked passage declares the KIND of " +
    "verification it performs, and the components it covers are read from the KinetixUI symbols that passage " +
    "calls (or, for a shared suite, from the directory or fixture it names). Every value is a list of source " +
    "references, so any positive result can be traced. This is NOT package maturity and NOT component " +
    "lifecycle — see platformDefinitions and `status` in components.manifest.json for those.",
  kinds: KINDS,
  claimableKinds: CLAIMABLE,
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
  .map((p) => `${p} ${KINDS.map((k) => `${k}:${totals[p][k]}`).join(" ")}`)
  .join("\n  ");
console.log(`${CHECK ? "check:verification ok" : "gen:verification"} — evidence for ${Object.keys(byComponent).length} components\n  ${line}`);
