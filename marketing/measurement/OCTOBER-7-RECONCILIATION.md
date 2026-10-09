---
type: records reconciliation
date: 2026-10-09
scope: what went out on LinkedIn on 2026-10-07, and the three earlier rows that still had no counts
---

# October 7 reconciliation

## What the records said

PR #321 (merged 2026-10-07, `efb1a82`) recorded **LI-005** — *The boundary, and the copies nobody maintains*,
pillar B, `kx_p2_b_token_boundary` → `/docs/tokens` — as published on 2026-10-07, with the live URL
`https://lnkd.in/p/dafq4fNP` and a posting time of "before 13:58 UTC".

## What the evidence says

| Source | What it shows |
| --- | --- |
| The 2026-10-07 close-out thread | The author wrote "today's post published" without naming the post. The close-out took the asset from the calendar slot (day 9 → LI-005). The post's content was never compared with LI-005's copy. The URL arrived later as "Today post is published", again without naming it |
| The author, 2026-10-09 | The October 7 LinkedIn posts were focused on IoT |
| PostHog, read 2026-10-09 04:15 UTC | **0** observed sessions before that cutoff carried `kx_p2_b_token_boundary` with `utm_content=li_primary`. On 2026-10-07 and 2026-10-08 there was one session in total; it was direct (no campaign, no LinkedIn referrer) and did not view `/iot` |
| LinkedIn | Independently inspected in merged PR #326: the short link resolves to an IoT device-state post. Canonical URL and evidence limits are preserved in [the correction](../distribution/october-7-correction.md) |

Zero tracked visits establishes only a lack of observed tagged traffic. It cannot prove non-publication,
identify a post's subject, or establish whether LI-005 published separately.

## Corrections and additions

1. **LI-005 reconciliation is already handled by merged PR #326.** Keep its content status `ready`,
   distribution status `blocked`, null date/result and the existing correction record. Separate publication
   evidence is required before closing it out. This PR does not repeat or override that correction.
2. **The verified IoT post is recorded separately** in `offCalendar` (`off-001`), using the canonical
   URL inspected for #326 and the author-supplied October 7 date. Exact times, total post count and
   attribution remain null. No registered asset is inferred.
3. **Two metrics-to-watch that could not fire were corrected.** LI-005's was `adopt_tokens on /docs/tokens`,
   but `adopt_tokens` is a homepage CTA target and `/docs/tokens` never emits it. X-004's was the
   `platform_selected` spread, but `/docs/tokens` has no platform switcher (`tokens-page.test.tsx` asserts
   this). Both now name signals the landing page and its next click can actually produce.

## Counts filled in for the earlier rows

As of 2026-10-09 04:15 UTC, read from PostHog. Absolute counts only (`../analytics.md` §10).

| Asset | Tagged sessions | Qualified Evaluation | Adoption Intent | Note |
| --- | --- | --- | --- | --- |
| LI-004 | 5 | 0 | 0 | All five began 18:31–18:34 UTC on **2026-10-02**, a day before the recorded posting date. Four began within the same second, which looks like automated link previews (inferred). Posting date left as recorded until the author confirms |
| X-003 | 0 | 0 | 0 | Replies (its metric to watch) are not readable from here |
| ART-002 | 0 | 0 | 0 | dev.to's own view counts are not readable from here |

**What these counts cannot see.** `respect_dnt` is on and ad blockers drop PostHog, so every count is a
floor. A post with no tagged link arrives as `direct` unless the browser sends a LinkedIn or X referrer.

## Process lesson

The close-out recorded an asset from the calendar slot, not from what was posted. A close-out should name the
asset back to the author ("LI-005, *The boundary…*?") before writing `published`, and an unplanned post goes in
`offCalendar` rather than in the nearest calendar row.

## Final review cross-check

Requeried the historical window 2026-09-01 00:00 UTC through 2026-10-09 04:15 UTC,
end-exclusive, production host kinetixui.com, nonempty session IDs, attribution on any event in the session.
LI-004: 5 tagged sessions, 0 QE, 0 AI; first sessions 2026-10-02 18:31:49–18:33:25 UTC.
Those sessions emitted 5 $pageview and 5 docs_viewed events. No matching rows for X-003,
ART-002 or LI-005 campaign/content pairs. This supports bounded traffic observations only.
X-004: all five posts fit 280 characters with URLs counted as 23, including each numbered prefix.
