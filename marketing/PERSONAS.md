# Personas

**Canonical.** Behavioural, job-based personas — defined by the situation someone is in and the job they are
trying to get done, never by invented demographics. There are no names, ages or stock photos here on purpose:
a fictional "Sarah, 32, Senior Engineer" adds nothing a job description does not, and invites copy written for
a character instead of a situation.

Ranking and the reasoning behind it are in [`STRATEGY.md`](./STRATEGY.md) §2. Wording is in
[`MESSAGING.md`](./MESSAGING.md). What may be claimed to any of them is in [`CLAIMS.md`](./CLAIMS.md).

| | Persona | Tier |
| --- | --- | --- |
| **P1** | Design-system engineer on more than one platform | **PRIMARY** |
| **P2** | Team shipping one product on web and native | **PRIMARY** |
| S1 | Frontend lead owning shared UI infrastructure | Secondary |
| S2 | Design-system designer | Secondary — influencer |
| S3 | RTL / multilingual product team | Secondary — niche |
| S4 | Mobile engineer | Secondary — blocked on distribution |
| S5 | Enterprise design-system team | Secondary — blocked on maturity signals |
| C1 | Open-source contributor | Contributor |

---

## P1 — Design-system engineer on more than one platform · PRIMARY

- **Role:** owns tokens and components for web plus at least one native platform. Often a team of one to three.
- **Context:** the design system is their product, and its users are other engineers inside the company. They
  are measured on consistency, which is invisible when it works.
- **Job to be done:** J1, J2, J8, J10 — change a value once and have every platform follow; know exactly what
  exists where; make drift fail the build rather than wait to be noticed; check a vendor's honesty themselves.
- **Pain:** they maintain the same component four times and cannot prove the four agree. Every cross-platform
  library they have evaluated claimed parity and delivered a subset.
- **Existing alternatives:** hand-rolled Style Dictionary pipeline plus four hand-maintained component sets;
  or a commercial design-system platform priced for enterprise; or per-platform libraries with no shared layer.
- **Trigger:** a visual bug that existed on iOS for three weeks because nobody was looking; or a token change
  that shipped on web and silently did not on Android.
- **Desired outcome:** one contract, and a mechanism that tells them when reality diverges from it.
- **KinetixUI value:** the verification architecture. Coverage generated from a manifest, claims checked
  against source in CI, exceptions documented with reasons — and marketing copy under the same guards.
- **Likely objection:** *"Everyone claims parity. Why would yours be different?"*
- **Proof needed:** a CI guardrail catching a false claim in **our** repository, with before/after counts. Not
  a feature list — an incident.
- **Best entry point:** `/docs/platforms`, then the parity checks in the repository.
- **Best CTA:** "See what each platform actually covers."

**Why primary:** they are the only audience for whom "verification is the product" is immediately legible
rather than an oddity. They also decide, rather than influence.

---

## P2 — Team shipping one product on web and native · PRIMARY

- **Role:** a product team with React on the web and SwiftUI, Compose or Flutter on device. Frequently **no**
  design-system owner at all.
- **Context:** two or three codebases, one brand, and nobody whose job is consistency between them.
- **Job to be done:** J1, J3, J4, J7 — one source for shared values; components they can edit; a way in that
  does not require a migration; something design and engineering can both point at.
- **Pain:** the apps have visibly diverged. Spacing, radii and brand colours differ, and each fix is applied
  in one place.
- **Existing alternatives:** a shared JSON file someone converts by hand; a Notion page of hex codes; giving
  up and letting each platform own its own look.
- **Trigger:** a redesign, a rebrand, or a stakeholder putting the web and mobile screens side by side.
- **Desired outcome:** the platforms stop drifting without hiring someone to prevent it.
- **KinetixUI value:** token-only adoption. They can take `@kinetixui/tokens`, get generated native output and
  the Material/Cupertino adapters, and change nothing about their components.
- **Likely objection:** *"We do not have time to adopt a design system."*
- **Proof needed:** that the smallest useful step is genuinely small — tokens with no component commitment.
- **Best entry point:** homepage flagship demo, then `/docs/tokens`.
- **Best CTA:** "Start with the tokens. Stop there if you want."

**Why primary:** they have the pain P1 has the vocabulary for. The token-only path is the only adoption story
in the category that fits a team with no design-system budget.

---

## S1 — Frontend lead owning shared UI infrastructure

- **Role:** senior/lead engineer who owns the component layer for web, and answers for its maintenance cost.
- **Context:** one platform today, possibly a second later. Cares about DX, CI, accessibility and lock-in.
- **Job to be done:** J3, J8, J9 — own the code; make rot detectable; justify the choice to people who will
  ask what happens when it breaks.
- **Pain:** a dependency they cannot patch, whose upgrades are risky and whose maintenance is invisible until
  it is urgent.
- **Existing alternatives:** shadcn/ui (the closest fit), MUI, Chakra, or an internal library.
- **Trigger:** a dependency upgrade that broke visual regressions, or an accessibility audit finding.
- **Desired outcome:** components they control, with a maintenance story they can defend.
- **KinetixUI value:** the copy-in model plus CI guardrails. Honestly, for React alone shadcn/ui serves them
  well — our advantage appears when a second platform does.
- **Likely objection:** *"This is another component library."*
- **Proof needed:** the guardrail architecture, and a straight answer about when shadcn/ui is the better pick.
- **Best entry point:** `/docs/installation`, `/components`.
- **Best CTA:** `npx @kinetixui/cli add button`.

---

## S2 — Design-system designer · influencer

- **Role:** owns Figma libraries, token naming and handoff. Does not write Kotlin and does not want to.
- **Context:** between design and engineering, and usually the person who notices the implementation has
  drifted from intent.
- **Job to be done:** J7 — one contract both sides can point at.
- **Pain:** token names that mean different things in Figma and in code; handoff as a negotiation each time.
- **Existing alternatives:** Figma variables plus Tokens Studio, and hope.
- **Trigger:** the third argument about whether a colour is "surface" or "background".
- **Desired outcome:** semantics that survive the trip into code.
- **KinetixUI value:** the DTCG source, explicit semantic-versus-primitive layering, light and dark as one
  contract.
- **Likely objection:** *"Will engineers actually use it?"*
- **Proof needed:** that the tokens in the repository are the ones the components consume — not a parallel set.
- **Best entry point:** `/docs/tokens`, `/docs/colors`, `/create`.
- **Best CTA:** "See the token contract."

**Treat as influencer:** rarely chooses the library, frequently decides whether the architecture argument gets
repeated to whoever does.

---

## S3 — RTL / multilingual product team · niche

- **Role:** builds for Arabic, Hebrew or mixed-direction audiences, across platforms.
- **Context:** direction is a first-class product requirement, and nearly every library treats it as a patch.
- **Job to be done:** J5 — direction-awareness that is structural rather than retrofitted.
- **Pain:** mirrored layouts break per platform, and each fix is bespoke.
- **Existing alternatives:** per-platform RTL patches and manual QA in two directions.
- **Trigger:** a market launch that makes RTL non-negotiable.
- **Desired outcome:** logical properties enforced rather than remembered.
- **KinetixUI value:** `check:rtl` enforcing logical properties on the React source, plus direction-aware
  behaviour evidence published as fractions — Flutter is substantial, the rest are thin, and one platform has
  none. Quote the fractions from `pnpm marketing:stats`; never round them into a platform list.
- **Likely objection:** *"How much of this is actually tested?"* — a fair question with an uneven answer.
- **Proof needed:** the real fractions, given plainly. Overstating here loses this persona permanently,
  because they will check.
- **Best entry point:** `/docs/rtl`.
- **Best CTA:** "See the direction-aware evidence."

---

## S4 — Mobile engineer · blocked on distribution

- **Role:** iOS, Android or Flutter engineer receiving design decisions made on the web.
- **Context:** their platform is downstream of web choices and they are handed screenshots.
- **Job to be done:** J1, J2 — native components in their own idiom that match the shared contract.
- **Pain:** re-implementing web decisions by eye, then being told the result is inconsistent.
- **Existing alternatives:** the platform's own design system (Material 3, Apple HIG) plus internal
  conventions.
- **Trigger:** a design review where their screen is compared to the web.
- **Desired outcome:** components that feel native and match the system.
- **KinetixUI value:** real implementations in their idiom, compiled in their own CI — and the token layer,
  which is available today.
- **Likely objection:** *"Is this a wrapper?"* — no, and the answer is easy to verify.
- **Proof needed:** platform-idiomatic source, and a straight answer about installation.
- **Best entry point:** `/docs/swiftui`, `/docs/compose`, `/docs/flutter`.
- **Best CTA:** "Read the platform implementation." **Not** an install command — these are source you build.

**The honest constraint:** until SwiftUI, Compose and Flutter are distributed, this persona's first experience
is clone-and-build, which converts poorly. That is a distribution problem, not a messaging one, and no wording
fixes it.

---

## S5 — Enterprise design-system team · blocked on maturity signals

- **Role:** a funded design-system group evaluating build-versus-adopt on a multi-year horizon.
- **Context:** procurement, security review, and a need to justify the decision to people who were not in the
  room.
- **Job to be done:** J9 — verifiable claims they can defend internally.
- **Pain:** adopting an outside system is a career risk if it stalls.
- **Existing alternatives:** build in-house, or buy a commercial design-system platform.
- **Trigger:** a mandate to consolidate design across product lines.
- **Desired outcome:** confidence the system will still be maintained in three years.
- **KinetixUI value:** unusually legible evidence — generated coverage, published verification fractions,
  provenance on releases, guardrails in CI.
- **Likely objection:** *"Can we rely on this?"*
- **Proof needed:** things we do not have yet — adoption, governance, a support story. We have engineering
  evidence and no users to point at.
- **Best entry point:** `/docs/platforms`.
- **Best CTA:** "Read the maturity assessment."

**Do not oversell to this persona.** The correct posture is an honest maturity picture and a token-only
suggestion. Claiming enterprise readiness we cannot support would cost more than the deal is worth, and
`CLAIMS.md` E3 prohibits it.

---

## C1 — Open-source contributor

- **Role:** engineer drawn by the machinery rather than the components.
- **Context:** looking for a project where the architecture is interesting and contributions are tractable.
- **Job to be done:** contribute something real without reverse-engineering an undocumented system.
- **Pain:** most design-system repositories are a components directory and little else to learn from.
- **Existing alternatives:** any of a thousand component libraries.
- **Trigger:** reading a build-in-public post about a guardrail that caught a real bug.
- **Desired outcome:** a merged contribution and something learned.
- **KinetixUI value:** manifest-driven architecture, generated artefacts, claim guards, five platforms — an
  unusually rich system to work on, with documented gaps that are genuine starting points.
- **Likely objection:** *"Will my PR sit unreviewed?"*
- **Proof needed:** `CONTRIBUTING`, the four-platform rule, `platformNote` exceptions as real openings.
- **Best entry point:** `CONTRIBUTING.md`, the documented exceptions, `/docs/contributing`.
- **Best CTA:** "See the documented gaps."

---

## Explicitly not the target right now

- **React-only teams.** shadcn/ui and Radix serve them better. Saying so builds more credibility than
  competing for them.
- **Anyone wanting a Figma UI kit.** We do not ship one.
- **Anyone needing support contracts, SLAs or paid tiers.** None exist; `CLAIMS.md` F2 prohibits implying
  otherwise.

## What changed from the previous version

The previous file ranked five ICPs A–E with four fields each. Three substantive changes:

1. **Two primaries, stated as a pair with distinct roles** — P1 evaluates the architecture, P2 feels the pain.
   The old file marked both A and D primary without explaining why two, which read as indecision.
2. **Full behavioural fields** — trigger, alternatives, objection, proof needed and CTA were missing, and
   those are the fields content actually gets written from.
3. **Two blocked personas named as blocked** — S4 on distribution, S5 on maturity signals. The old file listed
   enterprise teams among undifferentiated "secondary" audiences without recording *what* blocks them, which
   invited copy aimed at a persona we cannot currently serve.
