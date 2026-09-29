# Phase 6 — Organic distribution and community engine

**Date:** 2026-09-29 · **Base:** `2eb3b38` (Phase 5 visual proof and launch assets)

**Nothing was published, posted, sent, launched or deployed.** No repository setting was changed, no GitHub
Release was created, no Discussions category was enabled, no outreach was sent, no community was posted to,
and no content was written — Phase 4 produced the content and this phase decides only how it travels.

**No second calendar was created.** [`../content/calendar.md`](../content/calendar.md) remains the schedule.

---

## What this phase produced

| File | What it is | New? |
| --- | --- | --- |
| [`../distribution/README.md`](../distribution/README.md) | **Canonical** distribution system: channel roles, the discovery loop, attribution, destinations, engagement, stop rules, automation, the P1/P2 test | **New** |
| [`../distribution/first-14-days.md`](../distribution/first-14-days.md) | Day-by-day execution for the existing days 1–14 | **New** |
| [`../distribution/github.md`](../distribution/github.md) | GitHub as a channel: actions before traffic, Release policy, Discussions, the contributor path | **New** |
| [`../distribution/outreach.md`](../distribution/outreach.md) | Five partnership archetypes, four outreach templates | **New** |
| [`../distribution/register.json`](../distribution/register.json) | The distribution log — 12 rows, 0 published | **New** |
| `scripts/check-distribution.mjs` · `pnpm check:distribution` | Validates the register and the documents against the rest of the repository | **New** |
| [`../community.md`](../community.md) | **Rewritten** as the community-participation document: fit classification, asset mapping, listening routine | Reconciled |
| [`../launches.md`](../launches.md) | **Rewritten**: the launch model, prerequisite signals, Product Hunt classification, every stage criterion re-checked against today | Reconciled |
| [`../content-calendar.md`](../content-calendar.md) | **Superseded as a calendar**, with its un-carried ideas preserved | Reconciled |
| [`../weekly-review.md`](../weekly-review.md) · [`../monthly-review.md`](../monthly-review.md) | Reconciled to the Phase 3 measurement vocabulary | Reconciled |
| [`../roadmap.md`](../roadmap.md) · [`../README.md`](../README.md) · [`../CONTENT-PILLARS.md`](../CONTENT-PILLARS.md) | Pointer and vocabulary corrections | Reconciled |
| `apps/web/src/lib/current-truth.test.ts` | Five marketing documents added to `CURRENT_SURFACES` | Extended |

---

## Channel roles

Full nine-field definitions — audience, job, best content, bad fit, cadence, CTA style, attribution, success
signal, stop signal — are in `distribution/README.md` §2. Summary:

| Channel | Role | Audience | Pillars it carries | Cadence | Attribution |
| --- | --- | --- | --- | --- | --- |
| **LinkedIn** | **PRIMARY** | P1, P2, S1, S2 | A, C, D, G (+B, F derivatively) | 1–2/week | `utm_source=linkedin` |
| **Long-form off-site (dev.to)** | **PRIMARY** | P1, P2, S2, S4 | A, B, C, D, E | 1 per 2–3 weeks | `utm_source=devto` |
| **X** | **SECONDARY** | P1, S4, C1 | G, F, B | 1–3/week + replies | `utm_source=x` |
| **GitHub** | **SECONDARY — conversion, not feed** | Everyone arriving from elsewhere; C1 | the product itself | event-driven | `utm_source=github` |
| **Reddit** | **EXPERIMENTAL, contribute only** | S4, P2, P1 | B, F | opportunistic | **none, by design** |
| **Design-system communities** | **EXPERIMENTAL** | **P1**, S1, S2 | A, C, D | genuine participation | **community-dark** |
| **Frontend communities** | **EXPERIMENTAL** | S1, P1, C1 | C, G | opportunistic | **none** |
| **Mobile communities** | **EXPERIMENTAL, highest upside** | **S4**, P2 | **B only** | opportunistic | referrer only |

**NOT NOW:** Reddit self-promotion threads · Hacker News *submissions* (comments are in scope) · Product Hunt ·
video/YouTube · newsletter · anything paid.

**No pillar is forced onto every channel.** Pillar E has no channel in month one and no asset; pillar A is
deliberately *not* carried into frontend communities, where it reads as a product claim.

---

## First 14 days

**READY.** Eight scheduled assets plus two opportunistic community contributions, all finished, all
registered, all with a destination that exists.

| Day | Asset | Channel | ICP | Pillar | Destination | Visual | Link placement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | LI-003 | LinkedIn | P2 | A | `/docs/platforms` | VIS-001 | in the post |
| 2 | X-005 | X | P2 | A | `/docs/platforms` | — | **first reply** |
| 4 | LI-004 | LinkedIn | P1 | C | `/docs/platforms` | VIS-002 | in the post |
| 6 | X-003 | X | P1 | C | `/docs/platforms` | — | **first reply** |
| 8 | ART-002 | dev.to | P2 | B | `/docs/tokens` | VIS-003 | contextual + one closing |
| 9 | LI-005 | LinkedIn | P2 | B | `/docs/tokens` | VIS-003 | in the post |
| 11 | X-004 | X | NEUTRAL | B | `/docs/tokens` | VIS-003 | **final post of the thread** |
| 13 | LI-007 | LinkedIn | P2 | F | `/components` | VIS-005 | in the post |
| — | COM-002 | community | P1 | A | none | — | none |
| — | COM-001 | community | P2 | B | none | — | none |

**One ambiguity in the finished work was resolved rather than ignored.** The calendar's CTA column reads `—`
for X-005, X-003, X-007, X-009 and X-011, while `register.json` holds a tagged URL for each. Both are correct
and the resolution is *placement*: the post carries the argument, and the tagged URL goes in the first reply —
or, for a thread, the final post. That is the native convention on that channel and it needed writing down
before the operator had to guess mid-week.

**Blocking before day 1:** the repository description and topics, the social-preview upload, the PostHog
dashboard, and re-running `pnpm marketing:stats` against the week's numbers. Everything else can move.

---

## GitHub actions

State read from the GitHub API on 2026-09-29, not assumed.

### DO NOW

| Action | Verified state |
| --- | --- |
| **Replace the repository description** | Currently *"Multi-platform design system: one token contract, with React, SwiftUI, Jetpack Compose and Flutter components."* — **omits Angular**, which is published on npm, and omits verification entirely. Wording exists in `MESSAGING.md` §I |
| **Set topics** | **Empty.** The API returns `{"names": []}`. Twenty are already chosen and ordered in `PHASE-0.75-PUBLIC-SURFACE.md`. This is the cheapest discovery action available and it is entirely unspent |
| **Upload the social preview** | **Missing.** The file exists at `content/visuals/SOCIAL-PREVIEW.png` |

### THIS MONTH

Enable Discussions with four categories · create the three outstanding Releases · disable the Wiki if it is
empty · add the platform and area labels.

### LATER

A genuine `good first issue` when one appears · pinned threads once Discussions is active · release notes as
content when a release earns it · a README demo GIF once motion exists · a discussion template probably never.

**No commit or issue was manufactured**, and no setting was changed.

### Release communication

The **mechanism is already fixed** — `RELEASING.md` records the root cause (`changesets/action` creates
Releases by parsing `New tag:` lines out of a publish command's stdout, and this repository publishes with its
own pipeline, so there was never anything to parse) and the replacement
(`scripts/release/github-releases.mjs`, never fatal, idempotent, no backfill, no invented prose).

What remains is **visibility**: 2 Releases exist, both from an abandoned repository-level tag scheme; 92 tags
have none; the feed stops three weeks before the current version.

- **Policy:** a Release for every publish (automatic now) · three by hand for the current version of each
  cohort · none for a historical version · none for a docs or site change · one for a real milestone, which is
  the only case that is also a content beat.
- **A Release is the notification; the CHANGELOG is the record.** Different audiences, and neither is
  retro-edited.
- **The historical gap is not backfilled.** Ninety-two Releases dated today fabricates a history and sends
  ninety-two notifications. Three make the sidebar true and recent. The gap is a *visibility* problem;
  backfilling would make it a *truthfulness* problem.
- **The three catch-up Releases are not announced.** They are hygiene, and announcing them draws attention to
  the gap they close.

The specification is Phase 0.75's and was **re-verified rather than rewritten** — all three tags still exist
on `origin`, none has a Release.

### Discussions

**Enable — this month, not day 1.** Four categories: **Announcements**, **Q&A**, **Show and tell**, **Ideas**.
`community.md` previously listed six; *Help* duplicates Q&A and *Platform requests* is a subset of Ideas, and
every empty category is a small signal that nobody is here.

Routing rule: **Issues are for work. Discussions are for questions. Docs are for answers that should not have
needed asking** — a question asked twice is a docs defect, which is how the discovery loop actually closes.

Welcome copy is drafted in `distribution/github.md` §3, derived from `MESSAGING.md` §J, with no version, no
activation promise, and the native-install prohibition stated rather than merely obeyed.

### Contributor loop

**Honest expectation: one or two drive-by contributions in the first quarter**, most likely a docs correction
or a platform-specific fix from someone who hit the gap themselves. The path is `DISCOVER → UNDERSTAND
ARCHITECTURE → FIND A CONTRIBUTION PATH → FIRST CONTRIBUTION`, and most of it already exists —
`CONTRIBUTING.md` correctly delegates to `/docs/contributing` rather than duplicating it, and the templates,
Code of Conduct, governance and security policy are all in place.

Three necessary improvements, and nothing else: **platform and area labels** (the current set cannot express
*where* in a five-platform monorepo a piece of work lives); **one paragraph naming the approachable work as
categories rather than issues** — a missing `platformNote` reason, a direction-aware behaviour test where the
fraction is low, an accessibility test where it is thin, a docs page that failed to answer a real question, all
four **derivable from the published evidence fractions** so the list cannot go stale; and **nothing else**.

**`good first issue` exists as a label with no issue on it, and that is correct.** An empty label is honest.
**No fake good-first issue was created**, and a contributor who picks up manufactured busywork does not come
back.

---

## Community strategy

### `LIVE RULE CHECK REQUIRED` — verified, not assumed

**No community rule is quoted, paraphrased or assumed anywhere in this phase, because none could be read.**
This is a verified fact about the container, recorded with its evidence:

```
CONNECT www.reddit.com:443   → 403  (gateway policy denial, in the proxy's own relay log)
CONNECT old.reddit.com:443   → 403
news.ycombinator.com         → unreachable
dev.to                       → unreachable
linkedin.com                 → unreachable
```

Every community therefore carries `LIVE RULE CHECK REQUIRED`, and the standing assumption is the safe one:
**assume promotion is not allowed until the current rules say otherwise.**

### Fit classification

Judged on audience alignment, content fit, ability to contribute useful knowledge and promotion tolerance —
**deliberately not ranked by speculative conversion potential**, since with no baseline any such estimate would
be a number invented to justify a preference. Communities are named as **types and candidates**, because
whether a given community is currently active or moderated the way it was is not checkable from here.

| Fit | Types |
| --- | --- |
| **HIGH** | Design-system communities (**P1**) · design-token / DTCG ecosystem · mobile platform communities (**S4** — highest upside, highest rules risk) |
| **MEDIUM** | Frontend / framework communities · general engineering (HN **comments**, not submissions) · accessibility communities |
| **LOW** | Design/UI communities · startup and indie-hacker communities · "show your project" threads · IoT communities (month two) · Stack Overflow (**answer, do not distribute**) |

Each row states why the content fits, what it is worth **with every KinetixUI link removed**, whether a product
link is necessary (**almost never**), the best contribution format, and the promotion risk.

**No Reddit blast plan.** No scheduled Reddit post exists and none should; each of COM-001…COM-004 maps to at
most two community types, and none goes to three in a week.

### Community-dark traffic — a known limitation, accepted

Community channels are unattributed on purpose: comments carry no tagged link, and Slack, Discord and Hacker
News all classify as `other` because none is in `ATTRIBUTION_SOURCES`.

**The decision not to add `hackernews` is deliberate and has a trigger.** HN submissions are Stage 4, not month
one, and HN comments carry no link by policy — so adding a source nothing will tag is machinery pretending to
be measurement. If an HN submission is ever tagged, add it *then*. `check:distribution` proves the constraint
is live: setting `utm_source=hackernews` on a row fails with *"is not in ATTRIBUTION_SOURCES — it would
normalise to `other`"*.

---

## Article distribution

| | ART-001 | ART-002 |
| --- | --- | --- |
| **Canonical** | dev.to | dev.to |
| **Day** | 15 | 8 |
| **Destination** | `/docs/platforms` | `/docs/tokens` |
| **Social derivatives** | LI-001, LI-002 (day 36+), X-001 | LI-005, X-004 |
| **Community derivatives** | COM-002 | COM-001 |
| **GitHub linkage** | none — a README that links out to articles ages badly | same |

**Cross-posting requires a canonical link.** A Hashnode or Medium copy must set `canonical_url` to the dev.to
URL, or the two compete and neither ranks. If a platform does not support it, do not cross-post there.

**No `/blog`.** `seo.md`'s trigger is three off-site articles with one showing measurable traffic; two exist
and neither is published. Building it now would mean moving the canonical URLs of articles that have not earned
an audience. `check:distribution` carries `/blog` in an explicit `notYetRoutes` list so a genuinely wrong route
still fails.

**An article gets one LinkedIn post, not a serialisation.** That is the ceiling.

---

## P1 / P2 test

**Not simply P1 to engineers and P2 to designers.** The hypothesis travels in the *argument*, and the argument
decides where it is best tested:

| Hypothesis | Argument | Tested best on |
| --- | --- | --- |
| **P1** — architecture-led | *a claim should be checkable* | LinkedIn (LI-004, LI-008, LI-010) · design-system communities |
| **P2** — drift-led | *six months later, they don't* | LinkedIn (LI-003, LI-005, LI-009) · mobile communities |
| **NEUTRAL** | the engineering itself | X · dev.to |

**The clean test is week 1 on one channel**: LI-003 (P2, day 1) against LI-004 (P1, day 4) — same channel, same
destination, 48 hours apart, different campaigns, **no cross-linking**. Same-channel is the point; comparing a
P1 LinkedIn post against a P2 Reddit comment measures the channel, not the message.

Tracked in order: attributed sessions (context) → Qualified Evaluation Rate → Adoption Intent Rate → **which
ladder rung**, which is the most interesting signal because it is behaviour rather than a click.

**No winner is declared, and impressions decide nothing.** The month is P1-skewed 15:8:4 by inheritance, which
weakens the comparison and is stated rather than corrected.

---

## Launch recommendation

**ROLLING now. BOTH eventually.** Never a single big launch first.

Six reasons, all specific: no baseline · **credibility, not discovery, is the funnel's narrowest point**, and a
spike is a discovery instrument · a big launch is spent once · the content is built for rolling and a launch day
would compress the ICP experiment into one unreadable point · **activation is verified once, manually** · one
person, who needs a full day available for a launch that matters.

**Prerequisite signals for a concentrated launch — all four, none currently met:**

| # | Signal | State |
| --- | --- | --- |
| 1 | A baseline exists (`analytics.md` §10's window closed) | **NOT MET** — nothing published |
| 2 | **D1 cleared** — a repeatable activation check, not one manual observation | **NOT MET** |
| 3 | Community feedback has changed the copy or the docs | **NOT MET** |
| 4 | A genuine milestone a stranger would recognise | **NOT MET** |

**No urgency is manufactured.** No countdown, no *"launching soon"*, and nothing about the product gets worse
if the first post is next month.

Every stage criterion in `launches.md` was re-checked against today rather than left as an unticked box —
including the honest corrections that Stage 2's *"a 30-second demo exists"* is **not met** (three shot lists,
none produced), that Stage 3's *"activation events show a real funnel"* is **unachievable as worded** because
activation is not measurable on-site (the honest requirement is an Adoption Intent funnel), and that Stage 3's
Angular criterion is **met** and enforced by a guard.

### Product Hunt: **AFTER BASELINE**

| Criterion | Assessment |
| --- | --- |
| ICP fit | **Weak–moderate.** P1 finds libraries through engineering content, a colleague or a search — not a launch feed |
| Product maturity | **Adequate but uneven**, and a launch audience reads a caveat as a defect |
| Proof readiness | **Good** — the visual kit exists, `MESSAGING.md` §M is written. The strongest argument for eventually going |
| Expected learning value | **Low now, high later.** With no baseline, a spike teaches us that a spike happened |
| Cost of going early | **High and irreversible** |

Hacker News is the same call: **comments now, submission at Stage 4**, two viable stories at most.
**Not a priority at all:** launch-aggregator directories and listicles — impressions, no evaluation.

**The one genuine launch-asset gap is a demo video.** MOT-001 is the clip to produce.

---

## Partnership archetypes — 5

Non-paid only. **No individual or company is named anywhere**, deliberately: a list of named targets written
from a container with no network access is a list of guesses that decays privately.

| # | Archetype | What we give | Shared value | Main risk |
| --- | --- | --- | --- | --- |
| 1 | **Design-system educator** | An MIT-licensed, inspectable cross-platform case study — including the three false claims and the uneven fractions | Genuine: they need an example, we are one | Low, and mostly ours |
| 2 | **Open-source maintainer in an adjacent layer** | A concrete integration report from a non-trivial consumer | **Highest** — both sides get working software | Low |
| 3 | **Token / DTCG ecosystem** | The spec used in anger past the web boundary, and where it was ambiguous | Strong, and the most strategically aligned | Medium, of a useful kind: we may be told we are wrong |
| 4 | **Frontend or mobile educator** | Per-platform token output and a component in that platform's own idiom | Real but narrower | **Medium** — easiest place to overclaim |
| 5 | **Design-engineering community** | A talk or written contribution on putting a design system's claims under test | Good, while the contribution is the content | Medium |

Every row names a **specific thing we actually hand over**. Deliberately absent: paid placements, sponsorship,
"thought leader" co-marketing, and anything whose deliverable is an impression.

**Four outreach templates**, each a shape to adapt rather than copy: asking for technical feedback (the one to
reach for first), inviting critique of a published position, sharing a relevant article, proposing a joint
technical discussion. Ten rules, including **disclose in the first two sentences**, **one message and no
follow-up**, and **never ask for promotion, a share, a star or a mention**. **No cold-DM template exists** —
that is a rule, not an omission. **No outreach in the first 14 days**; the trigger is Stage 3.

---

## Automation opportunities

| Verdict | Items |
| --- | --- |
| **AUTOMATE NOW** | Campaign URL generation and validation (`check:content`, exists) · **distribution register validation (`check:distribution`, new)** · destination existence checking (new, inside it) · product number re-derivation (`marketing:stats`, exists) · visual regeneration (exists) |
| **AUTOMATE LATER** | Weekly analytics summary — *once the dashboard has ≥4 weeks of data* · stale-screenshot detection — *once it has gone stale twice; it has gone stale once* · broken-link sweep — *around month three* |
| **KEEP HUMAN** | Publishing · community replies · Reddit posting · outreach · claim approval · scheduling · deciding what a metric means · anything resembling engagement |

Each LATER item has a **named trigger**, not a vague "soon". **One script was written, not a system** —
automating a summary of an empty dashboard produces a report nobody reads.

---

## Stop rules

| Reduce or stop | Threshold shape |
| --- | --- |
| Repeated zero qualified evaluation | ≥4 assets with real reach, across ≥2 review cycles → **REDUCE**, and change the destination before the framing |
| Audience mismatch confirmed by conversation | **REDUCE** to one asset a month |
| Community resistance — a moderator action or a removed post | **STOP in that community immediately.** Record it. Do not appeal |
| High effort, no learning | **STOP.** Effort is the scarce resource, not reach |
| Format mismatch | **STOP posting that pillar there** — not the channel |

**Do not stop for:** one weak post (the commonest error, and usually a destination problem) · small initial
reach (expected for months) · a single negative comment (often the next objection-table row) · a week with no
posts.

**No numerical threshold is set.** *"Stop below 2% conversion"* against no baseline is a number invented to be
met. The thresholds above are **sample-shaped**, which is the only honest form available before the baseline
window closes.

---

## Reconciliation findings

Three contradictions were found in existing documents while building on them. All three would have reached the
operator during the first fortnight.

### 1. A second, competing 30-day calendar

`marketing/content-calendar.md` was still a live document — `marketing/README.md` listed it as *"Planning the
next 30 days"*, `CONTENT-PILLARS.md` said *"the rhythm lives in content-calendar.md"*, and
`current-truth.test.ts` guards it as a present-tense surface. It described **a different month** from the one
Phase 4 finished, and four of its differences were substantive:

- It used the **pre-Phase-1 pillar set**, where **E meant build-in-public**. E is now device interfaces, so
  every "E" row read as the wrong pillar.
- It **scheduled Reddit posts on named days** (9 and 18). Phase 4 rejected that explicitly, and the rules are
  unread.
- It made a GitHub Release and a Discussions thread into **calendar beats** (days 12 and 25).
- Its article titles predate the finished drafts.

**Resolution:** superseded as a calendar, with a banner pointing at `content/calendar.md`, the differences
recorded, and **its seven un-carried ideas preserved** — the Angular-directives article, the `material-icons`
classpath bug, the RTL-as-infrastructure piece and four others — because a superseded plan's ideas outlive its
schedule. Both pointers were corrected.

### 2. The review rituals asked for a number the strategy forbids reporting

`weekly-review.md` had an **"Activation (canonical events only)"** block asking for *"Weekly activated
developers — distinct users firing ≥1 of the three"*, and `monthly-review.md` had an **"Activations"** column
and an **"Activation trend"** section asking for an *"activation rate from docs sessions"*.

`analytics.md` §5, written in Phase 3, says activation is **not measurable from this website** and that *"any
metric named 'installs', 'activations' or 'conversions' built from the events above would be an inference
presented as a count"*. `CLAIMS.md` **D1** is `PENDING LIVE VERIFICATION`.

So the ritual asked, every week, for the one number the strategy says must not be reported — and the operator
filling it in would have been inferring installs from clipboard events. Phase 3 rewrote `analytics.md` and did
not reconcile the templates that consume it.

**Resolution:** both rewritten to the Phase 3 vocabulary — **Qualified Evaluation** and **Adoption Intent**,
with the boundary stated at the top of each. `roadmap.md`'s *"do activated developers return?"* became
**returning evaluators**, the definition that actually exists. A weekly **Distribution** block and a
**Verdicts** block were added so the review connects to the register and to §10's evidence ladder.

### 3. The X assets' CTA ambiguity

Described under **First 14 days** above. Resolved as a placement rule rather than by changing any finished
asset.

---

## Validation

| Check | Result |
| --- | --- |
| **`pnpm check:distribution`** (new) | **PASS** — 12 rows, 127 routes verified, 14 attribution sources read from the runtime |
| `pnpm check:content` | **PASS** — 27 assets, 23 linkable all attributed |
| `pnpm lint` | **PASS** |
| `pnpm typecheck` | **PASS** |
| Web suite (forced, not cached) | **PASS — 1,097 tests, 39 files** |
| `pnpm test:release` | **PASS** — 262 tests, 259 pass, 3 skipped by design |
| Every Phase 4 asset ID referenced | **VERIFIED** — mechanically, against the content register, the visual manifest, the visual briefs and the motion briefs |
| Every destination | **VERIFIED** — enumerated from `apps/web/src/app`, not from a list |
| Attribution convention | **VERIFIED** against the runtime's own `CAMPAIGN` regex and `ATTRIBUTION_SOURCES`, parsed out of `analytics-attribution.ts` |
| No invented community rule | **VERIFIED** — the network denial is recorded with its evidence |
| No stale version claim | **VERIFIED** — the only versions named are in the release-actions section, where the version is the subject, and they are flagged for re-derivation |
| No D1 activation promise | **VERIFIED** — swept for *"start building now"*, *"one command and"*, *"up and running"*, *"in under a minute"*, *"works out of the box"*. The only occurrence is a prohibition |
| No wearables | **VERIFIED** — zero occurrences |
| No install command for a source-only platform | **VERIFIED** |
| No paid-tier implication | **VERIFIED** — the only occurrence is *"No, and none is planned"* |

### The check earned its place on its first run

`check:distribution` failed immediately, on `/blog` — named three times in `first-14-days.md` **precisely
because it does not exist**. The finding was correct and its interpretation was inverted, so the fix was an
explicit `notYetRoutes` list rather than a weaker rule: a genuinely wrong route still fails, and adding an
exception is a visible edit.

**Ten mutations, ten caught:** a destination typo · a malformed campaign · an ICP drifting from the content
register · a community row acquiring a tracked link · a published row with no date or result · a `utm_source`
outside the runtime vocabulary · a nonexistent asset · a community row whose rules were marked as checked · a
fake asset ID in prose · a fake route in prose.

**And the failure mode when the runtime moves:** renaming the `CAMPAIGN` constant in
`analytics-attribution.ts` makes the check **fail loudly** — *"could not find the CAMPAIGN regex — this check
cannot verify campaigns and is failing rather than passing blindly"* — rather than silently validating nothing.

### The claim guards, and exactly how much they cover

The four new distribution documents plus the rewritten `community.md` were **unguarded**: neither
`marketing-claims.test.ts` nor `current-truth.test.ts` could see them, and they make present-tense claims about
platforms, coverage and distribution. Phase 0.75 found a guard that had the right rule and **could not see the
sentence**; a guard that cannot see the **file** is the same defect one level up.

They were added to `CURRENT_SURFACES`, and **the RTL overreach rule caught a real error in my own writing on
the first run**: a destination row reading *"The fractions, per platform"* matched the pattern that exists to
stop *"direction-aware behaviour on every platform"* being written while one platform has none. The sentence
was true and sat inside the shape the guard exists to catch, so — as in Phase 1 — **the prose was reworded, not
the guard weakened.**

**What that addition does not buy, stated rather than implied.** Mutation testing measured it:

| Mutation inserted into a new distribution document | Caught? |
| --- | --- |
| Claims direction-aware coverage on every platform | **YES** |
| An install command for an undistributed platform | No |
| A blanket parity claim | No |
| A transpilation implication | No |
| A *production ready* claim | No |
| A wearables claim | No |
| An activation promise | No |

**This is the documented design, not a defect I introduced.** `marketing-claims.test.ts:30` records that the
`marketing/*.md` guidance documents were tried under its phrase rules and **removed**, because those documents
*quote* anti-patterns in order to ban them — and a phrase rule cannot tell a claim from its refutation. The new
documents do exactly that (*"**No install command.** Source you compile"*, *"never imply transpilation"*), so
pointing phrase rules at them would fail on the correct text.

**No new phrase rule was added**, because the one that would be needed is the one already known to be
unsafe here, and a brittle guard gets deleted for being annoying. The honest position: these documents are
covered by one derived-set rule, by `check:distribution` structurally, and by human review — and the
prohibited-language sweep above was run by hand rather than asserted in CI.

---

## What was deliberately not done

- **No second content calendar.** The Phase 4 calendar is the schedule.
- **No Phase 4 post rewritten.** Not one word of finished copy changed.
- **Nothing published, posted, sent or launched.** No repository setting changed, no Release created, no
  Discussions enabled, no outreach sent, no community posted to.
- **No Product Hunt, no ads, no paid reach.**
- **No product architecture change, no positioning rewrite, no analytics replacement.** One enum was
  *considered* (`hackernews`) and deliberately not added, with a trigger recorded.
- **No named partnership targets, no influencer list, no CRM.**
- **No fake `good first issue`, no manufactured commit or issue.**
- **No Phase 7 work started.**

## Risks

- **Everything before day 1 is a manual action in a settings page.** Three GitHub settings and one PostHog
  dashboard stand between a finished content engine and a measurable one. None can be automated from here, and
  all four are individually forgettable.
- **Community channels are the highest-upside and the only unmeasurable ones.** Mobile communities are where
  the pain is described most concretely and where the rules are strictest. The result will be a rise in `other`
  and `direct` that coincides with participation and cannot be attributed to it.
- **The P1/P2 comparison is weak by inheritance.** Week 1's pair is the part to trust; the 15:8:4 skew is not
  fixable without discarding finished work.
- **The register is only as good as the habit.** Eight planned rows are structurally validated; a fortnight of
  unfilled `result` fields would make the log a plan rather than a record. `check:distribution` can catch a
  *wrong* row but not a *missing* one.
- **The distribution documents carry less CI protection than the website does**, quantified above. The mitigation
  is that they are guidance for one person rather than published copy — which is also exactly how a guidance
  document drifts unnoticed.
- **`/blog` will eventually be right.** `notYetRoutes` is an exception list, and exception lists grow. Two
  entries would be worth a second look; one is a decision.
