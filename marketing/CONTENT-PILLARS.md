# Content pillars

**Canonical** editorial strategy. Six pillars, each connecting an audience problem to a useful insight to a
KinetixUI proof to a product entry point. Every piece belongs to exactly one pillar, and every piece must
contain at least one fact a reader could verify in the repository.

Audiences referenced as P1/P2/S1–S5/C1 are defined in [`PERSONAS.md`](./PERSONAS.md). What may be claimed is
governed by [`CLAIMS.md`](./CLAIMS.md).

## Selection

Nine candidate pillars were evaluated. Six selected, three rejected — rejections recorded because a pillar we
cannot supply proof for is worse than one fewer pillar.

| Candidate | Verdict |
| --- | --- |
| Design-system architecture | **Pillar C** |
| Cross-platform UI | **Pillar A** |
| Design tokens | **Pillar B** |
| Native component engineering | **Pillar F** |
| Accessibility | **merged into Pillar D** |
| Component verification / testing | **merged into Pillar A** — verification *is* the cross-platform argument here, and splitting them would dilute both |
| Blocks / workflows | **rejected as a pillar** — real and useful, but it is a feature story with no recurring insight behind it. Use Blocks as proof inside A and F rather than as a theme |
| IoT / device interfaces | **Pillar E**, deliberately small |
| Building KinetixUI in public | **Pillar G** |

---

## A — Verified cross-platform design systems

- **Audience:** P1 primary, S5, influencers.
- **Purpose:** own the argument that a cross-platform claim should be checkable, and make "how would you
  verify that?" the question people ask of every library in the category.
- **Topics:** how to audit whether a library is really cross-platform · what a platform badge actually costs ·
  reading coverage from a manifest instead of a README · why a partial evidence count is not a tick ·
  maturity vs verification vs distribution as three separate questions.
- **Proof assets:** `check:platform-source`, `check:block-source`, `check:platform-code`; generated
  `platform-parity.json`; the 8 documented exceptions; the three false claims these checks caught here.
- **Channels:** LinkedIn, DEV, Hacker News.
- **CTA:** `/docs/platforms`.
- **Funnel stage:** Discovery → Credibility.

**This is the flagship pillar.** If only one pillar gets attention in a given month, it is this one.

---

## B — Design tokens past the web boundary

- **Audience:** P2, S2, P1.
- **Purpose:** own the native half of the token conversation, which is comparatively thin while web token
  content is saturated.
- **Topics:** DTCG in practice · semantic versus primitive layering · tokens in SwiftUI / Compose / Flutter ·
  using a design system's tokens **without** its components · light and dark as one contract · what breaks when
  tokens are copied by hand.
- **Proof assets:** `tokens/` DTCG source; generated `packages/tokens/dist/{web,ios,android,flutter}`;
  Material and Cupertino theme adapters; `check:token-contract`, `check:swiftui-tokens`.
- **Channels:** DEV, X, r/FlutterDev, r/androiddev, r/swift.
- **CTA:** `/docs/tokens`, and per-platform token docs.
- **Funnel stage:** Discovery → First value (the token-only path is the lowest-commitment entry we have).

---

## C — Engineering a design system

- **Audience:** S1, P1, C1, engineering leads.
- **Purpose:** argue that a design system's hard parts are generation, verification and drift control — not
  component authoring.
- **Topics:** manifest-driven architecture · generated versus maintained files and why the distinction must be
  enforced · drift checks in CI · release cohorts and why one version number cannot describe a multi-package
  product · provenance and tarball gating · putting marketing copy under test.
- **Proof assets:** `components.manifest.json` and every `gen:*` script; `release/publish-packages.json`
  cohorts; `requireFiles` + `validatePackedArtifact`; `marketing-claims.test.ts` and `current-truth.test.ts`.
- **Channels:** DEV, Hacker News, LinkedIn.
- **CTA:** `/docs/contributing`, the repository.
- **Funnel stage:** Credibility → Advocacy.

---

## D — Accessibility and direction as infrastructure

- **Audience:** S3, S1, S5.
- **Purpose:** argue both are structural rather than cosmetic, and demonstrate measurement honestly —
  including where ours is thin.
- **Topics:** contrast as a build gate · axe in a real browser versus unit assertions · logical properties
  instead of left/right · what direction-awareness costs on each of the five implementations · why publishing a low fraction beats
  publishing a tick.
- **Proof assets:** `check:contrast` (WCAG AA); the browser axe pass over the site and every Storybook story;
  `check:rtl`; the per-platform evidence fractions from `pnpm marketing:stats`.
- **Channels:** LinkedIn, DEV.
- **CTA:** `/docs/accessibility`, `/docs/rtl`.
- **Funnel stage:** Credibility.

**Constraint:** every piece here quotes fractions from `marketing:stats` at time of writing. The temptation to
round up is strongest in this pillar and the audience most likely to check.

---

## E — Device and fleet interfaces

- **Audience:** a narrow slice of P2 and S1 building dashboards; secondary reach into IoT communities.
- **Purpose:** hold a genuinely unusual position — a design system that models connectivity and telemetry
  state — without overclaiming a module that is small.
- **Topics:** modelling "device offline" and "reading is stale" as first-class UI state · fleet-level
  aggregation · why telemetry dashboards keep reinventing the same three states.
- **Proof assets:** `@kinetixui/iot` on npm (read its version from `marketing:stats`); its React patterns and
  examples layer; the `/iot` connected-product showcase, as a labelled simulation; `check:iot-examples`.
- **Channels:** DEV, LinkedIn, IoT and embedded communities.
- **CTA:** `/docs/iot`, `/iot`.
- **Funnel stage:** Discovery, narrow.

**Constraints:** it is a module, not a platform. It is experimental, and React only. No native port exists. No
protocol or transport is supported, and there is no automation engine, runtime or video — automation and
camera surfaces are *patterns*, UI for state something else supplies. Its primitives are not counted in the
component catalogue. Guards enforce the platform, native-port, transport and catalogue rules.

**And the one a piece in this pillar is most likely to get wrong:** the showcase is not the package. The `/iot`
environments are a deterministic simulation with no network and no device, and they demonstrate source that
the published module does not yet carry. Anything written here states what `npm install @kinetixui/iot`
actually delivers, separately from what the showcase shows. `CLAIMS.md` C4b is the row.

---

## F — How each platform's idiom actually differs

- **Audience:** S4, P1, P2.
- **Purpose:** demonstrate that the implementations are genuinely native by showing the differences, which
  simultaneously proves nothing is transpiled.
- **Topics:** the same component in five idioms, side by side · why Angular is directives on native elements
  rather than wrapped React · what a SwiftUI view does that a React component cannot · where the shared
  contract stops and platform convention takes over.
- **Proof assets:** the five source trees; `native-*.yml` workflows; `check:angular-api`; `check:platform-code`
  symbol checks; the 20 Blocks with real source on all five platforms.
- **Channels:** DEV, X, framework subreddits.
- **CTA:** the relevant platform doc.
- **Funnel stage:** Comprehension → Credibility.

**Never show an install command** for SwiftUI, Compose or Flutter in this pillar. It is the pillar where the
temptation is highest and a guard fails the build on it.

---

## G — Building in public

- **Audience:** P1, C1, influencers.
- **Purpose:** convert engineering honesty into distribution. This is where caught mistakes get published.
- **Topics:** bugs we shipped and the guardrail added because of them · before/after counts · decisions and
  their costs · what a check caught this week.
- **Proof assets:** the caught claims (`direction-provider`, `combobox`, `chart-demo`); the registry dependency
  defect and its structural fix; guard mutation tests.
- **Channels:** X, LinkedIn.
- **CTA:** varies — usually the repository or the relevant doc.
- **Funnel stage:** Discovery → Advocacy.

**The strongest single asset this project has** is a real defect, publicly diagnosed, with the structural fix
and the test that makes it unavailable. Competitors cannot copy it without having been wrong in public first.

---

## The multiplier: one development event → many outputs

A substantive change becomes a week of material. Template: `content/source-event-template.md`.

**Worked example — the registry dependency defect (Phase 0.9.1):**

| Output | Angle |
| --- | --- |
| Long-form article | "Our install command exited 0 and left a project that could not build" |
| LinkedIn | The defect, the two-part root cause, the structural fix |
| X thread | The allowlist that could only ever be incomplete, and what replaced it |
| Hacker News | "A hand-maintained dependency list cannot fail — it can only be incomplete" |
| DEV | How to derive registry dependencies from the delivered file set |
| Docs change | `/docs/installation` describing what the CLI actually installs |
| Changelog | What changed and who it affected |
| Pillar | **G**, with **A** as the secondary read |

---

## Standing rules

1. **Every piece cites a file, a check, a number or a commit.** A piece that cannot is an opinion post — ship
   at most one a month.
2. **Numbers come from `pnpm marketing:stats` at time of writing**, never from a previous draft.
3. **No evergreen piece hard-codes a version.** Release announcements may; positioning may not. See
   `CLAIMS.md` and the version-resilience rule in [`README.md`](./README.md).
4. **One pillar per piece.** A piece that spans three is usually three pieces or none.
5. **Cadence beats volume.** The schedule lives in [`content/calendar.md`](./content/calendar.md) and the
   cadence principle behind it in [`content-calendar.md`](./content-calendar.md); fewer and better compounds
   with this audience.

## What changed from the previous version

The previous six pillars were A cross-platform, B tokens, C engineering, D accessibility & RTL, E build in
public, F platform-specific. Changes:

- **A absorbed verification explicitly** and became the flagship. Previously verification was the argument of
  pillar A without being named in it, which made the pillar sound like a topic rather than a position.
- **E (device interfaces) is new**, and deliberately constrained. `@kinetixui/iot` shipped after the previous
  version was written and had no editorial home.
- **Build-in-public moved to G** and kept.
- **Blocks was evaluated and rejected** as a pillar rather than silently omitted.
- Each pillar now carries audience, funnel stage and CTA, which the previous table lacked — those are the
  fields that decide where a piece is published and what it links to.
