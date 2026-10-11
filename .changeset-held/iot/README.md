# Held `@kinetixui/iot` changesets

These four changesets are real, unreleased `@kinetixui/iot` changes on `main` (M4A lifecycle edges,
M4B device ledger, offline request wording, offline pending pulse). Together they make `0.6.0`.

They are held here, outside `.changeset/`, because `@kinetixui/iot` 0.6.0 is not released until the
device ledger has been validated against a live provider and a physical device (owner decision,
2026-10-09). Changesets only reads `.changeset/*.md`, so while they sit here the Version Packages PR
and the release workflow leave `@kinetixui/iot` at 0.5.0, and other cohorts (Angular 0.25.1) can ship.

`/docs/iot` still marks this work as landing in the next `@kinetixui/iot` release, which stays true;
`apps/web/src/lib/current-truth.test.ts` counts these files as pending for that reason.

To release them: `git mv .changeset-held/iot/iot-*.md .changeset/` and delete this folder. The next
Version Packages PR then proposes `@kinetixui/iot` 0.6.0 again.
