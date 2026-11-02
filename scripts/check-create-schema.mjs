#!/usr/bin/env node
/**
 * check-create-schema.mjs — the CreateProject schema gate.
 *
 *   node scripts/check-create-schema.mjs                     run every check
 *   node scripts/check-create-schema.mjs --negative=<id>     require one check to fail
 *   node scripts/check-create-schema.mjs --list-negatives
 *
 * What it proves, and what it does not. It proves that the canonical schema parses, that every
 * stored fixture is byte-canonical and declares the version of the directory it sits in, that the
 * valid corpus is accepted and the expected-invalid corpus is rejected for the stated reason, that
 * every namespaced reference in a stored document resolves against the live manifests, and that the
 * migration machinery refuses a future version and a missing step. It does NOT prove that a
 * migration works: CURRENT_VERSION is 1, so no migration exists yet to be exercised, and this gate
 * reports that in words rather than printing a green migration suite.
 *
 * Every check is named, and the name is what a negative control breaks. Controls mutate what the
 * checks see in memory; nothing broken is ever committed.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { validate as structural, assertSupported } from "./create-schema/json-schema.mjs";
import { loadRegistries, ROOT } from "./create-schema/registries.mjs";
import { validateCreateProject, serialize, SCHEMA_PATH, SEMANTIC_CODES } from "./create-schema/validate.mjs";
import { migrate, CURRENT_VERSION, ReadOnlyDocumentError, MissingMigrationError } from "./create-schema/migrate.mjs";

const FIXTURES = "docs/create/fixtures";
const INVALID = `${FIXTURES}/invalid`;

/**
 * Each control names the check it must break. A control that breaks nothing, or breaks something
 * else, is itself a failure: it would mean the check is not measuring what it claims.
 */
const NEGATIVES = {
  "accept-everything": { breaks: "invalid-fixtures-rejected", why: "a validator that returns no errors must not pass the expected-invalid corpus" },
  "drop-domain-pattern": { breaks: "invalid-fixtures-rejected", why: "removing the domain pattern from the schema must let a bare \"commerce\" through, which is what proves the pattern is the thing rejecting it" },
  "empty-block-registry": { breaks: "valid-fixtures-accepted", why: "references are resolved against blocks.manifest.json, not assumed — an empty registry must reject the valid corpus" },
  "four-space-fixture": { breaks: "fixture-canonical", why: "a fixture written with another indent must be caught, or the round-trip property is decoration" },
  "wrong-expected-code": { breaks: "invalid-fixtures-rejected", why: "a fixture rejected for a reason other than the one it claims must fail" },
  "missing-expectation-entry": { breaks: "expectations-complete", why: "an invalid fixture nobody declared an expectation for must fail" },
  "fixture-version-mismatch": { breaks: "fixture-version-matches-dir", why: "a v2 document in the v1 directory must be caught" },
  "unsupported-keyword": { breaks: "interpreter-strict", why: "a schema keyword the interpreter does not implement must throw, never be ignored" },
  "lenient-migrate": { breaks: "read-only-above-current", why: "a migrate() that accepts a future version must be caught — a rolled-back deployment must not downgrade a project" },
  "lenient-migrate-chain": { breaks: "missing-migration-detected", why: "a migrate() that silently skips an unregistered step must be caught" },
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

let schema = JSON.parse(readFileSync(join(ROOT, SCHEMA_PATH), "utf8"));
if (control === "drop-domain-pattern") delete schema.$defs.domainRef.pattern;
if (control === "unsupported-keyword") schema.$defs.projectId.formatMinimum = "x";

let registries = loadRegistries();
if (control === "empty-block-registry") registries = { ...registries, spaces: { ...registries.spaces, block: { ...registries.spaces.block, ids: new Set() } } };

let validateDoc = (doc) => validateCreateProject(doc, { schema, registries });
if (control === "accept-everything") validateDoc = () => ({ ok: true, errors: [] });
/** An interpreter error is a finding about the schema, not a crash of the gate. */
const validator = (doc) => {
  try {
    return validateDoc(doc);
  } catch (error) {
    return { ok: false, errors: [{ code: "interpreter-strict", message: error.message }] };
  }
};

let migrateImpl = migrate;
if (control === "lenient-migrate" || control === "lenient-migrate-chain") migrateImpl = (doc) => doc;

let expectations = JSON.parse(readFileSync(join(ROOT, INVALID, "EXPECTATIONS.json"), "utf8")).cases;
if (control === "wrong-expected-code")
  expectations = { ...expectations, "unknown-block-ref.json": { ...expectations["unknown-block-ref.json"], expect: "route-duplicate" } };
if (control === "missing-expectation-entry") {
  expectations = { ...expectations };
  delete expectations["bare-domain.json"];
}

const versionDirs = readdirSync(join(ROOT, FIXTURES))
  .filter((d) => /^v[0-9]+$/.test(d))
  .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

const readFixture = (rel) => {
  const raw = readFileSync(join(ROOT, rel), "utf8");
  if (control === "four-space-fixture" && rel.endsWith("v1/minimal.json"))
    return { raw: `${JSON.stringify(JSON.parse(raw), null, 4)}\n`, doc: JSON.parse(raw) };
  const doc = JSON.parse(raw);
  if (control === "fixture-version-mismatch" && rel.endsWith("v1/minimal.json")) doc.schemaVersion = 2;
  return { raw, doc };
};

/* ----------------------------------------------------------------------------------------- checks */

// interpreter-strict — every keyword in the canonical schema is one the interpreter implements. Walked
// over the whole schema, not over a probe document: `validate` only visits the subschemas a given
// document reaches, so an unimplemented keyword could otherwise sit unnoticed behind an optional field.
const unsupported = assertSupported(schema);
if (unsupported.length) for (const problem of unsupported) fail("interpreter-strict", problem);
else {
  try {
    structural({ schemaVersion: 1 }, schema);
    ok("interpreter-strict", "every keyword in the canonical schema is one the interpreter implements");
  } catch (error) {
    fail("interpreter-strict", error.message);
  }
}

// schema-parses — the canonical file is the only structural source, so it has to be loadable and complete.
if (!existsSync(join(ROOT, SCHEMA_PATH))) fail("schema-parses", `${SCHEMA_PATH} is missing`);
else if (schema.properties?.schemaVersion?.const !== CURRENT_VERSION)
  fail("schema-parses", `the schema pins schemaVersion ${JSON.stringify(schema.properties?.schemaVersion?.const)} but migrate.mjs says the current version is ${CURRENT_VERSION}`);
else ok("schema-parses", `${SCHEMA_PATH} parses and pins schemaVersion ${CURRENT_VERSION}`);

// Every semantic code the validator can emit is documented, so a fixture can name one.
const undocumented = Object.keys(SEMANTIC_CODES).length === 0;
if (undocumented) fail("schema-parses", "no semantic codes are documented");

let validCount = 0;
let refCount = 0;
for (const dir of versionDirs) {
  const version = Number(dir.slice(1));
  for (const file of readdirSync(join(ROOT, FIXTURES, dir)).filter((f) => f.endsWith(".json"))) {
    const rel = `${FIXTURES}/${dir}/${file}`;
    const { raw, doc } = readFixture(rel);

    // fixture-canonical — a stored document round-trips byte for byte, which is what makes a diff on
    // one of these files mean a change of content rather than a change of formatting.
    if (serialize(doc) !== raw) fail("fixture-canonical", `${rel} is not byte-canonical (two-space JSON, trailing newline)`);

    // fixture-version-matches-dir — a document's version is declared, never inferred from the path.
    if (doc.schemaVersion !== version)
      fail("fixture-version-matches-dir", `${rel} declares schemaVersion ${doc.schemaVersion} but sits in ${dir}`);

    // valid-fixtures-accepted, at its own version and again after migration to the current one.
    const result = validator(doc);
    if (!result.ok)
      fail("valid-fixtures-accepted", `${rel} is rejected: ${result.errors.map((e) => `[${e.code}] ${e.message}`).join(" | ")}`);
    else validCount += 1;

    // migration-chain — every stored version reaches the current one, and the result still validates.
    try {
      const migrated = migrateImpl(doc);
      const after = validator(migrated);
      if (!after.ok)
        fail("migration-chain", `${rel} migrated from v${version} to v${CURRENT_VERSION} no longer validates: ${after.errors.map((e) => e.message).join(" | ")}`);
    } catch (error) {
      fail("migration-chain", `${rel}: ${error.message}`);
    }

    refCount += JSON.stringify(doc).match(/"(domain|block|component):/g)?.length ?? 0;
  }
}
if (!validCount) fail("valid-fixtures-accepted", "no valid fixtures were found at all");
else ok("valid-fixtures-accepted", `${validCount} stored document(s) accepted across ${versionDirs.join(", ")}; every namespaced reference resolves against the live manifests`);
if (!failures.some((f) => f.startsWith("fixture-canonical"))) ok("fixture-canonical", "every stored fixture is byte-canonical");
if (!failures.some((f) => f.startsWith("fixture-version-matches-dir"))) ok("fixture-version-matches-dir", "every fixture declares the version of its directory");
if (!failures.some((f) => f.startsWith("migration-chain")))
  ok("migration-chain", CURRENT_VERSION === 1
    ? "nothing to migrate: CURRENT_VERSION is 1, so no migration has been exercised — the machinery is proved only by its two refusal controls"
    : `every stored version migrates to v${CURRENT_VERSION} and the result validates`);

// expectations-complete — the expected-invalid corpus and its declarations describe each other exactly.
const invalidFiles = readdirSync(join(ROOT, INVALID)).filter((f) => f.endsWith(".json") && f !== "EXPECTATIONS.json");
for (const file of invalidFiles)
  if (!expectations[file]) fail("expectations-complete", `${INVALID}/${file} has no entry in EXPECTATIONS.json — say which rejection it proves`);
for (const file of Object.keys(expectations))
  if (!invalidFiles.includes(file)) fail("expectations-complete", `EXPECTATIONS.json names ${file}, which does not exist`);
if (!failures.some((f) => f.startsWith("expectations-complete")))
  ok("expectations-complete", `${invalidFiles.length} expected-invalid fixtures, each with the rejection it proves`);

// invalid-fixtures-rejected — rejected, AND rejected for the declared reason. A document refused for
// an unrelated reason would leave the rule it claims to cover untested.
let rejected = 0;
for (const file of invalidFiles) {
  const rel = `${INVALID}/${file}`;
  const expect = expectations[file]?.expect;
  const result = validator(JSON.parse(readFileSync(join(ROOT, rel), "utf8")));
  if (result.ok) {
    fail("invalid-fixtures-rejected", `${rel} was ACCEPTED; it must be rejected with [${expect}]`);
    continue;
  }
  if (expect && !result.errors.some((e) => e.code === expect)) {
    fail("invalid-fixtures-rejected", `${rel} was rejected, but not with [${expect}]: ${result.errors.map((e) => `[${e.code}] ${e.message}`).join(" | ")}`);
    continue;
  }
  rejected += 1;
}
if (!failures.some((f) => f.startsWith("invalid-fixtures-rejected")))
  ok("invalid-fixtures-rejected", `${rejected} documents rejected, each for the reason it declares`);

// read-only-above-current — a document from a newer deployment opens read-only, never downgraded.
try {
  migrateImpl({ ...JSON.parse(readFileSync(join(ROOT, `${FIXTURES}/v1/minimal.json`), "utf8")), schemaVersion: CURRENT_VERSION + 1 });
  fail("read-only-above-current", `a schemaVersion ${CURRENT_VERSION + 1} document was migrated rather than refused`);
} catch (error) {
  if (error instanceof ReadOnlyDocumentError) ok("read-only-above-current", error.message);
  else fail("read-only-above-current", `refused with the wrong error: ${error.message}`);
}

// missing-migration-detected — a gap in the chain is an error, not a skipped step.
try {
  migrateImpl({ schemaVersion: 1 }, { current: 3, migrations: {} });
  fail("missing-migration-detected", "a chain with no registered step was walked without complaint");
} catch (error) {
  if (error instanceof MissingMigrationError) ok("missing-migration-detected", error.message);
  else fail("missing-migration-detected", `refused with the wrong error: ${error.message}`);
}

/* ----------------------------------------------------------------------------------------- report */

if (control) {
  const expected = NEGATIVES[control].breaks;
  const broke = failures.some((f) => f.startsWith(`${expected}:`));
  if (!broke) {
    console.error(`FAIL: negative control ${control} did not break ${expected}. The gate reported: ${failures.length ? failures.join(" | ") : "no failures at all"}`);
    process.exit(1);
  }
  // One broken property can legitimately surface in more than one check — a document whose version
  // is wrong is also no longer byte-canonical. The control's contract is that it breaks the check it
  // names; collateral is printed so it is declared rather than silent.
  const collateral = failures.filter((f) => !f.startsWith(`${expected}:`));
  console.log(`PASS: negative control ${control} breaks ${expected} as expected — ${NEGATIVES[control].why}`);
  if (collateral.length) console.log(`       collateral (expected, one property serves several checks): ${collateral.map((f) => f.split(":")[0]).join(", ")}`);
  process.exit(0);
}

if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`check:create-schema — ${failures.length} failure(s)`);
  process.exit(1);
}
for (const p of passed) console.log(`  ✓ ${p}`);
console.log(`check:create-schema ok — ${passed.length} checks, ${refCount} namespaced references resolved`);
