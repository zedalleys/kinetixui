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
- [ ] **QER's definition is untouched.** No event is added to it without an owner decision made in analytics.md,
      not in a query. `search_result_selected` (⌘K) and the per-platform properties from BD-W4 changed nothing;
      `verification_inspected` arrives with PR #408, which is unmerged, and is explicitly in neither QE nor
      Adoption Intent. If any of them is ever counted under QE, QER's history breaks at that date.
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
