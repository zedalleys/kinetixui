# @kinetixui/cli

## 0.4.0

## 0.3.1

## 0.3.0

### Minor Changes

- fe501e3: Add `kinetixui list` to enumerate every component in the registry, and an `--all` flag on `kinetixui add` to install all of them in one command.

> Published as `@kinetixui/cli` since 0.2.0. The `0.1.0` release under the
> unscoped name `kinetixui` is deprecated; the installed command is still
> `kinetixui` (run via `npx @kinetixui/cli`).

## 0.2.0

### Minor Changes

- b51e6e6: Add the `kinetixui` CLI (`packages/cli`) — a first-party install tool for the
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
