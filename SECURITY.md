# Security Policy

## Supported versions

Five packages are published, on three independent version lines. Fixes ship in
the **latest published version of the affected package** — upgrade to pick them
up. There are no backported patch branches.

| Package | Version line |
| --- | --- |
| `@kinetixui/tokens`, `@kinetixui/ui`, `@kinetixui/cli` | one shared line (a Changesets `fixed` cohort) |
| `@kinetixui/angular` | its own, independent |
| `@kinetixui/iot` | its own, independent |

`pnpm marketing:stats` prints the current version of each, read from the release
allowlist rather than from this file.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub's
[**Report a vulnerability**](https://github.com/zedalleys/kinetixui/security/advisories/new)
button (Security → Advisories). Private vulnerability reporting is enabled on
this repository.

Include, as far as you can:

- the affected package / file and version,
- a description of the issue and its impact,
- steps to reproduce or a proof of concept.

You'll get an acknowledgement within a few days. Once a fix is ready we'll
publish a patched release and a GitHub Security Advisory crediting you (unless
you'd rather stay anonymous).

## Scope

In scope: **every published package** — `@kinetixui/tokens`, `@kinetixui/ui`,
`@kinetixui/cli`, `@kinetixui/angular` and `@kinetixui/iot` — the registry
descriptors served from `kinetixui.com/r/`, and the build/release workflows in
this repo. The scope follows
[`release/publish-packages.json`](release/publish-packages.json): if a package is
publishable, it is in scope.

The SwiftUI, Jetpack Compose and Flutter implementations are in this repository
but are not distributed as packages. Report issues in them the same way — they
are source people compile, so a problem there still reaches a real consumer.

Out of scope: the marketing site content, third-party dependencies (report those
upstream; Dependabot tracks them here), and issues that require a
already-compromised developer machine or CI secret.
