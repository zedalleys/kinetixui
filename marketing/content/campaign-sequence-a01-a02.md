---
type: campaign sequence
campaigns: [a01, a02]
status: neither published, neither scheduled
---

# a01 → a02 — operator sequence

One index for two campaigns that are meant to be read in order. Each package
stays self-contained; this file only holds what is true *between* them — the
order, the interval, the attribution split, and the four places they touch.

**Nothing here schedules anything.** No automation is connected to any channel,
and none should be for these two. Every step is a person deciding the claim
still holds on the day.

| | a01 | a02 |
| --- | --- | --- |
| Title | Your cross-platform design system may be lying about parity | 98 components is not the interesting number |
| Format | DEV article + LinkedIn + X thread | LinkedIn + X thread (**no article**) |
| Campaign id | `kx_parity_proof` | `kx_count_isnt_coverage` |
| CTA | `/docs/platforms` | `/docs/platforms` |
| Status | `drafted` | `drafted` |
| Package | `drafts/a01/` (10 files) | `drafts/a02/` (7 files) |

## Why this order, and why it cannot be reversed

a01 argues that a platform claim is worthless unless something would fail when
it goes false. a02 turns that method on our own most quotable number.

The order is load-bearing in one specific way: **a01 ends with the per-platform
breakdown as a closing fact; a02 opens with it as the subject.** Read a01 → a02
and the numbers arrive first as a footnote, then as the topic — the second piece
enlarges the first. Read a02 → a01 and a01's closing paragraph is a recap of a
post the reader saw last week, in the piece's weakest position.

a01 also earns the right to a02. "The count is the least interesting number"
is a cheap thing to say about someone else's system and an expensive thing to
say about your own — it costs something only after you have published the piece
where your own numbers got worse.

## Interval: 15 days, gated on a01's day-14 decision

**Recommended: a02's LinkedIn post lands on day 15**, where day 0 is a01's DEV
publication — and only if a01's day-14 decision says go.

The two alternatives were both considered:

**Publish a02 earlier (day 5–7), as a deliberate follow-up while a01 is still
in memory.** Rejected, for one reason that is not about taste: a01's
`measurement.md` opens a **14-day window** with a day-7 early read and a day-14
decision whose literal question is *"run campaign 2, or fix something first?"*
Publishing a02 inside that window does not merely pre-empt the gate — it
removes the thing the gate measures. Both campaigns land on `/docs/platforms`.
Their sessions stay separable (different campaign ids, verified in
`apps/web/src/lib/campaign-links.test.ts`), but a01's pre-campaign baseline —
the `<FILL>` table in its `measurement.md` — is the only floor either campaign
has, and a second campaign running against it makes both readings unfalsifiable.
a02 has no baseline of its own precisely because it is supposed to inherit a
closed one.

There is a second cost. a01's day-14 questions include *"what did people push
back on?"* — a02 is drafted, but not frozen. Shipping it on day 7 spends that
answer before it arrives.

**Wait longer than 14 days.** No argument for it, and one against: a02's copy is
entirely current-state numbers, and those move. Compose went 89 → 90 in the
single day between a02 being drafted and this QA. Every extra week is another
re-derivation. 15 days is the floor; past about day 21 the package needs a fresh
`marketing:stats` run and a re-read of the visual brief.

### The conflict this creates, and how to resolve it

a01's `linkedin.md` holds a **second** post (B, led by the Chart finding) marked
*"keep for ~3 weeks later"* — around day 21. With a02 on day 15, LinkedIn would
see a01-A (day 0), a02 (day 15), a01-B (day 21): three posts in three weeks, and
the last of them a deeper cut of a campaign the audience has already moved past.

**Resolve it in a02's favour.** a01-B moves to day 30 or later, or is dropped if
a02's early read is strong. a02 is a new campaign with its own id and its own
measurement; a01-B is a second entry point into an article already published.
Moving a02 to accommodate a01-B would be optimising for the asset that exists
rather than the one that is measured.

## The running order

Day 0 is a01's DEV publication. Nothing below is scheduled in advance.

| Day | Campaign | Surface | Gate |
| --- | --- | --- | --- |
| 0 | a01 | DEV article | `a01/publish-checklist.md` steps 1–3 |
| 0–1 | a01 | LinkedIn A + primary visual | real DEV URL in hand |
| 1 | a01 | X thread | LinkedIn already posted |
| 2–3 | a01 | **one** standalone or derivative visual | thread has settled |
| 7 | a01 | — early read, no posting | `a01/measurement.md` |
| 14 | a01 | — decision: run a02, or fix first | `a01/measurement.md` |
| **15** | **a02** | **LinkedIn primary (`li_primary`)** | **day-14 decision was "go"** |
| 16 | a02 | X thread (`x_thread`) | LinkedIn already posted |
| 17–19 | a02 | **one** standalone — S4 build-in-public first | thread has settled |
| 22 | a02 | — early read | `a02/measurement.md` |
| 29 | a02 | — decision | `a02/measurement.md` |
| 30+ | a01 | LinkedIn B, **or drop it** | a02's window closed |

Never two channels in the same hour. Never both LinkedIn variants of one
campaign — `li_alt` is a **substitute** for `li_primary`, not an addition.

## Attribution

Both campaigns point at the same page, so the campaign id is the only thing
separating them. It is also the only value that fails **silently**: a tag that
does not match `/^kx_[a-z0-9][a-z0-9_-]{0,62}$/` is dropped with no key and no
error, and traffic that arrives untagged can never be reattributed afterwards.

Every documented link and every `utm_content` slug in both packages is run
through the real parser — `deriveAttribution` → `toProps` →
`sanitizeAttributionProps` — by `apps/web/src/lib/campaign-links.test.ts`, which
runs in CI. It reads the URLs out of the marketing files rather than restating
them, so a link edited in a draft is checked, not a copy of it.

| | a01 | a02 |
| --- | --- | --- |
| `utm_campaign` | `kx_parity_proof` | `kx_count_isnt_coverage` |
| `utm_content` | not used | `li_primary`, `li_alt`, `x_thread`, `x_numbers`, `x_principle`, `x_checklist`, `x_buildlog` |
| Mediums | `social` (LinkedIn, X), `community` (DEV CTA) | `social` |

`utm_medium=article` and `utm_medium=post` are **not** accepted values; both are
discarded and a medium is inferred from the source instead. Campaign parameters
never go on the DEV article URL itself — that is not our property and our parser
never sees those hits.

The **STOP GATE** in `a01/publish-checklist.md` applies to a02 as well: open one
real tagged link in a fresh session after deploy, confirm `kx_campaign` arrives,
and publish nothing further until it does.

## What the two pieces share, deliberately

Checked mechanically: there is **no shared 6-word sequence** between a01's and
a02's reader-facing copy. What follows is shared on purpose.

| Shared | Why it is not a repeat |
| --- | --- |
| The per-platform breakdown | a01's closing answer to "what are the real numbers?"; a02's subject. Order does the work — see above. |
| `/docs/platforms` as CTA | Both arguments terminate at the same generated page. Splitting them would weaken both and halve the signal. |
| Angular named with its preview state | Non-negotiable in any copy, in both campaigns and everywhere else. |
| Deliberate gaps | a01 asks whether a system distinguishes "not ported" from "missing"; a02 names the eight and gives their reasons. a02 goes further with the same idea. |

**One line was removed for being too close.** a01's signature question — *"what
would fail if this claim were false?"* — appeared in a02's LinkedIn alternative
as *"what would fail if the claim became false?"*. Same sentence to anyone who
saw both, on the same channel, a fortnight apart. a02 now asks *"when this
number goes stale, what notices?"*, which is a different question: not whether a
claim is true, but whether anything would notice it ageing. That is a02's axis,
not a01's.

## Placeholders

| Placeholder | Where | Kind | Resolved by |
| --- | --- | --- | --- |
| `<DEV_ARTICLE_URL>` | a01 `linkedin.md` ×4, `x-thread.md` ×2, `measurement.md`, `publish-checklist.md` | **Blocking** | Publishing the DEV article and capturing the real URL. No a01 social post may go out before this. Enforced by `a01/verify-package.mjs`. |
| `<FILL>` ×6 | a01 `measurement.md` baseline table | **Blocking for measurement, not for publication** | Reading the trailing-7-day numbers out of PostHog on day 0. **Do not fabricate them** — an invented baseline makes a fabricated delta look measured. |
| `<DATE>`, `<WHO>` | a01 `measurement.md` | Clerical | Whoever takes the baseline, when they take it. |
| `<pkg>` | a02 `sources.md` | **Not a placeholder** | A literal argument in the documented command `npm view <pkg> version`. |

**a02 has no unresolved placeholders.** It links directly to `kinetixui.com` and
does not depend on an article URL — which is also why a02 could, in principle,
publish without a01. It should not; see the ordering argument above.

## Visual assets

Both briefs specify **one primary asset**, built only if it earns the effort,
with numbers re-read from `marketing:stats` on the day it is made rather than
copied from the brief. Neither is a PNG in the repository: KinetixUI has an OG
card generator (`apps/web/src/app/opengraph-image.tsx`, Satori at Next build
time) and **not** a marketing-graphics pipeline, so both assets are produced in
a design tool from their spec.

They are deliberately different in kind, and should stay that way:

| | a01 primary | a02 primary |
| --- | --- | --- |
| Subject | Four gates a claim passes before it reaches a reader | The number 98, and what it decomposes into |
| Form | Horizontal flow diagram, left → right | A large figure over a right-aligned numeric column |
| Landscape | 1200 × 627 | 1600 × 900 (X) |
| Square | 1080 × 1080 optional | 1200 × 1200 (LinkedIn) |
| Theme | Light **and** dark; dark default on X | Dark surface, site tokens |

Shared rules, and both briefs already carry them: no parity grid of ✅, no
scorecard or ranking, no chart of stars or downloads, Angular never shown beside
the others without its preview label, and no number older than the day's
`marketing:stats` run.

**One inconsistency worth knowing about.** a01 specifies light *and* dark
exports; a02 specifies a dark surface only. That is defensible — a02's asset is
a numeric table that reads better on one surface, and dark is the default on X —
but if both appear in a LinkedIn feed within a fortnight they will not look like
one system. If a02's asset is made after a01's, build it light as well and pick
per channel.

a01's derivative **D** (the Chart code card) carries a trap that has changed
since the brief was written: a Compose chart now exists, so the component page
has a real Android tab. Draw the removed snippet; a screenshot would show
working code beside a caption calling it fiction.

## Verification — run before either publishes

```bash
pnpm marketing:stats
```

```bash
node marketing/content/drafts/a01/verify-package.mjs
```

```bash
node marketing/content/drafts/a01/verify-evidence.mjs
```

```bash
node marketing/content/drafts/a02/verify-package.mjs
```

The two a01 scripts divide the work along the line that matters: **current**
figures are re-derived from the manifest by `verify-package.mjs`, and
**historical** figures are pinned to git refs by `verify-evidence.mjs`, which
also asserts the copy still states them. A count that moves breaks exactly one
of the two. Neither can be satisfied by editing the other's numbers.

## Status

`a01` **drafted** · `a02` **drafted** · `p01` **idea** — unchanged by this
document. Neither campaign is scheduled, and no channel automation exists.

`p01` ("Tokens without widgets") remains the intended third campaign: position,
then the number behind the position, then the adoption path.
