---
type: test protocol
subject: LI-001 reader-path test — does the tracked link survive the trip from the LinkedIn mobile app
prepared: 2026-10-22
status: READY TO RUN. Nothing is published, posted or edited by it
runs_in: about one minute, on a phone, by the owner
---

# The LI-001 reader-path test

One tap, timed. It answers the question three PostHog reads could not: when a real reader follows the tracked
link from LinkedIn's mobile app, does the attribution survive?

It publishes nothing. It edits nothing. It adds no parameter to any public link — the link under test is the one
already posted, untouched, which is the whole point.

## What you do

1. **Note the clock** before you start, to the minute, in UTC or Riyadh time — either, as long as you say which.
2. On your **phone**, in the **LinkedIn app** (not a desktop browser — the app's in-app browser is the path the
   audience actually takes, and the one that failed on 18 October), open the live LI-001 post:
   `https://www.linkedin.com/feed/update/urn:li:activity:7518015214143873024/`
3. Open its **first comment** and tap the `kinetixui.com/docs/platforms` link in it, as a reader would.
4. Let the page finish loading. Scroll once, so a `page_engaged` event has a chance to fire.
5. **Copy the URL out of the address bar**, exactly as it stands after loading — all of it, including everything
   after the `?`. In LinkedIn's in-app browser the address bar may be hidden behind a ⋯ menu or an "Open in
   browser" action; if you cannot reach it, say so and we work from the PostHog row alone.
6. Send me three things: the time, that final URL, and whether you were in the in-app browser or it kicked you out
   to Safari.

That is the whole test. Steps 5 and 6 are what make it conclusive rather than suggestive — the final URL is the
direct evidence, and the PostHog row is the corroboration.

## What I do with it

I take your timestamp, find the session in PostHog 620385 within a few minutes either side, and fill this in:

| Field | Source | Value |
| --- | --- | --- |
| Test time, as reported | you | |
| Final landing URL | your address bar | |
| Query parameters present in it | derived from the URL | |
| PostHog session id | matched on your timestamp | |
| `kx_source` / `kx_medium` / `kx_campaign` / `kx_content` on that session | PostHog | |
| `kx_referrer` and raw `$referrer` | PostHog | |
| Cohort it landed in | the weekly report's rules | |
| Browser and platform | PostHog | |

The session will land in whatever cohort the rules put it in, since the posted link carries no `kx_traffic`
marker and I will not add one to a public link. **I will record its session id here by hand as a diagnostic**, so
that it is excluded from the audience counts in the T+7d read rather than quietly inflating them.

## How the outcome decides the cause

Four candidate causes, and this test separates them:

| What comes back | What it means | Confidence it gives |
| --- | --- | --- |
| Final URL still has all four `utm_*` parameters **and** a tagged PostHog session appears | **Query-string loss is dead.** The link works end to end from the app. The zero is then placement or reach | High — direct evidence from both ends |
| Final URL has the parameters but **no PostHog session appears** | **Incomplete capture**, not attribution: the page loaded and the event did not arrive. An ad or tracker blocker in the in-app browser is the first suspect | High for ruling attribution out; the capture cause then needs its own test |
| Final URL has **lost or truncated** the query, and the session shows `kx_source=direct` | **Query-string loss confirmed.** LinkedIn's wrapper is eating it, and no change of link placement would have helped | Decisive |
| Final URL is a `lnkd.in` or similar address that never resolves to ours | A wrapper or interstitial is in the way; we read what it forwards and re-test from there | Partial |

Note what the test cannot do: **it cannot tell us whether anyone else clicked.** One tap by the owner proves the
path works or does not. It says nothing about how many readers took it, which is what the LinkedIn-native numbers
below are for, and the two must not be blended.

## The LinkedIn-native numbers, recorded separately

From the post's own analytics in the LinkedIn app or on the web — **reported by the platform, never our own
measurement**, and written in their own block so nothing downstream can mistake them for first-party events:

| Metric | LinkedIn's value | Read at |
| --- | --- | --- |
| Impressions | | |
| Members reached | | |
| Reactions / comments / reposts | | |
| Link clicks, if LinkedIn reports one for the comment link | | |

This is the only thing that separates placement from reach:

- **High impressions, meaningful clicks, zero tagged arrivals** → an attribution defect. Fix the pipeline or the
  link.
- **High impressions, near-zero clicks** → **placement**. The link sat in a comment few people opened. Fix where
  the link goes, not how it is tracked.
- **Low impressions** → **reach**. Nothing in the pipeline is broken, and no instrumentation change would produce
  a number worth having.
- **LinkedIn reports no click metric for comment links at all** → a genuine blind spot to record as a limitation,
  not an inference.

## Confidence, stated plainly

| Claim | Confidence | Why |
| --- | --- | --- |
| No campaign-tagged session reached PostHog for LI-001 between 19 and 22 October | **Certain** | Three direct queries, pipeline proven live each time by a diagnostic minutes earlier |
| The failure is not the cohort rules | **Certain** | No tagged session exists in any cohort, so nothing was filtered |
| The site does not drop the query string | **High** | Two redirects in the app, neither on a campaign destination, no middleware; every owner diagnostic since 18 October landed the full quartet |
| The query string is the only attribution channel in use | **High** | Raw `$referrer` is null on every session since 1 October; the owner's own LinkedIn taps recorded `kx_referrer: direct` |
| Readers did arrive but were recorded as `direct` | **Unknown, and untestable from here** | The untagged one-page sessions are consistent with it and equally consistent with automation |
| Nobody clicked the link | **Not established, and not claimable** | First-party analytics cannot see a click that produced no event |
| X-001 was published | **Unknown** | No `x_thread` arrival has ever existed, which is consistent with both outcomes |
| The 18 October `kx_source=other` failure is connected to any of this | **No evidence** | No `other` session since. It stays its own open, not-reproducible investigation, and #409 is not its fix |

## What this does to the Qualified Evaluation Rate

**Nothing, and that is deliberate.** QER's canonical definition in `analytics.md` §3 and §4 is untouched, and no
event joins or leaves it because of this diagnosis. Three consequences worth stating:

- For LI-001, QER is **undefined rather than zero**: its denominator is campaign-attributed eligible sessions and
  there are none. A rate over an empty denominator is not a low rate.
- If this test shows arrivals were being recorded as `direct`, then the campaign QER was never measurable for
  these posts, and the right correction is to the **link**, not to the measure. Every past QER figure stays as it
  was published.
- analytics.md §10's baseline window is still open — 6 weeks of real distribution, or 300 sessions with at least
  30 qualified evaluations — so everything stays an absolute count with its window stated. Three weeks have
  produced 11 audience QE sessions in total, a third of the floor.

**What will not happen:** no attribution instrumentation gets changed to make a dashboard show a non-zero number.
If the honest count is zero, the record says zero, and says what that zero does and does not mean.

---

# Attempt 1 — 2026-10-22, 03:24 Riyadh / 00:24 UTC. **INCONCLUSIVE for the mobile path, and it found something else.**

## What the owner reported

The test was run in the **LinkedIn in-app browser** on a phone. The URL copied afterwards was still a
`linkedin.com/feed/update/...` address carrying a **text-fragment reference** to the full tracked KinetixUI link,
with all four `utm_*` values present in that referenced text. So the capture shows the tracked link existing, in
full, inside LinkedIn's own page — and **does not show a navigation to kinetixui.com at all.**

**Classification: inconclusive, not an attribution failure.** No external landing URL was reached, so nothing here
says anything about whether LinkedIn would have preserved the query on a real navigation. Recording it as
"LinkedIn stripped the parameters" would be a conclusion the evidence does not carry.

## What PostHog shows for that window

Queried 00:10 to 00:40 UTC on 22 October, every event, project 620385. Two sessions exist in the whole window,
and the three categories stay separate:

| Category | What was found |
| --- | --- |
| **Tagged arrival** (campaign + content) | **None.** No event carries `kx_p1_a_parity_proof` at any point on 22 October |
| **Untagged arrival from LinkedIn** | **One, and it is new.** Session `01a160f8-1a07-72a0-9463-226266d2ee81`, `$pageview` on `/docs/platforms` at **00:21:26.161 UTC**, `kx_source=linkedin`, `kx_referrer=linkedin`, `$current_url` = `https://kinetixui.com/docs/platforms` — **no query string**, campaign and content null. Chrome on macOS |
| **No recorded session** | **The mobile attempt.** No session from a phone, an in-app browser or iOS appears anywhere in the window. The 03:24 Riyadh tap produced no event at all |

## The two findings, kept apart

**1. Referrer attribution works, and this is the first time we have seen it from LinkedIn.** Every session since
1 October had a null raw referrer; this one arrived with `kx_referrer=linkedin` and was attributed `kx_source=linkedin`
*without any query string*. That is the first direct evidence that an arrival from LinkedIn can be recognised at
all when the tag is missing — and it narrows the earlier worry: such an arrival is **not** necessarily
indistinguishable from `direct`. On desktop web it is distinguishable. In the in-app browser, where no referrer has
ever arrived, it still would not be.

**2. A LinkedIn-referred visit reached `/docs/platforms` with no campaign parameters.** That is consistent with the
comment's link not carrying them, and it is equally consistent with a different link on linkedin.com having been
clicked — our own page's website field, an older post, or the post body. **Which link produced it is not
established**, so it is not evidence that the comment's link is broken. It is the reason for attempt 2.

A third observation, recorded without a claim attached: later pageviews in that same session (00:23:55 onward) read
`kx_source=direct` rather than retaining `linkedin`. Acquisition is supposed to stick for the session. It may be a
storage boundary in that browser, or the same class of same-tab behaviour PR #409 touches. It is noted here as an
anomaly to watch, not diagnosed, and it does not affect the counts above.

## Attempt 2 — the clean test, and it needs no navigation at all

The flaw in attempt 1 is that it tried to establish the link's target by following it. There is a direct way:
**read the anchor instead of clicking it.**

1. Open LI-001's first comment, on **desktop web** (`linkedin.com`, any browser).
2. **Right-click the `kinetixui.com/docs/platforms` link in it → "Copy link address"** (Chrome) or "Copy Link"
   (Safari/Firefox). Do not click it.
3. Paste that into the thread, whole.

That single string answers the question outright, with no navigation, no event and nothing published:

| What the copied address looks like | Conclusion | Confidence |
| --- | --- | --- |
| `https://kinetixui.com/docs/platforms?utm_source=linkedin&...` — all four parameters | The comment carries the tracked link correctly. The zero is **placement or reach**, and attempt 3 is LinkedIn's own click numbers | High |
| `https://kinetixui.com/docs/platforms` — bare, or truncated at the `?` | **LinkedIn's linkifier is cutting the query**, which also explains finding 2 above. The fix is to stop relying on a pasted URL being linkified whole | High |
| An `lnkd.in/...` wrapper | The query may survive inside the wrapper; paste it and I will resolve what it forwards to | Partial |
| There is no link to right-click — the URL is plain text | **The comment's URL was never a hyperlink.** On mobile a tap selects text, which is exactly what attempt 1 produced, and the arrival above came from somewhere else | Decisive, and it would explain everything |

If the fourth row is what you find, do not re-post or edit the comment to fix it — that is a publication decision,
and it is yours. Say so and I will write up what it means for the three posts still unpublished.

**Attempt 3 remains LinkedIn's own numbers** — impressions, members reached, and a link-click count if one exists
for comment links. Still the only thing that can separate placement from reach, and still unanswered.

## Confidence after attempt 1

| Claim | Confidence | Change |
| --- | --- | --- |
| No campaign-tagged session has reached PostHog for LI-001 | **Certain** | Unchanged, now through 22 October |
| LinkedIn strips `utm_*` parameters | **Not established** | Attempt 1 produced no external landing URL. Do not claim it |
| An arrival from LinkedIn is indistinguishable from `direct` | **Narrowed to the in-app browser** | On desktop web the referrer arrives and is classified; in the in-app browser no referrer has ever been seen |
| A LinkedIn-referred visit reached `/docs/platforms` untagged on 22 October | **Certain** | New. Which link produced it is **unknown** |
| The mobile tap navigated anywhere | **No** | It produced no session, and the copied URL never left `linkedin.com` |
| The first comment's URL is a working hyperlink in the app | **Unknown, and now the leading question** | Attempt 1's text-fragment capture is what a text selection looks like |

**Impact on QER: still none.** No definition changed, no event joined or left it, and LI-001's QER remains
undefined rather than zero because its denominator is empty. The untagged LinkedIn arrival above does not enter
the campaign denominator — it carries no campaign — so it changes no rate, and nothing about it will be made to.
