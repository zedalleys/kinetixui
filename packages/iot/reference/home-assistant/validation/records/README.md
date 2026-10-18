# Real-device evidence records

Committed `live-provider` records from `validation-runner.mjs`, one JSON file per run, unedited. Every
`*.json` here must pass `validateEvidenceRecord` (`validation.test.ts` fails otherwise), and
`evidence-gate.mjs` reads them to say whether the held `@kinetixui/iot` changesets have the device evidence
their release needs. Simulation records never belong here.

None yet: no test device or Home Assistant instance has been supplied (2026-10-11).
