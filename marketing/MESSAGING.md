# Messaging

**Canonical.** Every public sentence derives from here. Strategy is in [`STRATEGY.md`](./STRATEGY.md); what
may be asserted at all is in [`CLAIMS.md`](./CLAIMS.md) — this file governs *wording*, that file governs
*permission*. When they conflict, `CLAIMS.md` wins.

No number below is typed from memory. Run `pnpm marketing:stats` before quoting one.

---

## 1. Messaging hierarchy

### A. One-line positioning

> **A design system for teams on more than one platform — with cross-platform claims verified against source
> in CI.**

### B. Short pitch (1–2 sentences)

> KinetixUI keeps one design language coherent across React, Angular, SwiftUI, Jetpack Compose and Flutter:
> one DTCG token source generates every platform's native token output, and components are implemented
> natively per platform. Every platform claim is checked against real source in CI, so the coverage table is
> something you can verify rather than trust.

### C. 30-second pitch

> Most cross-platform design systems can't tell you what they actually cover. A platform badge costs nothing
> to add, so coverage tables drift into aspiration, and you find out after you've migrated.
>
> KinetixUI is built the other way round. Tokens have one canonical DTCG source that generates each
> platform's native output — CSS variables, Swift, Kotlin, Dart. Components are hand-written per platform in
> that platform's own idiom, against a shared contract. And every platform claim is generated from a manifest
> and checked against real source in CI: if a component claims SwiftUI and no SwiftUI source exists, the build
> fails.
>
> We know it works because it caught us. Three claims in this repository were false — a component claiming
> three native platforms with no implementation on any of them — and the checks are why we know. That's the
> product: not the component count, the fact that you can check the component count.

### D. Long description

> KinetixUI is cross-platform design system infrastructure: the architecture that keeps one design language
> coherent across five platforms, plus the verification that proves it.
>
> **Tokens are generated. Components are not.** One DTCG source in `tokens/` compiles through Style
> Dictionary into every platform's native token output, including Swift, Kotlin and Dart constants and
> Material and Cupertino theme adapters you can use with no Kinetix component at all. The components are five
> independent implementations — SwiftUI views, Compose composables, Flutter widgets, Angular directives on
> native elements, React components — sharing a contract, not a codebase. Nothing is transpiled from one
> component source into five, and we never say otherwise.
>
> Coverage is generated from a single manifest and published with its gaps: exact per-platform counts,
> documented reasons for every absence, and package maturity, catalogue verification and distribution kept as
> three separate facts rather than collapsed into one word. React carries the full catalogue and installs from
> npm. Angular is published and in preview — a deliberate subset. The three native libraries are real,
> compiled in their own CI, and are source you build rather than a registry install.
>
> Three ways in, none all-or-nothing: take the token layer alone, copy component source into your own
> repository with the CLI, or install the package. And the guardrails that keep all of this honest run on
> every commit — including the ones that read this marketing copy and fail the build when it drifts from what
> the product actually does.
>
> MIT licensed.

### E. Homepage hero

> **One design language. Five platforms. Claims you can check.**

Current homepage hero: *"Copy a component, own the code"* — see §6 for the comparison and recommendation.

### F. Homepage supporting message

> One DTCG token source generates every platform's native output. Components are implemented natively per
> platform. Every platform claim is verified against source in CI — including the three that turned out to be
> wrong.

### G. Primary CTA

**`npx @kinetixui/cli@latest add button`**

Note the constraint: activation copy around this command is **PENDING LIVE VERIFICATION** (`CLAIMS.md` D1).
The command is correct and safe to show. What must not accompany it is a promise of the form "one command and
you're running", until a repeatable production check exists.

### H. Secondary CTA

**"See what each platform actually covers" → `/docs/platforms`**

This is deliberately not "Read the docs". The secondary CTA should send a sceptic to the evidence, because
credibility is the funnel's narrowest point.

### I. GitHub description

> Cross-platform design system: one DTCG token source generating native token output for React, Angular,
> SwiftUI, Jetpack Compose and Flutter — with platform claims verified against source in CI.

Current: *"Multi-platform design system: one token contract, with React, SwiftUI, Jetpack Compose and Flutter
components."* It omits Angular, and omits the verification position entirely. Prefer a durable description
over a platform enumeration that drifts; if the list is dropped for durability, keep the verification clause.

### J. GitHub README intro

> **KinetixUI** — a design system for teams shipping on more than one platform.
>
> One DTCG token source generates every platform's native token output. Components are implemented natively
> per platform against a shared contract — not transpiled from one source. Every platform claim is generated
> from a manifest and checked against real source in CI, so the coverage table below is verifiable rather than
> asserted.

### K. npm / package ecosystem description

Per-package, because the packages are not one product and do not version together:

| Package | Description |
| --- | --- |
| `@kinetixui/ui` | React components for the KinetixUI design system, on the shared token contract |
| `@kinetixui/tokens` | The DTCG token contract, generated for web, iOS, Android and Flutter |
| `@kinetixui/cli` | Add KinetixUI components and tokens to your project |
| `@kinetixui/angular` | Angular directives on native elements for the KinetixUI token contract — preview |
| `@kinetixui/iot` | React primitives for device interfaces: connectivity, telemetry staleness, fleet state — experimental |

Never imply one version number describes the product. Core (`ui`, `tokens`, `cli`) shares a line; Angular and
IoT release independently.

### L. Social bio

> One design language across React, Angular, SwiftUI, Compose and Flutter. Token source generated, components
> native per platform, coverage verified in CI. MIT.

### M. Product Hunt style description

> **KinetixUI — a cross-platform design system that proves its own coverage.**
>
> One DTCG token source generates native token output for React, Angular, SwiftUI, Jetpack Compose and
> Flutter. Components are hand-written per platform, not transpiled. Every platform claim is checked against
> real source in CI — which is how we found three of our own claims were wrong. Copy components into your repo,
> or adopt just the token layer. MIT.

Launch readiness is governed by [`launches.md`](./launches.md), not by this wording existing.

---

## 2. Platform messaging

Canonical wording per platform, at three lengths. All derive from `pnpm marketing:stats`, which keeps
**maturity**, **catalogue verification** and **distribution** as three separate facts. Never collapse them.

### React

- **Short:** "Full catalogue, on npm."
- **Medium:** "React carries the complete catalogue and installs from npm."
- **Technical:** "Stable package, beta catalogue verification, full catalogue coverage, published on npm."

### Angular

- **Short:** "Published, and in preview."
- **Medium:** "Angular is on npm and in preview — a deliberate subset of the catalogue, versioned
  independently of the core packages."
- **Technical:** "Preview package, preview catalogue verification, `catalogComplete: false`, published on npm
  in its own release cohort. Directives on native elements, not React wrapped."

**Both halves always travel together.** "Published" alone overstates; "preview" alone tells a reader they
cannot install it, which is false.

### SwiftUI

- **Short:** "Real implementation, source you build."
- **Medium:** "SwiftUI components are implemented and compiled in their own CI — today they are source you
  build rather than a registry install."
- **Technical:** "Stable package, experimental catalogue verification, not on any registry. Swift Package
  Manager is the intended channel, not a live listing."

### Jetpack Compose

- **Short:** "Real implementation, source you build."
- **Medium:** "Compose composables are implemented and compiled in their own CI — source you build, not a
  registry install."
- **Technical:** "Stable package, experimental catalogue verification, not on any registry. Maven Central is
  the intended channel, not a live listing."

### Flutter

- **Short:** "Real implementation, source you build — and the deepest token story."
- **Medium:** "Flutter widgets are implemented and compiled in their own CI, and the Material and Cupertino
  theme adapters let stock widgets inherit Kinetix tokens with no Kinetix widget involved."
- **Technical:** "Stable package, experimental catalogue verification, not on any registry. pub.dev is the
  intended channel, not a live listing."

**Never show an install command** for SwiftUI, Compose or Flutter. The guard fails the build on one.

### IoT

- **Short:** "A published React module for device interfaces — experimental."
- **Medium:** "`@kinetixui/iot` is a published, experimental, React-only module of device-interface
  primitives — connectivity, telemetry staleness and fleet state."
- **Technical:** "Published on npm in its own release cohort. Experimental, and React only: the API may change
  without a major version. A module, not a platform; its primitives are not counted in the component
  catalogue, and no native port exists. No transport, no automation engine, no video."

Read its version from `marketing:stats`. Never hard-code it — a guard enforces this.

**The `/iot` showcase is not the package.** The connected-product environments at `/iot` are a deterministic
simulation — no network, no device, no video — and they demonstrate work that includes source in the
repository the published module does not yet carry. Never present the showcase as what `npm install` gives
you, and never let a demo screenshot imply hardware. See `CLAIMS.md` C4b, which carries the five qualifiers
that travel with any IoT sentence.

### Wearables

No approved wording. Nothing is implemented, and there is no roadmap statement. See `CLAIMS.md` C5.

---

## 3. Audience message matrix

| Audience | Primary problem | Desired outcome | Message | Technical proof | Product proof | Objection | CTA | Best content |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Design-system engineer** | Cannot tell coverage from aspiration in any cross-platform system | A system whose claims survive inspection | "Every platform claim is checked against source. Here are three of ours that failed." | `check:platform-source`, `check:block-source`, `check:platform-code` | Generated `platform-parity.json`, documented exceptions | "Everyone claims parity" | `/docs/platforms` | Build-in-public teardown of a caught claim |
| **Frontend engineer** | Shared UI is a dependency they cannot patch | Components they own and can edit | "Copy the source into your repo. No runtime dependency you cannot change." | Registry served from the site; `check:registry-deps` | The CLI, `@kinetixui/ui` | "Another component library" | `npx @kinetixui/cli add button` | Comparison of copy-in vs dependency models |
| **Mobile engineer** | Web design decisions arrive as screenshots | Native components in their own idiom | "SwiftUI views, Compose composables, Flutter widgets — compiled in their own CI." | `native-*.yml` workflows | Per-platform source trees | "Is this a wrapper?" | `/docs/swiftui`, `/docs/compose`, `/docs/flutter` | Platform-idiom deep dive |
| **Product designer** | Implementation drifts from intent, invisibly | A contract both sides can point at | "Semantic and primitive tokens are an explicit contract, not a convention." | DTCG source; `check:token-contract` | `/create`, token docs | "Do engineers actually use it?" | `/docs/tokens` | Token naming and semantic layering |
| **Engineering lead** | Design-system rot between releases | Maintenance that does not depend on attention | "Drift fails the build. The guardrails are the maintenance plan." | Generated manifests + drift checks in CI | `marketing-claims.test.ts`, provenance | "Is this mature enough?" | `/docs/platforms`, `/docs/contributing` | Architecture and CI write-up |
| **Startup / product team** | No capacity for a design system, shipping on two platforms | Consistency without a migration | "Start with the tokens. Stop there if you want." | Generated native token output | `@kinetixui/tokens`, theme adapters | "Too much to adopt" | `/docs/tokens` | Token-only adoption walkthrough |
| **Enterprise DS team** | Build-vs-adopt with a long horizon | Evidence they can defend internally | "Coverage, verification and distribution are three published facts, not one word." | `verification.json` fractions | Per-platform matrix, provenance | "Can we rely on this?" | `/docs/platforms` | Honest maturity assessment |

---

## 4. Objection system

Answered only from verified evidence. Where the answer is not known, it says so.

**Why not shadcn/ui?**
For React alone, use shadcn/ui — it does that job well and did it first. KinetixUI's reason to exist starts at
the second platform: the same token contract generating SwiftUI, Compose and Flutter output, and components in
each platform's idiom. We share its copy-in philosophy and are registry-compatible with it.

**Why not Material?**
Material is a design language with a specification you adopt. KinetixUI is infrastructure for *your* design
language across platforms. If Material's aesthetics and governance suit you, it is a strong choice — the
Flutter adapters even let you keep Material widgets while feeding them Kinetix tokens.

**Why not build our own?**
Many teams should. The parts worth borrowing are the ones that take longest: the DTCG-to-native token
pipeline, the manifest-driven coverage model, and the CI checks that stop claims drifting from source. Taking
the token layer alone is a legitimate outcome of evaluating us.

**Why not separate native libraries per platform?**
That is the honest alternative, and for a single-platform team it wins. It costs you the shared token contract
and any mechanism for noticing when platforms diverge — which is the problem KinetixUI exists to solve.

**Is this mature enough?**
Depends which question you mean, and they have different answers. Package maturity, catalogue verification and
distribution are three separate published fields. React: stable package, beta verification, on npm. The three
native libraries: stable packages, experimental verification, source you build. Angular: preview, on npm. Read
the current state from `pnpm marketing:stats` and decide against that rather than a label.

**Why multiple implementations instead of one?**
Because a genuinely native feel cannot be transpiled. A SwiftUI view that behaves like SwiftUI, a Compose
composable that behaves like Compose. The cost is five implementations to maintain; the mitigation is that
drift fails CI rather than waiting to be noticed.

**Is this generated?**
Tokens: yes, from one DTCG source. Components: no — hand-written per platform. That distinction is the most
important one in our messaging and we never blur it.

**What happens when platforms differ?**
It is recorded rather than hidden. `platformNote` in the manifest states why a component is absent on a
platform, and the generated coverage data publishes the gap. Currently 8 documented exceptions.

**Is Angular supported?**
Yes, in preview, and it is installable from npm today — a deliberate subset of the catalogue in its own
release cohort. Both halves are true and we always say both.

**Are the native packages installable?**
Not today. SwiftUI, Compose and Flutter are real, compiled implementations that you build from source. Their
registry coordinates are intended channels, not live listings, and we never show an install command for them.

**Is this production ready?**
We do not make that claim as a blanket statement, because it would span five platforms with different
maturity, verification and distribution. Ask about a specific platform and property and there is a precise
answer.

**How much is actually tested?**
Published as fractions per evidence type, per platform, in `pnpm marketing:stats` — build, interaction,
accessibility, direction-awareness, large text, visual. Some of those fractions are low and we publish them
anyway. A partial count is not a tick.

**Is it open source?**
MIT, all packages.

**Will there be paid features?**
Nothing exists and nothing is being built. We will not tease one.

**What about wearables?**
Nothing is implemented and there is no roadmap statement to give.

---

## 5. Voice and terminology

Technical, specific, transparent, unhurried. Engineering-led. The reader is a peer who has been
oversold to before.

**Write like this:**
> We found our platform counts were wrong. `direction-provider` claimed SwiftUI, Compose and Flutter and had
> no implementation on any of them. We added a check that verifies every claim against source, and the counts
> moved from 91/90/91 to 90/89/90.

**Not like this:**
> Excited to announce our revolutionary new parity engine! 🚀

### Terminology

| Use | Not | Why |
| --- | --- | --- |
| token **contract** | token system | A contract is checkable |
| **implementation** per platform | port, wrapper | "Port" implies a translation of one original |
| **catalogue entry** when counting | component | 98 entries include one documented recipe |
| **source you build** | not yet published | States what you can do, not what you cannot |
| **preview** (Angular) | beta, early access | Matches the manifest's own field value |
| catalogue **verification** | test coverage | It is claim-to-source verification, a different thing |
| **module** (IoT) | platform | A guard enforces this |
| direction-aware / **logical properties** | RTL support | "Support" implies completeness we do not have |

Banned: *game-changing · revolutionary · seamless · effortless · best-in-class · the future of · next
generation · powerful · blazing fast* · fake urgency · emoji-led headlines · any parity claim without a
number. Full list and rationale in `CLAIMS.md` §G.

### Reusable openers

- "Here is a bug we shipped, and the guardrail we added because of it."
- "X claims to be cross-platform. Here is how to check whether it is."
- "The interesting part of a design system is not the components."
- "Tokens can be generated. Components cannot. Here is why that matters."

---

## 6. Proposed versus current copy

The brief requires comparing before replacing. Nothing below is applied to production copy in this phase —
these are recommendations with reasons.

| Surface | Current | Proposed | Justification | Recommend |
| --- | --- | --- | --- | --- |
| **Homepage hero** | "Copy a component, own the code" | "One design language. Five platforms. Claims you can check." | The current line is a *shadcn* value proposition, and it is the one thing we are not differentiated on. It sells the mechanism of our least differentiated audience path while the cross-platform and verification position — the actual reason to exist — appears nowhere above the fold | **Change**, and keep "own the code" as a supporting line where the CLI is introduced |
| **Homepage subhead** | Token/platform sentence naming four platforms with Angular in preview | §F wording | Adds the verification clause, which is the position. Keeps the tokens-vs-components split explicit | **Change** |
| **GitHub description** | "Multi-platform design system: one token contract, with React, SwiftUI, Jetpack Compose and Flutter components." | §I wording | Omits Angular entirely, and omits verification. A hard-coded platform enumeration also drifts — prefer durable wording | **Change** |
| **README intro** | Token-contract-first framing | §J wording | Already close. The addition is "not transpiled" made explicit rather than implied | **Light edit** |
| **Primary CTA** | `npx @kinetixui/cli@latest add button` | unchanged | Correct and verified as a command. Only surrounding promises are constrained (D1) | **Keep** |
| **npm descriptions** | Per-package, already accurate | §K table | Already good; the table makes them consistent and keeps the version caveat attached | **Light edit** |
| **Old messaging headline** | "One token architecture, in motion across every platform." | §A / §E | "Every platform" invites the parity reading the whole position rejects, and "in motion" is decorative | **Replaced here** |

Two things deliberately **not** changed:

- The old messaging file's six value propositions were sound and are preserved as the five pillars in
  `STRATEGY.md` §5, consolidated: the previous #1 and #3 were both "tokens are the shared artefact" from
  different angles, and #6 absorbed the guardrail argument that now carries pillar 5.
- The voice section is kept nearly verbatim. It was already right, and rewriting a working voice guide to
  look new is the kind of churn this reconciliation is meant to stop.
