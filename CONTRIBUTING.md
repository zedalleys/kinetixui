# Contributing

The full guide — the platform rule, the standing non-ports, the
per-platform workflow, CI, publishing, component status, and blocks — lives
at **[kinetixui.com/docs/contributing](https://kinetixui.com/docs/contributing)**
(source: `apps/web/src/app/docs/contributing/page.mdx`), so it stays one
canonical copy instead of drifting from a duplicate here.

Quick orientation:

- `pnpm install`, then see [`README.md`](README.md#working-in-the-repo) for
  the day-to-day commands (`build:tokens`, `build:registry`, `test`, `dev:web`, …).
- Every component or block change goes through a PR against `main` — CI
  (`ci.yml` plus the path-filtered `native-*.yml` workflows) is the actual
  compile check for each platform, since none of the native toolchains are
  assumed to be on your machine.
- Decision-making / maintainer structure: [`GOVERNANCE.md`](GOVERNANCE.md).
- Found a security issue? Don't open a PR or public issue —
  see [`SECURITY.md`](SECURITY.md).
