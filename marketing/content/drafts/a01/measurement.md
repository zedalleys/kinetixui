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

### Link convention for a01

| Channel | URL |
| --- | --- |
| DEV article → site | `https://kinetixui.com/docs/platforms?utm_source=devto&utm_medium=referral&utm_campaign=kx_parity_proof` |
| LinkedIn post A | `<DEV_ARTICLE_URL>?utm_source=linkedin&utm_medium=social&utm_campaign=kx_parity_proof` |
| LinkedIn post B | same, `utm_content=chart_angle` |
| X thread | `<DEV_ARTICLE_URL>?utm_source=x&utm_medium=social&utm_campaign=kx_parity_proof` |
| X standalone | same, `utm_content=standalone` |

`utm_content` must match `^[a-z0-9][a-z0-9_-]{0,63}$` or it is dropped too.

**Before posting:** open one tagged link, and confirm in PostHog that the event
carries `kx_campaign: "kx_parity_proof"`. If it is absent, the tag is wrong and
everything after is unmeasurable.

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

## Day-14 write-up

Append to `marketing/research/` with the date, and answer plainly:

1. Which channel produced the qualified visits, not the most visits?
2. Did anyone reach `/docs/platforms` and then do anything?
3. What did people push back on? (That is the next article.)
4. Run campaign 2, or fix something first?
