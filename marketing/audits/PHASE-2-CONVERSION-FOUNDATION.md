# Phase 2 — Conversion foundation

**Date:** 2026-09-29 · **Base:** `a9494f4` (Phase 1 reconciliation)

**Nothing was published, deployed, released or merged.** No component API changed, no package was published,
no campaign launched. Changes are to public copy, two homepage sections, the analytics vocabulary, and the
guards that hold them.

## What this phase found first

Before any conversion work, three live claim violations on the most public surfaces — all prohibited by
`marketing/CLAIMS.md`, all shipping:

| Surface | Text | Rule broken |
| --- | --- | --- |
| Homepage closer | *"Free today; advanced tooling arrives as **KinetixUI Pro**"* | **F2** — paid tiers |
| Docs landing | *"KinetixUI is **free while in beta**; deeper tooling will arrive as KinetixUI Pro"* | **F2** |
| Homepage hero eyebrow | *"Free while in beta"* | **F2** — the licence framed as temporarily free |
| Homepage spec panel | *"Runtime deps: **0**"* | **new E5b** — `@kinetixui/ui` declares ~50 |

The paid-tier problem matters more than it looks. The audience being asked to depend on this is deciding
whether the project will still be maintained and still be MIT in three years; a teased commercial tier
answers *"no, not all of it"* — for a product that does not exist and may never be built. It cost trust while
promising nothing.

**"Runtime deps: 0" was simply false.** `@kinetixui/ui` depends on Radix, `cva`, `clsx`, `tailwind-merge`,
`recharts`, `date-fns` and about forty-five others. The defensible claim — copy the source in and KinetixUI
is not a dependency of *your* app — is about lock-in, and it does not survive compression into a two-word
spec row. It was found by a guard strengthened during this phase, not by reading.

---

## BEFORE — conversion journeys

### A. P1 — design-system engineer

| | |
| --- | --- |
| Entry | Homepage |
| First message | *"One token architecture, in motion across every platform"* — mechanism-first, and "every platform" invites the parity reading the positioning rejects |
| Proof encountered | Flagship demo (strong, real source, four platforms); derived platform sentences; availability split |
| **Missing proof** | **Verification appeared nowhere.** The core position — *claims verified against source in CI* — was absent from the homepage entirely |
| CTA | "Get started" → `/docs` |
| Likely confusion | None fatal; this visitor is well served once they reach `/docs/platforms`, but nothing on the homepage sends them there as a priority |
| Dead end | Verification story only discoverable by already knowing to look |

### B. P2 — team shipping web and native

| | |
| --- | --- |
| Entry | Homepage |
| First message | Token architecture — a mechanism for a problem the page never names |
| **Likely confusion** | **Their problem is never stated.** Drift, divergence and duplicated maintenance appear nowhere above the fold. The page assumes the reader already believes token architecture is the answer |
| Proof encountered | Flagship demo, which does land for this audience |
| **Dead end** | **Adoption reads as all-or-nothing.** Three independent entry points exist in the product; none was presented. P2's stated objection — "we don't have time to adopt a design system" — went unanswered |
| CTA | "Get started" → `/docs`, the highest-friction option available |
| Activation path | Hero command block, correctly caveated |

### C. Contributor / evaluator

| | |
| --- | --- |
| Entry | GitHub README |
| First message | Token-architecture framing; verification mentioned in the third sentence |
| Proof | Good — availability split, coverage link, CI badge |
| Confusion | *"Free while in beta"* implied a licence change was coming |
| Dead end | None significant |

---

## AFTER — conversion journeys

### A. P1

Hero states the outcome, then mechanism, then evidence → **section 02 gives the verification argument with
the caught claims** → secondary CTA "See what each platform covers" → `/docs/platforms`. The architectural
proof now appears on the homepage instead of being reachable only by search.

### B. P2

Hero states the **drift problem in their words** before any architecture → flagship demo shows one interface
across platforms → **section 05 shows three independent entry points**, the first of which changes none of
their components → `/docs/tokens`. Verification is present as the reason to believe, not the headline.

### C. Contributor / evaluator

README first screen now leads with the canonical positioning and the verification clause, states the
tokens-versus-components distinction explicitly ("never one source converted into five"), and replaces the
licence hedge with a plain MIT statement.

---

## Changes by surface

### Homepage — `apps/web/src/app/page.tsx`

**1. Hero rewritten**
- **Problem:** headline was mechanism-first and said "every platform"; nothing named P2's problem.
- **Change:** canonical `MESSAGING.md` §E headline (platform count derived), then a sentence naming drift in
  the reader's words, then mechanism + verification as supporting text.
- **Why:** `STRATEGY.md` §7 puts Comprehension before Credibility; the old order asked for belief in an
  answer before naming the question.
- **ICP:** P2 primarily; P1 retained via the supporting line.
- **Claim source:** `MESSAGING.md` §E/§F; A1+A2 (tokens generated, components hand-written).
- **Metric:** hero CTA click-through; scroll depth to section 02.

**2. Primary CTA: "Get started" → "Explore components"**
- **Problem:** the primary action asked a visitor who did not yet know what this is to start reading docs —
  the highest-friction option, skipping two funnel stages.
- **Change:** primary → `/components`; secondary → `/docs/platforms`; "Get started" moved to the closer.
- **Why:** lowest-friction step that is *also* evidence. `PERSONAS.md` says P1 evaluates and P2 wants to see it.
- **Claim source:** `MESSAGING.md` §G/§H.
- **Metric:** `browse_components` vs `platform_coverage` split — the clearest early read on which ICP arrives.

**3. New section 02 — "Why you can believe the coverage table"**
- **Problem:** the core position was absent from the homepage.
- **Change:** four proof points, benefit first, naming the three false claims our own checks caught.
- **Why:** Credibility is the funnel's narrowest point and we have no users to point at.
- **ICP:** P1 (evaluation), P2 (reason to believe).
- **Claim source:** B1, E6.
- **Metric:** `view_verification` clicks; `/docs/platforms` arrivals from `homepage_verification`.

**4. New section 05 — adoption ladder**
- **Problem:** adoption read as all-or-nothing; P2's main objection unanswered.
- **Change:** three rungs — tokens, components, blocks — each a real capability with its own CTA.
- **Why:** the token-only path is the only entry in this category that fits a team with no design-system budget.
- **ICP:** P2.
- **Claim source:** D2, D3, and pillar B.
- **Metric:** `adopt_tokens` / `adopt_components` / `adopt_blocks` distribution.

**5. Spec panel corrected**
- **Problem:** "Components: 98" overstated by one (B2); "Runtime deps: 0" was false; "Version" implied one
  product version across five independently released packages.
- **Change:** derived `componentCount` (97) plus a derived "Documented recipes" row; runtime-deps row
  removed; "Core version" relabelled.
- **Claim source:** B2, new E5b, and the release-cohort rule in `marketing/README.md`.

**6. Paid-tier tease removed** — see *What this phase found first*.

### Docs entry — `apps/web/src/app/docs/page.mdx`

- Paid-tier sentence removed; *"one design system, identical everywhere"* replaced, since documented
  exceptions exist and "identical" contradicts them.
- **Added an evaluation path**: coverage → tokens → reference, separating evaluation from reference
  documentation by navigation rather than by duplicating pages.
- **D1 not promoted.** No activation promise was added anywhere.

### GitHub — `README.md`

First screen leads with canonical positioning and the drift problem, states "never one source converted into
five" explicitly, and replaces the licence hedge with MIT. The availability split and badges are untouched —
they were already right.

### Analytics — `apps/web/src/lib/analytics.ts`

Two sources (`homepage_verification`, `homepage_adoption`) and five CTA targets (`platform_coverage`,
`view_verification`, `adopt_tokens`, `adopt_components`, `adopt_blocks`). No new architecture, no new
dependency, no personal data: the existing closed-union vocabulary and sanitisation are unchanged.

`platform_coverage` is deliberately distinct from the existing `platform_availability` even though both land
on `/docs/platforms` — merging them would hide whether the coverage *button* pulls its weight.

### Claim enforcement — `marketing-claims.test.ts`, `homepage-truth.test.tsx`

- **New:** *"no paid tier is teased, because none exists"* — three assertions, including one proving the rule
  is not vacuous. A phrase search is normally the brittle kind; it is justified here because the prohibited
  thing *is* a phrase — a named future product — rather than a number that drifts.
- **Strengthened:** the SPEC numeric-literal rule now scopes to the SPEC array and forbids *any* quoted
  digit-only literal inside it, instead of banning three historical strings file-wide. The old form had
  started failing on `<SectionHead index="05">`, an ordinal that is not a fact. **The strengthened form is
  what found "Runtime deps: 0".**
- `marketing/CLAIMS.md`: new **E5b** (runtime dependencies and lock-in); **F2** records its enforcement.

---

## Two guards fired on this work, and both were right

1. **"keeps saying it is beta where it says anything about maturity"** — removing *"Free while in beta"* also
   removed the only place the product stated its stage. The eyebrow now reads *"Beta — every package is 0.x,
   MIT"*: stage kept, commercial hedge gone.
2. **The SPEC literal rule** — fired on a section ordinal, which taught nobody anything, and once scoped
   properly immediately caught a false claim that had been shipping.

---

## ICP experiment hook

**No A/B test was launched**, and none is justified at this traffic level. What exists is measurement
capability, built entirely on infrastructure already present:

- **Campaign attribution** — `analytics-attribution.ts` already keeps `utm_campaign` matching
  `/^kx_[a-z0-9][a-z0-9_-]{0,62}$/` and drops everything else. The convention for Phase 3 is `kx_p1_*` for
  architecture-led entry and `kx_p2_*` for drift-led entry, so campaign-level ICP attribution needs no code.
- **Section-level CTA events** — because the hero, verification and adoption sections each emit their own
  source, the question *"which narrative moved them?"* is answerable from existing event data rather than
  from opinion.
- **The adoption ladder is itself the cleanest ICP signal available**: `adopt_tokens` skews P2,
  `adopt_components` skews P1.

`STRATEGY.md` §13 unknown #1 — which primary ICP converts — stays open, which is correct. It is now
*measurable* instead of arguable.

---

## Validation

| Check | Result |
| --- | --- |
| `pnpm lint` · `typecheck` | PASS |
| `pnpm test` | **PASS — 1,087 web tests**, including both claim guards and the new paid-tier rule |
| `pnpm build:web` | PASS |
| `check:manifest` · `check:blocks` · `check:contrast` · `check:usage` | PASS |
| **`check:a11y-site` (real browser)** | **PASS — 21 pages × 2 themes × 4 widths = 168 views, no axe findings, no horizontal overflow** |
| Rendered-HTML probe | New sections present; `KinetixUI Pro`, `Runtime deps`, `Free while in beta` absent from shipped HTML |

**Accessibility and responsive behaviour were verified in a real browser**, against the production build
served locally, at 320/375/768/1280 in both themes — the new sections included. The run needed
`PLAYWRIGHT_CHROMIUM_PATH` pointed at the preinstalled browser; the script already supports that.

**No screenshots were captured.** `.github/assets/home.png` in the README is now out of date with the new
hero — recorded as deferred rather than silently left.

**No new dependency was added.** Both new sections use existing components and CSS utilities.

---

## Deferred

### PHASE 3 — MEASUREMENT
- Promote **D1** once a repeatable production check exists.
- Baseline the new events; answer ICP question #1 with data.
- Funnel dashboards for homepage → evaluation → activation.

### PHASE 4 — CONTENT ENGINE
- Re-map `content/backlog.json` to the Phase 1 pillar set (marked NEEDS UPDATE).
- Build pillar-A and pillar-G pieces from the caught-claims material.
- `/components` and `/blocks` conversion hierarchy: both were reviewed and are **already sound** — real
  manifest-driven data, progressive disclosure, no hand-maintained examples. Changing them for the sake of
  this phase would have been novelty, which the brief forbids.

### PHASE 5 — LAUNCH
- Refresh `.github/assets/home.png`.
- Repository description and topics (recommended in Phase 0.75, still unapplied — requires repo settings).
- Product Hunt and launch sequencing per `launches.md`.

### LATER PRODUCT WORK
- Native package distribution — the blocker for personas S4 and S5. A product decision with marketing
  consequences, not a copy problem.
- Per-component subpath exports (`audits/TREE-SHAKING.md`).
- `/blog` infrastructure — `seo.md` recommends waiting for three off-site articles first.

---

## Success criteria

| A new qualified visitor can answer | Where |
| --- | --- |
| What is KinetixUI? | Hero headline + supporting line |
| Why would my team care? | Hero drift sentence (P2); verification section (P1) |
| How is it different? | Section 02 |
| How does cross-platform actually work? | Hero supporting line + flagship demo + features ledger |
| What platforms are represented? | Derived platform sentences, availability split, ticker, `/docs/platforms` |
| What is verified? | Section 02 → `/docs/platforms` |
| Can I adopt incrementally? | Section 05 |
| Where can I inspect real examples? | Flagship demo, `/components`, `/blocks` |
| What should I do next? | Explore components → coverage → an adoption rung |
