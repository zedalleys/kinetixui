---
id: a02
type: measurement plan
campaign: kx_count_isnt_coverage
status: drafted
---

# a02 — measurement

Same model as a01. **Do not invent a new analytics model per campaign** — the
comparison between campaigns is most of the value.

Window: **14 days** from the LinkedIn post. Day 0 distribution, **day 7 early
read**, **day 14 decision**.

## Attribution

Uses the existing parser in `apps/web/src/lib/analytics-attribution.ts`. No
second system. It drops anything it does not recognise, so a mis-tagged link
produces *no* attribution rather than wrong attribution — safe, but invisible.

### Link table — run through the real parser, not inferred

Each row below was executed against `deriveAttribution` + `toProps`. The
"produces" column is what PostHog actually receives.

| Surface | `utm_content` | URL | Produces |
| --- | --- | --- | --- |
| LinkedIn primary | `li_primary` | `…/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_count_isnt_coverage&utm_content=li_primary` | `kx_source: linkedin`, `kx_medium: social`, `kx_campaign: kx_count_isnt_coverage`, `kx_content: li_primary`, `kx_landing_page: /docs/platforms` |
| LinkedIn alternative | `li_alt` | same with `utm_content=li_alt` | as above, `kx_content: li_alt` |
| X thread | `x_thread` | `…?utm_source=x&utm_medium=social&utm_campaign=kx_count_isnt_coverage&utm_content=x_thread` | `kx_source: x`, `kx_medium: social`, `kx_campaign: kx_count_isnt_coverage`, `kx_content: x_thread` |
| X standalone S1 | `x_numbers` | same with `utm_content=x_numbers` | as above, `kx_content: x_numbers` |
| X standalone S2 | `x_principle` | same | `kx_content: x_principle` |
| X standalone S3 | `x_checklist` | same | `kx_content: x_checklist` |
| X standalone S4 | `x_buildlog` | same | `kx_content: x_buildlog` |

### Two failures confirmed by running them

- **`utm_campaign=count-isnt-coverage` is discarded entirely.** The resulting
  property bag has **no `kx_campaign` key at all** — not a corrected value, no
  key. The regex is `/^kx_[a-z0-9][a-z0-9_-]{0,62}$/`. This is the single most
  likely way to lose this campaign's data and it fails silently.
- **`utm_medium=post` is a no-op.** Not a member of `ATTRIBUTION_MEDIUMS`, so it
  falls back to LinkedIn's default, which happens to be `social` anyway. The tag
  looks like it worked. Write `social` explicitly.

`utm_content` must match `/^[a-z0-9][a-z0-9_-]{0,63}$/` and is only kept when a
valid campaign is present.

## Primary metrics

| Metric | Where | Why |
| --- | --- | --- |
| **Sessions reaching `/docs/platforms`** attributed to `kx_count_isnt_coverage` | `docs_viewed` filtered by campaign | The entire post argues that the breakdown is the interesting thing. If people agree and do not go look at it, the argument did not land. |
| **Engaged exploration** — campaign sessions that view a second platform/docs page | `docs_viewed` count ≥ 2 per session | Distinguishes "clicked the link" from "actually inspected the evidence", which is the desired action for an awareness piece. |
| **Activation** — `cli_command_copied`, `install_command_copied`, `component_code_copied` | the three canonical events | Secondary. An awareness post converting at all is the interesting result, not the target. |

Canonical activation events are **not redefined** for this campaign.

## Explicitly not the success metric

**Impressions.** Recorded for context, never the headline. A thread reaching
50,000 people and producing no docs visits has failed at the only thing it was
for.

## Distribution sequence

| Day | Surface |
| --- | --- |
| 0 | LinkedIn primary (`li_primary`) |
| 1 | X thread (`x_thread`) |
| 2–4 | **one** standalone — S4 build-in-public first; it is the most likely to travel |
| 7+ | remaining standalones only if the early read justifies it |

Do not post all variants at once. The LinkedIn alternative (`li_alt`) is a
**substitute** for the primary, not an addition — pick one; running both to the
same audience in one week splits attribution for no gain.

## Day 7 early read

Enough campaign sessions to tell signal from noise? If `/docs/platforms` visits
are near zero while impressions are healthy, the post was agreeable and
unconvincing — that is a content result, not a distribution one.

## Day 14 decision

- Repeat the format if the breakdown argument produced docs exploration.
- If engagement was high and exploration was not, the visual carried it and the
  argument did not — rewrite before reusing.
- Record the numbers in `marketing/monthly-review.md` either way.
