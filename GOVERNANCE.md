# Governance

## Today: a single maintainer

KinetixUI is maintained by one person ([@zedalleys](https://github.com/zedalleys)).
There's no RFC process or maintainer vote today because there's no one to vote
against — decisions get made, documented inline, and shipped. That's a
description of current reality, not a design goal; the structure below is
what this scales into once other maintainers show up.

## What doesn't bend

Two invariants hold regardless of who's contributing:

1. **React (`@kinetixui/ui`) is the single source of truth.** Every other
   platform — Angular, Jetpack Compose, SwiftUI and Flutter — is a port of it
   on the same token contract. Nothing lands on another platform first.
2. **The platform rule.** A new component isn't "done" until it exists on all
   four catalogue-complete platforms (React, SwiftUI, Jetpack Compose,
   Flutter), or is a documented, deliberate non-port with a
   reason recorded (see [`/docs/contributing`](https://kinetixui.com/docs/contributing)'s
   "standing non-ports" table). This is the project's actual decision-record
   mechanism today: rather than a separate RFC doc, every non-obvious call —
   why a component was scoped down, why a platform's implementation differs
   from the web version, why something isn't ported — gets written down at
   the point of the decision (a doc comment in the port itself, a changeset
   entry, or the contributing guide), not filed away in an issue tracker
   nobody reads later.

## How a change gets decided

- **Component/token/API changes** go through a PR against `main`. Branch
  protection requires the `build` CI check to pass and open conversations to
  be resolved before merge; there's no required-reviewer count today because
  there's one maintainer, not because review doesn't matter — a real
  contributor's PR gets read the same as a solo commit would.
- **Releases** go out via Changesets on merge to `main` — see
  [`/docs/contributing`](https://kinetixui.com/docs/contributing) for the
  mechanics. `@kinetixui/{tokens,ui,cli}` version together; none of them ship
  `1.0.0` until the library is considered feature-complete.
- **Security issues** follow [`SECURITY.md`](./SECURITY.md), not this file —
  report privately, not as a PR or public issue.
- **Roadmap** is tracked in-repo (`COMPONENT-ADDITIONS.md`) rather than in a
  separate project-management tool, so it stays versioned alongside the code
  it describes.

## If/when more maintainers join

The platform rule already implies the shape this grows into: a **core
maintainer** role (design language, tokens, cross-platform API conventions,
the "is this a real gap or a documented scope-down" call) plus a
**platform maintainer** per port (React, Angular, Jetpack Compose, SwiftUI,
Flutter), each responsible for their platform meeting the component contract
and accumulating the verification evidence before a component is called
verified there. A component doesn't move to fully
cross-platform `stable` status until every required platform's maintainer
has signed off — mirroring how [component maturity status](https://kinetixui.com/docs/contributing#component-status)
already separates "shipped" from "proven." Nothing about this needs
inventing from scratch when the time comes; it's a formalization of the
review discipline the platform rule already enforces on one person.

## Becoming a maintainer

There's no formal nomination process yet — the practical bar is a track
record of PRs that hold up: real component/platform ports that follow the
conventions in [`/docs/contributing`](https://kinetixui.com/docs/contributing),
not just one-off contributions. If you're contributing regularly and want to
take on a platform, open an issue and say so.
