---
type: measurement checklist
window: the four posts of 19 to 23 October 2026 (LI-001, X-001, LI-008, X-008)
prepared: 2026-10-18 (M4)
status: nothing here changes a PostHog setting, an event, or the canonical QER definition. It reads and records
---

# After each post — what to read, when, and what it is allowed to mean

One checklist, run four times. It exists because the failure mode in weeks 1–3 was not missing data but data read
too confidently: a 78% canonical QER that was 38 one-page robot loads
([`M3-AUDIENCE-QUALITY.md`](./M3-AUDIENCE-QUALITY.md) §1). Every step below either records an observation or
checks that an exclusion still works.

## Before the post goes out

- [ ] The tracked URL in the post is the register's built URL for that asset, character for character. A shortener
      breaks attribution and a hand-typed link breaks it silently.
- [ ] Nothing else is posted on any channel in the same hour, so arrivals stay attributable to one post.
- [ ] `node scripts/check-distribution.mjs` passes, so the row's campaign, content and destination still agree with
      the content register and the destination is a route that exists.

LI-001's attribution gate is already closed (19:07 UTC, 2026-10-18). The other three ride the same pipeline on the
same campaign conventions; the four links were also exercised against a production build by the M3.1 thread
(`/mnt/project-files/marketing/m3-1/stop-gate-*.log`). No further owner visit is needed before posting.

## T + 1 hour — did the pipeline see it

```sql
SELECT timestamp, event, properties.kx_source, properties.kx_medium, properties.kx_campaign,
       properties.kx_content, properties.kx_landing_page, properties.kx_traffic_type
FROM events
WHERE properties.kx_campaign = '<the asset's campaign>' AND properties.kx_content = '<the asset's content tag>'
  AND timestamp > now() - INTERVAL 6 HOUR
ORDER BY timestamp
```

- [ ] If rows appear: the source, medium, campaign and content are the four the post carried, and the landing page
      is the asset's destination. A row with the campaign but `kx_source=other` is the 18 October anomaly
      recurring — record it, say which browser and device, and do not treat the count as attributed.
- [ ] If no row appears: write "no tagged arrival observed", never "no clicks". LinkedIn and X both wrap, preview
      and strip links; LI-007 and ART-001 each produced zero tagged arrivals while live.
- [ ] Either way this is one hour of data and settles nothing.

## T + 24 hours — close the row out

- [ ] Paste the post's own live URL into its row in [`../distribution/register.json`](../distribution/register.json)
      with `status: "published"`, the real `date`, and a first result line of **absolute counts only**. A row cannot
      be published without its own URL; a profile, feed or `lnkd.in` link is not it.
- [ ] Set the asset to `published` in [`../content/register.json`](../content/register.json).
- [ ] `node scripts/check-distribution.mjs && node scripts/check-content-register.mjs`.

## T + 7 days — the weekly read

```
node scripts/marketing-weekly-report.mjs --from <Monday> --to <next Monday> --print-query --compact
# run the printed SQL in PostHog, save the single cell to a .txt, then:
node scripts/marketing-weekly-report.mjs --from <Monday> --to <next Monday> --sessions <that file> \
  --arms-from 2026-10-19
```

Run it from the repository root: it reads the registers by relative path. PostHog's MCP results cap at 100 rows,
which is why the compact one-cell export exists. `--arms-from 2026-10-19` makes the experiment-arm table cumulative
from the first post of this window, so an arm's floor accumulates across weeks instead of resetting
([`../distribution/M3-EXPERIMENTS.md`](../distribution/M3-EXPERIMENTS.md)).

## LI-001's own checkpoints (published 2026-10-19)

Live post: <https://www.linkedin.com/feed/update/urn:li:activity:7518015214143873024/>. Publication time unknown
(author-supplied date only), so each checkpoint is counted from the close-out read at 18:30 UTC on 19 October.

**T+1h, done 2026-10-19 ~18:30 UTC — no tagged arrival observed.** No event carrying `kx_p1_a_parity_proof` exists at
any time on 19 October; the project ingested events to 18:19:37 UTC, so this is absence of arrivals, not absence of
data. Two `kx_source=direct` Chrome/macOS sessions in the window carry no campaign tag and are not attributable to the
post. Nothing was recorded as a click, impression or engagement figure.

**What each checkpoint measures**, with the canonical definitions in `../analytics.md` and the traps in the table
below: tagged arrivals, the canonical Qualified Evaluation Rate, `component_viewed`, the code-copy events
(`component_code_copied`, `block_code_copied`, `install_command_copied`, `cli_command_copied`), platform exploration
(`platform_selected` and the `platform_coverage` / `platform_availability` CTAs) and installation interest
(`installation_viewed`, kept apart from `install_command_copied`). Audience cohort only: diagnostic, internal and
suspected-automation sessions are excluded, and every query filters on `kx_content` so LI-001 (`li_primary`) and
X-001 (`x_thread`) never merge on their shared campaign.

**T+24h — Tuesday 20 October, after about 18:30 UTC.** Run the T+1h query above with
`properties.kx_campaign = 'kx_p1_a_parity_proof' AND properties.kx_content = 'li_primary'` over `INTERVAL 2 DAY`, then:

- [ ] If any row appears, check the four attribution values and the landing page, and record **absolute counts** of
      sessions, of Qualified Evaluations and of Adoption Intent, audience cohort only. A row with the campaign but
      `kx_source=other` is the 18 October anomaly recurring: record it with its browser and device and do not treat
      the count as attributed.
- [ ] If none appears, write "no tagged arrival in 24 hours" in the LI-001 result line, with the ingest high-water
      mark beside it so a reader can tell silence from an outage.
- [ ] Either way the registers already say `published`; only the result line changes. `node scripts/check-distribution.mjs`
      and `node scripts/check-content-register.mjs` after any edit.
- [ ] X-001 is scheduled for 20 October 15:00 UTC on the **same campaign**, so note the reading before it posts: after
      that, `utm_content` is the only thing separating the two posts' arrivals.

**T+24h, read 2026-10-21 09:25 UTC (late: the 20 October slot passed while the thread was idle).** Window
19 October 14:00 UTC to 21 October 09:25 UTC, PostHog project 620385.

| Measure | Observed |
| --- | --- |
| Tagged arrivals (`kx_p1_a_parity_proof` + `li_primary`, audience cohort) | **0** |
| Campaign-tagged sessions of any cohort | 3, all `kx_traffic_type=diagnostic`, 21 events, 18:33:10 to 18:44:37 UTC on 19 October — the owner's own gate and iOS retest visits, excluded by rule 7 |
| Qualified Evaluation Rate | **undefined**, not 0%. The denominator is campaign-attributed eligible sessions, and there are none |
| Component views | 5 `component_viewed` in 5 sessions, none campaign-tagged |
| Code-copy events | 0 of any kind (`component_code_copied`, `block_code_copied`, `install_command_copied`, `cli_command_copied`) |
| Platform exploration | 0 `platform_selected`, 0 `cta_clicked`. 1 `docs_viewed` outside the diagnostics |
| Installation interest | 0 `installation_viewed` |

All non-diagnostic traffic in the window is `kx_source=direct` with no campaign: 14 sessions, every one of them a
single page with a direct referrer, which is the `suspected_automation` signature from
[`M3-AUDIENCE-QUALITY.md`](./M3-AUDIENCE-QUALITY.md) §1. None of it is attributable to LI-001, and none of it is
counted as audience here.

**What this says and does not say.** Zero observed qualifying events for this query and this window. It is not a
measurement of impressions, clicks or reactions — LinkedIn's own analytics cannot be read from here and none is
recorded. The post's body link goes to dev.to, which first-party analytics cannot see, so only the first comment's
tracked link could ever produce a row. LI-007 and ART-001 each produced zero tagged arrivals while live, so this is
the third post in a row with the same outcome rather than a new anomaly, and it is worth saying plainly that three
posts producing no tagged arrival is itself the finding.

**Extended read, 2026-10-21 23:45 UTC.** The same query carried forward to T+53h after publication, window
19 October 14:00 UTC to 21 October 23:45 UTC. **Nothing changed.** The only campaign-tagged sessions are still the
same three diagnostics of 19 October; no fourth tagged session exists on `kx_p1_a_parity_proof` at any cohort.

| Measure | Observed, window to 2026-10-21 23:45 UTC |
| --- | --- |
| Tagged arrivals (`kx_p1_a_parity_proof` + `li_primary`, audience cohort) | **0**, unchanged |
| Campaign-tagged sessions of any cohort | still 3, all `diagnostic`, all on 19 October |
| Sessions on 20 October | 6 sessions, 11 events, **0 carrying any campaign tag** |
| Sessions on 21 October | 22 sessions, 45 events, **0 carrying any campaign tag** |
| Every session of 20–21 October | `kx_source=direct`, direct referrer, one page each, 1 to 3 events — the `suspected_automation` signature |
| Code-copy, `platform_selected`, `cta_clicked`, `installation_viewed` across both days | 0 of each |

**The pipeline was demonstrably live throughout**, which is what makes the zero an observation rather than a gap:
the last ingested event in the window is 2026-10-21 23:34:10 UTC, eleven minutes before the read, and the two days
carry 56 events across 28 sessions. So the reading is that no tagged arrival was observed on a working pipeline,
not that nobody clicked: LinkedIn click counts are not readable from here and none is recorded.

**No X-tagged arrival has ever been observed.** A query over every event since 1 October for `kx_source=x`,
`kx_content=x_thread`, or any campaign naming `x_thread` returns no rows at all. That is consistent with X-001 not
having been published, and equally consistent with its having been published and read by nobody who followed the
reply link, so it settles nothing about publication — see the X-001 packet §7a. It does mean that if X-001 goes out
later, the first `x_thread` row to appear will be unambiguous: there is no earlier one to confuse it with.

**Why the zeros are now a diagnosis rather than a repetition.** The cause is being worked as its own question in
[`M4-ATTRIBUTION-DIAGNOSIS.md`](./M4-ATTRIBUTION-DIAGNOSIS.md). Two things it settles are worth carrying here: the
failure is upstream of cohort classification, since no campaign-tagged session exists in any cohort rather than
being filtered out of the audience one; and `$referrer` is null on every session since 1 October, so the query
string is the only attribution channel this pipeline has. A reader whose query string does not survive the trip
from LinkedIn lands as `kx_source=direct` with a direct referrer, which is why the untagged one-page sessions
cannot be excluded as candidates and why "no tagged arrival observed" is the only claim these reads support.

**T+7d — Monday 26 October.** The weekly read, cumulative from this post:

```
node scripts/marketing-weekly-report.mjs --from 2026-10-19 --to 2026-10-26 --print-query --compact
# run the printed SQL in PostHog, save the single cell to a .txt, then:
node scripts/marketing-weekly-report.mjs --from 2026-10-19 --to 2026-10-26 --sessions <that file> \
  --arms-from 2026-10-19
```

- [ ] Report audience-cohort counts beside the canonical QER, never instead of it, and absolute counts only: three
      weeks produced 11 audience QE sessions in total, a third of the 30 floor.
- [ ] Four posts in one week is not a test of anything. The honest output is a list of observations.

## The six measures to track, and the trap in each

| Measure | How it is read | What it is not |
| --- | --- | --- |
| **Campaign-attributed audience visits** | Sessions carrying the asset's campaign and content tag, in the `audience` cohort only | Not reach and not clicks. A LinkedIn in-app browser preview is an audience session that no person read |
| **Qualified evaluations** | The canonical QE definition, unchanged (analytics.md §3), reported beside the audience-only count, never instead of it | Not engagement. `component_viewed` fires on render, so a one-page load of a component page qualifies on arrival alone |
| **Component exploration** | `component_viewed`, and `component_code_copied` as the stronger form | A render-only view is not exploration; the copy event is the one that took a decision |
| **Platform exploration** | `platform_selected`, plus `cta_clicked` → `platform_coverage` / `platform_availability`. Per-platform `platform` properties exist only from 2026-10-18 (BD-W4) | Three campaign links land on `/docs/platforms`, which emits `docs_viewed` and qualifies nothing. Landing is not exploring |
| **Installation interest** | `installation_viewed` (fires on render — interest), separated from `install_command_copied` / `cli_command_copied` (an act) | One install-command copy exists in three weeks. Do not blend the two into one number |
| **Code-copy activity** | `component_code_copied`, `block_code_copied`, `install_command_copied`, `cli_command_copied`, each counted separately with its platform where carried | Not adoption. Nothing in first-party analytics can show an install succeeded (analytics.md §5) |

## Integrity checks to repeat every week

- [ ] **Diagnostics stay out of audience counts.** Both owner diagnostic visits (10:30 and 19:07 UTC on 18 October)
      carry `kx_traffic_type=diagnostic` and are excluded by rule 7. The weekly report's cohorts put each session in
      exactly one of `not_arrival`, `diagnostic`, `internal`, `suspected_automation`, `audience`.
- [ ] **Automation exclusions still fire.** The `suspected_automation` rule took 46 of 50 sessions in the week of
      12 October. If a week shows a sudden canonical QER jump, read the audience rows before reporting anything.
- [ ] **The rule has a known false positive** — a real reader arriving `direct` on one page looks the same. It is a
      suspicion, never a claim that a session was a bot.
- [ ] **Mark the owner's own browsing** with `?kx_traffic=internal`. The 18 October 07:47 session (64 page views,
      36 QE signals) is unmarked and still counts as audience.
- [ ] **Attribution arrived intact**: campaign, medium and content present, and `kx_source` not `other`. Record any
      `other` with its browser and device — the 10:30 cause is still unknown and iOS Safari has not been re-tested.
      A single `other` on one browser is a data point to log, not a reason to stop the campaign; the same signature
      on several arrivals is a live defect and goes to the attribution thread. One iOS Safari diagnostic visit,
      whenever convenient, would settle which it is (packet §4); it is excluded from counts whenever it is made.
- [ ] **QER's definition is untouched.** No event is added to it without an owner decision made in analytics.md,
      not in a query. `search_result_selected` (⌘K) and the per-platform properties from BD-W4 changed nothing;
      `verification_inspected` arrived with PR #408, merged to `main` 2026-10-18 as `a7127c84`, and is explicitly
      in neither QE nor Adoption Intent (analytics.md §4 and the 2026-10-18 BD-W5 note). It does join the arrival
      allowlist, but it fires only on a page that has already sent its `$pageview`, so it adds no eligible session
      and the denominator is unchanged too. If any of them is ever counted under QE, QER's history breaks at that
      date.
- [ ] **Campaign links resolve.** `check:distribution` verifies every destination against the routes in
      `apps/web/src/app` and rejects a `utm_source` the runtime would normalise to `other`.

## What may be said about the numbers

- **Absolute counts only.** analytics.md §10's baseline window is still open: 6 weeks of real distribution, or 300
  sessions with at least 30 qualified evaluations.
- **Under ~30 qualified evaluations in a comparison, change nothing.** Three weeks produced 11 audience QE
  sessions in total — a third of the floor. A rate computed on that is noise with a decimal point.
- **No arm comparison before its floor.** The report prints an arm's share only once that arm's registered floor
  reaches 30, and prints bare counts until then.
- **Four posts is not a test of anything.** Two campaigns, two channels, one week. The honest output of this window
  is a list of observations and a working attribution pipeline, not a verdict on positioning.
