# Marketing analytics

**Canonical** measurement specification: the funnel, what each stage means, what we may conclude from it,
and what we deliberately do not claim to measure. Strategy is [`STRATEGY.md`](./STRATEGY.md); what may be
asserted publicly is [`CLAIMS.md`](./CLAIMS.md).

Implementation lives in `apps/web/src/lib/analytics*.ts` and is documented there. This file is about
*decisions*, not code.

## The one rule

**A metric that cannot change a decision does not belong on the scorecard.** Page views are context. Nothing
in Tier 3 is a success measure, and nothing here is reported as a percentage of a number smaller than the
baseline policy in §8 allows.

---

## 1. Canonical funnel

Five stages, reconciled against what the Phase 2 site actually does. Each qualifying event exists today
unless marked.

| Stage | Visitor behaviour | Qualifying signal | Excludes | Primary metric | Informs |
| --- | --- | --- | --- | --- | --- |
| **Awareness** | Sees a link somewhere | None on-site — attribution only (`kx_source`, `kx_campaign`) | — | Attributed sessions | Which channels are worth repeating |
| **Discovery** | Arrives and reads | `$pageview` on `/`, plus session entry | Bounces with no second signal | Sessions with ≥1 semantic event | Whether the hero holds anyone |
| **Evaluation** | Inspects the product | **Qualified Evaluation**, §3 | Pageviews alone; homepage scroll | **Qualified Evaluation Rate** | Whether the proof lands |
| **Adoption intent** | Looks at how to adopt | **Adoption Intent**, §4 | Any inference of installing | Adoption Intent Rate · Evaluation → Intent Progression (§4) | Which rung people reach for |
| **Activation** | Actually installs and uses | **Not measurable on-site** — §5 | Everything above | — | — |

Discovery is deliberately weak. It is context for the stages that matter.

---

## 2. Primary early-stage marketing metric

### Qualified Evaluation Rate

> Of sessions that arrive, the share that reach **Qualified Evaluation** (§3).

**Why this one, now.** We have no users, no baseline and no revenue, so every mature north-star is
unavailable and any number built on traffic would reward the wrong work. Qualified Evaluation is the earliest
behaviour that means *someone looked at the product rather than the pitch* — and it is the thing Phases 1 and
2 were built to cause. It is computable from events that already exist, and it cannot be inflated by a
successful social post alone.

**What would replace it.** Real installs, once **D1** is promoted (§5) and a repeatable activation signal
exists. At that point Qualified Evaluation becomes a diagnostic and activation becomes the metric. Until
then, anything claiming to count installs is inferring.

---

## 3. Qualified Evaluation — definition

> A session in which someone inspects the product itself, not just the marketing surface.

A session qualifies on **any one** of these:

| Signal | Event | Why it counts |
| --- | --- | --- |
| Looked at a component | `component_viewed` | The catalogue is the product |
| Copied component code | `component_code_copied` | Stronger: they wanted the source |
| Copied a block's code | `block_code_copied` *(new, §7)* | A composition, on a named platform |
| Switched platform | `platform_selected` | Cross-platform is the position; this is someone testing it |
| Read platform coverage | `cta_clicked` → `platform_coverage` / `platform_availability` | Checking the claim |
| Followed the verification argument | `cta_clicked` → `view_verification` | The position, followed rather than read |
| Reached installation docs | `installation_viewed` | Adoption intent, which is also evaluation |

**One signal is enough, deliberately.** Requiring two or three would look more rigorous and would mostly
measure patience. A person who opens `/components`, finds nothing for them and leaves has still evaluated —
and that is a fact we want in the denominator of everything else.

**Excluded on purpose:** homepage `$pageview`, scroll depth, time on page, `external_link_clicked`,
`changelog_viewed`, and every `preset_*` event from `/create` (a theming toy, not product evaluation).

**Derived, not emitted.** This is a PostHog-side definition over existing events. Emitting a
`qualified_evaluation` event would create a second source of truth that could disagree with its own inputs.

---

## 4. Adoption Intent — definition

> A session in which someone looks at *how to adopt*.

| Signal | Event |
| --- | --- |
| Installation documentation | `installation_viewed` |
| Copied an install or CLI command | `install_command_copied`, `cli_command_copied` |
| Reached for a ladder rung | `cta_clicked` → `adopt_tokens` / `adopt_components` / `adopt_blocks` |

**Adoption Intent is not activation.** It is the strongest on-site signal available and it stops well short
of the claim.

**Adoption Intent does not require evaluation.** The signal list above *is* the definition. A session that
copies an install command without ever opening a component page is Adoption Intent, and that is deliberate —
arriving already knowing what you want is a real behaviour and hiding it would flatter nothing. It is also
why the next two measures are separate, with different denominators, rather than one rate.

### Adoption Intent Rate

> **Numerator** — sessions with ≥1 Adoption Intent signal.
> **Denominator** — **eligible arriving sessions**: every session the site received events from at all. The
> same denominator as Qualified Evaluation Rate (§2), so the two are readable side by side.

*For:* how much of arriving traffic reaches adoption documentation at all. A share of arrivals — **not a
conversion rate**, and nothing may present it as one.

### Evaluation → Intent Progression

> **Numerator** — sessions containing **both** a Qualified Evaluation signal (§3) and an Adoption Intent
> signal, where the intent signal occurs **after or within** the evaluation: same session, intent timestamp
> at or later than the session's first qualifying evaluation. `installation_viewed` is both signals at once
> and counts as *within*.
> **Denominator** — Qualified Evaluation sessions (§3).

*For:* whether evaluation leads anywhere. This is the conversion measure, and it is bounded by 100% because
its numerator is a subset of its denominator.

**How they diverge.** A campaign landing people directly on `/docs/installation` raises Adoption Intent Rate
and leaves Progression untouched; a component gallery that holds attention but offers no next step raises
Qualified Evaluation Rate and lowers Progression. They can move in opposite directions on the same week's
traffic, which is the whole reason for keeping two numbers.

**Never divide Adoption Intent by Qualified Evaluation.** That quotient is neither measure: its numerator is
not a subset of its denominator, so it can exceed 100% — observed, not hypothetical, on 2026-09-21 (6
Adoption Intent sessions against 5 Qualified Evaluation sessions).

**Ordering is available.** Verified in `analytics-posthog.ts`: PostHog's own `$session_id` and event
timestamps are untouched by `before_send`, which deletes only referrer and campaign properties and strips
query strings from URL-valued ones. Progression is therefore computable PostHog-side, like every other
definition here — derived, not emitted.

---

## 5. The activation boundary

**Activation is not measurable from this website, and we do not report it.**

- A docs visit is not an installation.
- A copied command is not an installation — the clipboard is where our knowledge ends.
- A `/docs/cli` visit is not activation.

`CLAIMS.md` **D1** (one-command installation) is **PENDING LIVE VERIFICATION**, and no analytics definition
may quietly promote it. Any metric named "installs", "activations" or "conversions" built from the events
above would be an inference presented as a count.

**What would make activation measurable** — none of it in this phase, all of it a deliberate decision:
npm download statistics for `@kinetixui/cli` (public, coarse, no session join); a registry-side request
count for `/r/*.json` (server-side, would need its own privacy review); or opt-in CLI telemetry (which we
have no intention of adding). Until one exists, the honest answer to "how many people installed it?" is
**we do not know**.

---

## 6. KPI hierarchy

### Tier 1 — decision metrics (5)

| KPI | Definition | Decision it informs | Baseline |
| --- | --- | --- | --- |
| **Qualified Evaluation Rate** | Qualified Evaluation sessions ÷ eligible arriving sessions | Is the site converting attention into inspection? | NO BASELINE |
| **Adoption Intent Rate** | Adoption Intent sessions ÷ eligible arriving sessions (§4) | How much of arriving traffic reaches adoption docs? | NO BASELINE |
| **Evaluation → Intent Progression** | Sessions with intent after or within evaluation ÷ Qualified Evaluation sessions (§4) | Does evaluation lead anywhere? | NO BASELINE |
| **Content → Qualified Evaluation** | Qualified Evaluation rate of `kx_campaign`-attributed sessions vs direct | Does content bring the right people? | NO BASELINE |
| **Returning evaluators** | Distinct anonymous IDs with Qualified Evaluation in ≥2 sessions | Sustained interest — the strongest signal available pre-adoption | NO BASELINE |

### Tier 2 — diagnostics

Platform interest (`platform_selected` by platform) · component interest (`component_viewed` by component) ·
block interest (`block_code_copied` by block) · adoption-rung split (`adopt_*`) · CTA progression
(`cta_clicked` by source/target) · docs progression (`docs_viewed` by page) · code-copy behaviour.

### Tier 3 — context, never the scorecard

Sessions · pageviews · referrers · attribution source and medium.

---

## 7. Event changes in this phase

Only one gap was worth code. Everything else the funnel needs already existed.

| Change | Why |
| --- | --- |
| **`blocks_gallery` source** | `/blocks` had no analytics source at all, so Phase 2's `adopt_blocks` CTA pointed at a page where nothing could be observed |
| **`block` property** | A block slug. Its own property rather than reusing `component`, because a block is a composition of catalogue components and folding them together would inflate `component_*` with a different kind of thing — the same reasoning that kept IoT examples separate |
| **`block_code_copied`** | Which composition, on which platform. Both properties required: a copy with neither answers no question |
| **`platform_selected` gains optional `block`** | The gallery's platform tabs were emitting nothing |
| **`analyticsPlatformFor()`** | Maps a manifest platform name to the analytics vocabulary **and validates membership**, so a future platform that does not map produces *no* dimension rather than an unvalidated string |

**No renames.** Historical continuity matters more than tidiness.

**Vocabulary health, audited:** no duplicate events; no event without a decision it supports; every
documented event is emitted and every emitted event is documented. (`button_clicked` appears in the
repository only as a test fixture, not in shipped code — checked rather than assumed.)

---

## 8. Attribution and campaign conventions

Verified from `analytics-attribution.ts`: `utm_campaign` must match `/^kx_[a-z0-9][a-z0-9_-]{0,62}$/`, and
anything unrecognised is **dropped rather than guessed**. A mis-tagged link produces no attribution — a safe
but invisible failure, so links are worth checking.

Stored per session and first touch: `kx_source`, `kx_medium`, `kx_campaign`, `kx_content`, `kx_referrer`,
`kx_landing_page`. No personal identifiers, no raw URLs.

### Canonical campaign name

```
kx_<icp>_<pillar>_<asset>
```

- **icp** — `p1` (architecture-led), `p2` (drift-led), `neutral`
- **pillar** — `a` verified cross-platform · `b` tokens · `c` engineering · `d` accessibility/RTL ·
  `e` device interfaces · `g` build-in-public (from [`CONTENT-PILLARS.md`](./CONTENT-PILLARS.md))
- **asset** — short slug for the specific piece

Examples: `kx_p1_a_parity_audit` · `kx_p2_b_token_only_flutter` · `kx_neutral_g_registry_defect`

Channel travels in `utm_source` (normalised against `ATTRIBUTION_SOURCES`), format in `utm_medium`, and a
variant in `utm_content`.

---

## 9. ICP measurement — and its limits

**Attribution indicates message intent, not identity.** A `kx_p1_*` session means *someone arrived through
architecture-led messaging*. It does **not** mean they are a design-system engineer. We have no identity
data and are not collecting any, so every ICP statement is about which message earned the click.

Compare `kx_p1_*` against `kx_p2_*` sessions on: Qualified Evaluation Rate, Adoption Intent Rate,
Evaluation → Intent Progression, which ladder rung (`adopt_tokens` skews P2, `adopt_components` skews P1),
platform interest, and verification engagement.

**Do not declare a winner.** `STRATEGY.md` §13 unknown #1 is open and stays open until the evidence rules in
§10 are met. The honest framing is *"P2-attributed sessions evaluate at a higher rate"* — never *"P2 is our
ICP"*.

---

## 10. Baseline policy and decision rules

### Baseline

**Every Tier 1 KPI is NO BASELINE until the first distribution period completes.**

The baseline window is **the first 6 weeks of real distribution, or 300 sessions with ≥30 qualified
evaluations, whichever is later.** Calendar time alone does not establish a baseline; sample size overrides
the date in both directions. Until then, report absolute counts and never a percentage change.

No targets are set in this phase. "Increase conversion 20%" against no baseline is a number invented to be
met.

### When evidence is enough

| Evidence | Action |
| --- | --- |
| Fewer than ~30 qualified evaluations in a comparison | **KEEP.** Change nothing. This is noise |
| A directional gap that persists across 2+ review cycles | **INVESTIGATE.** Look for a mechanism |
| A mechanism plus a repeated pattern | **TEST.** One change, stated in advance |
| A tested change that holds, or qualitative feedback agreeing with behaviour | **CHANGE** |

**Never:** change positioning from a handful of sessions · declare a P1/P2 winner from click-through alone ·
optimise to pageviews · run an A/B test at this traffic level (the infrastructure exists; the traffic does
not, and an underpowered test produces confident nonsense).

---

## 11. Dashboard — "KinetixUI — marketing funnel"

**BUILT 2026-09-29.** `https://us.posthog.com/project/620385/dashboard/2148797` — 11 numbered insights, the
3 funnels, returning evaluators, and a text tile carrying the reading rules, so no number on it can be read
without §10's baseline policy beside it.

There is still no dashboard-as-code convention here, and inventing one for eleven insights would be its own
maintenance burden. The spec below stays canonical; the dashboard is built from it.

**Two things about it are worth knowing before reading any tile.**

**A. Five tiles cannot receive data yet.** The deployed site runs `main`, and the Phase 2–6 analytics
vocabulary is on an unmerged branch. `platform_coverage`, `view_verification`, `adopt_tokens`,
`adopt_components`, `adopt_blocks`, `block_code_copied`, `platform_selected` and `blocks_gallery` have
**never fired in the project**, verified against the event table. Insights 7 and 9 are empty by
construction, 3 shows only the retired `get_started`/`installation` CTAs, 5 and 6 under-count because three
of the six Qualified Evaluation signals cannot fire, and Funnel 3 is empty. **An empty tile means "not
deployed", not "nobody did it"** — and this is a prerequisite for Day 1 that no earlier phase listed.

**B. An older dashboard contradicts §5.** "KinetixUI — Developer Growth & Activation" (dashboard 2120439,
created 2026-09-21, pinned) has `Developer Activation Rate — Observed` as its headline tile: copy events ÷
pageviews, displayed as a percentage. That is the inference §5 forbids, and it predates this specification.
It was **left untouched rather than edited** — it is a record of what was being measured then, and rewriting
someone's dashboard to match a later rule is the same mistake as retro-editing a changelog. Treat the
marketing-funnel dashboard as canonical and retire the older one when its remaining product tiles have been
re-homed.

### The defect in §4, found by building it — now resolved in §4

`Adoption Intent Rate` was defined in §6 as Adoption Intent ÷ Qualified Evaluation, and §4's prose said
"having evaluated" — but §4's *signal list* does not require it. `install_command_copied`,
`cli_command_copied` and the `adopt_*` CTAs are not Qualified Evaluation signals, so a session can reach
Adoption Intent without ever qualifying, and **that quotient can exceed 100%**. This is not hypothetical: on
2026-09-21 the project recorded 6 Adoption Intent sessions against 5 Qualified Evaluation sessions.

**Resolved by separating the two questions rather than picking one of them.** §4 now defines **Adoption
Intent Rate** (÷ eligible arriving sessions — a share of arrivals) and **Evaluation → Intent Progression**
(÷ Qualified Evaluation sessions, intent after or within the evaluation — the conversion) as two measures
with explicit numerators and denominators. Neither of the two options previously written down was taken:
making Adoption Intent require evaluation would have discarded a real behaviour, and simply swapping the
denominator would have left the progression question unanswered.

**The live dashboard has NOT been changed, and now disagrees with this specification.** Insight 8 still
reports Adoption Intent and Qualified Evaluation as **counts** against each other, which is safe — no
misleading percentage is displayed — but it is not either measure named above, and insight 10's `Both`
column is the overlap Progression would use rather than Progression itself. **Manual follow-up:** rebuild
insight 8 as Adoption Intent Rate over eligible arriving sessions, and add Evaluation → Intent Progression
over Qualified Evaluation sessions, before either is read as a rate. Until that is done the spec is
canonical and the tile is stale.

**11 insights.**

| # | Name | Event / filter | Breakdown | Range | Question |
| --- | --- | --- | --- | --- | --- |
| **Acquisition** |
| 1 | Attributed sessions | sessions with `kx_source` | `kx_source` | 30d | Where do visitors come from? |
| 2 | Campaign sessions | sessions with `kx_campaign` | `kx_campaign` | 30d | Which asset is working? |
| **Discovery** |
| 3 | Homepage CTA split | `cta_clicked`, source `homepage_hero` | `target` | 30d | Which hero CTA earns the click? |
| 4 | Entry → second signal | sessions with ≥1 semantic event ÷ all | — | 30d | Does the hero hold anyone? |
| **Qualified evaluation** |
| 5 | **Qualified Evaluation Rate** | QE definition §3 ÷ sessions | — | 30d | **Tier 1** |
| 6 | Evaluation entry point | first QE event in session | event name | 30d | What starts evaluation? |
| 7 | Verification engagement | `cta_clicked` → `view_verification`, `platform_coverage` | `source` | 30d | Does the position get followed? |
| **Adoption intent** |
| 8 | **Adoption Intent Rate** | AI §4 and QE §3 as counts — **stale, see above**; §4 now specifies AI ÷ eligible arriving sessions, plus a second tile for Evaluation → Intent Progression | — | 30d | **Tier 1** |
| 9 | Adoption-rung split | `cta_clicked` → `adopt_*` | `target` | 30d | Which rung do people reach for? |
| **ICP and content** |
| 10 | **ICP hypothesis comparison** | QE and AI rates, with a `Both` overlap column | `kx_campaign` prefix (`kx_p1`/`kx_p2`) | 90d | **Tier 1** — which message converts? |
| 11 | Platform interest | `platform_selected` | `platform` | 30d | Which platform draws attention? |

Component and block interest are deliberately **not** dashboard insights. They are long-tail lists, better
queried when a question arises than watched weekly.

### Funnels (3, flexible-step)

1. **Homepage → evaluation → intent:** `$pageview /` → any QE signal → any AI signal.
2. **Campaign → evaluation:** session with `kx_campaign` → any QE signal, broken down by campaign.
3. **Coverage → component:** `cta_clicked` → `platform_coverage` → `component_viewed`.

All flexible-step: these are not journeys anyone must take in order, and forcing linearity would report a
funnel the product does not have.

### Returning evaluators

PostHog's anonymous distinct ID already supports this with `person_profiles: identified_only` — no identity
collection, no new tracking. Counted as distinct anonymous IDs with a qualified evaluation in two or more
sessions. Treat as directional: cleared cookies and multiple devices both undercount, and we will never know
by how much.

---

## 12. Review cadence

**Weekly** (30 min, per [`weekly-review.md`](./weekly-review.md)) — Tier 1 counts as *absolute numbers*, the
CTA split, anything that broke. No percentage changes before baseline. Captures land in
[`research/`](./research/).

**Monthly** (per [`monthly-review.md`](./monthly-review.md)) — Tier 1 as rates if baseline exists, ICP
comparison, channel performance, and one question: *did anything here change a decision?* A metric that has
not informed a decision in three months is a candidate for deletion, including from this file.

**Never daily.** At this volume, daily numbers are noise with a narrative attached.

---

## 13. Privacy — unchanged, and not negotiable

`kx_*` first-touch and session-entry attribution · `respect_dnt` · autocapture and session replay **off** ·
`person_profiles: identified_only` · a runtime property allowlist that drops anything not explicitly
permitted, including PostHog-injected `$session_entry_utm_*` / `gclid` / `ph_keyword`.

**Do not** add invasive tracking, session recording, or any field carrying user text. No event in this
specification carries anything but short identifiers from closed vocabularies — no URLs, no copied strings,
no search terms, no names.
