# Phase 3 — Funnel, measurement and growth analytics

**Date:** 2026-09-29 · **Base:** `5a9afdd` (Phase 2 conversion foundation)

**Nothing was published, deployed or released.** No analytics vendor was changed, no architecture replaced,
no invasive tracking added. One instrumentation gap was closed; the rest of this phase is definitions.

The canonical specification now lives in [`../analytics.md`](../analytics.md). This report records what was
decided and why.

## The finding that shaped the phase

**The existing analytics is better than the brief assumed, with exactly one hole.**

`/blocks` had **no analytics source at all**. `Showcase` — the component behind both `/blocks` and
`/charts` — emitted nothing: no source, no platform switch, no copy. Phase 2 had added an `adopt_blocks`
CTA pointing at that page, so we could watch people reach for the third rung of the adoption ladder and then
see nothing they did when they got there. On a single-page gallery, `$pageview` cannot say which composition
held anyone's attention.

Everything else the funnel needs already existed. That is why this phase changed five files and not fifty.

---

## Canonical funnel

| Stage | Qualifying signal | Primary metric |
| --- | --- | --- |
| **Awareness** | Attribution only (`kx_source`, `kx_campaign`) | Attributed sessions |
| **Discovery** | `$pageview` + session entry | Sessions with ≥1 semantic event |
| **Evaluation** | **Qualified Evaluation** | **Qualified Evaluation Rate** |
| **Adoption intent** | **Adoption Intent** | Adoption Intent Rate · Evaluation → Intent Progression |
| **Activation** | **Not measurable on-site** | — |

Discovery is deliberately weak — context for the stages that matter. Full definitions, exclusions and the
decision each metric informs are in `analytics.md` §1.

## Primary early-stage metric

**Qualified Evaluation Rate** — of sessions that arrive, the share that inspect the product rather than the
pitch.

Chosen because we have no users, no baseline and no revenue, so every mature north-star is unavailable and
any traffic-based number would reward the wrong work. It is computable from events that already exist, and a
successful social post alone cannot inflate it.

**It gets replaced** when D1 is promoted and a repeatable activation signal exists. Then activation becomes
the metric and this becomes a diagnostic.

## Qualified Evaluation

> A session in which someone inspects the product itself.

Any **one** of: `component_viewed` · `component_code_copied` · `block_code_copied` · `platform_selected` ·
`cta_clicked` → `platform_coverage` / `platform_availability` / `view_verification` · `installation_viewed`.

**One signal is enough, deliberately.** Requiring two or three would look more rigorous and would mostly
measure patience. Someone who opens `/components`, finds nothing for them and leaves has still evaluated —
and that belongs in the denominator of everything else.

**Excluded:** homepage pageview, scroll depth, time on page, `external_link_clicked`, `changelog_viewed`,
and every `preset_*` event from `/create` — a theming toy, not product evaluation.

**Derived in PostHog, not emitted.** A `qualified_evaluation` event would be a second source of truth
capable of disagreeing with its own inputs.

## Adoption Intent

> A session in which someone looks at *how to adopt*.

`installation_viewed` · `install_command_copied` · `cli_command_copied` · `cta_clicked` → `adopt_tokens` /
`adopt_components` / `adopt_blocks`.

Kept separate from activation on purpose. It is the strongest on-site signal available and stops well short
of the claim.

**It does not require evaluation** — the signal list is the whole definition — which is why `analytics.md` §4
carries two measures rather than one: **Adoption Intent Rate** (÷ eligible arriving sessions, a share of
arrivals) and **Evaluation → Intent Progression** (÷ Qualified Evaluation sessions, intent after or within
the evaluation — the conversion). Dividing Adoption Intent by Qualified Evaluation is neither, and can
exceed 100%.

## Activation limitation

**Activation is not measurable from this website, and is not reported.**

A docs visit is not an installation. A copied command is not an installation — the clipboard is where our
knowledge ends. A `/docs/cli` visit is not activation. `CLAIMS.md` **D1** is **PENDING LIVE VERIFICATION**,
and no metric name may quietly promote it.

Honest answer to *"how many people installed it?"* → **we do not know.** What would change that: npm
download statistics (coarse, no session join), registry-side request counts for `/r/*.json` (server-side,
own privacy review), or opt-in CLI telemetry (which we have no intention of adding). None in this phase.

## KPI hierarchy

**Tier 1 (5):** Qualified Evaluation Rate · Adoption Intent Rate · Evaluation → Intent Progression ·
Content → Qualified Evaluation · Returning evaluators. All **NO BASELINE**.

**Tier 2:** platform interest · component interest · block interest · adoption-rung split · CTA progression ·
docs progression · code-copy behaviour.

**Tier 3 (context, never the scorecard):** sessions · pageviews · referrers · attribution source/medium.

## Attribution model

**Verified from implementation**, not from Phase 2's claim about it: `analytics-attribution.ts` enforces
`utm_campaign` matching `/^kx_[a-z0-9][a-z0-9_-]{0,62}$/` and **drops anything unrecognised** rather than
guessing. Phase 2's statement that `kx_p1_*` / `kx_p2_*` already attribute through existing code is correct.

Canonical campaign name: **`kx_<icp>_<pillar>_<asset>`** — e.g. `kx_p2_b_token_only_flutter`. ICP is
`p1` / `p2` / `neutral`; pillar is the letter from `CONTENT-PILLARS.md`. Channel travels in `utm_source`,
format in `utm_medium`, variant in `utm_content`. No URL shortener, no marketing platform, no new code.

## ICP measurement method

**Attribution indicates message intent, not identity.** A `kx_p1_*` session means someone arrived through
architecture-led messaging. It does **not** mean they are a design-system engineer — we hold no identity data
and are collecting none.

Compare P1- and P2-attributed sessions on Qualified Evaluation Rate, Adoption Intent Rate, ladder rung,
platform interest and verification engagement. The honest sentence is *"P2-attributed sessions evaluate at a
higher rate"*, never *"P2 is our ICP"*.

**No winner is declared.** `STRATEGY.md` §13 unknown #1 stays open until the evidence rules below are met.

## Event changes

| Change | File |
| --- | --- |
| `blocks_gallery` source | `analytics.ts` |
| `block` property (+ allowlist) | `analytics.ts` |
| `block_code_copied` event — `block` and `platform` both required | `analytics.ts` |
| `platform_selected` gains optional `block` | `analytics.ts` |
| `/blocks` → `blocks_gallery` | `analytics-surfaces.ts` |
| `analyticsPlatformFor()` — maps **and validates** | `analytics-surfaces.ts` |
| `Showcase` instrumented, opt-in via `analyticsBlock` | `showcase.tsx` |
| Gallery passes its slug | `blocks-content.tsx` |

**No renames.** Historical continuity matters more than tidiness.

Three design decisions worth recording:

1. **`block` is its own property**, not a reuse of `component`. A block is a composition of catalogue
   components; folding them together would inflate `component_*` with a different kind of thing — the same
   reasoning that kept IoT examples out of `component_code_copied`.
2. **Instrumentation is opt-in.** `Showcase` is shared with `/charts`, where an example is not a block.
   No slug, no events. The test asserting that silence is the most important one in the file.
3. **The platform mapper validates membership.** A future manifest platform whose name does not map produces
   *no* dimension rather than an unvalidated string in the event stream. Silence is the safe failure; an
   invented dimension is not.

**Vocabulary audit:** no duplicates, no event without a decision it supports, no documented-but-unemitted
event, no emitted-but-undocumented event. `button_clicked` appears in the repository only as a test fixture —
checked rather than assumed, and worth stating because a grep of emitted events initially suggested otherwise.

## Dashboard

**11 insights**, specified in `analytics.md` §11 with event, breakdown, range and the question each answers.
Manual creation in PostHog: the repository has no dashboard-as-code convention, and inventing one for eleven
insights would be its own maintenance burden.

Three flexible-step funnels: homepage → evaluation → intent; campaign → evaluation; coverage → component.
Flexible because these are not journeys anyone must take in order.

Component and block interest are deliberately **not** dashboard insights — long-tail lists, better queried
when a question arises than watched weekly.

## Baseline policy

**Every Tier 1 KPI is NO BASELINE.**

Baseline window: **the first 6 weeks of real distribution, or 300 sessions with ≥30 qualified evaluations,
whichever is later.** Sample size overrides the calendar in both directions. Until then, absolute counts
only — never a percentage change.

**No targets set.** "Increase conversion 20%" against no baseline is a number invented to be met.

## Decision rules

| Evidence | Action |
| --- | --- |
| Under ~30 qualified evaluations in a comparison | **KEEP** — noise |
| A directional gap across 2+ review cycles | **INVESTIGATE** |
| A mechanism plus a repeated pattern | **TEST** |
| A tested change that holds, or qualitative agreement | **CHANGE** |

Never: change positioning from a handful of sessions · declare a P1/P2 winner from click-through · optimise
to pageviews · run an A/B test at this traffic level. The infrastructure exists; the traffic does not, and an
underpowered test produces confident nonsense.

## Validation

| Check | Result |
| --- | --- |
| `lint` · `typecheck` · `build:web` · `check:usage` | PASS |
| `pnpm test` | **PASS — 1,097 web tests** (1,092 + 5 emission tests) |
| Emission verified | `showcase.analytics.test.tsx` asserts the real component fires `platform_selected` and `block_code_copied` with the right properties, emits nothing on render, stays silent without a slug, and never lets the copied source into a property |
| Guard mutation test | Removing the membership check from `analyticsPlatformFor` fails exactly 2 tests; restored |
| Privacy | Every new property is a manifest slug or a closed-vocabulary value; `sanitizeProps` asserted over every emitted call |

**PostHog production delivery is not verified.** These are repository facts — the code emits what it says it
emits. Whether events arrive in a PostHog project is a separate fact requiring production, and this
environment cannot reach it.

## What we can answer now

1. Where qualified visitors come from — `kx_source`, `kx_campaign`.
2. Which message attracts them — campaign prefix, and which hero CTA earns the click.
3. Which ICP hypothesis looks stronger — **directionally, once traffic exists**, never as identity.
4. Whether visitors move from discovery to evaluation — Qualified Evaluation Rate.
5. Which proof creates deeper evaluation — `view_verification` and `platform_coverage` against downstream QE.
6. Which platforms receive interest — `platform_selected` by platform, now including blocks.
7. Which components and blocks attract evaluation — `component_viewed`, `block_code_copied`.
8. Whether visitors reach adoption documentation — Adoption Intent Rate; and whether evaluation leads there
   — Evaluation → Intent Progression.
9. Where the funnel loses people — the three funnels.
10. Whether content creates product evaluation — Content → Qualified Evaluation.

## What we cannot answer yet

- **Whether anyone installed anything.** Not measurable on-site; see the activation boundary.
- **Whether P1 or P2 converts better.** No traffic. The mechanism exists; the data does not.
- **Who our visitors actually are.** Attribution is message intent, not identity, and we collect none.
- **Whether IoT interest is distinguishable** beyond `iot_page` — IoT is deliberately not in
  `ANALYTICS_PLATFORMS`, being a module rather than a platform. Left alone rather than bent to fit.
- **Returning evaluators, accurately.** PostHog's anonymous ID supports it with no new tracking, but cleared
  cookies and multiple devices undercount and we will never know by how much. Directional only.
- **Anything about production event delivery.** Repository correctness and PostHog receipt are separate facts.

## Deferred

**PHASE 4 — content engine:** build the dashboard in PostHog; produce pillar-A and pillar-G pieces with
`kx_*` campaign links; re-map `content/backlog.json` to the Phase 1 pillars.

**PHASE 5 — launch:** establish the baseline during the first distribution period; first Tier 1 rates.

**LATER:** activation measurement (needs a product decision, not a marketing one); `/create` funnel, left
out because theming is not product evaluation and folding it in would flatter the numbers.
