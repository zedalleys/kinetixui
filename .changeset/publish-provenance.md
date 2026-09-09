---
"@kinetixui/cli": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

Publishes now carry an npm **provenance** attestation.

`changeset publish` in this pnpm workspace shells out to `pnpm publish`, which didn't pick up the `NPM_CONFIG_PROVENANCE` workflow env var — so 0.5.1 / 0.6.0 shipped without attestations. `publishConfig.provenance: true` in each package's `package.json` is the tool-agnostic switch; it only fires in CI (OIDC), which is the only place these publish.
