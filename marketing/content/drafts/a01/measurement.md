---
id: a01
type: measurement plan
campaign: kx_parity_proof
status: drafted
---

# a01 — measurement

Review window: **14 days** from the DEV publication. One review at day 7, one at
day 14. Anything shorter reads noise as signal at this traffic volume.

## Attribution — use the system that exists

KinetixUI already has privacy-safe acquisition in
`apps/web/src/lib/analytics-attribution.ts`. **Do not add a second one.** It
normalises incoming UTM values into `kx_*` properties and drops anything it does
not recognise, which means a mis-tagged link produces *no* attribution rather
than a wrong one.

Two constraints found by reading the code, both easy to get wrong:

**1. `utm_campaign` must start with `kx_`.**

```
const CAMPAIGN = /^kx_[a-z0-9][a-z0-9_-]{0,62}$/;
```

A campaign tagged `parity-proof` is **silently discarded**. It must be
`kx_parity_proof`. This is the single most likely way to lose this campaign's
data, and it fails quietly.

**2. `utm_source` must be a recognised alias.** `linkedin`, `lnkd.in`, `x`,
`twitter`, `t.co`, `reddit`, `devto`, `dev.to`, `github`, `hashnode`,
`producthunt`, `youtube` and the search engines all map correctly. An
unrecognised source falls back to referrer classification rather than being
stored raw.

Click ids (`gclid`, `fbclid`) are never read. The referrer is classified to a
category and the hostname is discarded. Nothing here carries user content.

### Link convention for a01 — tested against the real parser

Each row below was run through `deriveAttribution` + `toProps` and the output is
what PostHog will actually receive. Not inferred — executed.

| Channel | URL | Produces |
| --- | --- | --- |
| LinkedIn | `https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_parity_proof` | `kx_source: linkedin`, `kx_medium: social`, `kx_campaign: kx_parity_proof` |
| X | `https://kinetixui.com/docs/platforms?utm_source=x&utm_medium=social&utm_campaign=kx_parity_proof` | `kx_source: x`, `kx_medium: social`, `kx_campaign: kx_parity_proof` |
| DEV article CTA | `https://kinetixui.com/docs/platforms?utm_source=devto&utm_medium=community&utm_campaign=kx_parity_proof` | `kx_source: devto`, `kx_medium: community`, `kx_campaign: kx_parity_proof` |

All three also carry `kx_landing_page: /docs/platforms`.

#### Two corrections the test produced

**`utm_medium=article` does not exist.** `ATTRIBUTION_MEDIUMS` is `organic,
social, community, referral, email, launch, video, direct, other`.
`normalizeMedium("article")` returns `undefined`, and the value falls back to the
default medium for the source — `community` for DEV. So an `article` tag is a
no-op that quietly becomes something else. Use `community` explicitly: it is
allowed, and it is what the fallback would have chosen anyway.

**`utm_campaign=parity-proof` is discarded entirely.** Confirmed by running it:
the resulting property bag has **no `kx_campaign` key at all**. The regex is
`/^kx_[a-z0-9][a-z0-9_-]{0,62}$/`. This is the single most likely way to lose
this campaign's data, and it fails without any error.

#### Third-party URLs

Do **not** append campaign parameters to the DEV article URL itself when linking
from LinkedIn or X. DEV is not our property, our parser never sees those hits,
and the parameters would only clutter a shared link. Tag the links that point at
`kinetixui.com`; leave `<DEV_ARTICLE_URL>` clean.

`utm_content` (optional, for distinguishing post variants) must match
`/^[a-z0-9][a-z0-9_-]{0,63}$/` and is only kept when a valid campaign is present.

## Primary metrics

These decide whether the campaign worked.

| Metric | Where | Why |
| --- | --- | --- |
| **Sessions reaching `/docs/platforms`** attributed to `kx_parity_proof` | `docs_viewed` filtered by campaign | The article's whole argument points here. If people read it and do not look at the coverage page, the argument did not land. |
| **Activation from campaign sessions** — `cli_command_copied`, `install_command_copied`, `component_code_copied` | the three canonical events | An awareness piece converting at all is the interesting result. |
| **Activation rate** = activated campaign sessions ÷ campaign sessions | derived | Comparable to baseline once one exists. |

**Weekly Activated Developers** is the project north star, but a single article
will not move it detectably at this volume. Record it; do not judge a01 by it.

## Secondary

Article reads · LinkedIn saves and comments (saves matter more than likes for
this audience) · X replies from people who build design systems · GitHub visits
from campaign referrals · new stars.

## Explicitly not a success metric

**Impressions.** A thread can reach 50,000 people and produce nothing, and a
post reaching 800 of the right people can produce the only inbound that
mattered. Record reach for context, never as the headline.

Stars are secondary for the same reason they are not the north star: they
ratchet up and never down, so they cannot tell you something got worse.

## What would make this worth repeating

- Someone who does not know us links the article in a discussion we are not in.
- A design-system maintainer says they ran a similar check and found something.
- Campaign sessions reach `/docs/platforms` at a higher rate than baseline
  traffic does.
- One qualified inbound question about multi-platform adoption.

Any one of those justifies campaign 2. Raw traffic without them does not.

## Pre-launch baseline — fill immediately before publishing

Without this, a post-launch number has nothing to be compared against and every
result looks like a success. Take these readings **on the morning of Day 0**,
before anything is posted.

These cannot be retrieved from the repository — PostHog is not accessible from
here — so they are placeholders for a human. **Do not estimate them.** An
invented baseline is worse than none, because it makes a fabricated delta look
measured.

| Reading | Trailing 7 days, as of Day 0 | Value |
| --- | --- | --- |
| `/docs/platforms` sessions | `docs_viewed` filtered to that page | `<FILL>` |
| Activation events (all three) | `cli_command_copied` + `install_command_copied` + `component_code_copied` | `<FILL>` |
| Weekly Activated Developers | distinct users firing ≥1 activation event | `<FILL>` |
| Referral sessions | `kx_medium` in (`social`, `community`, `referral`) | `<FILL>` |
| Sessions with any `kx_campaign` | should be ~0 — no campaign has run | `<FILL>` |
| GitHub stars | repo page | `<FILL>` |

Baseline taken on: `<DATE>` by `<WHO>`.

## Day-7 review

Early read. Enough to spot a distribution problem, not enough to judge the
content. **Do not change strategy on impressions alone.**

1. Which channel sent the most *qualified* visitors — those who reached
   `/docs/platforms`, not those who merely clicked?
2. Which channel produced activations, if any?
3. Did article readers continue into the platform docs, or stop at the article?
4. Which technical point generated substantive discussion — the
   `direction-provider` finding, the Chart fiction, or the symbol-check limit?
5. Did anyone challenge the evidence? (The most valuable outcome available.)
6. Did the campaign surface a documentation or product issue we did not know
   about?

Record answers in `marketing/research/<date>.md`. If a channel produced nothing,
say so plainly — that is the finding.

## Day-14 review — the decision point

Compare against the pre-launch baseline:

- campaign-attributed sessions, and how many reached `/docs/platforms`
- activated developers from campaign traffic
- campaign activation rate vs. the baseline rate
- returning visitors — **only if volume supports interpretation**; at low
  traffic this number is noise and should be left uninterpreted rather than
  over-read
- GitHub activity: stars, and more usefully, issues or discussions that cite the
  article
- qualitative technical feedback, quoted rather than summarised

Then choose exactly one:

| Outcome | Decision |
| --- | --- |
| Qualified traffic and some activation | Repeat the theme — the position works |
| Traffic but no movement to `/docs/platforms` | Fix the CTA, not the content |
| Neither, but good technical discussion | Change distribution, keep the writing |
| Neither, and no discussion | Move on without optimising — do not iterate a piece nobody engaged with |

## Day-14 write-up

Append to `marketing/research/` with the date, and answer plainly:

1. Which channel produced the qualified visits, not the most visits?
2. Did anyone reach `/docs/platforms` and then do anything?
3. What did people push back on? (That is the next article.)
4. Run campaign 2, or fix something first?

## After a01

Next intended campaign: **"Tokens without widgets"** (`p01` in the backlog).

The sequence is deliberate. a01 establishes credibility and the category
position — *we verify what we claim*. Campaign 2 converts that into a concrete
adoption path — *and here is how you can adopt one layer of it today*. Running
them in the other order asks people to adopt something they have no reason to
trust yet.

**Not drafted, and its backlog status is untouched.** Campaign 2 starts only
after the Day-14 decision.
