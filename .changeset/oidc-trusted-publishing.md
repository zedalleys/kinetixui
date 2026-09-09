---
"@kinetixui/cli": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

Release plumbing: publish via npm **trusted publishing** (OIDC) instead of a long-lived `NPM_TOKEN`. Each package has a trusted publisher (this repo + `release.yml`) configured on npmjs.com; `pnpm publish` exchanges the GitHub Actions OIDC token for a short-lived registry token. No package contents change.
