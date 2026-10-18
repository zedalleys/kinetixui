---
type: measurement audit
date: 2026-10-18
scope: PostHog project 620385, events up to 2026-10-18 08:30 UTC; source at branch claude/project-thread-lqckz6
status: findings and source-side changes; no PostHog setting was changed and no event was deleted or rewritten
---

# M2 — traffic quality, attribution reliability and cohorts

Every number below was read from PostHog with HogQL on 2026-10-18. Where a statement is an inference, it says so.
The rules this produced are in [`../analytics.md`](../analytics.md) §11 *Internal traffic* and *Traffic cohorts*.

## 1. The 38 Qualified Evaluation sessions of 10–16 October

| Window | Sessions | Meet the suspected-automation rule | QE sessions | QE sessions in that cohort |
| --- | --- | --- | --- | --- |
| 10–16 Oct | 46 | 45 | 38 | 38 |
| 12–19 Oct (weekly report) | 50 | 46 | 39 | 38 |

The rule: at most one `$pageview`, no event a person causes, under 5 seconds, `kx_referrer = direct`.

What those sessions share, observed:

- **One page, nothing done.** Each is a single component docs page (`/docs/components/<name>`), which fires
  `component_viewed` on render and so qualifies on load alone. Duration 0–1 s.
- **A fingerprint.** 36 of the 38 have browser language `zh-CN` with a geolocation in the US, Mexico, Hong Kong,
  Singapore or Puerto Rico; near-square, unusual viewports (e.g. 1247×1113); Chrome 148–150; time zone
  `Etc/Unknown`. The other 2 are an AWS address in Dulles, Virginia, 9 ms apart on 12 October.
- **A cadence.** Consecutive visits are about 12.3 minutes apart for hours at a time (13–14 October).
- **A new device every time.** The 46 suspected sessions from 10 to 18 October use 46 different anonymous IDs.
- **No referrer category.** All arrive as `kx_referrer = direct` (the raw referrer is never stored).

Before 10 October the same fingerprint appears in 6 sessions (1 QE, and the only Adoption Intent signal of that
period, a render-fired `installation_viewed`). 32 other sessions up to 9 October meet the rule and none qualifies.

**Inference, not proof:** this is consistent with an automated crawler or monitor rendering pages in a real
browser. posthog-js already drops `HeadlessChrome` and `navigator.webdriver` sessions, so whatever this is presents
as an ordinary browser. A person who opens a deep link and closes it inside five seconds would meet the same rule,
so the cohort is called *suspected* and is reported, never deleted or subtracted from the canonical rate.

## 2. The rest of the brief's questions

| Question | Finding |
| --- | --- |
| One-hit sessions under 5 s | Covered by §1. They are the whole suspected cohort. |
| Missing referrers | By design the site stores only the `kx_referrer` category. "No referrer" in older notes means `kx_referrer = direct`; `weekly-review.md` now says so. |
| New-device patterns | 46 suspected sessions, 46 anonymous IDs (§1). |
| Zero adoption intent | Observed: 0 Adoption Intent sessions in 12–19 October in every cohort. The single historical AI session was render-only and fingerprint-matched. No audience AI has been observed yet. |
| Empty internal cohort | Structural. The project's test-account filter is cohort 583396, which cannot match anyone: `person_profiles: identified_only` and no sign-in mean no visitor is identified. Fixed source-side with a per-browser `?kx_traffic=internal` mark; moving the PostHog filter is the owner's setting. |
| Docs and guide landings that emit only `$pageview` | `/guides/*` and listed docs pages send `$pageview` (plus `docs_viewed` on docs) and nothing else unless a link is clicked, so a reader who scrolls and leaves is indistinguishable from a render-only load. Fixed with `page_engaged` (first trusted pointer, key, touch or wheel input per page view; not a QE or AI signal). |
| PostHog settings that differ from source | See §3. |
| The 17 October `art_pillar` arrival | Matches the fingerprint (CN, 1247×1113, one hit, 0 s). The M1 inference that the dev.to pillar edit is live is withdrawn; the M1 audit and the execution calendar are corrected. |
| The 18 October 07:47 session | 64 page views over 38 minutes, 36 QE signals, unattributed. It is the only audience session this week with real activity and it qualifies. It falls near the M1 merge (07:59), so it may be the owner reviewing the site, but nothing marks it and it stays audience. Marking the owner's browser with `?kx_traffic=internal` stops this ambiguity going forward. |

## 3. PostHog project settings versus source

| Setting | Project 620385 | Source (`analytics-posthog.ts`) | Effect today |
| --- | --- | --- | --- |
| Autocapture | on (`autocapture_opt_out: false`) | `autocapture: false` | none: the SDK option wins |
| Console log capture | on | recording disabled | none |
| Performance capture | on | `capture_performance: false` | none |
| Heatmaps | on | off | none |
| Web vitals autocapture | on | remote config not loaded (`advanced_disable_flags`, `disable_external_dependency_loading`) | none observed |
| Discard client IP | off (`anonymize_ips: false`) | cannot be set from the browser | **IP is kept**; `apps/web/ANALYTICS.md` already asks the owner to turn this on |
| Test-account filter | cohort 583396 `not_in` | n/a | **filters nothing** (§2) |

Recommendation for the owner (not done here): turn on *Discard client IP data*; replace the test-account filter
with `kx_traffic_type is not set`; optionally switch the unused project toggles off so the settings page matches
what is actually collected.

## 4. What changed in source

- `?kx_traffic=internal` marks a browser (localStorage) and every event carries `kx_traffic_type: "internal"`;
  Vercel Web Analytics drops those page views.
- `page_engaged` arrival event, once per page view, on trusted input only.
- `scripts/marketing-weekly-report.mjs`: one HogQL query, one tested classifier, five cohorts, canonical QER plus
  two labelled sensitivities, platform figures "unavailable" unless supplied.
- No change to Qualified Evaluation, Adoption Intent or the canonical QER.

## 5. Limits of this audit

- Fingerprint fields (language, screen, time zone, geolocation) come from the SDK's standard properties as stored
  in PostHog; they can be spoofed and are evidence, not identity.
- `page_engaged` only helps once deployed; this week's "human-evidenced" figure relies on click events and second
  page views.
- No production page was loaded from this container (kinetixui.com is unreachable here), so nothing in this audit
  is a live-site observation other than what PostHog recorded.
