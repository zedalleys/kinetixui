---
"@kinetixui/cli": patch
---

Fix `kinetixui --version` reporting a stale hardcoded "0.3.0" instead of the actual published package version. The version is now read from `package.json` and inlined at build time, so it can't drift out of sync with a release again.
