# Claim registry

**Canonical.** What KinetixUI may and may not assert in public, with the evidence behind each line.

If a claim is not in this file, it has not been cleared. If this file and a published surface disagree, the
surface is wrong — unless the *product* changed, in which case this file is wrong and the row's review
trigger tells you what to re-derive.

**Before quoting any number, run `pnpm marketing:stats`.** It prints every figure from generated sources and
refuses to guess. No number in this file is typed from memory, and where a figure would date the document the
source is named instead.

## Status meanings

| Status | Means |
| --- | --- |
| **APPROVED** | Say it. Evidence is in the repository and checked in CI |
| **APPROVED WITH QUALIFICATION** | Say it only with the stated qualifier attached. The qualifier is not optional and does not travel separately |
| **PENDING LIVE VERIFICATION** | True in source, not independently confirmed against the live production system. Usable internally and in engineering writing; **not** in acquisition copy that promises a reader an outcome |
| **INTERNAL ONLY** | Accurate, but not for public copy — usually because it invites a comparison we would lose or a promise we cannot keep |
| **PROHIBITED** | Do not write it in any form. Each row says what to write instead |

---

## A. Architecture

### A1 — Tokens are generated from one canonical source

- **Status:** APPROVED
- **Evidence:** `tokens/` DTCG source → Style Dictionary → `packages/tokens/dist/{web,ios,android,flutter}`;
  committed artefacts, regenerated in CI; `check:token-contract`, `check:swiftui-tokens`.
- **Approved wording:** "One DTCG token source generates every platform's native token output."
- **Forbidden interpretation:** that components are generated the same way. They are not. See A2.
- **Review trigger:** a platform is added to or removed from the token build.

### A2 — Components are hand-written per platform

- **Status:** APPROVED, and **mandatory** whenever A1 is stated in the same breath
- **Evidence:** five independent source trees, each compiled by its own CI workflow.
- **Approved wording:** "Components are implemented natively per platform against a shared contract."
- **Forbidden interpretation:** "one component source compiles everywhere", "write once, run everywhere",
  "single source of truth for components", or any phrasing where a reader could conclude components are
  transpiled or generated from one tree.
- **Review trigger:** any shared component-generation mechanism is introduced.

> **A1 and A2 are one claim in two halves.** Shipping the first without the second is the most attractive
> misrepresentation available to this project and the easiest for a competent engineer to catch.
> `marketing-claims.test.ts` fails the build on a transpilation implication for this reason.

### A3 — Native, not wrapped

- **Status:** APPROVED
- **Evidence:** SwiftUI views, Compose composables, Flutter widgets, Angular directives on native elements
  (`<button kxButton>`), React components. `check:angular-api`; the three native CI workflows.
- **Approved wording:** "Each platform's components are written in that platform's idiom."
- **Forbidden interpretation:** that a runtime bridge, web view or abstraction layer is involved. None is.
- **Review trigger:** any platform gains a wrapper-based implementation.

---

## B. Coverage and verification

### B1 — Cross-platform coverage is verified against source

- **Status:** APPROVED
- **Evidence:** `check:platform-source` fails when a component claims a platform whose source is absent;
  `check:block-source` and `check:platform-code` do the same for every snippet the site shows. Each shipped
  after catching a real false claim here.
- **Approved wording:** "Every platform claim is checked against real source in CI — a claim without source
  fails the build."
- **Forbidden interpretation:** that verification means *tested*. It means the implementation exists and the
  claim matches it. Test depth is B3.
- **Review trigger:** any of those three checks is weakened or removed.

### B2 — The catalogue count

- **Status:** APPROVED WITH QUALIFICATION
- **Evidence:** `pnpm marketing:stats` — 98 catalogue entries, of which one (`combobox`) is a documented
  recipe the manifest says is not a component.
- **Approved wording:** "98 catalogue entries — 97 components and one documented recipe." Or simply avoid the
  number; per `MESSAGING.md` the count is never the lead.
- **Forbidden interpretation:** "98 components". It overstates by one, and `marketing:stats` says so out loud.
- **Review trigger:** the manifest's entry count or recipe count changes.

### B3 — Verification depth is published, including where it is thin

- **Status:** APPROVED WITH QUALIFICATION
- **Evidence:** `verification.json` → `platform-parity.json` → `catalogueVerification`, printed by
  `marketing:stats` as fractions per platform per evidence type.
- **Approved wording:** quote the fraction from `marketing:stats` at time of writing. React is a stable
  package at beta verification; the three native libraries are stable packages at experimental verification.
- **Forbidden interpretation:** that a low verification level means the source does not run — it runs and its
  CI compiles it. Also forbidden: presenting a partial count as a tick.
- **Review trigger:** `verification.json` totals change.

### B4 — Package maturity, catalogue verification and distribution are three different questions

- **Status:** APPROVED, and structurally important
- **Evidence:** `platformDefinitions[].maturity`, `catalogueVerification`, `distribution.published` — three
  independent fields; `marketing:stats` prints them in three separate sections on purpose.
- **Approved wording:** name whichever one you mean, and only that one.
- **Forbidden interpretation:** any sentence where "stable" implies installable, or "published" implies
  verified. Every native port is `maturity: "stable"` and on no package registry simultaneously.
- **Review trigger:** any platform's distribution or maturity changes.

---

## C. Platform and distribution

### C1 — React

- **Status:** APPROVED — stable package, full catalogue, installable from npm.
- **Evidence:** `marketing:stats`; `@kinetixui/ui` on npm.
- **Approved wording:** "React: the full catalogue, installable from npm."
- **Qualification:** its catalogue verification is beta. Do not imply the deepest evidence tier.
- **Review trigger:** React's maturity or verification level moves.

### C2 — Angular

- **Status:** APPROVED WITH QUALIFICATION — **both halves always together**
- **Evidence:** `marketing:stats`; `@kinetixui/angular` on npm in its own release cohort;
  `catalogComplete: false`.
- **Approved wording:** "Angular is published on npm and in preview — a deliberate subset of the catalogue,
  versioned independently of the core packages."
- **Forbidden interpretation:** "full Angular support"; equally forbidden is implying it cannot be installed.
  It is installable *and* preview. Never place Angular in a parity denominator its product model excludes.
- **Review trigger:** `catalogComplete` flips, or the Angular subset count changes materially.

### C3 — SwiftUI, Jetpack Compose, Flutter

- **Status:** APPROVED WITH QUALIFICATION
- **Evidence:** `marketing:stats` — each a stable package at experimental verification, each **source you
  compile**, on no package registry. Their coordinates (Swift Package Manager, Maven Central, pub.dev) are
  recorded as intended channels, not as live listings.
- **Approved wording:** "SwiftUI, Jetpack Compose and Flutter implementations are real and compiled in their
  own CI — today they are source you build, not a registry install."
- **Forbidden interpretation:** any install command, dependency snippet or "add this to your Package.swift"
  for these. `current-truth.test.ts` fails the build on an install command for an undistributed library.
- **Review trigger:** any of the three is actually published.

### C4 — The IoT module

- **Status:** APPROVED WITH QUALIFICATION
- **Evidence:** `@kinetixui/iot` is on npm and releases on its own cohort; read its version from
  `marketing:stats`, never hard-code it.
- **Approved wording:** "`@kinetixui/iot` is a published React module of device-interface primitives —
  connectivity, telemetry staleness, fleet state."
- **Forbidden interpretation:** calling it a *platform* (it is a module, and the guard enforces this);
  claiming a native IoT port exists; claiming any protocol or transport is supported; counting its primitives
  or patterns in the component catalogue; or describing it as planned or unpublished.
- **Review trigger:** a native port, a transport integration, or a catalogue merge.

### C5 — Wearables

- **Status:** PROHIBITED
- **Evidence:** no implementation exists; `WEARABLES.md` records that nothing is built, and the manifest has
  no such platform definition.
- **Approved wording:** none. If asked directly, the honest answer is that nothing is built and there is no
  approved roadmap statement.
- **Forbidden interpretation:** "supported", "available", "shipping", "coming soon", "on the roadmap" — an
  unbuilt platform with an implied date is the same promise as a claim. `marketing-claims.test.ts` fails on
  all of these, in both word orders.
- **Review trigger:** a wearable implementation is actually started. The guard's premise test fails first and
  forces these rules to be revisited deliberately.

---

## D. Activation and installation

### D1 — One-command installation

- **Status:** **PENDING LIVE VERIFICATION**
- **Why not APPROVED:** the mechanism is correct in source and was confirmed against production once, on
  2026-09-29, from the repository owner's machine — `add card` installed `clsx` and `tailwind-merge` into a
  clean project using the unmodified published CLI. That is a single manual observation, not a repeatable
  check, and the agent environment cannot reach the live origin to re-run it. Until a repeatable production
  check exists, activation copy promises a reader an outcome we cannot continuously confirm.
- **Evidence:** `audits/PHASE-0.9.1-REGISTRY-FIX.md`; `check:registry-deps` in CI proves every registry item
  declares the npm packages its delivered files import.
- **Approved wording, internal and engineering writing:** "the CLI resolves an item's registry dependencies
  and installs the npm packages its delivered files import."
- **Forbidden interpretation:** headline copy of the form "one command and you're running" in acquisition
  surfaces, until this row is promoted.
- **Review trigger:** a repeatable production check lands — then promote to APPROVED and record the check.

> This row exists because of a real failure. Before Phase 0.9.1, 91 of 97 registry items shipped
> `lib/utils.ts` without declaring the two packages it imports, so the documented command exited 0 and left a
> project that could not build. The claim was false in production while being true-sounding everywhere else.
> That is exactly the failure mode this registry is for.

### D2 — Own the code

- **Status:** APPROVED
- **Evidence:** the shadcn-compatible registry served from the site; the CLI writes editable files into the
  consumer's repository.
- **Approved wording:** "Copy the component source into your project and edit it."
- **Forbidden interpretation:** that this is the only adoption model — the npm package and token-only paths
  are equally real.
- **Review trigger:** the registry or CLI delivery model changes.

### D3 — Token-only adoption

- **Status:** APPROVED
- **Evidence:** `@kinetixui/tokens` on npm; `KinetixMaterialTheme` / Cupertino adapters style stock widgets
  with no Kinetix component involved.
- **Approved wording:** "Adopt the token layer alone — stock widgets inherit it, no Kinetix component
  required."
- **Review trigger:** the adapters or the tokens package entry points change.

---

## E. Quality claims

### E1 — Accessibility

- **Status:** APPROVED WITH QUALIFICATION
- **Evidence:** `check:contrast` (WCAG AA) in CI; a real-browser axe pass over the site (19 pages × 2 themes
  × 4 widths) and a second over every Storybook story; per-platform accessibility evidence as fractions in
  `marketing:stats`.
- **Approved wording:** "Contrast is gated in CI and accessibility is checked in a real browser across the
  site and every Storybook story." For a platform, quote its fraction.
- **Forbidden interpretation:** "accessible" as a finished property, or "WCAG compliant" as a certification.
  Automated checks are evidence, not compliance — and the native platforms' accessibility fractions are low.
- **Review trigger:** the axe surface or any platform's accessibility fraction changes.

### E2 — Direction awareness / RTL

- **Status:** APPROVED WITH QUALIFICATION
- **Evidence:** `check:rtl` enforces logical properties on the React source; direction-aware behaviour
  evidence is published as fractions in `marketing:stats`, platform by platform, and they are uneven —
  Flutter is substantial, the others are single-digit component counts, and one has none at all.
- **Approved wording:** quote the fractions from `marketing:stats` at time of writing.
- **Forbidden interpretation:** "RTL support on every platform", or a platform list that silently includes
  one with no direction-aware evidence. `current-truth.test.ts` fails on both.
- **Review trigger:** `verification.json` rtl totals change.

### E3 — Production ready

- **Status:** PROHIBITED as a blanket claim
- **Evidence:** the three axes in B4 differ per platform; verification depth sits below package maturity by
  design; activation is D1.
- **Approved wording:** describe the specific property — "stable package", "compiled in CI", "published on
  npm" — for the specific platform.
- **Forbidden interpretation:** "KinetixUI is production ready" as an umbrella statement over five platforms
  with different maturity, verification and distribution.
- **Review trigger:** a deliberate decision to define and defend the term.

### E4 — Tree-shaking

- **Status:** PROHIBITED as a differentiator
- **Evidence:** `audits/TREE-SHAKING.md` — measured, not competitive at the package level. Per-component
  subpath exports were evaluated and deferred.
- **Approved wording:** none as a selling point. If asked, the audit is the answer.
- **Forbidden interpretation:** documentation that implies efficient per-component tree-shaking from
  `@kinetixui/ui`.
- **Review trigger:** subpath exports actually ship.

### E5 — Release integrity

- **Status:** APPROVED
- **Evidence:** npm provenance (SLSA) on published packages; `requireFiles` validated against the real packed
  tarball by `validatePackedArtifact`; Changesets cohorts in `release/publish-packages.json`.
- **Approved wording:** "Published packages carry npm provenance, and tarball contents are gated against the
  real packed artefact."
- **Review trigger:** provenance or the artefact gate changes.

### E6 — Marketing copy is itself under test

- **Status:** APPROVED, and a genuine differentiator
- **Evidence:** `marketing-claims.test.ts` and `current-truth.test.ts` read the website, the READMEs and this
  directory, failing CI on a stale platform list, a blanket parity claim, a transpilation implication, an
  install command for an unpublished package, or a wearable presented as real.
- **Approved wording:** "Our marketing claims are checked against the product in CI — including this one."
- **Forbidden interpretation:** that the guards make every sentence true. They catch known failure modes,
  several of which they caught here first.
- **Review trigger:** a guard is weakened, or a new claim class needs one.

---

## F. Adoption and commercial

### F1 — Users, adoption, downloads

- **Status:** PROHIBITED until real
- **Evidence:** none exists. There is no user base to cite.
- **Approved wording:** engineering proof only.
- **Forbidden interpretation:** invented testimonials, "trusted by", download-count narratives, or implied
  scale.
- **Review trigger:** genuine, attributable adoption.

### F2 — Paid tiers

- **Status:** PROHIBITED
- **Evidence:** nothing exists.
- **Forbidden interpretation:** "Pro", "coming soon", waitlists, or any teased commercial tier.
- **Review trigger:** a real decision to build one.

### F3 — Open source

- **Status:** APPROVED
- **Evidence:** MIT, in each package manifest.
- **Approved wording:** "MIT licensed."
- **Forbidden interpretation:** MIT as a differentiator — most of the category is too.

---

## G. Language to avoid

Banned regardless of subject, because they are unfalsifiable and cost credibility with the exact audience we
want: *game-changing · revolutionary · seamless · effortless · best-in-class · the future of · next
generation · powerful · blazing fast* · fake urgency · emoji-led headlines · any parity claim without a
number.

"Build faster" is not banned but is discouraged as a lead: it is what every library in the category claims
and none proves, and we have something better.

---

## How to add a claim

1. Derive it from row 1 or row 2 of the source-of-truth hierarchy in [`README.md`](./README.md).
2. Add a row here with all six fields — a claim without a review trigger goes stale silently.
3. If it is a claim class a guard could catch, add the guard. If a guard would be brittle or would prohibit
   legitimate evolution, say so in the row instead of writing the test.
4. Run `pnpm --filter @kinetixui/web test` before committing. The guards read this file.
