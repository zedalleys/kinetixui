---
"@kinetixui/cli": patch
"@kinetixui/ui": patch
---

Security hardening.

- **`@kinetixui/cli`** — validates the registry base URL (http/https only), every component / registry-dependency name, and every npm dependency spec before it reaches a fetch URL or the package manager, and refuses to write a file outside the project root. A hostile registry or a checked-in `kinetixui.json` can no longer steer where files land or what gets installed.
- **`@kinetixui/ui`** — `chart.tsx` sanitises the identifiers and colour values it interpolates into its inline `<style>` (strips everything but `[\w-]` from identifiers; drops colour values carrying characters that could close the declaration, the rule, or the element).

Published with npm provenance for the first time.
