---
type: audit (dated snapshot, not retro-edited)
date: 2026-10-17
audited: main at ced9d5e (rebased onto eb82e18 before the PR), PostHog project 620385, GitHub API
scope: Marketing Operations M1 — campaign reconciliation, distribution restart, growth measurement
verdict: PASS WITH NOTES
---

# M1 — campaign reconciliation, distribution restart and growth measurement

This recovers and reconciles the existing campaign. It does **not** replace the strategy: positioning, ICPs,
pillars and the 30-day calendar are unchanged (§1). Everything below separates **facts** (read from the
repository, PostHog or the GitHub API on 2026-10-17), **inferences** (labelled) and **unknowns**.

What this environment could and could not reach:

| Source | Reachable | Used for |
| --- | --- | --- |
| Repository, generators, checks | yes | registers, claims, visuals, instrumentation source |
| PostHog (project 620385, read-only SQL) | yes | campaign arrivals, funnel counts, dashboard tile modification times |
| GitHub API | yes | open PRs, Releases, repository settings |
| dev.to, linkedin.com, x.com, kinetixui.com | **no** (DNS / egress proxy) | — live posts and the live site were **not** read back |

So no live post was re-opened here. Publication status rests on the URLs and statements recorded at close-out,
and on tagged arrivals in PostHog where they exist.

---

## 1. The strategy that was recovered

| Element | Canonical file | State |
| --- | --- | --- |
| Positioning: cross-platform design system infrastructure (primary), multi-platform component library (secondary) | `STRATEGY.md`, `MESSAGING.md` | unchanged |
| P1 design-system engineers across platforms; P2 product teams shipping web and native | `PERSONAS.md` | unchanged |
| Channels: LinkedIn and dev.to primary; X, GitHub, communities supporting | `distribution/README.md` | unchanged |
| Pillars | `CONTENT-PILLARS.md` (A–G) | unchanged; see mapping below |
| 30-day campaign, day 1 = 2026-09-29 | `content/calendar.md`, `content/register.json` | unchanged; execution moves to §5 |
| Funnel and primary metric (Qualified Evaluation Rate) | `analytics.md` §1–§4 | unchanged |

**Pillar mapping.** The M1 brief names four pillars (A consistency, B architecture, C proof, D adoption). The
repository's canonical set is six-plus-one (A–G). They are not renamed; the brief's pillars map onto them:

| Brief pillar | Repository pillars |
| --- | --- |
| A — Cross-platform consistency | A (verified cross-platform), B (tokens past the web boundary) |
| B — Engineering architecture | C (engineering a design system), D (accessibility and direction), F (platform idiom) |
| C — Product proof | A and C evidence pieces (LI-004, LI-008, X-007, X-009) |
| D — Adoption | B ladder (LI-009, X-010), G (LI-006, X-006), GH-001 |
| — | E (device interfaces) stays out of the core campaign, as decided in Phase 4 |

**Status vocabulary.** The registers keep their own words (content: brief / drafted / ready / published;
distribution: planned / published / skipped / blocked). The M1 statuses are **derived** from both by
`m1Status()` in `scripts/marketing-publication-rules.mjs` and printed by `pnpm marketing:inventory`:

| M1 status | Derived from |
| --- | --- |
| PLANNED | content `brief` |
| DRAFTED | content `drafted` |
| READY FOR REVIEW | content `ready` with no `approval` (`ready` means the copy's checks pass, **not** approval — `content/README.md`) |
| APPROVED | content `ready` with an `approval: { by, on, evidence }` record. **None exists today** |
| SCHEDULED | never derived: nothing in this repository schedules posts |
| PUBLISHED | content `published` / a published distribution row |
| BLOCKED | a blocked distribution row |
| CANCELLED | every distribution row `skipped` |

---

## 2. Verified campaign inventory

Full table: `pnpm marketing:inventory`. The dated snapshot this section was written from is committed as
[`M1-inventory-2026-10-17.md`](./M1-inventory-2026-10-17.md); rerunning the script later is not equivalent,
because its overdue flags are relative to the day it runs. Planned dates come from day offsets.

| Asset | Channel | Planned | Actual | M1 status | Live URL / evidence | Blockers |
| --- | --- | --- | --- | --- | --- | --- |
| LI-003 | LinkedIn | 09-29 | 09-29 | PUBLISHED | **no URL recorded**; 21 tagged sessions (§8) | URL from owner |
| X-005 | X | 09-30 | 09-30 | PUBLISHED | **no URL recorded**; 2 tagged sessions | URL from owner |
| LI-004 | LinkedIn | 10-02 | 10-03 (recorded) | PUBLISHED | **no URL recorded**; 5 tagged sessions on 10-02, before the recorded date | URL and true date from owner |
| X-003 | X | 10-04 | 10-04 | PUBLISHED | **no URL recorded**; 0 tagged sessions | URL from owner |
| ART-002 | dev.to | 10-06 | 10-06 | PUBLISHED | dev.to URL recorded; 0 tagged sessions | — |
| LI-005 | LinkedIn | 10-07 | — | BLOCKED | the recorded short link is the 7 Oct IoT post (off-001) | owner: did LI-005 ever go out? |
| X-004 | X | 10-09 | 10-09 | PUBLISHED | x.com status URL recorded; 0 tagged sessions | — |
| LI-007 | LinkedIn | 10-11 | 10-12 | PUBLISHED | LinkedIn activity URL recorded; **0 tagged sessions** | check the link kept its tag |
| ART-001 | dev.to | 10-13 | 10-13 | PUBLISHED | dev.to URL recorded; 0 `art_primary` sessions | — |
| ART-001-PILLAR | dev.to edit | — | — | PLANNED | 1 tagged `art_pillar` session 2026-10-17 03:51 UTC (inference: the edit may be live) | owner confirms the edit |
| LI-001 | LinkedIn | 10-14 | — | READY FOR REVIEW | — | approval; a01 stop gate |
| X-001 | X | 10-15 | — | READY FOR REVIEW | — | approval; after LI-001 |
| X-008 | X | 10-16 | — | READY FOR REVIEW | — | approval |
| LI-008 | LinkedIn | 10-18 | — | READY FOR REVIEW | — | approval |
| X-007 | X | 10-19 | — | READY FOR REVIEW | — | approval |
| LI-006 | LinkedIn | 10-20 | — | READY FOR REVIEW | — | VIS-004 not produced (ship without) |
| X-006 | X | 10-21 | — | READY FOR REVIEW | — | as LI-006 |
| LI-010 | LinkedIn | 10-23 | — | DRAFTED | — | stale figures (§4) |
| X-002 | X | 10-24 | — | DRAFTED | — | stale figures (§4) |
| LI-009 | LinkedIn | 10-25 | — | READY FOR REVIEW | — | two sentences corrected (§4) |
| X-010 | X | 10-26 | — | READY FOR REVIEW | — | after LI-009 |
| X-009 | X | 10-27 | — | READY FOR REVIEW | — | — |
| X-011 | X | 10-28 | — | READY FOR REVIEW | — | — |
| LI-002 | LinkedIn | 11-03 | — | DRAFTED | — | hold ~3 weeks after LI-001 |
| COM-001 … COM-004 | community | — | — | BLOCKED | — | live rule check |
| ART-003 (new) | dev.to | — | — | PLANNED | — | outline only |
| GH-001 (new) | GitHub | — | — | DRAFTED | — | Discussions disabled |

## 3. Baseline

| # | Measure | Value | Basis |
| --- | --- | --- | --- |
| 1 | Total registered assets | **30** (28 from the 30-day campaign + ART-003, GH-001), plus 10 visuals | `content/register.json` |
| 2 | Verified published | **8** recorded published; **4** of them with a live URL in the repository (ART-002, X-004, LI-007, ART-001) | distribution rows |
| 3 | Approved, unpublished | **0**. No asset carries an approval record; 11 are READY FOR REVIEW | §1 |
| 4 | Drafted | 4 (LI-002, LI-010, X-002, GH-001) | |
| 5 | Blocked | 5 (LI-005, COM-001 … COM-004) | |
| 6 | Missing publication URLs | 4 published rows (LI-003, X-005, LI-004, X-003), now each with a `liveUrlGap` saying so | §9 rules |
| 7 | Missing visuals | VIS-004 (briefed for LI-006/X-006, never produced); no light-theme exports exist for any visual | `visuals/manifest.json` |
| 8 | Missing tracking links | 0 for linkable assets (all 26 attributed; community briefs untracked by design). In practice, **LI-007, X-004, ART-002 and ART-001 produced 0 tagged sessions** | PostHog |
| 9 | Outdated technical claims | §4: 3 canonical-document claims, 1 ready post, 2 drafted posts, 1 published article, 3 visuals | |
| 10 | Duplicate or conflicting records | LI-005 (resolved as BLOCKED on 2026-10-09; still open with the owner). LI-004's tagged arrivals predate its recorded date. LI-003's session count grew from the 5 recorded to 21 (the paid boost window; amp-001) — the row keeps its dated count | |

**FACTS.** The eight PUBLISHED rows above; their recorded URLs; the PostHog counts in §8; Discussions are
disabled; the four Release tags on 2026-10-06/11.
**INFERENCES.** ART-001-PILLAR's edit may be live (one tagged arrival). LI-004 may have gone out on 2026-10-02
UTC (arrivals at 18:31). The 12–14 October traffic is likely automated (§8).
**UNKNOWN.** Live URLs for LI-003, X-005, LI-004, X-003. Whether LI-005 published. Every channel's own
impression, reaction and comment counts. Whether LI-007's post carried the tagged link.

**The exact next asset to distribute:** **LI-001** (LinkedIn), the oldest READY FOR REVIEW asset past its
date, whose spine (ART-001) is published. It needs the owner's approval and the a01 stop gate (open its tagged
link once with `&kx_traffic=diagnostic` and see `kx_campaign` arrive). No asset is approved yet, so there is
no approved asset to name.

---

## 4. Technical claims audit

Product truth on 2026-10-17 (`pnpm marketing:stats`): 109 catalogue entries (108 components and one recipe);
React 109, SwiftUI / Compose / Flutter 90 each, Angular 80 (published, **preview**); 90 on all four
catalogue-complete platforms, 19 documented exceptions; 21 blocks on all five platforms. React and Angular
are installable from npm; SwiftUI, Compose and Flutter are **source only**. Evidence as fractions: RTL React
36/109, Angular 47/80, SwiftUI 0/90, Compose 1/90, Flutter 58/90; visual 0 everywhere. Versions:
tokens/ui/cli 0.24.0, angular 0.25.1, iot 0.5.0 (registry checked).

Source present / build verified / runtime verified, per platform: React — source, CI build, browser evidence
for accessibility (109/109) and partial interaction (48/109). Angular — source, AOT build in CI, real-browser
interaction and accessibility 80/80. SwiftUI — source, CI build, almost no runtime evidence (reduced motion
7/90). Compose and Flutter — source, CI build, partial runtime evidence. **No two platforms have equivalent
runtime verification**, and no copy may imply they do.

| Where | Claim | Finding | Action |
| --- | --- | --- | --- |
| `CLAIMS.md` B2, `STRATEGY.md` rule 4, `MESSAGING.md` glossary | "98 catalogue entries — 97 components" | stale (109 / 108) | **Fixed**: the rows now name no number and point at `marketing:stats` |
| `STRATEGY.md` rule 5 | "React, Compose and Angular are single-digit" RTL counts | stale (React 36, Angular 47) | **Fixed**: describes the range, quotes fractions |
| `CLAIMS.md` A3, `MESSAGING.md` ×3, `STRATEGY.md` ×2, `CONTENT-PILLARS.md` | "Angular directives on native elements" as a general statement | false in general: of the package's selectors, 152 are `kx-*` elements and 91 attribute directives (count by selector shape) | **Fixed**: "Angular components written in Angular; a button is a directive on a real `<button>`" (PR #330 already fixed the posts) |
| LI-009 (ready) | "Install the tokens package, generate your platform's output" | consumers do not generate; the package ships the generated web/iOS/Android/Flutter output (`packages/tokens/dist`) | **Fixed** |
| LI-009 (ready) | "a change one engineer can make in an afternoon" | unverified effort claim | **Fixed**: "a small change, and it's reversible" |
| LI-010, X-002 (drafted, a02) | "98 catalogue entries", "Angular 31", "90 of 98" as today's figures | stale; `a02/verify-package.mjs` fails 8 checks | Not rewritten here: refresh before review (out of this batch) |
| ART-001 (published on dev.to) | "ours, today" paragraph: catalogue 98, Angular 64 | stale at publication (Angular was 80 of 98 on 2026-10-13); `a01/verify-package.mjs` fails 9 checks on the repository copy | **Owner decision**: edit the live article with a dated correction, or leave it as a dated piece |
| LI-001, X-001, LI-006, X-006, X-008, LI-008 | historical figures in past tense; RTL fractions in LI-008 | accurate on 2026-10-17 | none |
| VIS-006, VIS-008, SOCIAL-PREVIEW, VIS-007 (generated) | 98/98, Angular 64/98, 20 blocks | stale | **Regenerated** with `pnpm gen:visuals` + `render:visuals` (§7) |
| a01 `linkedin.md` "Do not" note | "90/98 with 8 documented exceptions" | stale internal note, not copy | recorded only |

Out-of-scope finding (engineering doc, not changed): `ANGULAR-GRADUATION.md` "Current truth" table says
"80 of 98"; the script it describes now reports "of 109". The script is right by that document's own rule.

---

## 5. Distribution calendar

`distribution/execution-calendar.md`: Monday 19 October to Sunday 1 November. Week 1: LI-001 (Mon), X-001
(Tue), GH-001 (Wed, if Discussions are enabled), LI-008 (Thu), X-008 (Fri). Week 2: LI-006 (Mon), X-007 (Tue),
COM-004 (opportunistic, blocked), LI-009 (Thu), X-006 (Fri). No dev.to article: none is approved. Original IDs,
day offsets and published rows are untouched; nothing published is repeated. `check:distribution` now validates
the calendar's asset ids and routes.

## 6. Next content batch

`content/drafts/m1/README.md`: LI-001, X-001, LI-008, X-008 (reused, READY FOR REVIEW, each re-checked), ART-003
outline (new, PLANNED) and GH-001 GitHub status update (new, DRAFTED). Nothing is marked approved.

## 7. Visual asset inventory

| Visual | Used by | Exists | Size (PNG, 2×) | Current | Notes |
| --- | --- | --- | --- | --- | --- |
| VIS-001 | LI-003, X-005 | yes | 2400×1972 | yes | constructed illustration, labelled |
| VIS-002 | LI-004, X-003 | yes | 2400×1676 | yes | |
| VIS-003 | ART-002, LI-005, X-004 | yes | 2400×1828 | yes | |
| VIS-004 | LI-006, X-006 | **no** | — | — | briefed in `visual-briefs.md`; never produced. Posts ship without it |
| VIS-005 | LI-007, X-008 | yes | 2400×1572 | yes | alt says the columns are "presented as equals", but the right column is accent-styled: alt-text nit |
| VIS-006 | LI-008, X-007, X-011, LI-010 | yes | 2400×1568 | **regenerated** | carried React 98/98, Angular 64/98 |
| VIS-007 | LI-009, X-010 | yes | 2400×1600 | **regenerated** | carried "20 composed sections" |
| VIS-008 | LI-007, X-008 | yes | 2400×1504 | **regenerated** | carried 98 / 64 |
| VIS-009 | LI-004, X-003, X-009, ART-001 | yes | 2400×1644 | yes | |
| SOCIAL-PREVIEW | GitHub | yes | 2560×1280 | **regenerated** | carried 98/98, 64/98. The copy uploaded to GitHub is from the old source and was never read back: **owner re-upload** |

Render gate (`pnpm render:visuals`): all nine rendered with no overflow or collision, smallest font 20 px
(6.1–6.5 px in a 390 px feed). Every visual is dark-theme only; a light export does not exist. Alt text lives
in the manifest and is generated with the numbers. Only the four PNGs whose SVG changed are committed; the
renderer produced byte-level noise on the unchanged five, which was discarded.

## 8. PostHog analytics audit

**Limitation first:** this is source inspection plus read-only SQL against project 620385. It is not a live
click-through of the site, which this environment cannot reach.

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Events fire on real interactions | Source: semantic events fire from route views and clicks (`analytics-surfaces.ts`, `AnalyticsProvider`); PostHog shows `$pageview` and 12 contract events received in the last 30 days | `read-data-schema` |
| 2 | No duplication | Pageviews are manual (`capture_pageview: false`), one per route change; not re-tested live | `analytics-posthog.ts` |
| 3 | Pageviews do not qualify | Correct: `$pageview` and `docs_viewed` are in neither signal list | `analytics.md` §3 |
| 4 | Event names consistent | `AnalyticsEvents` type is the contract; `ARRIVAL_EVENTS` fails to compile if one is missing | `analytics-measurement.ts` |
| 5 | Campaign UTMs preserved | Yes where tagged links were used: `kx_p2_a_drift`, `kx_p1_c_manifest`, `kx_p1_a_parity_proof/art_pillar` all arrived intact. **But 4 published assets produced no tagged session at all** (ART-002, X-004, LI-007, ART-001 `art_primary`) | SQL below |
| 6 | Destinations valid | Every register destination is a route in `apps/web/src/app` (`check:distribution`, 144 routes) | |
| 7 | No search text collected | `search_result_selected` carries only `target` (a result type), `source`, `location` | `analytics.ts` line 208 |
| 8 | Privacy constraints | Code: autocapture off, session recording off, `respect_dnt`, `person_profiles: identified_only`, property allowlist. **Note:** the PostHog *project* setting has autocapture opt-out false and console-log capture on; both are overridden by the SDK config and recording is off, so nothing is collected, but the project settings do not match the documented posture | `project-get`, `analytics-posthog.ts` |
| 9 | Dev/test traffic distinguishable | `?kx_traffic=diagnostic` marks every event; the dashboard excludes it. The internal-account cohort 583396 has **0 members** (since 2026-10-09), so owner visits without the mark are counted | `analytics.md` §11 |
| 10 | Dashboard matches the definition | The six funnel tiles were last modified 2026-10-10 12:28–12:33 UTC (the revision-3 apply) and not since. An independent session-level query here reproduces the 2026-10-09 checkpoint exactly: 94 eligible / 15 QE / 12 AI / 27 campaign / 2 campaign-QE. Tile outputs were not re-run | `system.insights`, SQL |

**Campaign arrivals since 2026-09-21** (non-diagnostic, by first `kx_campaign`):

| Campaign / content / source | Sessions | First seen (UTC) |
| --- | --- | --- |
| kx_p2_a_drift / li_primary / linkedin (+1 `other`) | 20 + 1 | 2026-09-29 18:54 |
| kx_p2_a_drift / x_single / x (+1 `other`) | 1 + 1 | 2026-09-30 14:59 |
| kx_p1_c_manifest / li_primary / linkedin | 5 | 2026-10-02 18:31 |
| kx_p1_a_parity_proof / art_pillar / devto | 1 | 2026-10-17 03:51 |
| everything else in the register | 0 | — |

**Qualified Evaluation Rate findings** (absolute counts; the §10 baseline is not established, so no rate is
reported as a result):

| Period (session start, UTC) | Eligible | Qualified Evaluation | Adoption Intent | Campaign sessions | Campaign + QE |
| --- | --- | --- | --- | --- | --- |
| up to 2026-10-09 | 94 | 15 | 12 | 27 | 2 |
| 2026-10-10 → 10-16 | 46 | 38 | 0 | 0 | 0 |
| 2026-10-17 (partial) | 3 | 0 | 0 | 1 | 0 |

**The 10–16 October window is very likely not evaluators** (inference, strongly supported): all 46 sessions
fell on 12–14 October, every one has at most three events, 45 lasted under five seconds, none has a referrer,
each is a new device, screen widths are unusual (1286–1392 px) and the landings spread across component pages.
Because one `component_viewed` qualifies a session, these single-hit landings inflate Qualified Evaluation
(38 of 46). The definition is behaving as written; the definition did not anticipate automated traffic that
runs JavaScript. **Owner decision:** whether `analytics.md` §3/§4 should exclude sessions matching a
documented automated-traffic signature, decided there and applied to the dashboard, never in a one-off query.

Adoption Intent has been **0** since 2026-10-10.

## 9. Funnel gap analysis

| Stage | Existing tracking | Missing | Friction / content | Evidence needed |
| --- | --- | --- | --- | --- |
| Awareness | `kx_*` attribution from tagged links | Channel-side reach (impressions, reactions) is not readable here; 4 of 8 published assets produced no tagged arrival | dev.to links in LI-001/X-001 bodies are invisible first-party; only the first-comment link counts | owner-supplied platform counts; a tagged-link check before each post |
| Discovery | `$pageview`; `docs_viewed`; `use_cases_hub` / `use_case_page` sources for clicks | Landing on `/capabilities`, `/use-cases/*`, `/guides/*` emits only `$pageview`, so these pages are invisible in Tier 1 except through the next click | Use Cases hub is new; no content points at it yet | decide whether a use-case view is a discovery signal (definition change, owner) |
| Evaluation | QE signals (§3) | No automated-traffic exclusion (§8); campaign landings on docs pages are not QE by definition (open decision since Week 1) | — | owner decisions in `analytics.md` |
| Adoption intent | `installation_viewed`, install/CLI copies, adopt CTAs | Nothing after a copy | 0 sessions since 10-10 | — |
| Implementation | **not measurable** on-site (`analytics.md` §5, D1 pending) | everything | — | **measurement gap**: would need opt-in CLI telemetry or registry download counts, both outside this PR |
| Retention | "Returning evaluators" (anonymous ID, ≥2 QE sessions) | cross-device and cleared cookies undercount | — | **measurement gap** beyond that proxy |

An installation-page view is not an installation, and nothing here says otherwise.

## 10. Recommended BD-W4 handoff items

For the adoption workstream, not implemented here:

1. **Use-case pages have no next-step signal.** A visitor landing on `/use-cases/<domain>` emits only
   `$pageview`. If BD-W4 adds a "start building" step, give it a `cta_clicked` target from the closed
   vocabulary so the journey from discovery to implementation is measurable.
2. **Adoption Intent has been zero since 2026-10-10.** Before optimising pages, confirm with the owner that real
   (non-automated) visitors reach `/docs/installation` at all.
3. **The install path differs by platform** (npm for React/Angular/tokens, source for the native three). The
   onboarding should branch on the platform a visitor selected (`platform_selected` already exists).
4. **No post-copy signal.** A "did it work?" step after an install copy (opt-in, no free text) would be the
   first implementation-stage evidence; it needs a privacy review under `analytics.md` §13 first.
5. **Content that BD-W4 can reuse:** LI-009 / X-010 (token-only entry), LI-006 / X-006 (what the CLI installs),
   GH-001 (status per platform).

## 11. Quality gates added

| Rule | Where | Negative control |
| --- | --- | --- |
| A published row carries `liveUrl` (the post on its own channel) or, before 2026-10-17 only, a `liveUrlGap` | `marketing-publication-rules.mjs` via `check:distribution` | missing field, own-site URL, other-channel URL, empty gap, post-cutoff null — each fails (unit tests + end-to-end on the real register) |
| One asset is published once per channel | same | duplicate X-004 row fails; the **old** check passed the same mutation (exit 0) |
| One live post is evidence for one record (the LI-005 failure) | same | reusing off-001's URL on LI-003 fails |
| A planned row cannot carry a live URL | same | unit test |
| `approval` needs `by`, `on`, `evidence`, and ready copy | `check:content` | drafted asset with approval fails; approval without evidence fails |
| `check:content` runs in CI | `.github/workflows/ci.yml` | it ran only by hand before |
| The execution calendar's asset ids and routes are validated | `check:distribution` DOCS list | — |

Logs of the end-to-end controls are in the project files under `marketing/m1-reconciliation/negative-controls/`.
No existing check was weakened.

## 12. Owner decisions

1. Approve (or not) LI-001 and the rest of week 1; record approvals as `approval` on each asset.
2. LI-005: did it ever publish? If yes, its URL; if no, it can take a later slot.
3. Supply the live URLs for LI-003, X-005, LI-004, X-003, and LI-004's true posting date.
4. ART-001: edit the live dev.to "ours, today" paragraph with a dated correction, or leave it.
5. Confirm the ART-001 pillar-link edit is live (ART-001-PILLAR).
6. Re-upload `SOCIAL-PREVIEW.png` to GitHub (the regenerated source no longer says 98/64).
7. Enable GitHub Discussions (GH-001 waits on it).
8. Analytics definitions: exclude automated-traffic sessions? count docs-page campaign landings? add members to
   the internal cohort or use `?kx_traffic=diagnostic` consistently?
9. Align the PostHog project settings (autocapture, console logs) with the documented posture, or record why not.
