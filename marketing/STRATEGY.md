# KinetixUI strategy

**Canonical.** Category, who we serve, what we solve, why we win. Everything public derives from here.
Wording lives in [`MESSAGING.md`](./MESSAGING.md); what we may assert lives in [`CLAIMS.md`](./CLAIMS.md).

Every number in this file comes from `pnpm marketing:stats`. None is typed from memory. Where a figure would
date this document, the source is named instead of the number.

---

## 1. Product category

### Primary category

**Cross-platform design system infrastructure.**

The product is the architecture that keeps one design language coherent across five platforms, plus the
verification that proves it. Components are what you install; the token contract and the checks are what you
adopt.

### Secondary category

**A multi-platform component library** — React and Angular on npm, SwiftUI, Jetpack Compose and Flutter as
source you compile.

### Adjacent categories

Design-token tooling (DTCG → native output) · shadcn-style copy-in component registries · design-system
governance and drift detection · IoT/device interface primitives for React.

### What KinetixUI is **not**

| Not | Why it matters |
| --- | --- |
| **A React component library** | React is one of five implementations, and the least differentiated. Someone who wants React alone is better served by shadcn/ui or Radix, and saying so earns more credibility than competing there |
| **Write-once-run-everywhere** | Components are implemented independently per platform. Nothing compiles from one component source into five |
| **A cross-platform runtime** | No web view in a native shell, no bridge, no abstraction layer at runtime |
| **A Figma plugin or a handoff tool** | Tokens have a canonical source in this repository, not in a design tool |
| **A hosted service** | Nothing to sign up for. MIT, and the CLI writes files into your project |
| **Feature-complete on every platform** | Coverage is partial, measured, and published with reasons |

### The distinction that must never blur

This is the single most important sentence in KinetixUI's marketing, and the easiest to get wrong:

> **Tokens are generated from one canonical source. Components are hand-written per platform.**

One DTCG source produces every platform's token output — CSS variables, Swift, Kotlin, Dart. That pipeline is
real and automated. The *components* are five separate implementations in five idioms: SwiftUI views, Compose
composables, Flutter widgets, Angular directives on native elements, React components. They share a contract,
not a codebase.

Collapsing these into "one source, every platform" would be the most attractive lie available to us, and the
one a competent engineer would catch in ten minutes. Never write it. See `CLAIMS.md` → *component generation*.

---

## 2. Ideal customer profiles

Ranked by how well the product serves them **today**, not by market size. Serving the primary well beats
being vaguely interesting to all of them. Full behavioural detail per persona is in
[`PERSONAS.md`](./PERSONAS.md).

### PRIMARY

**P1 — The design-system engineer maintaining more than one platform.**

They own tokens and components for web *and* at least one native platform. They have personally watched the
platforms drift, and they have personally been burned by a library promising parity. They are the only
audience for whom KinetixUI's central bet — *verification is the product* — is immediately legible rather
than a curiosity.

**P2 — The team shipping the same product on web and native.**

React on the web, SwiftUI/Compose/Flutter on device. Drift is a current, named, painful problem rather than a
theoretical one. They differ from P1 in that they may have no design-system owner at all, which makes
token-only adoption the entry path that actually converts.

These two are primary together because they share the trigger (drift that has already cost them) and the
proof they need (evidence, not features). P1 evaluates the architecture; P2 feels the pain.

### SECONDARY

| # | Audience | Why secondary |
| --- | --- | --- |
| S1 | **Frontend lead owning shared UI infrastructure** | Real fit — DX, CI, accessibility, maintenance cost — but the cross-platform argument is not their lead concern, so they convert on "own the code" rather than on parity |
| S2 | **Design-system designer** (Figma, tokens, handoff) | Genuinely served by the DTCG source and semantic layering, but does not choose the library; influences whoever does |
| S3 | **RTL / multilingual product team** | Very high intent, very small volume, and our evidence is real but uneven — strong on Flutter, thin elsewhere. A credible niche, not a growth engine |
| S4 | **Mobile engineer** (iOS/Android/Flutter) | The native libraries are real and compiled, and **not distributed on any registry**. Until that changes, a mobile engineer's first experience is "clone and build", which converts poorly |
| S5 | **Enterprise design-system team evaluating build-vs-adopt** | Ideal on paper. Blocked in practice by what maturity signals we can honestly show today |

### INFLUENCERS

Design-system designers (S2) · design-engineering commentators on LinkedIn and X · maintainers whose
opinion carries in r/reactjs, r/FlutterDev, r/androiddev, r/swift · conference and newsletter curators in the
design-systems space.

They do not install anything. They decide whether the architecture argument gets repeated.

### CONTRIBUTORS

Open-source contributors drawn by the verification machinery itself — the guardrails, the manifest-driven
architecture, the generated parity data. This is a distinct motivation from *using* the library, and the
honest hook is "the interesting part is not the components".

### LOW PRIORITY — deliberately not pursued now

- **React-only teams.** Better served elsewhere; competing there dilutes the position.
- **Designers wanting a Figma UI kit.** We do not ship one.
- **Anyone needing enterprise support, SLAs or paid tiers.** None exist. Do not imply otherwise.
- **Wearables.** No implementation. Not supported, not "coming soon". See `CLAIMS.md`.

---

## 3. Jobs to be done

Only jobs the product actually addresses. Nothing invented to fill the framework.

### Functional

| | |
| --- | --- |
| **J1** | **When** my design language has to exist on web and native, **I want to** change a colour or a spacing value once and have every platform's native output follow, **so I can** stop reconciling five sets of constants by hand |
| **J2** | **When** I adopt a cross-platform design system, **I want to** know exactly which components exist on which platform and why any are missing, **so I can** plan a migration against facts instead of a marketing page |
| **J3** | **When** I need a component in my own codebase, **I want to** copy real source I can edit, **so I can** avoid a runtime dependency I cannot patch |
| **J4** | **When** I already have my own components, **I want to** consume only the token layer, **so I can** adopt incrementally without replacing my UI |
| **J5** | **When** my product ships in Arabic or Hebrew, **I want** direction-awareness to be structural rather than retrofitted, **so I can** stop patching mirrored layouts per platform |
| **J6** | **When** I build device or fleet interfaces, **I want** primitives that model connectivity and telemetry state, **so I can** stop reinventing "stale reading" and "device offline" in every dashboard |

### Team / organisational

| | |
| --- | --- |
| **J7** | **When** design and engineering argue about whether the implementation matches intent, **I want** one contract both sides can point at, **so I can** end the argument with a file rather than an opinion |
| **J8** | **When** my design system is maintained by two or three people, **I want** drift to fail the build, **so I can** stop relying on someone noticing |
| **J9** | **When** I have to justify adopting an outside design system, **I want** verifiable coverage claims, **so I can** defend the decision to people who will ask what happens when it breaks |

### Professional / emotional

| | |
| --- | --- |
| **J10** | **When** I have been burned by a parity claim before, **I want** to check a library's honesty myself, **so I can** trust it without taking anyone's word |
| **J11** | **When** I am the person who owns consistency, **I want** the system to make my judgement visible rather than invisible, **so I can** show work that is otherwise only noticed when it fails |

J10 deserves emphasis: KinetixUI's guardrails caught false claims **in this repository** — `direction-provider`
claiming three native platforms with no implementation, `combobox` claiming a React component that does not
exist, `chart-demo` advertising a Compose symbol with no source. Publishing our own caught mistakes is the
single most persuasive asset we have, because it is the one thing a competitor cannot copy without also
having been wrong in public.

---

## 4. Problem hierarchy

### CORE PROBLEM

**Cross-platform design-system claims are unverifiable, so teams cannot tell coverage from aspiration until
they are committed.**

- **Who experiences it:** P1, P2, S5 — anyone who must choose a cross-platform system and defend the choice.
- **Current workaround:** read the docs, read the changelog, clone the repo, grep for the component.
- **Why it fails:** documentation is written by the same optimism that produced the gap. Absence of a
  component is invisible; a platform badge costs nothing to add. Teams discover the truth after migrating.
- **KinetixUI mechanism:** coverage is generated from `components.manifest.json` into `platform-parity.json`,
  and `check:platform-source` fails the build when a component claims a platform whose source does not exist.
  `check:block-source` and `check:platform-code` do the same for every snippet the site shows.
- **Evidence:** each of those checks shipped *after* catching a real false claim here. Counts moved
  91/90/91 → 90/89/90 when the first one landed.

### MAJOR PROBLEMS

**M1 — Design tokens stop at the web boundary.**
Who: P1, P2, S2. Workaround: hand-maintained Swift/Kotlin/Dart constants, or a JSON file someone converts
manually. Why it fails: the copies diverge silently and nobody owns the divergence. Mechanism: one DTCG
source through Style Dictionary into `packages/tokens/dist/{web,ios,android,flutter}`, plus Material and
Cupertino theme adapters usable with **no** Kinetix component. Evidence: the generated artefacts, and
`check:token-contract`.

**M2 — Platform drift is discovered by users, not by CI.**
Who: P1, S1. Workaround: review discipline and periodic audits. Why it fails: it depends on attention, which
is exactly what runs out. Mechanism: generated manifests plus drift checks on every generated artefact, in
CI on every commit. Evidence: the check list in `CLAIMS.md`, and the caught claims above.

**M3 — Adopting a design system is all-or-nothing.**
Who: P2, S1. Workaround: a long migration nobody funds, or a wrapper layer. Why it fails: the cost lands
before any benefit does. Mechanism: three independent entry points — tokens only (npm), components copied
into your repo (CLI), or the full package. Evidence: the token-only Flutter path exists because a real user
asked for it.

**M4 — Accessibility and RTL are retrofitted per platform, badly.**
Who: S1, S3. Workaround: an audit before launch. Why it fails: it is structural, not cosmetic, so late fixes
are expensive and partial. Mechanism: WCAG AA contrast gated in CI, a real-browser axe pass over the site
and every Storybook story, and `check:rtl` enforcing logical properties on the React source. Evidence:
`pnpm marketing:stats` prints the direction-aware fractions platform by platform — and they are uneven.
Quote the fractions; never round them up to a platform list.

### SUPPORTING PROBLEMS

- **Component discovery across platforms** — one catalogue, one manifest, documented exceptions with reasons.
- **Implementation speed** — 20 Blocks with real source on all five platforms, and a CLI that writes files.
- **Device-interface primitives** — `@kinetixui/iot` models connectivity, telemetry staleness and fleet state.
- **Design/engineering handoff** — semantic versus primitive token layering as an explicit contract.

Marketing outcomes, not features: the feature is `check:platform-source`; the outcome is *you can trust the
coverage table*. Lead with the second.

---

## 5. Value proposition

### Core value proposition

> **KinetixUI is a design system for teams on more than one platform, whose cross-platform claims are
> verified against source in CI — including the ones that turned out to be wrong.**

One DTCG token source generates every platform's native token output. Components are implemented natively per
platform, and every platform claim is checked against real source before it can ship.

Why this and not "build faster": speed is what every library claims and none proves. Verification is
demonstrable in a minute, on our own repository, and is the reason the rest of the claims can be believed.

### Pillar 1 — One token source, every platform's native output

- **Problem:** tokens stop at the web boundary; native constants are copies that drift.
- **Promise:** edit one DTCG value, every platform's generated output moves with it.
- **Mechanism:** `tokens/` → Style Dictionary → `packages/tokens/dist/{web,ios,android,flutter}`, plus
  `KinetixMaterialTheme` / Cupertino adapters that style stock widgets with no Kinetix component involved.
- **Evidence:** the generated artefacts are committed and regenerated in CI; `check:token-contract` and
  `check:swiftui-tokens` fail on drift.

### Pillar 2 — Native implementations, not wrappers

- **Problem:** "cross-platform UI" usually means a web view in a native shell.
- **Promise:** each platform's components are written in that platform's idiom, and read like that platform.
- **Mechanism:** separate source trees per platform, each compiled by its own CI workflow. Angular is
  directives on native elements (`<button kxButton>`), not React wrapped.
- **Evidence:** `native-swiftui.yml`, `native-compose.yml`, `native-flutter.yml`; `check:angular-api`.

### Pillar 3 — Coverage you can check, including where it is thin

- **Problem:** every design system claims parity; almost none publishes where it falls short.
- **Promise:** exact per-platform coverage, with reasons for every gap, generated rather than asserted.
- **Mechanism:** `components.manifest.json` → `platform-parity.json`; `platformNote` records why a component
  is absent; `check:platform-source` refuses a claim without source.
- **Evidence:** the coverage table, the documented exceptions, and the false claims these checks caught here.

### Pillar 4 — Three ways in, none of them all-or-nothing

- **Problem:** adoption cost lands before any benefit.
- **Promise:** take the tokens, copy a component, or install the package — and stop wherever you like.
- **Mechanism:** `@kinetixui/tokens` on npm; the shadcn-compatible registry served by the site and consumed
  by `@kinetixui/cli`; `@kinetixui/ui` for the conventional dependency.
- **Evidence:** the registry, and the token-only Flutter adoption path that exists because a user asked.

### Pillar 5 — Maintenance is the product, not an afterthought

- **Problem:** design systems rot quietly between releases.
- **Promise:** the guardrails are the maintenance plan, and they run on every commit.
- **Mechanism:** generated manifests, drift checks on every generated artefact, per-platform native
  workflows, contrast/typography/grid/icon checks, release provenance, and claim guards that read the
  published copy itself.
- **Evidence:** `marketing-claims.test.ts` and `current-truth.test.ts` fail CI when *marketing* drifts from
  product truth — including the sentence you are reading.

Pillar 5 is unusual enough to be worth stating plainly: the marketing copy is under test. That is a claim
almost nobody else can make, and it is checkable in the repository.

---

## 6. Differentiation

### STRUCTURAL — hard to copy, because they are architectural choices with sunk cost

| Differentiator | Why defensible |
| --- | --- |
| **Marketing copy under CI guard** | `marketing-claims.test.ts` + `current-truth.test.ts` read the website, the READMEs and this directory, and fail the build on a stale platform list, a blanket parity claim, a transpilation implication, or an install command for an unpublished package. Copying this requires wanting to be constrained |
| **Coverage generated from a manifest, not written** | The single source is `components.manifest.json`; every surface derives. A competitor with hand-written tables cannot retrofit this without rebuilding their docs pipeline |
| **Claims that failed and were published** | Three false claims caught by our own checks, recorded with before/after counts. Unavailable to anyone unwilling to say they were wrong |
| **DTCG source → four native token outputs** | Real pipeline with committed artefacts, not a promise |

### PRODUCT

- **Five platform implementations in their own idioms**, each compiled by its own CI.
- **20 Blocks with real source on all five platforms** — composed patterns, not just primitives.
- **`@kinetixui/iot`** — connectivity, telemetry-staleness and fleet-state primitives; an unusual surface for
  a design system and a genuine differentiator in device dashboards. Experimental, and React only; the `/iot`
  showcase is a labelled simulation, not a device integration. See `CLAIMS.md` C4 and C4b.
- **A shadcn-compatible registry** plus a conventional npm package, so the copy-in and dependency models
  both work.

### WORKFLOW

- **Token-only adoption** on any platform, including through Material/Cupertino adapters.
- **Own-the-code CLI** — files land in your repo, editable, with dependencies derived from what each item
  actually delivers (the Phase 0.9.1 fix).
- **Documented exceptions with reasons** — `platformNote` turns a gap into information instead of a surprise.

### TRUST

- **npm provenance (SLSA)** on published packages.
- **Tarball contents gated** by `requireFiles` against the real packed artefact.
- **Accessibility verified in a real browser**, not asserted: axe over the site and every Storybook story.
- **Per-platform evidence published as fractions**, including the ones that look bad.

### NOT a differentiator — say so internally, never dress these up

| Not differentiating | Why |
| --- | --- |
| **Component count** | Everyone has components. The count is a footnote to where they run |
| **"Built with TypeScript / Tailwind / Radix"** | Table stakes in this category |
| **Dark mode, theming, variants** | Expected, not remarkable |
| **The React library on its own** | Our least differentiated artefact; shadcn/ui does it better and first |
| **MIT licence** | So is most of the competition |
| **Tree-shaking** | Measured and **not** competitive at the package level — see `audits/TREE-SHAKING.md` |
| **"Production ready"** | Not a differentiator and not currently a claim we make. See `CLAIMS.md` |

---

## 7. Strategic funnel

| Stage | What has to happen | Surface | Primary metric |
| --- | --- | --- | --- |
| **Discovery** | A cross-platform or token question gets answered better than anyone else answers it | Long-form off-site, SEO clusters, community | Qualified arrivals |
| **Comprehension** | The tokens-vs-components distinction lands in under a minute | Homepage hero + flagship demo | Scroll to proof, demo interaction |
| **Credibility** | They believe the coverage table because they can check it | `/docs/platforms`, parity data, caught-claims posts | Docs depth, repo visits |
| **First value** | Tokens installed, or one component copied | `/docs/tokens`, `npx @kinetixui/cli add …` | Activation — **pending live verification** |
| **Expansion** | A second platform adopted | Platform docs, Blocks | Multi-platform usage |
| **Advocacy** | They repeat the verification argument | GitHub, Discussions, social | Mentions, stars, contributions |

The funnel's narrowest point is **Credibility**, not Discovery. We have no users to point at, so engineering
proof carries the whole weight — which is why every stage past Comprehension links to something checkable.

**Activation is not independently verified.** The end-to-end CLI journey against production was confirmed
once, on 2026-09-29, from the repository owner's machine; the agent environment cannot reach
`kinetixui.com`. Treat activation claims as **PENDING LIVE VERIFICATION** in `CLAIMS.md` until a repeatable
check exists.

---

## 8. Positioning risks to manage honestly

1. **Angular is a preview subset.** Real, compiler-backed, deliberately incomplete
   (`catalogComplete: false`), and **published on npm**. Both halves are true and must travel together: it
   is installable *and* preview. Never put Angular in a parity denominator its product model excludes.
2. **Verification sits below package maturity, on purpose.** React is a stable package at beta verification;
   SwiftUI, Compose and Flutter are stable packages at experimental verification. That gap is the
   measurement working, not the libraries failing. Never imply a low verification level means the source
   does not run.
3. **Distribution is not maturity.** Every native port is `maturity: "stable"` and on **no** package
   registry. Never show an install command for an undistributed library. `pnpm marketing:stats` prints
   installable-versus-source-only as its own section for exactly this reason.
4. **The catalogue is 98 entries, of which one is a documented recipe, not a component.** "98 components"
   overstates by one. `marketing:stats` says so out loud; quote it that way.
5. **Direction-aware evidence is uneven.** Flutter is strong; React, Compose and Angular are single-digit
   component counts; SwiftUI has none at all. Quote the fractions, never a platform list.
6. **No users to point at.** Engineering proof only. Never invent adoption, testimonials or download
   narratives.
7. **Pro does not exist.** Do not market it, tease it, or imply a paid tier is planned.
8. **Activation is verified once, not continuously.** See §7.

---

## 9. What changed here, and why

This file was `positioning.md`. It is renamed and rewritten as the canonical strategy document so that
category, ICP, JTBD, problems, value and differentiation live in one place rather than being inferred from a
positioning fragment and a persona list. The renames are `git mv`, so history is intact.

Two substantive corrections to what the old file said:

- It framed the category as *"infrastructure for teams that need one design language across multiple
  platforms"* without naming a secondary category, which left "so is it a component library or not?"
  unanswered for readers who need the concrete answer before the architectural one. Both are now stated.
- Its one-line — *"compiles one DTCG token source into every platform's own token output, and ships a native
  component implementation per platform"* — is accurate but leads with mechanism. The core value proposition
  now leads with the verifiable claim, because mechanism is what we prove *second*.
