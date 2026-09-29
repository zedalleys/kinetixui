# Launches

**Supporting document.** Launch staging, the launch model, and Product Hunt. Distribution mechanics are in
[`distribution/README.md`](./distribution/README.md); the 30-day schedule is
[`content/calendar.md`](./content/calendar.md). Nothing here is scheduled and nothing has been launched.

A launch is a sequence, not a day. Each stage has an entry criterion that is a fact, not a feeling.

---

## The launch model: ROLLING

**KinetixUI needs a rolling launch now, and keeps the option of one concentrated moment later.** Both, in
that order — never a single big launch first.

**Why rolling.** The reasoning is specific, not a preference:

1. **There is no baseline.** Every Tier 1 KPI is `NO BASELINE` until `analytics.md` §10's window closes. A
   concentrated spike into an unmeasured funnel produces a number we cannot interpret and cannot repeat.
2. **Credibility is the narrowest point in the funnel, not discovery** (`STRATEGY.md` §7). A spike is a
   discovery instrument. It widens the part that is already widest.
3. **A big launch is spent once.** Product Hunt and Hacker News give a project roughly one good first
   impression each. Spending either before we know which argument lands wastes the asset we cannot re-buy.
4. **The content is built for rolling.** Twenty-seven finished assets across thirty days, four weekly themes,
   two ICP hypotheses under comparison. That is a publishing programme, and a launch day would compress the
   experiment into a single unreadable data point.
5. **Activation is not verified.** `CLAIMS.md` **D1** is `PENDING LIVE VERIFICATION`. Driving a thousand
   people at an install path whose reliability we have confirmed **once**, manually, is the wrong risk.
6. **One person.** A launch day needs someone available all day to answer. That is affordable once, and it
   should be spent on a day that matters.

**No urgency is manufactured.** There is no deadline, no countdown, no *"launching soon"*. Nothing about this
product gets worse if the first post is next month.

### What a rolling launch actually is

The four weeks in `content/calendar.md`, distributed per `distribution/first-14-days.md`, reviewed weekly.
Discovery accumulates instead of spiking. The measurement stays legible because only one thing changes at a
time.

### The prerequisite signal for a concentrated launch

A **BIG** moment becomes justified when **all four** hold. Not three.

| # | Signal | Why this one | State today |
| --- | --- | --- | --- |
| 1 | **A baseline exists** — `analytics.md` §10's window closed: 6 weeks of real distribution, or 300 sessions with ≥30 qualified evaluations, whichever is later | Without it, the spike cannot be read as better or worse than anything | **NOT MET.** Nothing published |
| 2 | **D1 cleared** — a repeatable activation check against production, not one manual observation | A launch drives people at the install path. It has to be known-good, not known-good-once | **NOT MET.** `PENDING LIVE VERIFICATION` |
| 3 | **Community feedback incorporated** — at least one objection from a real reader has changed the copy or the docs | Proof the pitch survived contact. A launch is where the unfixed objection gets asked in public | **NOT MET** |
| 4 | **A genuine milestone** — Angular out of preview, or blocks verified on all five platforms, or 1.0 | A launch needs a reason a stranger recognises. *"We exist"* is not one | **NOT MET** |

**All four are currently unmet, which is the answer:** rolling now, and the question reopens when they are
met rather than on a date.

---

## Stage 1 — Technical peers · **READY NOW**

**Goal:** find the holes in the pitch before strangers do.

- **Where:** personal networks, a handful of design-system engineers, one or two framework Discords.
- **Ask:** *"does the cross-platform claim read as credible, and what would you check first?"*
- **Entry criteria:** ✅ **all met** — the site is live, every npm package is published, every displayed
  snippet is verified, coverage is derived.

The `distribution/outreach.md` T1 and T2 templates exist for exactly this, and are unsent.

## Stage 2 — Design-system and frontend communities

**Goal:** first real inbound from the target ICP. **This is the rolling launch**, and it is what
`content/calendar.md` schedules.

- **Where:** LinkedIn, X, dev.to, design-system communities.
- **Content:** the parity-verification article, the token-boundary article, the generated visual proof.

| Entry criterion | State, verified 2026-09-29 |
| --- | --- |
| 2 long-form articles **published** | **NOT MET** — two are finished drafts (ART-001, ART-002). Finished is not published |
| `/docs/platforms` reads clearly to someone with no context | **UNVERIFIED** — a judgement nobody outside has made. Stage 1 is how it gets made |
| A 30-second demo exists | **NOT MET** — three motion shot lists are written and **none is produced** (`content/motion-briefs.md`) |
| The homepage CTA path works on mobile | **NEEDS RE-CHECK** on the current hero. Phase 5's screenshot was captured at 1440×900 and says nothing about 390px |

**Stage 2 is not blocked on all four.** The articles publish on days 8 and 15, which satisfies the first by
itself; the demo is optional and explicitly not a dependency — *a post ships without its visual rather than
late*. The mobile check is small and should happen before day 1.

## Stage 3 — Broader open-source launch

**Goal:** sustained discovery.

- **Where:** framework subreddits (with genuine contribution first), dev.to, X.

| Entry criterion | State |
| --- | --- |
| ≥ 4 weeks of consistent publishing | **NOT MET** — week 0 |
| At least one landing page from `seo.md` shipped and indexed | **NOT MET** — none built. `/design-tokens/flutter` is ranked first |
| Activation events show a real funnel, not just traffic | **NOT MET**, and note the wording: `analytics.md` §5 is explicit that **activation is not measurable on-site**. What this criterion can honestly require is a real *Adoption Intent* funnel — the strongest on-site signal that exists |
| Angular either deeper or clearly framed as preview everywhere | ✅ **MET.** Published **and** preview travel together on every surface, and `current-truth.test.ts` fails the build if they separate |

Stage 3 is also the trigger for **outreach** (`distribution/outreach.md`) — two published articles plus four
weeks of consistent publishing.

## Stage 4 — Milestone launch (Product Hunt / Hacker News)

**Goal:** one concentrated spike, spent well. This is the **BIG** moment, and its gate is the four signals
above.

| Entry criterion — all of | State |
| --- | --- |
| A genuine milestone | **NOT MET** |
| Demo video, not just screenshots | **NOT MET** |
| Docs answer the top 10 objections | Partly — `MESSAGING.md` §4 has the objection system; the docs do not mirror it |
| Someone other than the maintainer has shipped with it | **NOT MET.** No users exist and none is invented |
| The maintainer is available for a full day | A scheduling fact, decided then |

**Do not launch on Product Hunt before Stage 3 works.** A spike into a funnel that does not convert wastes
the one launch you get.

---

## Product Hunt: **AFTER BASELINE**

Classified against ICP, product maturity, proof readiness and expected learning value — not against
convention.

| Criterion | Assessment |
| --- | --- |
| **ICP fit** | **Weak–moderate.** P1 is a design-system engineer who finds libraries through engineering content, a colleague, or a search — not a launch feed. Product Hunt's audience skews founders and product people, who are S2-adjacent at best |
| **Product maturity** | **Adequate but uneven, and the unevenness is the point.** Every package is `0.x`, Angular is preview, three platforms are source-only, verification sits below package maturity. All of that is honest and none of it is a launch-day story — a launch audience reads a caveat as a defect |
| **Proof readiness** | **Good, and the strongest argument for eventually going.** The visual kit exists, the coverage table is derived, the caught-claims story is real. `MESSAGING.md` §M is written |
| **Expected learning value** | **Low right now, high later.** With no baseline, a spike teaches us that a spike happened. After a baseline, the same spike is measurable against something |
| **Cost of going early** | **High and irreversible.** One good first impression, and it lands on an unconverted funnel while D1 is unverified |

**Verdict: AFTER BASELINE.** Specifically after signals 1, 2 and 3 of the prerequisite set; signal 4 (a
milestone) is what makes it worth doing rather than merely safe.

**Hacker News is the same call with a different shape.** HN *comments* on relevant threads are in scope now
and `community.md` classifies them MEDIUM FIT. An HN **submission** is Stage 4. Two stories are viable, at
most, in the next quarter:

1. *How we verify cross-platform parity against source* — engineering depth.
2. A genuine milestone launch.

Anything less is a wasted first impression. **Note the attribution gap:** `hackernews` is not in
`ATTRIBUTION_SOURCES`, so HN traffic classifies as `other`. If an HN submission is ever tagged, add the
source then — `distribution/README.md` §5.

**Not a priority at all:** Betalist, launch-aggregator directories, "top 10 design systems" listicles. They
produce impressions and no evaluation.

### Product Hunt preparation (prepared, not submitted)

- **Tagline:** One token architecture, natively implemented on every platform.
- **Short description:** the `MESSAGING.md` §M wording, which is canonical and re-derived at submission time.
- **Maker story angle:** built because keeping a design language consistent across web and native meant
  maintaining four implementations by hand, and every library that claimed to solve it either shipped web
  views or could not prove its own coverage. The interesting engineering turned out to be the verification,
  not the components.
- **First comment:** the three guardrails and what each caught in our own repository — including that our
  platform counts were wrong.
- **Assets:** the generated visual kit is ready (`content/visuals/`) — social preview, architecture,
  verification, product proof, adoption, plus the homepage screenshot. **Missing:** a demo video. `MOT-001`
  (platform switching) is the one to produce, and it is the only genuine launch-asset gap.
- **FAQ:** Is this React Native? (No.) Do I have to use all of it? (No — tokens only is a supported path.) Is
  Angular ready? (Published and installable, **and** preview: a deliberate subset, stated everywhere, versioned
  independently. Re-read the fraction from `pnpm marketing:stats` on the day.) What is the licence? (MIT.) Is
  there a paid tier? (No, and none is planned — `STRATEGY.md` §8.7.)
- **On activation:** no *"one command and you're running"* phrasing. D1 is `PENDING LIVE VERIFICATION` and a
  launch is the worst place to discover that.

**No testimonials.** None exist. Engineering proof only.

---

## Campaign themes

The month's content is organised as **six families** in `content/register.json`, each with a spine asset and
its derivatives — F1 drift, F2 tokens, F3 parity, F4 registry, F5 evidence, F6 trades. That is the operative
structure and it is not restated here.

Five *launch-scale* themes remain, and they outlive any one month. Each is a hero insight with a destination
and a measure; the article ids are from `content/backlog.json`, which
[`content/README.md`](./content/README.md) marks **NEEDS UPDATE** — re-map them to `CONTENT-PILLARS.md`
before planning month two.

| # | Theme | Hero insight | Family today | Destination | Measure |
| --- | --- | --- | --- | --- | --- |
| **1** | Cross-platform design systems should prove parity — **start here** | Every library claims parity; ours fails its own build if the claim has no source | **F3** (ART-001) | `/docs/platforms` | Platform-doc views, article referrals |
| **2** | Tokens without widgets | A design system should be adoptable one layer at a time | **F2** (ART-002) | `/docs/tokens` | `adopt_tokens`, Flutter doc views |
| **3** | One design language, native implementations | Sharing a contract is not sharing a codebase | **F6** (LI-007) | `/components` | `platform_selected` spread |
| **4** | RTL should not be a per-platform afterthought | RTL is an architecture decision made once | **none yet** — no month-one asset | `/docs/rtl` | RTL page entries from search |
| **5** | Building KinetixUI in public | The bugs are the content | **F4** (LI-006) | the repository | Returning evaluators |

**Theme 4 has no asset**, which is worth stating rather than leaving as an empty row: the RTL evidence is
genuinely uneven (Flutter 58/90, Compose 1/90, React 3/98) and pillar D's month-one asset is the *reporting*
argument instead. It is a month-two candidate.

---

## Newsletter — strategy only, nothing built

**"KinetixUI Build Notes"**, monthly: releases, one architecture lesson, one community highlight, what is
next. No provider, no capture form, no list, and no signup field anywhere on the site until there is a reason
for one. **Revisit at Stage 3.** `newsletter` already exists in `ATTRIBUTION_SOURCES`, so nothing needs
building on the measurement side when it happens.
