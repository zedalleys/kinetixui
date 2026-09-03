---
"kinetixui": minor
---

Add the `kinetixui` CLI (`packages/cli`) — a first-party install tool for the
component registry:

- **`kinetixui init`** — writes `kinetixui.json` (your import aliases, global
  CSS path, `src/` layout) and pulls in the token contract.
- **`kinetixui add <name...>`** — resolves registry dependencies
  transitively, installs the npm packages a component needs with whichever
  package manager your project already uses (pnpm / yarn / bun / npm,
  detected from the lockfile), and writes source files into your configured
  directories. `--overwrite` to replace existing files.
- Own config format (`kinetixui.json`) and own registry-item `$schema`
  (`https://kinetixui.com/schema/registry-item.json`) — no other tool's CLI
  or config file needed to consume the registry.
