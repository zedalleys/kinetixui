# Week 1 measurement integrity audit

**Date:** 2026-10-05 · **Base:** `main` at `6e13ccb` · **Scope:** does the site emit what
[`analytics.md`](../analytics.md) measures, and can that support the 30-day distribution plan?

This audit establishes **measurement integrity**. It does **not** declare any campaign, channel or message a
success or a failure. Every number below is an operational observation.

## Verdict

**PASS WITH NOTES.**

Every Qualified Evaluation and Adoption Intent signal is defined, emitted from a reachable surface, fires once
per action, and carries campaign attribution through client-side navigation into the same PostHog session, in
unit tests, with the real SDK, and in a real browser against a real build. One genuine instrumentation defect
was found and fixed: it sits outside both definitions. Four documentation defects were found and corrected.

The notes are about **what the definitions measure**, not about the code. The biggest one: the campaigns so far
land on docs pages, and a docs landing on its own is neither evaluation nor intent (§ Week 1 interpretation
boundary).

## Canonical measurement model

Owner: `marketing/analytics.md`. Its executable form is now `apps/web/src/lib/analytics-measurement.ts`, and
`analytics-measurement.test.tsx` fails if the two disagree.

**Qualified Evaluation** (§3): a session with **any one** of:
`component_viewed` · `component_code_copied` · `block_code_copied` · `platform_selected` ·
`cta_clicked` with target `platform_coverage`, `platform_availability` or `view_verification` · `installation_viewed`.

**Adoption Intent** (§4): a session with **any one** of:
`installation_viewed` · `install_command_copied` · `cli_command_copied` ·
`cta_clicked` with target `adopt_tokens`, `adopt_components` or `adopt_blocks`.
It does not require evaluation.

`cli_command_copied` **is** in the canonical Adoption Intent definition, explicitly, in §4. It was not added to
match PostHog; it was already there. Strategy and implementation agree.

**Not evaluation and not intent:** `$pageview`, `docs_viewed`, `github_clicked`, `external_link_clicked`,
`changelog_viewed`, `iot_example_copied`, `preset_*`, `create_export_*`, and `cta_clicked` with `get_started`,
`browse_components`, `read_docs`, `installation` or `view_changelog`. The test asserts this list.

**Rates** count **sessions** (`$session_id`), never events: QE Rate and Adoption Intent Rate ÷ eligible arriving
sessions; Evaluation → Intent Progression ÷ QE sessions. Activation is not measurable on-site (§5).

## Event integrity matrix

Live counts are PostHog, last 30 days to 2026-10-05 07:42 UTC, read-only query (82 sessions, 175 `$pageview`).
They show **delivery happened**; a zero does not show breakage.

| Event (or CTA target) | Defined | Emission site | Reachable UI | Tested | Live 30d (events/sessions) | Expected frequency | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `component_viewed` | §3 | `trackRouteView` via `AnalyticsProvider` | any `/docs/components/<slug>` | unit, provider, browser | 7 / 6 | every component page view | **ACTIVE** |
| `component_code_copied` | §3 | `ComponentPreview` code pane; `CodePre` on component pages | component page → code → copy | unit, instrumentation | 2 / 2 (last 09-21) | low | **VALID, LOW-FREQUENCY** |
| `block_code_copied` | §3 | `Showcase` (`analyticsBlock` on `/blocks` only) | `/blocks` → code → copy | unit, browser (touch) | 0 | low: `/blocks` is two clicks from any campaign destination | **VALID, LOW-FREQUENCY** (A) |
| `platform_selected` | §3 | `ComponentPreview`, `Showcase`, `CrossPlatformFlagship` | platform tabs on component pages, `/blocks`, homepage | unit, browser (touch) | 9 / 2 | low–medium | **ACTIVE** |
| `cta_clicked` → `platform_coverage` | §3 | homepage hero secondary button | `/` | rendered-homepage click | 0 | homepage-only | **VALID, LOW-FREQUENCY** (A) |
| `cta_clicked` → `platform_availability` | §3 | homepage flagship "What ships where" | `/` | rendered-homepage click | 0 | homepage-only | **VALID, LOW-FREQUENCY** (A) |
| `cta_clicked` → `view_verification` | §3 | homepage verification section | `/` | rendered click; browser (keyboard) | 0 | homepage-only | **VALID, LOW-FREQUENCY** (A) |
| `installation_viewed` | §3, §4 | `trackRouteView` | `/docs/installation` | unit, provider, browser | 7 / 7 | medium | **ACTIVE** |
| `install_command_copied` | §4 | `CodePre` fences; `/iot` install command | `/docs/installation`, `/docs/iot`, `/docs/angular`, `/iot` | unit, instrumentation | 0 | low | **VALID, LOW-FREQUENCY** (A) |
| `cli_command_copied` | §4 | `HeroCommand`; `CodePre` | homepage hero; installation and component docs | unit, instrumentation, browser | 5 / 4 | low–medium | **ACTIVE** |
| `cta_clicked` → `adopt_tokens` / `adopt_components` / `adopt_blocks` | §4 | homepage adoption ladder | `/` | rendered-homepage click | 0 | homepage-only | **VALID, LOW-FREQUENCY** (A) |
| `$pageview` | context | `AnalyticsProvider` | every route | provider, real SDK, browser | 175 / 82 | every page | **ACTIVE** (Tier 3) |
| `docs_viewed` | Tier 2 | `trackRouteView` | listed `/docs/*` | unit, browser | 37 / 32 | most common | **ACTIVE** (not QE) |
| `cta_clicked` → `browse_components`, `installation` | Tier 2 | homepage hero | `/` | provider | 1 / 1, 5 / 5 | | **ACTIVE** |
| `cta_clicked` → `get_started` from `homepage_hero` | — | none today | — | — | 3 / 3, all 2026-09-21 | — | **LEGACY** (pre-Phase-2 hero; `get_started` now only in the closer) |
| `cta_clicked` → `read_docs`, `view_changelog` | Tier 2 | homepage, `/iot` | yes | provider | 0 | low | VALID, LOW-FREQUENCY |
| `github_clicked` | Tier 2 | provider (outbound) | header, footer, docs, **homepage closer (fixed)** | provider, rendered homepage | 1 / 1 | low | **ACTIVE** — was under-counted, Bug 1 |
| `npm_clicked` | Tier 2 | provider (outbound) | **none**: the site links no npm page | unit | 0 | none | **DEAD** by construction (documented in ANALYTICS.md; fires the day a link is added) |
| `external_link_clicked`, `changelog_viewed`, `iot_example_copied`, `preset_*`, `create_export_*` | excluded | various | yes | unit | 0–4 | low | VALID (outside the funnel) |
| "Developer Activation Rate" | — | — | — | — | — | — | **DOCUMENTATION DRIFT**, retired (Doc 1) |

### The events "missing" from the live taxonomy

| Name | What it is | Finding |
| --- | --- | --- |
| `block_code_copied` | an event | **A** — implemented, reachable, browser-verified; no one copied a block in the window |
| `view_verification`, `platform_coverage` | **`target` values** of `cta_clicked` | **A** — they can never appear in an *event-name* taxonomy. Reachable, verified, unused in the window |
| `adopt_tokens`, `adopt_components`, `adopt_blocks` | **`target` values** of `cta_clicked` | **A** — same |
| `blocks_gallery`, `homepage_verification`, `homepage_adoption` | **`source` values** | **A** — they appear only when an event from that surface fires; none did |

None is B (unreachable), C (removed), D (renamed), E (duplicated), F (documentation-only) or G (broken). Nothing
was added or renamed.

## Campaign attribution

**Proven:**

- Every tagged URL of `kx_p2_b_token_boundary` in the content register (ART-002, LI-005, LI-009, X-004, X-010)
  survives landing on `/docs/tokens` → client navigation to a component → installation → CLI copy: every event
  carries `kx_campaign`, `kx_source`, `kx_content` and `kx_landing_page=/docs/tokens`, all in **one**
  `$session_id`. Real SDK in jsdom, per URL (`analytics-posthog.attribution.test.ts`), and in Chromium against a
  built site, read off the wire (`scripts/analytics-browser.mjs`).
- A full reload in the same tab keeps the campaign (sessionStorage).
- LinkedIn, X and dev.to tags normalise to `linkedin`, `x`, `devto`; GitHub to `github`. Unrecognised values become
  `other`, campaigns without `kx_` are dropped (`campaign-links.test.ts`).
- Privacy is unchanged: no query string, `utm_*`, click id or raw referrer reaches the wire (asserted on the
  decoded payloads); nothing in the sanitisation was touched.
- Live: 28 sessions carried a campaign (`kx_p2_a_drift` 23, `kx_p1_c_manifest` 5).

**Uncertain, with the reason:**

1. **New tabs.** `kx_*` session entry is per tab; PostHog's `$session_id` spans tabs. A component opened in a new
   tab from a campaign landing carries `kx_source=direct` and no `kx_campaign` (but keeps `kx_first_campaign`)
   inside the campaign's PostHog session. Seen live on 2026-09-30 in one session with five windows. **Rule:**
   attribute a session by *any* event carrying `kx_campaign`; never filter evaluation events on `kx_campaign`
   individually. Now written in analytics.md §8, ANALYTICS.md, and `summarizeSessions`, and pinned by a test.
   The reverse also happens: a PostHog session that began direct and later gained a campaign tab counts as
   attributed.
2. **`kx_source=other` with a correct campaign.** Two campaign sessions (one LinkedIn `li_primary`, one X
   `x_single`, iOS Safari) resolved `utm_source` to `other` while medium, campaign and content survived. The
   register's own URLs cannot produce that, and the raw value is discarded by design, so it cannot be recovered.
   Campaign-level counts are unaffected; channel-level counts may under-count by that much. Already logged in
   the distribution register; left as an observation.
3. **Live delivery of the new campaign** is not proven by anything in this repository; see the live-data caveat.

## Bugs found

### Bug 1 — the homepage "Read the source" link was counted as a docs CTA

- **Problem:** the closer's GitHub button carried `ctaAttrs("homepage", "read_docs")`. A CTA wins over outbound
  classification, so a click on it produced `cta_clicked` / `read_docs` and never `github_clicked`.
- **Impact:** GitHub interest from the homepage was invisible, and `read_docs` mixed docs with the repository.
  Outside both Tier 1 definitions, so **no QE or Adoption Intent number was affected**. Live impact in the
  window: none observed (0 `read_docs` clicks).
- **Root cause:** a CTA marker on an off-site destination, against ANALYTICS.md's own rule that a GitHub click is
  `github_clicked` and never also `cta_clicked`.
- **Fix:** removed the marker (`apps/web/src/app/page.tsx`); the provider now reports it as `github_clicked`
  (`source: homepage`, `location: content`).
- **Regression evidence:** the rendered-homepage tests "marks only on-site destinations as CTAs" and "reports the
  closer's repository link as github_clicked" failed on the original markup and pass after
  (negative control 03).

## Documentation drift

| # | Where | Drift | Resolution |
| --- | --- | --- | --- |
| Doc 1 | `apps/web/ANALYTICS.md` | Defined "Developer Activation Rate" (copy events ÷ visitors) as the metric, which analytics.md §5 forbids | Retired; points at analytics.md and `analytics-measurement.ts` |
| Doc 2 | `apps/web/ANALYTICS.md` | `block_code_copied` missing; `platform_selected` listed only `ComponentPreview`; claimed `/blocks` copies and homepage `platform_selected` are not instrumented — both are | Corrected to the emitters that exist |
| Doc 3 | `marketing/analytics.md` §11 A | Said the Phase 2–6 vocabulary was on an unmerged branch and had "never fired" | Marked resolved with the live first-seen dates; original note kept as the record |
| Doc 4 | `marketing/analytics.md` §8 | "Stored per session" did not say that session means tab, while every rate counts PostHog sessions | Added the tab/session rule |
| Note | analytics.md §3 | — | Added that a docs landing is not a signal by itself, so a low campaign rate is not read as a broken pipeline. **The definition is unchanged.** |

**Not changed, reported:** the pinned PostHog dashboard "Developer Growth & Activation" (2120439) still headlines a
copy ÷ pageview "activation" tile, and insight 8 on the canonical dashboard is still the stale count pair
analytics.md §11 describes. Both are PostHog-side; this task does not modify the PostHog project. Two code
comments (`cross-platform-flagship.tsx`, one architecture-test title) still say "activation"; wording only.

## Regression protection added

| Gate | Fails when | Runs in |
| --- | --- | --- |
| `analytics-measurement.test.tsx` — strategy ↔ code | analytics.md §3 or §4 and `analytics-measurement.ts` name different signals | CI (`@kinetixui/web` test) |
| `analytics-measurement.ts` types | a signal names an event or CTA target the contract does not have | CI (typecheck) |
| same — emitters | a definition's event has no `analytics.track("…")` in shipped code (static, labelled so) | CI |
| same — rendered homepage | a QE/AI CTA is not on the rendered page, a click produces anything but exactly one `cta_clicked`, the page fires an event on render, or a CTA points off-site | CI |
| same — sessions | events are counted instead of sessions, attribution is taken from the first event only, Progression exceeds QE | CI |
| `analytics-posthog.attribution.test.ts` — campaign chain | any register URL for `kx_p2_b_token_boundary` loses its campaign before evaluation or intent, or the events split across sessions | CI |
| `check:distribution` — baseline rule | a published result contains a percentage or a verdict word before analytics.md §10's baseline | **CI, newly** — it previously ran only by hand |
| `check:analytics-browser` | the built site sends anything but the exact event sequence, loses attribution, or sends a raw URL/referrer | local; needs an analytics-enabled build (header of the script) |

Negative controls, each run and reverted (logs in the project files folder `measurement-audit-week-1/`):

| # | Sabotage | Result |
| --- | --- | --- |
| 01 | add a signal to analytics.md §3 | QE strategy test fails |
| 02 | remove the `view_verification` CTA marker | its reachability test fails |
| 03 | restore the original `read_docs` marker on the GitHub link | 2 tests fail |
| 04 | count events instead of sessions | session test fails |
| 05 | stop emitting `block_code_copied` | emitter test fails |
| 06 | attribute sessions by first event only | new-tab test fails |
| 07 | rename a signal in the module | typecheck fails |
| 08 | attach attribution to `$pageview` only | 13 attribution tests fail |
| 09 | do not reuse the stored session on reload | reload test fails |
| 10 | write "winning … 5%" into a published result | `check:distribution` fails twice |
| 11 | built site with attribution on `$pageview` only and a double copy callback | browser gate: 6 problems, including the duplicate `block_code_copied` |

## Live-data caveat

Everything in "Proven" is **repository and local-browser** verification: the code emits the right events with the
right properties to an intercepted ingest origin. It is not proof that production delivers them.

What the read-only PostHog query does show: the deployed site has sent the post-Phase-2 vocabulary since
2026-09-29/30, attribution properties arrive intact, and `$session_id` groups multi-page visits. What it cannot
show: that an event with zero recorded uses would arrive if someone used it, that ad blockers and Do Not Track
are not removing a share of visitors (they are, by design, and the share is unknown), or that the production
build matches `main` today (the Vercel deployment was not checked from here).

Two delivery facts worth knowing: posthog-js drops browsers it detects as bots (`HeadlessChrome`,
`navigator.webdriver`), which the browser gate had to work around, so automated traffic is not inflating counts;
and the canonical dashboard's insight 8 is still not either Adoption Intent measure.

## Week 1 interpretation boundary

This audit does not say the campaign worked or did not. analytics.md §10 holds: **no baseline until 6 weeks of
real distribution or 300 sessions with ≥30 qualified evaluations, whichever is later.** As of this audit there
are 82 sessions in 30 days. Week 1 numbers are **operational and directional observations**.

What to know before reading them:

- **Every campaign so far landed on a docs page, and a docs landing is neither QE nor Adoption Intent.** 28
  campaign sessions landed on `/docs/platforms`; 1 reached Qualified Evaluation. That reflects §3 counting the
  homepage coverage *click*, not the coverage *page*. The pipeline is not dropping anything.
- **ART-002 and its posts land on `/docs/tokens`**, which has no KinetixUI install command, no component link in
  its body and no CTA (its only fence is the repository's own `pnpm build:tokens`). A visitor there reaches QE or
  intent only through the sidebar. LI-009 and X-010 are staged "Adoption intent" in the calendar, and their
  destination cannot produce an Adoption Intent signal by itself.
- Count sessions, attribute a session by any of its events, and never divide Adoption Intent by QE.

**Decision for Ziad, not taken here:** whether a landing on the coverage or tokens page should count. Two honest
options: keep §3 as written and read campaign QE as "what visitors do after landing", or add
`docs_viewed` with `page` `/docs/platforms` (and decide separately for `/docs/tokens`) to §3. Either is a
one-line strategy change, and `analytics-measurement.test.tsx` will hold code and strategy together when it is
made. Changing it retroactively changes every past number, so it should be dated in analytics.md.

## Recommendation

**Measurement ready with defined caveats.** Continue distribution. Week 1 PostHog numbers are safe to read as
absolute session counts and directional observations, not as rates or verdicts, and only with the caveats above:
docs landings are not signals, sessions are attributed by any event, and the baseline window is open.

## Verification

| Command | Result |
| --- | --- |
| `pnpm build` | pass (all 6 workspaces, including the production `next build`) |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test` (turbo) | cli, create-theme, angular, iot, ui pass; web first run had 2 failures: `analytics.architecture` caught this audit's own test adding a `document` click listener (fixed: the test now uses `window`), and `iot-page` timed out under full-turbo load (known; passes alone) |
| `pnpm --filter @kinetixui/web test` (re-run) | 1524 / 1524 pass |
| `pnpm test:release` | pass |
| `pnpm check:distribution`, `pnpm check:content` | pass |
| `check:analytics-browser` (analytics-enabled build) | pass; negative control 11 fails as expected |

Logs: project files folder `measurement-audit-week-1/`.

## Files changed

- `apps/web/src/app/page.tsx` — Bug 1
- `apps/web/src/lib/analytics-measurement.ts`, `analytics-measurement.test.tsx` — new gate
- `apps/web/src/lib/analytics-posthog.attribution.test.ts` — campaign-chain tests
- `scripts/check-distribution.mjs`, `.github/workflows/ci.yml` — baseline rule, enforced in CI
- `scripts/analytics-browser.mjs`, `package.json` (`check:analytics-browser`) — browser gate
- `apps/web/ANALYTICS.md`, `marketing/analytics.md` — documentation drift
- this report

## Out of scope, recorded

- PostHog dashboard 2120439 and insight 8 (PostHog-side; analytics.md §11 already lists the manual follow-up).
- `/docs/tokens` offers no tokens install path although the homepage "Start with tokens" card promises one. A
  content gap, not instrumentation; relevant to ART-002's destination.
- The `Explore IoT` link is tagged `read_docs` while pointing at `/iot`; arguably a stretch of the target's
  meaning, harmless to both definitions, left alone.
- `check:analytics-browser` is not in CI: it needs a second, analytics-enabled build.
