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
 * migration machinery refuses a future version and a missing step. It also proves the node-identity
 * contract: reordering a page changes no id, an allocation takes nextNodeId rather than a derived
 * highest-plus-one, and an imported document has its counter raised above every id ever allocated.
 * It does NOT prove that a migration works: CURRENT_VERSION is 1, so no migration exists yet to be exercised, and this gate
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
import { allocateNodeId, normalizeImportedNodeIds, liveNodeIds, nodeIdNumber, formatNodeId, walkNodes } from "./create-schema/node-ids.mjs";

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
  "ref-with-sibling": { breaks: "interpreter-strict", why: "a $ref beside a constraint keyword must be refused — merging is not implemented, so the sibling would be silently ignored, and `validate` alone cannot see it because it only visits the subschemas a document reaches" },
  "unbounded-depth": { breaks: "document-depth-bounded", why: "without the depth bound a deeply nested document leaves the validator through a RangeError instead of a rejection" },
  "lenient-migrate-chain": { breaks: "missing-migration-detected", why: "a migrate() that silently skips an unregistered step must be caught" },
  "next-node-id-unchecked": { breaks: "invalid-fixtures-rejected", why: "without the allocation-frontier rule a stale nextNodeId, and a retired id above it, are both accepted — and the next allocation then hands out an id a Figma frame and a provenance record still name" },
  "document-order-identity": { breaks: "reorder-preserves-ids", why: "a validator that compares a node id with its siblings again makes reordering a page a rejection, which is exactly the contract the owner decision removed" },
  "allocator-reuses-ids": { breaks: "allocation-uses-next-node-id", why: "an allocator deriving the next id from the highest LIVE id hands out a retired id as soon as the highest-numbered node has been deleted" },
  "import-ignores-retired": { breaks: "import-raises-next-node-id", why: "an import normaliser that counts only live ids leaves the counter below a retired id, so the import itself creates the reuse it was meant to prevent" },
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
if (control === "ref-with-sibling") schema.properties.id = { $ref: "#/$defs/projectId", maxLength: 2 };

let registries = loadRegistries();
if (control === "empty-block-registry") registries = { ...registries, spaces: { ...registries.spaces, block: { ...registries.spaces.block, ids: new Set() } } };

const maxDepth = control === "unbounded-depth" ? 100000 : undefined;
let validateDoc = (doc) => validateCreateProject(doc, { schema, registries, ...(maxDepth ? { maxDepth } : {}) });
if (control === "accept-everything") validateDoc = () => ({ ok: true, errors: [] });
if (control === "next-node-id-unchecked") {
  const inner = validateDoc;
  validateDoc = (doc) => {
    const { errors } = inner(doc);
    const kept = errors.filter((e) => e.code !== "next-node-id-too-low");
    return { ok: kept.length === 0, errors: kept };
  };
}
if (control === "document-order-identity") {
  const inner = validateDoc;
  validateDoc = (doc) => {
    const result = inner(doc);
    const errors = [...result.errors];
    let highest = 0;
    const inDocumentOrder = [];
    for (const page of doc.pages ?? []) walkNodes(page.root, (node) => inDocumentOrder.push(node.id));
    for (const id of inDocumentOrder) {
      const n = nodeIdNumber(id);
      if (n <= highest) errors.push({ code: "node-id-not-monotonic", message: `${id}: not greater than the highest id so far` });
      highest = Math.max(highest, n);
    }
    return { ok: errors.length === 0, errors };
  };
}
/** An interpreter error is a finding about the schema, not a crash of the gate. */
const validator = (doc) => {
  try {
    return validateDoc(doc);
  } catch (error) {
    return { ok: false, errors: [{ code: "interpreter-strict", message: error.message }] };
  }
};

/** The node-identity contract, injectable so a control can show the checks below have teeth. */
let allocate = allocateNodeId;
if (control === "allocator-reuses-ids")
  allocate = (doc) => {
    const highestLive = Math.max(...liveNodeIds(doc).map(nodeIdNumber));
    return { id: formatNodeId(highestLive + 1), doc: { ...doc, nextNodeId: Math.max(doc.nextNodeId, highestLive + 2) } };
  };
let normalizeImport = normalizeImportedNodeIds;
if (control === "import-ignores-retired")
  normalizeImport = (doc) => {
    const numbers = liveNodeIds(doc).map(nodeIdNumber);
    return { ...doc, nextNodeId: Math.max(doc.nextNodeId ?? 0, (numbers.length ? Math.max(...numbers) : 0) + 1) };
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

// document-depth-bounded — both the structural interpreter and the semantic walk recurse, so a deeply
// nested document must come back as a verdict rather than as a RangeError out of the validator.
{
  const deepRoot = { id: "node_1", kind: "slot", name: "page" };
  let cursor = deepRoot;
  for (let i = 2; i <= 20000; i += 1) {
    const next = { id: `node_${i}`, kind: "slot", name: "s" };
    cursor.children = [next];
    cursor = next;
  }
  const deepDoc = { ...JSON.parse(readFileSync(join(ROOT, `${FIXTURES}/v1/minimal.json`), "utf8")) };
  deepDoc.pages = [{ ...deepDoc.pages[0], root: deepRoot }];
  const result = validator(deepDoc);
  if (result.ok) fail("document-depth-bounded", "a 20 000-deep document was accepted");
  else if (!result.errors.some((e) => e.code === "document-too-deep"))
    fail("document-depth-bounded", `a 20 000-deep document was rejected, but not with [document-too-deep]: ${result.errors.map((e) => `[${e.code}] ${e.message}`).join(" | ")}`);
  else ok("document-depth-bounded", result.errors[0].message);
}

/* ------------------------------------------------- the node-identity contract (owner decision) */

/**
 * Node ids are allocation-ordered. The three checks below are the executable form of that: identity
 * survives restructuring, an allocation comes from the persisted counter rather than from the
 * document, and a document arriving from outside has its counter raised past everything ever
 * allocated. Each has a negative control, because a contract nothing can break is a comment.
 */
const idsOf = (doc) => {
  const ids = [];
  for (const page of doc.pages ?? []) walkNodes(page.root, (node) => ids.push(node.id));
  return ids.sort();
};
/** Reverse every child list, at every depth: a restructuring that touches nothing but order. */
const deepReverse = (node) => ({
  ...node,
  ...(node.children ? { children: [...node.children].reverse().map(deepReverse) } : {}),
});

// reorder-preserves-ids — reordering, moving and grouping must never change an id, and must never
// turn an accepted document into a rejected one. This is what the removed document-order comparison
// used to break; the control re-adds it to show the check would catch its return.
{
  const subject = `${FIXTURES}/v1/commerce-storefront.json`;
  const before = readFixture(subject).doc;
  const after = { ...before, pages: before.pages.map((page) => ({ ...page, root: deepReverse(page.root) })) };
  const beforeIds = idsOf(before).join(",");
  const afterIds = idsOf(after).join(",");
  const result = validator(after);
  if (beforeIds !== afterIds) fail("reorder-preserves-ids", `reordering ${subject} changed the id set: ${beforeIds} -> ${afterIds}`);
  else if (!result.ok)
    fail("reorder-preserves-ids", `${subject} is accepted, but the same document with every child list reversed is rejected: ${result.errors.map((e) => `[${e.code}] ${e.message}`).join(" | ")}`);
  else ok("reorder-preserves-ids", `every child list of ${subject} reversed at every depth: the same ${idsOf(after).length} ids, still accepted — document order carries no identity`);
}

// allocation-uses-next-node-id — an allocation takes the counter's value, never a value derived from
// the document, and the document it returns still validates. The control derives it from the highest
// live id, which is the mistake this check exists to catch.
{
  const subject = `${FIXTURES}/v1/reordered-identity.json`;
  const base = readFixture(subject).doc;
  const retired = new Set(base.retiredNodeIds ?? []);
  const expected = [base.nextNodeId, base.nextNodeId + 1].map(formatNodeId);
  const handedOut = [];
  let doc = base;
  for (const _ of expected) {
    const step = allocate(doc);
    handedOut.push(step.id);
    // Attach it, so the document that must still validate is one the new id actually lives in.
    const [page] = step.doc.pages;
    doc = {
      ...step.doc,
      pages: [{ ...page, root: { ...page.root, children: [...(page.root.children ?? []), { id: step.id, kind: "slot", name: "appended" }] } }, ...step.doc.pages.slice(1)],
    };
  }
  const reused = handedOut.filter((id) => retired.has(id) || idsOf(base).includes(id));
  const result = validator(doc);
  if (reused.length) fail("allocation-uses-next-node-id", `allocation handed out ${reused.join(", ")}, which ${subject} has already used or retired`);
  else if (handedOut.join(",") !== expected.join(","))
    fail("allocation-uses-next-node-id", `two allocations from nextNodeId ${base.nextNodeId} gave ${handedOut.join(", ")}, expected ${expected.join(", ")}`);
  else if (doc.nextNodeId !== base.nextNodeId + 2)
    fail("allocation-uses-next-node-id", `the counter moved from ${base.nextNodeId} to ${doc.nextNodeId} across two allocations`);
  else if (!result.ok)
    fail("allocation-uses-next-node-id", `the document after two allocations no longer validates: ${result.errors.map((e) => `[${e.code}] ${e.message}`).join(" | ")}`);
  else ok("allocation-uses-next-node-id", `two allocations from ${subject} gave ${handedOut.join(", ")} (nextNodeId ${base.nextNodeId} -> ${doc.nextNodeId}); neither id was live or retired, and the result validates`);
}

// import-raises-next-node-id — a document from an import or a migration has its counter raised above
// every id ever allocated, live or retired, and is never lowered. The control counts only live ids.
{
  const subject = `${FIXTURES}/v1/reordered-identity.json`;
  const base = readFixture(subject).doc;
  const highestEver = Math.max(...[...idsOf(base), ...(base.retiredNodeIds ?? [])].map(nodeIdNumber));

  const stale = { ...base, nextNodeId: 2 };
  const raised = normalizeImport(stale);
  const noCounter = { ...base };
  delete noCounter.nextNodeId;
  const fromNothing = normalizeImport(noCounter);
  const alreadyHigher = normalizeImport({ ...base, nextNodeId: highestEver + 500 });

  const staleResult = validator(raised);
  if (raised.nextNodeId <= highestEver)
    fail("import-raises-next-node-id", `a stale counter was raised only to ${raised.nextNodeId}, which is not above the highest id ever allocated (node_${highestEver})`);
  else if (!staleResult.ok)
    fail("import-raises-next-node-id", `the normalised document does not validate: ${staleResult.errors.map((e) => `[${e.code}] ${e.message}`).join(" | ")}`);
  else if (fromNothing.nextNodeId !== raised.nextNodeId)
    fail("import-raises-next-node-id", `a document with no counter normalised to ${fromNothing.nextNodeId}, a stale one to ${raised.nextNodeId}; the floor must not depend on what was there`);
  else if (alreadyHigher.nextNodeId !== highestEver + 500)
    fail("import-raises-next-node-id", `normalising lowered a counter that was already higher: ${highestEver + 500} -> ${alreadyHigher.nextNodeId}`);
  else ok("import-raises-next-node-id", `an imported ${subject} with a stale or absent counter is raised to ${raised.nextNodeId}, above the retired node_${highestEver}, and a higher counter is left alone`);
}

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
