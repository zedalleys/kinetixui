---
id: LI-001
type: manual publish packet
status: APPROVED 2026-10-18 (editorial only). Not published. Stop gate CLOSED 2026-10-18 19:07 UTC (§4).
target: Monday 19 October 2026, 14:00 UTC / 17:00 Riyadh, posted by hand by the owner
---

# LI-001 — manual publish packet

Editorial approval is not permission for any tool to post. Nothing in this repo schedules, posts or calls a
LinkedIn API. The owner posts by hand, then closes the row out with the live URL.

## 1. The copy (do not edit)

- File: [`../a01/linkedin.md`](../a01/linkedin.md), section **A — default**, the text between the second and third
  `---` under that heading (1,538 characters; starts "I wrote a script to check…", ends "#designsystems #frontend").
- Pinned in `marketing/content/register.json` → `LI-001.approval.copy`, sha256
  `09a399477e8c537d48045fd2cc83a3faf77c33a467b3d046389c83e3f5d33cfb`. `pnpm check:content` fails if a single word
  of section A changes, so the copy you paste is the copy that was approved.
- Paste it exactly as written. Do not shorten it, and do not move the dev.to link out of the body.

## 2. Links

| Link | Where | Value | Checked |
| --- | --- | --- | --- |
| dev.to article (ART-001) | post body, already in the copy | `https://dev.to/zedalleys/your-cross-platform-design-system-may-be-lying-about-parity-4bj0` | Matches the distribution register's `liveUrl` for ART-001 and the a01 front matter. **Not opened from here**: dev.to is unreachable from this environment. Open it once before posting. |
| Platform coverage (tracked) | first comment | `https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=li_primary` | The register's built URL. Parser test and a real-browser run on a local production build both show it arrives as `linkedin / social / kx_p1_a_parity_proof / li_primary`, landing `/docs/platforms`. **Not checked on kinetixui.com** (unreachable from here); that is the stop gate below. |

## 3. First comment (post it yourself, right after the post)

> What each platform implements today, generated from the manifest, with the gaps listed:
> https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=li_primary

The sentence matches what the page says about itself ("Component counts and the gaps below are generated from
`components.manifest.json`"). Paste the full URL; do not shorten it with lnkd.in or any other shortener.

## 4. Stop gate — CLOSED 2026-10-18 19:07 UTC

The three rows below are the record as it stood that morning, and the two dated notes after them are what
changed, in order. Nothing is removed: the failed diagnostic is evidence, not a mistake to tidy away.

| Check | Result |
| --- | --- |
| Source code | **Verified.** `campaign-links.test.ts` and `analytics-attribution.test.ts` (LI-001 link, diagnostic mark, negative controls). |
| Real browser | **Verified, locally.** `scripts/marketing-stop-gate-browser.mjs` against a production build with an intercepted ingest: every event carries the campaign, source, medium, content and landing; the diagnostic mark arrives only when asked. Evidence: `/mnt/project-files/marketing/m2/stop-gate-browser-evidence.json`. |
| PostHog delivery | **BLOCKED.** No LI-001 diagnostic event exists in project 620385, and this environment cannot open kinetixui.com. Re-checked 2026-10-18 at about 10:00 UTC (M3): every diagnostic-marked event since 1 October is from 10 October (a `kx_p2_f_two_trades` and an `art_primary` probe); none carries `kx_p1_a_parity_proof` / `li_primary`. The project's last ingested event of any kind was 08:26 UTC, so the visit has simply not happened yet. Failure point: the owner's visit (step 1 below), not the pipeline. |

> **Correction, 2026-10-18 13:00 UTC.** The 10:00 UTC observation "no LI-001 diagnostic event; visit not done" was
> made before the visit was ingested and is superseded. The owner's diagnostic visit happened: PostHog 620385 holds
> `$pageview` 10:30:33.060, `docs_viewed` 10:30:33.066 and `page_engaged` 10:30:38.373 UTC (session
> 01a14e90-2718-737d-affb-9d0d9a4ed40a, iOS Safari), all with kx_campaign kx_p1_a_parity_proof, kx_medium social,
> kx_content li_primary, kx_traffic_type diagnostic, landing /docs/platforms. Source attribution was wrong:
> kx_source=other, not linkedin. Cause under investigation (M3.1); the visit's `utm_source` value did not arrive as
> `linkedin`. LI-001 gate remains BLOCKED.

> **PostHog delivery PASSED, 2026-10-18 19:07 UTC.** A second owner diagnostic arrived correctly attributed and
> closes this gate. PostHog 620385 holds `$pageview` 19:07:22.944, `docs_viewed` 19:07:22.946 and `page_engaged`
> 19:07:29.248 UTC, each carrying kx_source **linkedin**, kx_medium social, kx_campaign kx_p1_a_parity_proof,
> kx_content li_primary, kx_landing_page /docs/platforms, kx_traffic_type diagnostic. Session
> `01a15069-53d6-788a-a041-498cefb22366`, Chrome on Mac OS X (desktop), posthog-js 1.438.7, `kx_referrer` direct.
> Read from PostHog twice independently: by the M3.1 thread at about 19:15 UTC and by this one at 19:16 UTC.
>
> Two limits on what this proves, stated so nobody reads more into it than it says:
>
> - **The iOS path is untested since the failure.** The passing visit was Chrome on macOS; the failing 10:30 visit
>   was Mobile Safari on iOS. This shows the production pipeline attributes the LI-001 link correctly on that
>   browser, not that the earlier failure cannot happen again on iOS.
> - **The earlier anomaly's cause is still unknown.** Nothing was deployed between the two visits and PR #409 is
>   unmerged, so no code change explains the difference. #409 is a separate improvement (a new tagged arrival in the
>   same tab starts a new session entry) and does not claim to fix the 10:30 defect. Do not describe it as the fix.
>
> What this gate now certifies: the tracked LI-001 link, opened on kinetixui.com, delivers the full attribution
> quartet to PostHog. The diagnostic visit itself is excluded from every count (analytics.md rule 7) and is not a
> LinkedIn arrival. It does not certify every browser: one visit on one browser is not a claim that attribution is
> reliable everywhere.
>
> **Recommended, and not a blocker: one iOS Safari retest.** The failure was on iOS and most LinkedIn readers tap
> through in an in-app or mobile browser, so that is the path worth re-testing — on an iPhone, from the LinkedIn
> app if possible, opening the same URL with `&kx_traffic=diagnostic` appended and tapping once. It can be done
> after Monday's post as easily as before it: a diagnostic visit is excluded from every count whenever it happens,
> so it cannot contaminate the campaign's figures. If it reads `linkedin`, the anomaly was a one-off on a link that
> is now proven on two browsers. If it reads `other` again, the cause is on the iOS path and M3.1's next step
> applies: a diagnostic-only property recording why a source was rejected. Publication is not held for it —
> nothing currently indicates an active failure, and holding a post for an unexplained past event with no present
> symptom would mean never posting.


### The iOS Safari diagnostic, step by step (optional, three minutes, any time)

This is the retest recommended above, written out so it can be done without thinking about it. It is a
**diagnostic** visit: the URL carries `&kx_traffic=diagnostic`, which puts the session in the `diagnostic` cohort,
excluded from every audience count and from QER by analytics.md rule 7. It is therefore safe before or after the
post, and it is never the link that goes in the post or the first comment.

1. On an iPhone, open the LinkedIn app and paste this into a direct message to yourself (a note to self keeps it
   out of the feed), then tap the link so it opens in LinkedIn's **in-app** browser:

```
https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=li_primary&kx_traffic=diagnostic
```

2. Tap once anywhere on the page, wait about five seconds, then close it.
3. Open the same link again from the in-app browser's "open in Safari" action, so the second arrival is **iOS
   Safari proper**. Tap once, wait five seconds, close.
4. Say in the thread that both taps are done, and roughly when. Claude then runs the query below and reports which
   `kx_source` each arrival carried.

Two arrivals, two browsers, one URL: that is what separates "the in-app browser mangles the link" from "iOS Safari
does". Reading `linkedin` on both means the 10:30 anomaly was a one-off on a link now proven on three browsers.
Reading `other` on either names the path that breaks it, and M3.1's next step applies — a diagnostic-only property
recording why a source was rejected. Either way the visits are excluded from the campaign's figures.

If the gate ever has to be re-run (two minutes, once):

1. Open a private window and visit
   `https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=li_primary&kx_traffic=diagnostic`
2. Click anywhere on the page once, then close the window.
3. Say so in the project thread. Claude then runs this in PostHog and reports the result:

```sql
SELECT timestamp, event, properties.kx_campaign, properties.kx_source, properties.kx_medium,
       properties.kx_content, properties.kx_landing_page, properties.kx_traffic_type
FROM events
WHERE properties.kx_campaign = 'kx_p1_a_parity_proof' AND properties.kx_content = 'li_primary'
  AND properties.kx_traffic_type = 'diagnostic' AND timestamp > now() - INTERVAL 1 DAY
ORDER BY timestamp
```

Pass: at least a `$pageview` with `linkedin / social / kx_p1_a_parity_proof / li_primary`, landing
`/docs/platforms`, marked `diagnostic`. If nothing arrives, do not post until the cause is found.

The diagnostic visit is excluded from every count (analytics.md rule 7) and does not count as a LinkedIn arrival.

## 5. Before posting: one owner decision

**ART-001 shows stale figures.** The post sends readers to the dev.to article, whose "today" paragraph says 98
catalogue entries and Angular 64. The catalogue is now 109 and Angular 80 (`a01/verify-package.mjs`; flagged
`stale` on ART-001 in the content register). The LinkedIn copy itself only uses historical, past-tense figures and
is unaffected.

- Recommended: update that one paragraph on dev.to before Monday (the historical numbers stay as they are).
- Or post as is and accept that the article's "today" figures are behind.

## 6. Manual checklist on the day

- [x] Stop gate closed (§4): PostHog delivery passed 2026-10-18 19:07 UTC, confirmed in the thread
- [x] Approved copy still pinned: section A is 1,538 characters and hashes to `09a3994…3cfb`, re-computed
      2026-10-18 on `984792b` (`check:content` enforces it on every run)
- [ ] The first comment's URL carries **no** `kx_traffic` parameter — that mark belongs only to the owner's own
      diagnostic visits, never to a public link
- [ ] ART-001 decision made (§5)
- [ ] dev.to article opens and is the right article
- [ ] Section A pasted unchanged; preview shows the dev.to link card
- [ ] Posted at about 14:00 UTC (17:00 Riyadh); nothing else posted on any channel in the same hour
- [ ] First comment (§3) posted with the full tracked URL
- [ ] Post URL copied (… → Copy link to post; it should contain `/feed/update/urn:li:activity:` or `/posts/`)

## 7. Close-out (only after it is live)

1. In `marketing/distribution/register.json`, LI-001 row: `status: "published"`, `date: "2026-10-19"` (the real
   date), `liveUrl:` the post's own URL (not a profile, feed or lnkd.in link), and a first result line with
   absolute counts only.
2. In `marketing/content/register.json`, LI-001: `status: "published"`. Leave the approval and its pin in place.
3. `pnpm check:distribution && pnpm check:content`. Both fail on a published row without a live post URL, on a
   URL from another channel, and on one post logged twice.
4. X-001 follows the next day and needs its own approval first.

Until step 1 is done with a real URL, LI-001 is APPROVED, not PUBLISHED.
