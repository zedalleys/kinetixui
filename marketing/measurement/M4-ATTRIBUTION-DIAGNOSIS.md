---
type: diagnosis
subject: why four posts with a tracked link produced no tagged audience arrival
opened: 2026-10-22
status: OPEN — one mechanism confirmed, two live hypotheses, three tests outstanding
scope: diagnosis only. Nothing here publishes, posts or edits a live link, and no test in it requires one
---

# Why no tagged arrival has been observed

Four pieces of content have been live with a tracked link — LI-007, ART-001, LI-001, and an ART-001 pillar-link
edit whose state is unconfirmed — and between them they have produced **zero tagged audience arrivals**. Three
separate PostHog reads, each against a pipeline proven live by the owner's own diagnostic visit minutes earlier,
returned the same thing. This file is the diagnosis: what the data can already settle, what it cannot, and the
cheapest test for each remaining possibility.

The distinction it keeps throughout: *no tagged arrival observed* is not *no clicks*. The first is a fact about
this pipeline. The second would be a fact about readers, and nothing here can establish it.

## What the data already settles

**1. The failure is upstream of cohort classification.** The `suspected_automation` rule has been the usual
suspect, because it took 46 of 50 sessions in the week of 12 October. It is not the cause here: there is no
campaign-tagged session in *any* cohort over the whole window — not audience, not automation, not internal. The
only tagged sessions that exist at all are the owner's three diagnostics of 19 October. A classifier cannot
explain a row that was never written.

**2. The site does not lose the query string.** `apps/web/next.config.mjs` declares exactly two redirects,
`/colors` and `/theme-builder` → `/create`, and the file states there is no middleware and no route handler doing
redirects; neither campaign destination (`/docs/platforms`, `/components`) is touched by either. So a visitor who
arrives with the tracked query reaches the page with it intact, and every owner diagnostic since 18 October
confirms that end to end — the full quartet (`kx_source`, `kx_medium`, `kx_campaign`, `kx_content`) landed on
Chrome/macOS, Safari/macOS and Safari/iOS.

**3. Referrers are not arriving, from anywhere, almost ever.** This is the finding with teeth. Across every
session since 1 October, PostHog's raw `$referrer` is **null in every single one**, and the derived `kx_referrer`
is `direct` in all but two (one `bing`, 19 October; one `devto`, 17 October). The classifier is not at fault —
`classifyReferrer` in `apps/web/src/lib/analytics-attribution.ts` handles `linkedin.com`, `lnkd.in`, `x.com`,
`t.co` and `dev.to` by hostname suffix, and it demonstrably worked for the dev.to arrival. The referrer simply is
not there to classify.

**Why that matters more than it looks.** The owner's own LinkedIn diagnostic visits — real taps on a real
LinkedIn link — recorded `kx_referrer: direct`. They were attributed *only* because the URL carried `utm_*`.
So on this pipeline the query string is the single channel of attribution, with no second signal behind it:

> If a reader reaches the site from LinkedIn or X and the query string does not survive the trip, their session is
> recorded as `kx_source=direct` with a direct referrer — **indistinguishable from the untagged one-page traffic we
> have been counting as suspected automation.**

That is not proof that any such reader exists. It does mean the honest reading of "zero tagged arrivals" is
*"no arrival carried the tag"*, not *"nobody came from the post"*, and that the untagged `direct` sessions cannot
be excluded as candidates.

## The live hypotheses

| # | Hypothesis | What it predicts | State |
| --- | --- | --- | --- |
| **H1** | **Link placement.** LI-001's tracked link was in the first comment, not the body; its body link went to dev.to. A first comment is seen by a fraction of a post's readers | Low tagged-arrival counts even with healthy reach, and LinkedIn's own click count far above the tagged count | **Live.** Needs T3 |
| **H2** | **Link rewriting.** LinkedIn (`lnkd.in`) or X (`t.co`) drops or truncates the query when wrapping the link | A tap on the *actually posted* link produces an untagged `direct` session, while the same URL pasted into a browser produces a tagged one | **Live, and decisive if true.** Needs T1 |
| **H3** | **The dev.to boundary.** Readers who follow the body link read the article and never come back to kinetixui.com | No campaign row, and no `devto` referrer either, which is what we see — one `devto` session in three weeks | **Live but minor.** Explains ART-001, not LI-001's comment link |
| **H4** | **Reach.** The posts were read by very few people, and the tagged count is honest | LinkedIn impressions and clicks near zero | **Live.** Needs T3, and only the owner can answer it |
| **H5** | **The 18 October `kx_source=other` defect recurring.** The failed 10:30 diagnostic is still unexplained | Tagged arrivals landing as `other` | **Not supported.** No `other` session exists since 18 October, so nothing is currently being mis-shaped. The investigation stays **OPEN — NOT REPRODUCIBLE / MONITORING**, and PR #409 is not its fix |

H1 and H2 are not alternatives: either on its own produces the observed zero, and both can be true at once.

## The tests, cheapest first

None of these publishes anything, posts anything, or edits a live link.

**T1 — tap the link that is actually live. Owner, about one minute. The decisive test.**
Open the live LI-001 post, tap the tracked URL in its **first comment** exactly as a reader would, let the page
load, and tell me roughly when. Nothing is edited and nothing is posted. Then:
- a session appears carrying `kx_campaign=kx_p1_a_parity_proof` → **H2 is dead**, LinkedIn preserves the query,
  and the zero is about placement or reach (H1/H4).
- a session appears as `kx_source=direct` at that minute → **H2 is confirmed**, the wrapper is eating the query,
  and no amount of link-placement change would have helped.
It is worth doing from a phone, in the LinkedIn app, because that is where the audience is and it is also the
path that failed on 18 October. Appending `&kx_traffic=diagnostic` is impossible here — the link is already
posted — so this visit will land in whatever cohort it lands in; I will mark the session id as diagnostic in the
record by hand rather than let it count as audience.

**T2 — the same from X, once X-001 exists.** Identical logic for `t.co`. Nothing to do until a thread is live.

**T3 — LinkedIn's own post analytics. Owner, about one minute.** Impressions, and the click count if LinkedIn
shows one for the comment link. This is the only thing that separates H1 and H4 from each other: tagged 0 against
500 impressions and 12 clicks is an attribution defect; tagged 0 against 40 impressions and 0 clicks is reach, and
there is nothing to fix. Numbers or a screenshot; I will record them as reported by the platform, attributed to
LinkedIn, never as first-party measurement.

**T4 — a bare-URL control. Mine, no owner action.** I can confirm from the container that the tracked URL
resolves and carries its query into the page, which closes the loop on site-side loss independently of the
redirect map above. Scheduled with the T+7d read on 26 October so it costs nothing extra.

## What I am not doing, and why

- **No `kx_source_rejected_shape` instrumentation.** It would record the shape of a rejected `kx_source` value, and
  it is the obvious next step *if* H5 reopens. The owner's standing instruction is not to implement it unless the
  agreed reopening conditions occur or he asks, and nothing in this diagnosis reopens it.
- **No change to the QER definition, the cohort rules, or any gate.** A diagnosis that moves the measure it is
  diagnosing proves nothing.
- **No second post into the same path before T1 and T3 come back.** If H2 is true, publishing X-001 on the current
  pattern adds a fourth zero and no information. That is a recommendation, not a hold: the owner decides, and the
  packet is ready either way.

## The decision this is all for

If T1 shows the query surviving and T3 shows real clicks, the fix is **placement**: put the tracked link in the
post body rather than a first comment, and accept whatever reach cost the platforms impose on outbound links. If
T1 shows the query being eaten, placement is irrelevant and the fix is a **destination that identifies itself** —
a campaign-specific landing path rather than a query string, which is a web change, not a marketing one, and would
need its own decision. If T3 shows almost no clicks on healthy impressions, nothing here is broken and the problem
is the post, not the pipeline.

Until one of those comes back, every number in this workstream stays an absolute count with its window stated, and
every zero stays an observation of absence.
