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

## Adoption Intent — Tier 1 ([`analytics.md`](./analytics.md) §4)
Someone looking at *how to adopt*, having evaluated. **Not an install count.**
- `installation_viewed`:
- `install_command_copied` · `cli_command_copied`:
- `cta_clicked` → `adopt_tokens` / `adopt_components` / `adopt_blocks`:
- **Adoption Intent sessions (count):**
- **Which rung** did people reach for:

## Distribution — from [`distribution/register.json`](./distribution/register.json)
- Assets published this week, by channel:
- Rows appended to the register (date + result filled in):
- Anything planned and **not** published, and why:
- **Content → Qualified Evaluation:** campaign-attributed sessions vs direct, as counts:
- **P1 vs P2:** `kx_p1_*` vs `kx_p2_*` counts. **Do not declare a winner** ([`analytics.md`](./analytics.md) §9):
- Community contributions made, and whether the rules were re-read first:

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
- One content priority:
- One product priority that creates content:
- One experiment ([`experiments.md`](./experiments.md)) — **one at a time**:
