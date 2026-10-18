---
type: measurement report
date: 2026-10-18
scope: PostHog project 620385, sessions that started 2026-09-28 to 2026-10-18 (UTC; last ingested event 2026-10-18 08:26)
method: one export from `node scripts/marketing-weekly-report.mjs --from 2026-09-28 --to 2026-10-19 --print-query --compact`, classified by `classifySession`; rows kept at /mnt/project-files/marketing/m3/
status: observed counts and labelled inferences. No PostHog setting changed; no event deleted or rewritten; canonical QER unchanged
---

# M3 — audience quality, three weeks

Every number below comes from the same per-session rows the weekly report uses, so this page and
[`weekly/2026-10-12.md`](./weekly/2026-10-12.md) cannot disagree. The cohorts are M2's (analytics.md §11 *Traffic
cohorts*). A session is in exactly one.

## 1. The headline, read correctly

| Week (UTC) | Raw | Eligible | Canonical QE | **Canonical QER** | Audience | Audience QE | Suspected automation (QE) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 28 Sep – 4 Oct | 66 | 62 | 7 | 11.3% | 38 | 7 | 24 (0) |
| 5 – 11 Oct | 15 | 14 | 4 | 28.6% | 4 | 3 | 10 (1) |
| 12 – 18 Oct | 50 | 50 | 39 | **78.0%** | 4 | 1 | 46 (38) |

**The 78% canonical QER of 12–18 October is not 78% genuine audience engagement.** 38 of its 39 qualifying sessions
are one-page, sub-5-second, direct loads of a component docs page, which fires `component_viewed` on render and so
qualifies on load alone (M2 traffic-quality report §1). The audience cohort for that week is 4 sessions, 1 of which
qualifies. Both figures are below analytics.md §10's ~30-evaluation floor, so neither is a rate anyone should act on.

The canonical definition stays as it is (analytics.md §3). Whether suspected automation should ever leave it is the
owner's decision; until then the report prints the audience figure beside it, never instead of it.

## 2. What the brief asked for, over the three weeks

| Measure | Canonical | Audience only | Notes |
| --- | --- | --- | --- |
| Sessions | 126 eligible (131 raw: 4 not an arrival, 1 diagnostic) | 46 | 80 suspected automation, 0 internal (no browser is marked yet) |
| Qualified evaluations | 50 | 11 | 39 of the 50 are in the suspected cohort |
| Human-evidenced evaluations | — | 11 | every audience QE session also has a click event or a second page |
| Adoption-intent sessions | 7 | 6 | the 7th is a 0-second load of `/docs/installation` on 5 Oct, in the suspected cohort |
| Evaluation → intent progression | 7 of 50 | 6 of 11 | an intent signal at or after the first evaluation (analytics.md §4) |
| Installation interest: opened an installation page | 7 | 6 | fires on render, so it is interest, not action |
| Installation interest: copied an install or CLI command | 1 | 1 | one copy in three weeks (30 Sep) |
| Platform interest (sessions naming a platform) | 7 sessions | 7 | SwiftUI 4, React 3, Angular 3, Compose 2, Flutter 2; all audience. Too few to rank |
| Campaign-attributed sessions | 28 | 19 | 21 of the 28 are `kx_p2_a_drift` / `li_primary` (29 Sep – 1 Oct) |
| Missing attribution | 97 unattributed | — | direct or unrecognised source with no campaign |
| Landing-page engagement (`page_engaged`) | 0 | 0 | the event has never fired: the M2 release that adds it is merged but no event has arrived (see §4) |

### Campaign sessions by quality

| Campaign / content | Sessions | Audience | Human-evidenced | Qualified |
| --- | --- | --- | --- | --- |
| `kx_p2_a_drift` / `li_primary` | 21 | 17 | 5 | 2 |
| `kx_p2_a_drift` / `x_single` | 2 | 1 | 0 | 0 |
| `kx_p1_c_manifest` / `li_primary` | 5 | 1 | 0 | 0 |
| `kx_p2_f_two_trades` / `li_primary` (LI-007) | 1 | 0 (diagnostic probe) | 0 | 0 |
| `kx_p1_a_parity_proof` / `art_pillar` | 1 | 0 (suspected) | 0 | 0 |

**Observed:** the one campaign that produced human-evidenced arrivals is the 29 September LinkedIn post
(`kx_p2_a_drift`), with 5. Most of its 17 audience sessions are a single page view of `/docs/platforms` lasting under
20 seconds, arriving with a LinkedIn referrer.

**Inference, not proof:** LinkedIn's in-app browser and link previews produce short single-page loads with a real
LinkedIn referrer. They stay in the audience cohort because the rule only suspects `direct` arrivals, and a person
who read the headline and left looks the same. This is why the "human-evidenced" line exists.

**Observed:** LI-007 (12 Oct) and the dev.to article (13 Oct) produced no tagged audience arrival. The only
`kx_p2_f_two_trades` session is the 10 Oct diagnostic probe. "No tagged arrival observed" does not mean nobody
clicked; LinkedIn and X can strip or wrap links.

## 3. Conversion, where it means something

- **Audience QE sessions that went on to show intent: 6 of 11** over three weeks. 11 is a third of §10's floor, so
  this is an observation, not a conversion rate.
- **Landing page:** the homepage `/` produced 9 of the 11 audience evaluations and all 6 audience intent sessions;
  `/docs/platforms`, where every campaign link lands, produced 1 evaluation and no intent from 18 sessions. Observed
  and worth watching, but campaign sessions are mostly one-page previews (§2), so the landing comparison is
  confounded by how people arrived. It is the motivation for experiment B, not a finding.
- **No week-on-week percentage change is reported.** The baseline (analytics.md §10) is still open.

## 4. Data-quality warnings

1. **Suspected automation dominates the latest week** (46 of 50 sessions, 38 of 39 QE). Read audience rows.
2. **`page_engaged` has never arrived.** PR #405 merged at 09:38 UTC on 18 October; the last ingested event is
   08:26 the same day, so no visit has happened since the merge. Whether production runs the M2 build is not
   confirmed from here (kinetixui.com and the Vercel project are not reachable from this environment). Treat
   "human-evidenced" as relying on click events and second pages until a `page_engaged` event is seen.
3. **No browser is marked internal.** The 18 October 07:47 session (64 page views, 36 QE signals, the only
   five-platform session) is unmarked and counts as audience; it is likely the owner reviewing the site, which is
   exactly what `?kx_traffic=internal` is for.
4. **One campaign session has a campaign but a `direct` source** (30 Sep, 85 minutes, 19 pages). It counts as
   campaign-attributed; it may be a returning visitor whose stored first touch carried the campaign.
5. **PostHog's test-account filter is cohort 583396, which is empty by construction** (M2). Dashboard tiles that
   rely on it filter nothing.

## 5. What this does not claim

- Not that the suspected cohort is bots. It is a rule with a documented false-positive case.
- Not that any campaign "worked" or "failed". The largest comparison here has 11 qualifying sessions.
- No reach, impressions, clicks, installs or customers. Those exist only on the platforms and npm, and none was
  supplied.
