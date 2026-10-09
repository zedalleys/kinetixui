# October 7 publication correction

Recorded 2026-10-08 (America/Los_Angeles).

## Evidence and limits

- The author reports in the current developer adoption audit request: “October 7 actual posts concerned IoT but PR #321 recorded LI-005 token-boundary post as published.” This is author-supplied evidence; the actual posts have not been independently inspected.
- [PR #321](https://github.com/zedalleys/kinetixui/pull/321), merged October 7, changed LI-005 from ready/planned to published across the content register, distribution register, and calendar. Its description associates the LinkedIn short link below with LI-005. The PR proves that association was recorded; it does not verify the destination's subject matter.
- LI-005's registered subject is the token boundary, pillar B, `/docs/tokens`, `kx_p2_b_token_boundary`, `li_primary`. An IoT post cannot be counted against that asset solely because it went out on its scheduled date.

## Correction

Restore LI-005 to **ready** in the content register and mark its distribution row **blocked**, with no publication date or result, pending identity reconciliation. Amend the calendar consistently. Keep its planned campaign and copy unchanged.

Do not create an IoT asset, publication URL, timestamp, campaign, impression count, or session count from inference. No claim is made that the short link is an IoT URL, that every IoT post has been located, or that LI-005 could not have published separately. The correction withdraws the unsupported LI-005 close-out.

## Prior assertion, preserved for audit

This was PR #321's distribution result, withdrawn from the operational register. It is **not verified publication evidence**:

> Posted 2026-10-07, on its scheduled day 9. The live post is https://lnkd.in/p/dafq4fNP (LinkedIn short link, as supplied by the author). No counts are recorded yet: this row was logged the same day it went out, so the honest result is none observed so far, to be replaced with absolute counts at the next close-out: adopt_tokens on /docs/tokens first, since that is the metric to watch, then sessions carrying kx_p2_b_token_boundary with utm_content=li_primary. Organic only — no amplification. The exact posting time is not recorded; it went out before 13:58 UTC, when it was reported as published. It shares kx_p2_b_token_boundary with ART-002 (utm_content=art_primary), so the two are separated by utm_content, never by campaign. Absolute counts only — analytics.md §10's baseline window is open.

## Manual reconciliation

1. Inspect the actual October 7 posts and record their canonical URLs and content, separately for LinkedIn and any other channel used.
2. Match each post to an existing IoT asset only if its copy and destination actually match; otherwise create an accurate asset and publication row after that evidence is available.
3. Verify whether LI-005 also published, and whether the short link previously recorded belongs to it. Only then close out that asset with a verified date and result.
4. Attribute observed sessions using the URLs that actually shipped, not the token-boundary campaign that was planned. Counts remain unknown here.

Validation: `node scripts/check-content-register.mjs` and `node scripts/check-distribution.mjs`.
