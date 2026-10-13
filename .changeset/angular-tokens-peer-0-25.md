---
"@kinetixui/angular": patch
---

Accept `@kinetixui/tokens` 0.25.0: the peer range is now `>=0.24.0 <0.26.0`. The next core release is a minor only because `@kinetixui/ui` adds components, and `@kinetixui/tokens` moves with it in the fixed group; no token is renamed or removed, so the variables Angular reads (including `--surface-grouped` and `--on-info-container`) are unchanged.
