/**
 * migrate.mjs — schemaVersion migrations for CreateProject.
 *
 * Three properties this file exists to hold:
 *
 *   1. A migration is a pure function vN → vN+1, registered here and tested against stored fixtures
 *      of every prior version (docs/create/fixtures/v<N>/).
 *   2. Migrations run ON READ, and the migrated document is written back on the next save. A
 *      big-bang migration of a projects table is a migration that can only be run once correctly.
 *   3. A document whose schemaVersion is HIGHER than the running code is read-only, with a clear
 *      message. A rolled-back deployment must not silently downgrade someone's project.
 *
 * CURRENT_VERSION is 1 and MIGRATIONS is therefore empty. That is the honest state: nothing here
 * has yet migrated a real document, and check:create-schema says so rather than reporting a
 * passing migration suite. What IS proved today is that the machinery rejects what it must —
 * an unknown future version, and a stored version with no path to the current one. Both have
 * negative controls.
 */
export const CURRENT_VERSION = 1;

/** version N → a pure function producing a valid version N+1 document. */
export const MIGRATIONS = {
  // 1: (doc) => ({ ...doc, schemaVersion: 2, /* ... */ }),
};

export class ReadOnlyDocumentError extends Error {}
export class MissingMigrationError extends Error {}

/**
 * @param doc parsed document
 * @param current override CURRENT_VERSION (the negative controls use this; nothing else should)
 * @param migrations override the registry (likewise)
 */
export function migrate(doc, { current = CURRENT_VERSION, migrations = MIGRATIONS } = {}) {
  const from = doc?.schemaVersion;
  if (!Number.isInteger(from) || from < 1)
    throw new MissingMigrationError(`schemaVersion ${JSON.stringify(from)} is not a positive integer — the document's version is never inferred from its shape`);
  if (from > current)
    throw new ReadOnlyDocumentError(`document is schemaVersion ${from}, this code understands ${current} — open it read-only rather than downgrading it`);

  let out = doc;
  for (let v = from; v < current; v += 1) {
    const step = migrations[v];
    if (!step) throw new MissingMigrationError(`no migration registered from schemaVersion ${v} to ${v + 1}`);
    out = step(out);
    if (out.schemaVersion !== v + 1)
      throw new MissingMigrationError(`the migration ${v} → ${v + 1} produced schemaVersion ${out.schemaVersion}`);
  }
  return out;
}
