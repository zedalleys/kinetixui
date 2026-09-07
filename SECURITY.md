# Security Policy

## Supported versions

`@kinetixui/tokens`, `@kinetixui/ui` and `@kinetixui/cli` share one version
line. Fixes ship in the **latest published release** — upgrade to pick them up.

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

In scope: the published packages (`@kinetixui/{tokens,ui,cli}`), the registry
descriptors served from `kinetixui.com/r/`, and the build/release workflows in
this repo.

Out of scope: the marketing site content, third-party dependencies (report those
upstream; Dependabot tracks them here), and issues that require a
already-compromised developer machine or CI secret.
