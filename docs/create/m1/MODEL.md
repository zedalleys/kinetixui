# Create Studio M1 document and command core

CreateProject v2 composes the immutable v1 JSON Schema with `create-project.v2-extension.json` in `apps/web/src/lib/create-studio/model.ts`. The filesystem adapter and browser use the same structural/semantic validator (`scripts/create-schema/validate-core.mjs`). The legacy schema gate deliberately continues proving v1 compatibility; M1's fixture tests exercise the registered v1→v2 migration using the existing migration runner. Future versions are rejected; unsupported old props/blocks are reported, never dropped. No published package or native API changes.

`layout-registry.json` declares Stack, Grid and Section in their own namespace. Sections are named frames; a page-root slot owns one or more frames. Parenthood is structural in the nested tree, not a second parent-ID map that can drift. Commands require an existing legal parent and cannot create orphan/cyclic relationships. Component nodes are instances of named library adapters. Token bindings name existing semantic roles; motion references are validated against the existing contract and do not add a motion engine.

Enabled adapters: Button, Input, Card, Badge, Tabs; Stack/Grid/Section are structure, not new library components. Props are closed per adapter, including exact variant casing and valid defaults. Input requires a label; Tabs has two explicitly editable labels/panels. Arbitrary event handlers, HTML, functions, CSS or module paths are never executed. Unsupported catalogue items are not advertised as editable.

Command history is immutable and bounded to 100 entries. Selection is separate; commands preserve normal IDs. A committed deletion retires IDs permanently. Undo that recreates deleted nodes allocates fresh IDs and restores selection through its explicit mapping; redo and snapshot restoration never rewind the allocation frontier. Figma binding is invalidated on structural identity restoration; synchronization is not implemented. This follows the architecture report's conservative recommendation without weakening the existing retirement invariant.

Validation limits: 1 MB canonical UTF-8, 1000 nodes/product, existing JSON-depth and per-page/child bounds. Serialization sorts keys, preserves child order, and refuses cyclic/shared object graphs, non-JSON values and prototype keys. It is deterministic independent of object insertion order.

Verification commands:

- `node scripts/check-create-schema.mjs` (legacy v1 fixture/identity regression)
- `pnpm --filter @kinetixui/web exec vitest run src/lib/create-studio/model.test.ts`
- `pnpm --filter @kinetixui/web typecheck`

M1 does not implement production accounts, storage or billing in this core; those belong behind a separate development/server adapter. No claim of all-catalogue editing, native page export, freeform vector editing, AI generation or Figma sync.
