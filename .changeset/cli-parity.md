---
"@kinetixui/cli": minor
---

Add `kinetixui parity [components...]` — a table of which native platforms carry each component (or a filtered subset), plus a status tag for anything `beta`/`deprecated`. Pulled straight from the registry index (`platform-parity.json`/`component-status.json`, embedded by `pnpm build:registry`), so it can't drift from what the docs site shows.
