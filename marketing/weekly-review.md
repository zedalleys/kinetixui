# Weekly review

30 minutes, same day each week. Copy this block into `research/YYYY-MM-DD.md`.

> **Read every number from source, not from last week's file.**
> `pnpm marketing:stats` prints the derived product numbers.

> **Before baseline, report absolute counts — never a percentage change.**
> Every Tier 1 KPI is NO BASELINE until the window in [`analytics.md`](./analytics.md) §10 closes:
> six weeks of real distribution, or 300 sessions with ≥30 qualified evaluations, whichever is later.
> A rate computed from nine sessions is a story, not a measurement.

> **Nothing here is named "activation".** Activation is **not measurable from this website**
> ([`analytics.md`](./analytics.md) §5) and `CLAIMS.md` **D1** is `PENDING LIVE VERIFICATION`. A copied
> command is where our knowledge ends. The strongest honest signal is **Adoption Intent**, below.

## Period and sources
- Reporting period (UTC, Monday 00:00 to Sunday 23:59):
- PostHog project and the query or dashboard tile each number came from (dashboard "KinetixUI — marketing
  funnel"; any one-off query pasted into the capture):
- Repository commit the product numbers were read at (`pnpm marketing:stats`):
- Inventory at the start of the week: `pnpm marketing:inventory` (statuses, planned versus actual dates)
- What could not be read this week, and why (a channel's own analytics, a live URL):

## Traffic — Tier 3, context only
- Sessions:
- Acquisition channels (`kx_source`), as counts:
- Campaigns (`kx_campaign`), as counts:
- Top landing pages:

## Qualified Evaluation — Tier 1 ([`analytics.md`](./analytics.md) §3)
Sessions in which someone inspected the product rather than the pitch. Any one signal is enough.
- `component_viewed` · `component_code_copied`:
- `block_code_copied`:
- `platform_selected`:
- `cta_clicked` → `platform_coverage` / `platform_availability` / `view_verification`:
- `installation_viewed`:
- **Qualified Evaluation sessions (count):**
- **Which event started it** most often:
- **Automated-traffic check:** how many Qualified Evaluation sessions were *suspected automation*: one page
  view, no event a person causes, under 5 seconds, arriving with `kx_referrer = direct` (the raw referrer is
  never stored, so "no referrer" means that category)? `pnpm marketing:weekly` prints this cohort; the rule and
  its evidence are in [`analytics.md`](./analytics.md) §11 *Traffic cohorts*. Report them beside the count,
  never silently inside it. In the week of 12 to 19 October all 38 such Qualified Evaluation sessions came from
  this cohort ([`measurement/M2-TRAFFIC-QUALITY.md`](./measurement/M2-TRAFFIC-QUALITY.md)). Whether to exclude
  them from the definition is the owner's decision in `analytics.md`, not a reviewer's in a query.

## Adoption Intent — Tier 1 ([`analytics.md`](./analytics.md) §4)
Someone looking at *how to adopt*. Evaluation is **not** required — see `analytics.md` §4, which is why the
rate and the progression are separate measures. **Not an install count.**
- `installation_viewed`:
- `install_command_copied` · `cli_command_copied`:
- `cta_clicked` → `adopt_tokens` / `adopt_components` / `adopt_blocks`:
- **Adoption Intent sessions (count):**
- **Sessions with intent after or within evaluation (count)** — the numerator of Evaluation → Intent
  Progression (`analytics.md` §4). Do **not** divide Adoption Intent by Qualified Evaluation:
- **Which rung** did people reach for:

## Distribution — from [`distribution/register.json`](./distribution/register.json)
- Assets published this week, by channel, **each with its live URL** (no URL, not published):
- Planned versus actual date for each, from `pnpm marketing:inventory`:
- Rows appended to the register (date + result filled in):
- Anything planned and **not** published, and why:
- **Content → Qualified Evaluation:** campaign-attributed sessions vs direct, as counts:
- **P1 vs P2:** `kx_p1_*` vs `kx_p2_*` counts. **Do not declare a winner** ([`analytics.md`](./analytics.md) §9):
- Community contributions made, and whether the rules were re-read first:

## Engagement — platform-reported, context only
Copy only what the channel itself shows (LinkedIn, X and dev.to analytics), with the date it was read.
Leave a field empty rather than estimate it. None of these is a Tier 1 metric.
- Per asset: impressions · clicks · reactions · comments · reposts or shares · read date:
- Paid amplification running this week, if any (`amplification` log), so its counts are not read as organic:

## Exploration — Tier 2
- Docs views · component views · platform-doc views:
- Top components:
- **Platform interest** (`platform_selected` by platform) — which platform are people here for:

## Search
- Impressions / clicks:
- New queries worth a page ([`seo.md`](./seo.md)):

## Content
- Best performer, and the honest reason:
- Worst performer, and whether it was the **topic**, the **framing** or the **destination**:

## Community and GitHub
- Stars · forks · issues opened/closed · discussions · new contributors:
- **Stars are context, not a result** — record the shape against posting dates, never report it as an outcome:

## Feedback
- Meaningful replies and questions — the number that is a person, not an event:
- Requests received, routed per [`distribution/README.md`](./distribution/README.md) §8:
- Anything said three times → roadmap or content:

## Verdicts
One per line reviewed, from [`analytics.md`](./analytics.md) §10's evidence ladder:

| Verdict | When |
| --- | --- |
| **KEEP** | Under ~30 qualified evaluations in the comparison. This is noise. Change nothing |
| **INVESTIGATE** | A directional gap that has persisted across 2+ cycles. Look for a mechanism |
| **TEST** | A mechanism plus a repeated pattern. One change, stated in advance |
| **CHANGE** | A tested change that held, or qualitative feedback agreeing with the behaviour |

- Verdicts this week:

## Next week
- Content to publish (from the execution calendar, `distribution/execution-calendar.md`):
- Content to improve (a draft whose `verify-package.mjs` fails, a stale figure):
- Product issues for BD-W4 (adoption friction seen in sessions or replies), routed to that workstream:
- Development milestones worth covering (`opportunities.md`), only once live:
- One content priority:
- One product priority that creates content:
- One experiment ([`experiments.md`](./experiments.md)) — **one at a time**:
