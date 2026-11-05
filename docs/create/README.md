# KinetixUI Create — canonical schema slice

A docs-and-schema slice. It provisions nothing, calls no API, spends nothing, changes no CSP header
and adds no runtime code to any shipped package. What it adds is a canonical document schema, the
identifier-namespace decision that schema depends on, a stored fixture corpus, and two CI gates with
negative controls.

## What is here

| | |
|---|---|
| `create-project.schema.json` | the canonical `CreateProject` v1 schema — the only structural source |
| `IDENTIFIER-NAMESPACES.md` | the Commerce-collision decision and what enforces it |
| `fixtures/v1/` | stored documents at schemaVersion 1, byte-canonical |
| `fixtures/invalid/` | documents the validator must reject, each declaring the rejection it proves |
| `../../scripts/create-schema/` | the schema interpreter, the one validator, the node-identity contract, the migration registry |
| `../../scripts/check-create-schema.mjs` | `pnpm check:create-schema` — 16 checks, 20 negative controls |
| `../../scripts/check-taxonomy-namespaces.mjs` | `pnpm check:taxonomy-namespaces` — 5 checks, 8 negative controls |

## One schema, one validator

`CreateProject` is one versioned document carrying all three Create workflows — the design-system
builder, the page builder and the Figma synchroniser — because they are views and transforms of one
value. Three documents would give an AI generator three places to be almost-right.

`create-project.schema.json` is canonical and `scripts/create-schema/json-schema.mjs` **interprets**
it. It is not a second validator re-expressing the same constraints in JavaScript: that would be a
derivation which has to agree with the first by hand. The interpreter covers the JSON Schema 2020-12
subset the file uses and **throws** on a keyword it does not implement, so a keyword added without
support cannot be quietly ignored. One negative control proves that.

Two layers, named apart:

- **structural** — the schema file, executed.
- **semantic** — what a structural schema cannot carry: a reference resolving against a live
  manifest, node-id uniqueness and retirement, the allocation frontier, provenance naming a node
  that exists, an AI attribution carrying a request id. Each has a code, so a fixture declares which rejection it
  proves rather than matching prose.

The preset is reused verbatim: `@kinetixui/create-preset` already encodes brand, neutral, radius,
surface and chart palette into a versioned `KX1_` code with its own validator and canonicaliser, and
`resolveCreateTheme` is deterministic across processes. `overrides` carries only what that codec
cannot express. Rendered output — code, CSS, Figma frames, preview HTML — is never stored: it is
derivable, and a stored copy is a second source of truth with a staleness problem.

## What the evidence proves, and what it does not

**Proved, by `pnpm check:create-schema` and `pnpm check:taxonomy-namespaces` on this branch:**

- the canonical schema parses, and every keyword in it is one the interpreter implements;
- 6 stored documents are accepted, and all 20 of their namespaced references resolve against the
  live `blocks.manifest.json`, `components.manifest.json` and `docs/business-capabilities.json`;
- 20 documents are rejected, **each for the reason it declares** — a document refused for an
  unrelated reason fails the gate, because it would leave the rule it claims to cover untested;
- every stored fixture is byte-canonical, so a diff on one means a change of content;
- the migration machinery refuses a version above the current one and refuses a gap in the chain;
- the block-category → domain map is complete, namespaced on both sides, resolves, and declares no
  relationship the derived index does not demonstrate;
- the node-identity contract holds: four reorderings (reverse and rotate, applied at every depth,
  across two fixtures) leave the id set and the verdict unchanged, two allocations take `nextNodeId`
  and not a value derived from the document, and an imported document with a stale or absent counter
  has its counter raised above every id ever allocated **with every existing id unchanged** — the
  import never repairs a document by renaming nodes;
- `designSystem.preset` is decoded by **the canonical codec** (`decodePreset` from
  `packages/create-preset`), not by a second set of parsing rules here. The schema can only constrain
  the `KX1_` envelope, so an envelope-valid payload that no build can read — bad base64url, unreadable
  JSON, an unsupported preset version — was accepted before. One expected-invalid fixture carries such
  a payload, the valid corpus carries decodable ones, and a control removing the codec call makes the
  invalid fixture pass;
- a legal document's structural cost grows with its **size, not its depth**. `oneOf` must evaluate
  every alternative, so an interpreter that keeps walking an alternative after it has already failed
  re-walks the same subtree once per alternative at every level. The gate measures subschema
  evaluations rather than wall-clock time: a constant 14 per nesting level from depth 6 to 24;
- `additionalProperties: false` holds for **every** key, including the names of `Object.prototype`
  members. A declared property is an own property of `properties`, so the lookup is ownership-safe;
  `constructor`, `toString`, `hasOwnProperty` and a parsed `__proto__` are all rejected as undeclared,
  at the root and inside a nested node, and `$ref` cannot resolve to an inherited member;
- **28 negative controls**, 20 on one gate and 8 on the other, each proving the named check goes red.
  Nothing broken is committed: a control mutates what the checks see, in memory, for one run. (They
  are 28 controls over 27 distinct mutations: `lenient-migrate` and `lenient-migrate-chain` share one
  mutation and assert that two different checks went red. Two controls cannot be expressed as a
  mutation of what the checks see, because the defect they cover lives in the interpreter's own
  source: those load a variant of that source with the fix textually reverted, executed from memory,
  and assert the substitution applied exactly once so a stale control cannot quietly pass.)
- a document nested past `MAX_JSON_DEPTH` comes back as a **rejection, not a RangeError**. Both the
  structural interpreter and the semantic walk recurse, so without that bound a deep document would
  leave the validator through a crash where the contract promises a verdict.
- the interpreter **refuses a `$ref` that carries a constraint keyword beside it**. 2020-12 allows
  such siblings; this interpreter does not implement merging them, so accepting one would mean
  silently ignoring it — and `validate` alone cannot see the problem, because it only visits the
  subschemas a given document reaches. `assertSupported` checks it over the whole schema.

**Not proved, and not claimed:**

- **No migration has ever run.** `CURRENT_VERSION` is 1 and the registry is empty, so there is no
  v1 → v2 function to exercise. The gate says so in words instead of printing a green migration
  suite. What is proved is that the machinery refuses what it must.
- **Nothing is wired to a product surface.** No editor, no save route, no AI gateway exists; the
  claim "one validator in three places" is an architecture decision here, not a measured property.
- **No browser or type evidence.** This container has no `node_modules`, so the TypeScript check, the
  web test suite and every browser gate were not run. The gates added here are dependency-free and
  were run; the rest is CI's to confirm.
- **No AI call was made**, so no generation cost is measured.
- **Rendered output is excluded by convention at the document root, not yet by a contract on props.**
  `fixtures/invalid/stored-rendered-output.json` proves a top-level `renderedHtml` key is rejected as
  an unknown property. It does **not** prove rendered output cannot be stored at all: `propValue`
  accepts any string up to 4000 characters, so a props value can still carry markup or CSS today.
  Giving that rule teeth needs a per-component prop contract — a later slice, not this one.

## Registering education and agriculture

Both are registered as domains with `page: false`: declared, with no public page claiming they are
served, and no demo implied. Each cites existing capability families only.

- `domain:agriculture` → families S (IoT), A (data & analytics), R (maps & spatial), Y (observability).
  `@kinetixui/iot` already ships soil-sensor, weather-station and air-quality device categories,
  telemetry, freshness and the requested-vs-confirmed command lifecycle, so the agritech interaction
  model is largely built already.
- `domain:education` → families AC (advanced forms), N (workflow & approvals), M (authentication),
  P (documents & files), W (collaboration), A (data & analytics). Enrolment is a form plus an approval
  flow; progress is a stepper; a cohort is a member list. **Nothing education-specific exists**, so
  education is composed entirely from neutral primitives. That is architecturally correct, and it
  means a demo built on it would be a composition demo, not a capability demo.

A domain may set `page: true` only when it meets the publication criteria `scripts/business-discovery.mjs`
already enforces. Neither new domain meets them, and neither asks to.

**The measured consequence of registering them**, from the regenerated `discovery-index.json`: 21
catalogue components and 8 blocks now carry an education or agriculture facet, and `/capabilities`
gains two domain cards that list what ships and say they have no use-case page. No reader-visible
label changed, and no route was added — `discovery-routes.json` is unchanged.

## Node identity

Settled by the owner on 2026-11-04: **allocation-order ids with a persisted `nextNodeId`.** Document
order is independent of identity. The contract, and what enforces each clause:

| Clause | Enforced by |
|---|---|
| a new node takes the current `nextNodeId`, which is then incremented | `allocateNodeId`, check `allocation-uses-next-node-id` |
| reordering, moving, grouping or restructuring never changes an id | check `reorder-preserves-ids` (reverse and rotate, at every depth), control `document-order-identity` |
| a deleted id is never reused | semantic code `node-id-retired` (a live node on a retired id) and `next-node-id-too-low` (a retired id at or above the counter) |
| ids are stable across save, load and migration | fixtures are byte-canonical and are re-validated after `migrate()` |
| an imported or migrated document raises the counter above every id ever allocated, and renames nothing | `normalizeImportedNodeIds`, check `import-raises-next-node-id` |
| duplicate ids are rejected | semantic code `node-id-duplicate`, control `duplicate-ids-unchecked` |
| no state in which the counter could re-allocate a used or lower id | semantic code `next-node-id-too-low`, over live **and** retired ids |

There is **no repair pass**. `normalizeImportedNodeIds` raises the counter and touches nothing else;
a document whose stored state is invalid is rejected with a code, never silently renumbered. A repair
that renumbers nodes is indistinguishable, after the fact, from the reuse it was meant to prevent.

`nextNodeId` is persisted rather than derived, and that is the whole point. "Highest live id plus
one" loses the allocation frontier the moment the highest-numbered node is deleted: the next
allocation hands out an id that a Figma frame and a provenance record still name. The control
`allocator-reuses-ids` is exactly that mistake, and it goes red.

The document-order comparison that v1 carried before this decision is gone, along with its fixture.
`fixtures/v1/reordered-identity.json` replaces it from the other side: a page whose children are
`node_9`, `node_2`, `node_6` with `node_3`, `node_10` and `node_11` retired — accepted, because
where a node sits says nothing about when it was allocated.

Nothing was stored under the old rule, so this needed no migration; `schemaVersion` stays 1. What it
did need is a required field, and `fixtures/invalid/missing-next-node-id.json` proves the counter is
required rather than inferred.

## Open decisions for the owner

1. **`layout` nodes.** v1 has `block`, `component` and `slot`. `layout` is deliberately absent: the
   repository has no canonical layout registry — `components.manifest.json` holds no Stack, Grid or
   Section — so a layout reference could resolve against nothing, and an unresolvable identifier
   space is what the namespace decision exists to prevent. Either a layout registry is declared, or
   page structure stays expressed with slots and blocks.
2. **Where the schema lives when Create becomes code.** It sits under `docs/` with its validator in
   `scripts/` because that keeps this slice out of every published package. A private
   `@kinetixui/create-schema` package would be the natural home once something imports it, and that
   is a packaging decision with release consequences, not a schema decision.
3. **Whether `provenance` is retained for deleted nodes.** Today a retired node id keeps no record.
   Attribution history may need one; storage and privacy say otherwise.
Decision 4 — which invariant node identity carries — was **settled by the owner on 2026-11-04** and
is implemented here; see *Node identity* above.
