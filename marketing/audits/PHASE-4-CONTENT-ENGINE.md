# Phase 4 — 30-day content and acquisition engine

**Date:** 2026-09-29 · **Base:** `27b1bc6` (Phase 3 funnel measurement)

**Nothing was published.** No post, no article, no community contribution, no visual asset produced, no
deploy, no release. This phase produced finished copy and the machinery to keep it honest.

## Channel priorities

| Channel | Role | Why |
| --- | --- | --- |
| **LinkedIn** | **PRIMARY** | Where design-system and engineering-leadership conversation actually happens, and the only channel where a 250-word architecture argument gets read. Serves P1 and P2 |
| **Long-form off-site (dev.to)** | **PRIMARY** | The only format with room for the token-pipeline and verification arguments in full, and the source most other assets derive from. `seo.md` says no `/blog` until three articles have run off-site |
| **X** | **SECONDARY** | Good for one sharp observation and for threads that earn replies. Weak for nuance, and nuance is most of our position |
| **GitHub** | **SECONDARY — conversion, not feed** | Where an interested reader goes to check whether we are serious. Not a place to post |
| **Communities** (r/FlutterDev, r/androiddev, r/swift, design-system Slack/Discord, HN comments) | **EXPERIMENTAL** | Highest-quality audience, highest risk of getting it wrong. Value-first, rules-gated, opportunistic |
| **Reddit self-promotion threads** | **NOT NOW** | Audience is other builders, format rewards screenshots over substance |
| **Product Hunt** | **NOT NOW** | Launch surface. `launches.md`, Phase 5 |
| **Video / YouTube** | **NOT NOW** | Production cost per asset is wrong for month one |
| **Newsletter** | **NOT NOW** | Nothing to send it to, and no list is worth building before there is traffic |

No account gets created because a channel exists.

## 30-day cadence

**20 scheduled assets across 30 days** — 2–3 original assets a week plus repurposing, not five posts a day.
Deliberately under a template calendar's suggestion: this is one person who also maintains the product, and
a month of thin posts costs more credibility than a month of silence.

| Week | Theme | Rationale |
| --- | --- | --- |
| 1 | **Problem recognition** | Nobody evaluates a solution to an unnamed problem. Runs the P1/P2 pair |
| 2 | **Architecture** | Mechanism, once the problem has a name |
| 3 | **Proof** | Caught claims, fractions instead of ticks, the bug and its structural fix |
| 4 | **Adoption and invitation** | Only now is a next step reasonable |

Full table with day offsets, hooks, CTAs and destinations: [`../content/calendar.md`](../content/calendar.md).

## Content mix

Problem content (drift, the token boundary) · educational (DTCG, primitive/semantic layering, generation per
platform) · build-in-public (the registry defect, the caught parity claims, the reporting decision) · proof
(coverage table, real source, the catalogue) · engineering principle (why components are not generated from
one source; why a partial count is not a tick) · product discovery (the adoption ladder).

**No feature announcements.** Not one asset in the month is "we shipped X".

## Content families (6)

| Family | Spine | Derived | Idea |
| --- | --- | --- | --- |
| **F1 drift** | LI-003 | X-005, VIS-001, COM-002 | Drift is a mechanism problem, not a discipline problem |
| **F2 tokens** | **ART-002** | LI-005, X-004, X-010, LI-009, VIS-003, COM-001 | Tokens stop at the web boundary; crossing it is a build step |
| **F3 parity** | **ART-001** | LI-001, LI-002, X-001, LI-010, X-002, COM-002 | A platform claim is free to write and expensive to verify |
| **F4 registry** | LI-006 | X-006, VIS-004, COM-003 | A hand-maintained list cannot fail, only be incomplete |
| **F5 evidence** | LI-008 | X-007, VIS-006, COM-004 | A partial count is not a tick |
| **F6 trades** | LI-007 | X-008, VIS-005 | Runtime vs native implementations is a trade, not a winner |

Each channel version is **adapted, not truncated**. The X assets are written for X; none is a shortened
LinkedIn post.

## P1 / P2 experiment

**The cleanest comparison is week 1:** LI-003 (P2, drift-led — *"Six months later, they don't"*) against
LI-004 (P1, architecture-led — the manifest and the check that reads it back). Same week, 48 hours apart, no
cross-linking, different campaigns, same downstream destination.

Two further contrasts run across the month: F2 (P2-targeted, token boundary) against F3 (P1-targeted, parity
verification), and F1's drift framing against F5's evidence framing.

**A limitation worth stating plainly:** the month is P1-skewed — 15 P1 assets to 8 P2 and 4 neutral. That is
*inherited*, not chosen: two finished campaign packages already existed as P1 material, and regenerating them
as P2 to balance a table would have been waste. It weakens the month-one comparison and the week-1 pair is
the part to trust.

Measurement is by campaign, and campaign is **one per idea** with `utm_content` identifying the asset — so
reporting shows which *argument* worked rather than which button. Attribution indicates message intent, never
identity (`analytics.md` §9).

## Finished assets

| Type | Count | Where |
| --- | --- | --- |
| LinkedIn posts | **10** finished | 7 new in `content/linkedin.md`, 3 existing in `drafts/a01`, `drafts/a02` |
| X assets | **11** finished | 9 new in `content/x.md`, 2 existing threads |
| Articles | **2** fully drafted | ART-002 new (~1,500 words), ART-001 existing |
| Community briefs | **4** | `content/community-briefs.md` |
| Visual briefs | **7** | `content/visual-briefs.md` (+2 existing) |
| **Total registered** | **27** | `content/register.json` |

**By ICP:** P1 15 · P2 8 · NEUTRAL 4. **By pillar:** A 10 · B 6 · C 3 · D 3 · G 3 · F 2.
**By stage:** awareness 12 · evaluation 13 · adoption intent 2.

**Pillar E (device interfaces) is deliberately absent** — narrow audience, and forcing it in would cost a
stronger asset its slot.

## First week — execution-ready

Days 1–6 have final copy, CTA, destination, attributed URL, visual brief and publishing notes. Nothing is a
TODO.

| Day | Asset | What |
| --- | --- | --- |
| 1 | LI-003 | P2 drift post → `/docs/platforms` · `kx_p2_a_drift` · VIS-001 |
| 2 | X-005 | Drift is not discipline · same campaign |
| 4 | LI-004 | P1 manifest post → `/docs/platforms` · `kx_p1_c_manifest` · VIS-002 |
| 6 | X-003 | No source, no claim · same campaign |

Plus COM-002 whenever a real thread appears. **A post ships without its visual rather than late** — none of
them depends on an image to make sense.

## Long-form plan

**ART-002 — *Your design tokens stop at the web boundary*** (new, full draft, ~1,500 words). Pillar B, P2.
Chosen because `seo.md` ranks the native-token cluster as the highest-opportunity, least-served search intent
we have, and because it stands alone: the primitive/semantic argument and the theme-adapter pattern are
useful with every KinetixUI reference removed. Two further concepts are recorded but **not** drafted —
verification architecture (pillar C) and the device-interface story (pillar E) — because four articles in
thirty days from one person is a fiction.

**ART-001** is reused as-is. Its argument holds, its 48 evidence assertions pass, and rewriting it to look
new would be waste.

## Community plan

Four briefs, each written to be worth reading with every link removed. Standing rules: answer the question
asked, useful content in the comment, disclose the bias, a link only as the shortest path to something
specifically requested, never the same idea in three communities in one week.

> **RULES REQUIRE LIVE CHECK.** No community rule is quoted or assumed anywhere in this phase — this
> environment has no network access to read them. Several of these communities prohibit self-promotion
> outright. **Assume promotion is not allowed until the rules say otherwise.**

## Visual requirements

Seven briefs, production order VIS-003 → VIS-001 → VIS-006 → VIS-004/002 → VIS-007/005. Nothing produced:
the repository has no reliable automated visual generation, so generating images here would mean hand-made
assets that drift from the product. One brief (VIS-001) is explicitly labelled a **constructed
illustration** rather than a screenshot of a real broken app, because that is what it is.

## GitHub work before traffic

| Priority | Item | Note |
| --- | --- | --- |
| **REQUIRED BEFORE TRAFFIC** | Repository description and topics | Recommended in Phase 0.75, still unapplied. Wording in `MESSAGING.md` §I. **Requires repo settings — not changed from this phase** |
| **REQUIRED** | Refresh `.github/assets/home.png` | Stale since the Phase 2 hero change. The README's first image is currently the old homepage |
| **USEFUL** | Social preview image | Feeds every shared link |
| **USEFUL** | Enable Discussions | A place for the questions these posts will produce |
| **LATER** | The three missing GitHub Releases | Phase 0.75 identified them; not blocking traffic |

**No GitHub settings were modified**, and no commit was manufactured for visibility.

## Attribution coverage

**23 of 23 linkable assets attributed. 10 campaigns for 23 assets** — one per idea, `utm_content` per asset.
Community briefs carry **no** tracked link deliberately: dropping a tagged URL into someone else's thread is
the instinct this project should not have.

## Validation

`pnpm check:content` (new) asserts: every asset has an ID, a file that exists, an ICP, a pillar, a funnel
stage; every linkable asset has a destination, a campaign and a built URL; every campaign matches **the
runtime's own regex** from `analytics-attribution.ts` *and* the `kx_<icp>_<pillar>_<asset>` convention; the
campaign's ICP and pillar agree with the asset's; every `derived_from` and `visual` resolves; families
reference real assets; no asset file names a version outside a provenance line.

| Check | Result |
| --- | --- |
| `pnpm check:content` | **PASS** — 27 assets, 23 linkable all attributed, 6 families, 7 visual briefs |
| `lint` · `typecheck` · `build:web` | PASS |
| `pnpm test` | PASS — **1,097 web tests** |
| `pnpm test:release` | PASS |
| a01 / a02 `verify-package.mjs` | PASS after the campaign migration |
| Mutation test | Malformed campaign → caught with *"would be DROPPED by analytics-attribution.ts"*; restored |

### Three things the checks caught in my own work

1. **The register invented campaign names the files did not have.** Every other check passed. A register
   that agrees only with itself is a second source of truth wearing a validator — so the check now verifies
   the campaign appears in the asset's own file, or across its package for multi-file campaigns.
2. **An ICP misclassification:** ART-002's campaign said `p2` while the register said neutral. Its own
   frontmatter says P2 primary; the register was wrong.
3. **A Phase 3 typecheck error, shipped.** `showcase.analytics.test.tsx` was created *after* that phase's
   typecheck run, so `tsc` never saw it — `Showcase` requires `children` and five usages omitted it. Vitest
   passed because vitest does not typecheck. Fixed here, and worth recording as a process failure rather than
   a code one: running the gate before writing the last file is not running the gate.

## Claim safety

Every asset was written against `CLAIMS.md`. Specifically: no install command for SwiftUI/Compose/Flutter
(C3); Angular not described anywhere this month; IoT absent; no "production ready"; no tree-shaking claim; no
accessibility claim beyond the contrast gate and the browser axe pass; **no activation promise anywhere** —
D1 remains PENDING LIVE VERIFICATION, and no asset says "start building now" or equivalent; no invented
users, counts, testimonials or benchmarks; no wearables.

The tokens-generated / components-hand-written distinction is stated explicitly in ART-002, LI-005, LI-007,
X-008 and the README — never blurred.

## Manual actions before Day 1

1. **Set the repository description and topics** (wording in `MESSAGING.md` §I). Requires repo settings.
2. **Refresh `.github/assets/home.png`** — currently the pre-Phase-2 homepage.
3. **Build the PostHog dashboard** — 11 insights, spec in `analytics.md` §11. Without it the month produces
   data nobody reads.
4. **Read the current rules** for every community in `community-briefs.md`.
5. **Re-run `pnpm marketing:stats`** and re-check every number in the assets being published that week.
6. Decide the start date. Day 1 is assumed to be a Tuesday.

## Risks

- **P1 skew** weakens the month-one ICP comparison. Mitigated by the week-1 pair; not solved.
- **One-person cadence.** Twenty assets is realistic only if the product does not need an emergency. The
  calendar is deliberately slack enough to lose a week without collapsing.
- **Community channels can reject this outright.** Rules are unread from here; the briefs assume refusal.
- **No baseline.** Everything in month one is absolute counts (`analytics.md` §10). The temptation to read a
  rate from forty sessions is the main analytical risk of Phase 5.
- **Visuals could become the bottleneck.** Explicitly mitigated: a post ships without its image.
- **The strongest asset is a bug report.** The registry-defect story is the best material here, and it
  depends on being told plainly rather than dramatised. Told badly it reads as instability.
