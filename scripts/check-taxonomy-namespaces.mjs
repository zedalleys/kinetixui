#!/usr/bin/env node
/**
 * check-taxonomy-namespaces.mjs — the identifier-namespace gate.
 *
 *   node scripts/check-taxonomy-namespaces.mjs                   run every check
 *   node scripts/check-taxonomy-namespaces.mjs --negative=<id>   require one check to fail
 *   node scripts/check-taxonomy-namespaces.mjs --list-negatives
 *
 * The defect it exists for: `commerce` is a business domain in docs/business-capabilities.json and
 * `Commerce` is a block category in blocks.manifest.json. They mean different things — an industry a
 * product serves, and a shelf in the block filter — and they are enforced by two scripts that do not
 * know about each other. Nothing declared the relationship, so a domain filter and a category filter
 * could silently behave as one facet. Neither name is renamed: renaming a reader-visible category to
 * dodge an internal ambiguity is the wrong trade. Instead both identifier spaces are prefixed and the
 * relationship between them is written down, in `discovery.blockCategoryDomains`.
 *
 * This gate owns that map and the resolution of prefixed identifiers. It does not re-check what
 * check:capabilities already owns (that a domain's families exist, that evidence resolves, that the
 * generated roadmap and discovery index are current) — one rule, one gate.
 *
 * Every check is named, and the name is what a negative control breaks.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { kebab, loadRegistries, resolveRef, ROOT } from "./create-schema/registries.mjs";

const CAPABILITIES = "docs/business-capabilities.json";
const BLOCKS = "blocks.manifest.json";
const INDEX = "discovery-index.json";
const CREATE_DOCS = "docs/create";

const NEGATIVES = {
  "bare-category-key": { breaks: "category-map-namespaced", why: "an unprefixed \"commerce\" key is the original defect and must not be storable" },
  "bare-domain-value": { breaks: "category-map-namespaced", why: "the value side is namespaced too, so a mapping cannot point at an unqualified name" },
  "unknown-domain-value": { breaks: "category-map-namespaced", why: "a prefixed value still has to name a domain that exists" },
  "unknown-prefix-value": { breaks: "category-map-namespaced", why: "an invented identifier space is not accepted because it carries a colon" },
  "missing-category-entry": { breaks: "category-map-complete", why: "a block category with no entry would leave its relationship to the domains undeclared, which is the state this map replaces" },
  "extra-category-entry": { breaks: "category-map-complete", why: "an entry for a category that does not exist is a stale declaration" },
  "empty-families-domain": { breaks: "domain-families-non-empty", why: "a domain citing no capability family claims an industry with nothing behind it" },
  "unsupported-category-mapping": { breaks: "category-map-matches-derived-data", why: "a mapping may be permissive, but it may not name a domain no block in that category reaches — that would be a claim with no evidence" },
};

if (process.argv.includes("--list-negatives")) {
  for (const id of Object.keys(NEGATIVES)) console.log(id);
  process.exit(0);
}
const negativeId = process.argv.find((a) => a.startsWith("--negative="))?.slice("--negative=".length);
if (negativeId && !NEGATIVES[negativeId]) {
  console.error(`Unknown negative control ${negativeId}. --list-negatives shows them.`);
  process.exit(2);
}
const control = negativeId ?? null;

const failures = [];
const passed = [];
const fail = (check, message) => failures.push(`${check}: ${message}`);
const ok = (check, message) => passed.push(`${check}: ${message}`);

/* ------------------------------------------------------------------------------- what the checks see */

const capabilities = JSON.parse(readFileSync(join(ROOT, CAPABILITIES), "utf8"));
const blocks = JSON.parse(readFileSync(join(ROOT, BLOCKS), "utf8"));
const index = JSON.parse(readFileSync(join(ROOT, INDEX), "utf8"));

const disc = capabilities.discovery;
let map = { ...(disc.blockCategoryDomains ?? {}) };
switch (control) {
  case "bare-category-key":
    delete map["block-category:commerce"];
    map.commerce = ["domain:commerce"];
    break;
  case "bare-domain-value":
    map["block-category:commerce"] = ["commerce"];
    break;
  case "unknown-domain-value":
    map["block-category:commerce"] = ["domain:aerospace"];
    break;
  case "unknown-prefix-value":
    map["block-category:commerce"] = ["industry:commerce"];
    break;
  case "missing-category-entry":
    delete map["block-category:marketing"];
    break;
  case "extra-category-entry":
    map["block-category:telemetry"] = [];
    break;
  case "unsupported-category-mapping":
    map["block-category:feedback"] = ["domain:commerce"];
    break;
  default:
    break;
}
if (control === "empty-families-domain")
  disc.domains = disc.domains.map((d) => (d.id === "agriculture" ? { ...d, families: [] } : d));

const registries = loadRegistries({ capabilities, blocks });

/* ----------------------------------------------------------------------------------------- checks */

// category-map-complete — the map and the manifest's categories describe each other exactly.
const categoryKeys = Object.keys(map).filter((k) => !k.startsWith("$"));
const declared = new Set(categoryKeys);
for (const category of blocks.categories ?? []) {
  const key = `block-category:${kebab(category)}`;
  if (!declared.has(key))
    fail("category-map-complete", `block category ${JSON.stringify(category)} has no entry in discovery.blockCategoryDomains — declare the domains it may serve, or [] for domain-neutral`);
}
const manifestKeys = new Set((blocks.categories ?? []).map((c) => `block-category:${kebab(c)}`));
for (const key of categoryKeys)
  if (!manifestKeys.has(key) && key.startsWith("block-category:"))
    fail("category-map-complete", `discovery.blockCategoryDomains names ${key}, which is not a category in ${BLOCKS}`);
if (!failures.some((f) => f.startsWith("category-map-complete")))
  ok("category-map-complete", `${manifestKeys.size} block categories, each with a declared domain list`);

// category-map-namespaced — both sides carry their identifier space, and both sides resolve.
let valueCount = 0;
for (const [key, value] of Object.entries(map)) {
  if (key.startsWith("$")) continue;
  if (!key.startsWith("block-category:"))
    fail("category-map-namespaced", `key ${JSON.stringify(key)} is not namespaced — a bare name does not say which identifier space it belongs to, which is the ambiguity this map exists to remove`);
  else {
    const why = resolveRef(key, registries);
    if (why) fail("category-map-namespaced", why);
  }
  if (!Array.isArray(value)) {
    fail("category-map-namespaced", `${key}: the value must be a list of domain references ([] means domain-neutral)`);
    continue;
  }
  for (const ref of value) {
    valueCount += 1;
    if (!ref.startsWith("domain:")) {
      fail("category-map-namespaced", `${key}: ${JSON.stringify(ref)} must be a domain: reference`);
      continue;
    }
    const why = resolveRef(ref, registries);
    if (why) fail("category-map-namespaced", `${key}: ${why}`);
  }
}
if (!failures.some((f) => f.startsWith("category-map-namespaced")))
  ok("category-map-namespaced", `every key and all ${valueCount} declared domain reference(s) are namespaced and resolve`);

// category-map-matches-derived-data — the map may be permissive ("may serve"), but it may not name a
// domain that no block in that category actually reaches. discovery-index.json is the derived truth:
// a block reaches a domain through the shipping capability rows that cite it.
const reach = new Map();
for (const [slug, entry] of Object.entries(index.blocks ?? {})) {
  const category = blocks.blocks?.[slug]?.category;
  if (!category) continue;
  const key = `block-category:${kebab(category)}`;
  if (!reach.has(key)) reach.set(key, new Set());
  for (const domain of entry.domains ?? []) reach.get(key).add(domain);
}
for (const [key, value] of Object.entries(map)) {
  if (key.startsWith("$") || !Array.isArray(value)) continue;
  for (const ref of value) {
    const domain = ref.slice("domain:".length);
    if (!reach.get(key)?.has(domain))
      fail("category-map-matches-derived-data", `${key} → ${ref}: no block in that category reaches ${domain} in ${INDEX}. Leave the list empty until one does, rather than declaring a relationship nothing demonstrates.`);
  }
}
if (!failures.some((f) => f.startsWith("category-map-matches-derived-data")))
  ok("category-map-matches-derived-data", "every declared category → domain relationship is one the derived index demonstrates");

// domain-families-non-empty — registering a domain is the easy half; a domain that cites no capability
// family claims an industry with nothing behind it. check:capabilities checks the families exist; this
// checks there is at least one.
for (const domain of disc.domains ?? [])
  if (!domain.families?.length)
    fail("domain-families-non-empty", `discovery.domains / ${domain.id}: no families. A domain must cite at least one existing capability family, or it is an id with no content.`);
if (!failures.some((f) => f.startsWith("domain-families-non-empty")))
  ok("domain-families-non-empty", `${disc.domains.length} domains, each citing at least one capability family`);

// stored-references-resolve — every namespaced identifier written anywhere under docs/create resolves.
// The cross-file direction check:capabilities cannot see: a stored Create document, or the prose
// describing one, citing a domain or block the manifests do not define.
const files = [];
const walkDir = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkDir(full);
    else if (/\.(json|md)$/.test(entry)) files.push(full);
  }
};
walkDir(join(ROOT, CREATE_DOCS));
// Only references inside JSON string values or Markdown backticks are checked: prose naming a prefix
// to explain it ("a bare \"commerce\"") must not be mistaken for a reference.
const REF = /`(domain|capability|family|block-category|block|component):([A-Za-z0-9-]+)`|"(domain|capability|family|block-category|block|component):([A-Za-z0-9-]+)"/g;
const EXPECTED_INVALID = join(ROOT, CREATE_DOCS, "fixtures", "invalid");
let storedRefs = 0;
for (const file of files) {
  // The expected-invalid corpus is deliberately full of references that do not resolve; proving they
  // are rejected is check:create-schema's job, so this gate must not read them as real citations.
  if (file.startsWith(EXPECTED_INVALID)) continue;
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(REF)) {
    const ref = `${match[1] ?? match[3]}:${match[2] ?? match[4]}`;
    storedRefs += 1;
    const why = resolveRef(ref, registries);
    if (why) fail("stored-references-resolve", `${relative(ROOT, file)}: ${why}`);
  }
}
if (!failures.some((f) => f.startsWith("stored-references-resolve")))
  ok("stored-references-resolve", `${storedRefs} namespaced reference(s) under ${CREATE_DOCS}/ resolve against the canonical files`);

/* ----------------------------------------------------------------------------------------- report */

if (control) {
  const expected = NEGATIVES[control].breaks;
  if (!failures.some((f) => f.startsWith(`${expected}:`))) {
    console.error(`FAIL: negative control ${control} did not break ${expected}. The gate reported: ${failures.length ? failures.join(" | ") : "no failures at all"}`);
    process.exit(1);
  }
  const collateral = failures.filter((f) => !f.startsWith(`${expected}:`));
  console.log(`PASS: negative control ${control} breaks ${expected} as expected — ${NEGATIVES[control].why}`);
  if (collateral.length) console.log(`       collateral (expected, one property serves several checks): ${[...new Set(collateral.map((f) => f.split(":")[0]))].join(", ")}`);
  process.exit(0);
}

if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`check:taxonomy-namespaces — ${failures.length} failure(s)`);
  process.exit(1);
}
for (const p of passed) console.log(`  ✓ ${p}`);
console.log(`check:taxonomy-namespaces ok — ${passed.length} checks`);
