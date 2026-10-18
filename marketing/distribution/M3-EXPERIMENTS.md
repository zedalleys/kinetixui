---
type: distribution experiment designs
prepared: 2026-10-18 (M3)
status: PROPOSED. None is running. Each starts only when the owner approves its first post through the normal content approval
---

# Three distribution experiments

These are small, sequential comparisons, not A/B tests. analytics.md §10 rules out A/B testing at this traffic, and
§2 of [`../measurement/M3-AUDIENCE-QUALITY.md`](../measurement/M3-AUDIENCE-QUALITY.md) shows why: 11 audience
Qualified Evaluation sessions in three weeks. Each experiment therefore pre-registers what it measures and what
would count as evidence, then waits for that evidence instead of reading a result into a handful of sessions.

**Rules shared by all three**

- **Canonical QER is not changed and is not the success metric.** Every metric below is a count from the audience
  cohort of the weekly report (`classifySession` = `audience`), with suspected automation, internal and diagnostic
  traffic outside it.
- **One experiment at a time** (`../experiments.md`, *Rules*). Order: B first (no new copy needed), then A, then C.
- **Arms are told apart only by `utm_content`.** The campaign stays the asset's own `kx_…` campaign so every post
  still passes `check:distribution`; the arm suffix is in the content tag, which the parser keeps
  (`^[a-z0-9][a-z0-9_-]{0,63}$`). The weekly report's *By campaign / content* table then shows each arm on its own row.
- **Every post still goes through approval** (copy pin, manual posting, live URL at close-out). An experiment never
  authorises a post.
- **Evidence floor.** No arm is called better until **each arm has at least 30 audience Qualified Evaluation
  sessions** (analytics.md §10) **and** the gap has held across **two consecutive weekly reports**. Below that, the
  result is written as "no evidence yet", and the simpler option is kept (`../experiments.md`: an ambiguous result is
  negative).
- **Never A/B a truth claim.** Both arms say only what `CLAIMS.md` allows; accuracy is not a variable.

---

## A. Messaging: infrastructure versus component library

| | |
| --- | --- |
| Hypothesis | P1 readers who arrive from infrastructure messaging ("platform claims verified against source in CI") evaluate more than those who arrive from component-library messaging ("109 components across five platforms"), because the infrastructure angle is the differentiator and the library angle competes with every UI kit |
| Audience | P1, multi-platform design-system engineers, on LinkedIn |
| Arms | **A1 infrastructure**: an existing pillar-a/d post (e.g. LI-008). **A2 library**: a post of the same length and format, same destination, leading with the catalogue (to be drafted and approved; figures from `pnpm marketing:stats` on the day) |
| Destination | `/docs/platforms` for both, so only the message differs |
| Tagging | `utm_source=linkedin&utm_medium=social&utm_campaign=<the asset's kx_ campaign>&utm_content=li_xa_infra` / `li_xa_library` |
| Primary metric | Audience Qualified Evaluation sessions per arm |
| Secondary metric | Human-evidenced arrivals per arm (audience sessions with a click event, a second page or `page_engaged`) |
| Minimum evidence | 30 audience QE sessions per arm and the same direction in two consecutive weekly reports |
| Stop condition | Six weeks or four posts per arm without reaching the floor: stop, record "no evidence", keep infrastructure as the primary message (it is the stated positioning) |
| Reporting | One row per arm in the weekly report's campaign table; a short line in each Monday review: counts per arm, "no evidence yet" until the floor |

## B. Destination: platform coverage versus a relevant component or Use Case page

| | |
| --- | --- |
| Hypothesis | Arrivals sent to a page that matches the post's subject (a component page, or `/use-cases/commerce` / `/use-cases/travel-booking`) evaluate more than arrivals sent to `/docs/platforms`. Observed motivation, not evidence: over three weeks `/docs/platforms` took 18 audience arrivals and produced 1 evaluation, while the homepage produced 9 of the 11 |
| Audience | P2, web and native product teams (component- and workflow-led posts); P1 for the coverage arm |
| Arms | **B1 coverage**: `/docs/platforms`. **B2 relevant page**: the component page or Use Case page the post discusses |
| Destination | as above; the post's copy is unchanged, only the link differs, so this needs no new copy approval beyond the link |
| Tagging | `utm_content=li_xb_coverage` / `li_xb_relevant` (or `x_xb_…` on X) |
| Primary metric | Audience Qualified Evaluation sessions per arm |
| Secondary metric | Audience sessions with more than one page view (did the landing lead anywhere) |
| Minimum evidence | 30 audience QE sessions per arm, two consecutive weeks in the same direction |
| Stop condition | Six weeks without the floor, or a landing page that breaks attribution (a tagged post with zero tagged arrivals twice in a row): stop and fix the link before going on |
| Reporting | Weekly report *By campaign / content* and *Conversion by landing page* tables |
| Caveat | Component pages fire `component_viewed` on render, so B2 qualifies on load and would win on the canonical rate by construction. That is why the metric is the audience cohort, and why the secondary metric (a second page) carries weight here |

## C. Developer intent: technical proof versus a practical first-use example

| | |
| --- | --- |
| Hypothesis | A post that shows a first use (one install command and the component rendering) produces more Adoption Intent than a post that shows technical proof (the verification story), for developers who already accept the premise |
| Audience | P2 developers, on X and dev.to comments; P1 for the proof arm |
| Arms | **C1 proof**: an existing proof post (X-001's family). **C2 first use**: a short post with one `npx @kinetixui/cli …` or `npm i @kinetixui/ui` line and a screenshot, linking `/docs/installation` (to be drafted and approved) |
| Tagging | `utm_content=x_xc_proof` / `x_xc_firstuse` |
| Primary metric | Audience sessions with an Adoption Intent signal per arm (analytics.md §4: install or CLI copy, or an adopt CTA). `installation_viewed` alone fires on render, so it is reported but not counted as the primary signal for this experiment |
| Secondary metric | Evaluation → Intent Progression in the audience cohort |
| Minimum evidence | 30 audience QE sessions per arm before any intent comparison is read; Adoption Intent counts are reported as absolute numbers until then |
| Stop condition | Six weeks or four posts per arm; also stop if C2's install line ever names a package version no package has (checked by `pnpm check:content` and `verify-package.mjs`) |
| Reporting | Weekly report *Adoption Intent* and *Installation interest* sections, per arm |

---

## What would change a decision, and what would not

- **Would:** an arm crossing the floor with a gap that holds for two reports, together with a mechanism the
  team can name (analytics.md §10: INVESTIGATE, then TEST, then CHANGE).
- **Would not:** a single post with many clicks, a platform's reach figure, canonical-QER movement, or any
  comparison with fewer than 30 audience evaluations per arm.
