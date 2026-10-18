---
type: marketing opportunity register
status: maintained by hand. Re-read every merge state from GitHub before using a row; a row is a prompt to
  check, never a claim
last reconciled: 2026-10-17, against main at eb82e18 and the open PR list
---

# Marketing opportunity register

Development milestones that could become content, and what each one is waiting on. **A merged PR is not a
public feature until the site serving it is checked, and an open PR is not a feature at all.** Content can be
prepared ahead; publication is gated on the evidence column, never on this file.

Verification levels use `../README.md`'s distinctions: **source** (code exists) → **CI** (a check runs on
it) → **merged** → **deployed** (seen on kinetixui.com) → **published** (on a package registry). Deployment
could not be checked from the environment that wrote this file (kinetixui.com was not reachable), so no row
below says *deployed*. Where the website deploys `main`, the owner confirms it by opening the page.

| # | Capability | PR | Merge state (2026-10-17) | Verification level | Audience | Marketing angle | Supporting evidence | Channel | Content readiness | Publication dependency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Angular Preview → Stable contract | (existing) `ANGULAR-GRADUATION.md`, `check:angular-graduation` | merged | CI; package published and **preview** | P1 | "Preview is a measurement": a gate a script can fail, measured against React | `pnpm check:angular-graduation`: 7 of 13 criteria met; 80 implemented / 2 equivalent / 27 planned of 109 | dev.to → LinkedIn, X | Outline: ART-003 | Draft + owner approval. Never a Stable date, never parity |
| 2 | Motion contract (MX1a): motion tokens and `check:motion-tokens` | #393 | merged | CI (token level) | P1 | Motion durations and easings as a token contract, so platforms cannot drift on timing | `MOTION.md`, `check:motion-tokens` | LinkedIn, X | Idea | Claim the **token contract only**. Rendered motion evidence is thin (React reduced-motion evidence 4 of 109 per `marketing:stats`); no "verified motion" claim |
| 3 | Toggle / ToggleGroup selection motion (MX1b-1a) | #396 | open | source | P1 | Same as #2, at component level | — | — | Not started | Merge, then deploy, then a rendered check |
| 4 | Use Cases hub | #395 | merged | merged | P2 | Find components by the business workflow you are building, not by component name | `/capabilities` page; `use_cases_hub` analytics source | LinkedIn, GitHub | Idea | Owner confirms the page is live. Landing on it emits only `$pageview` (not a Qualified Evaluation), so measure what visitors open next |
| 5 | Domain journeys with verified platform coverage (BD-W3b2b-1) | #397 | merged (eb82e18, today) | merged | P2 | Coverage per journey shown from evidence, including what is not covered | `/use-cases/<domain>` pages | LinkedIn | Idea | Owner confirms live; read which journeys are published (Finance was held unpublished on the PR) |
| 6 | Global search with blocks and use cases | #394 | merged | merged, CI | neutral | Cmd-K finds blocks and use cases as well as components | `search_result_selected` (type only, never the query text) | X | Idea | Owner confirms live. Small feature: an X single at most |
| 7 | Block taxonomy and `/blocks` filters | #389 | merged | merged | P2 | Blocks findable by business domain | `blocks.manifest.json`, 21 blocks on all five platforms per `marketing:stats` | LinkedIn, X | Idea | Owner confirms live |
| 8 | SegmentedControl black fill and travelling Tabs indicator | #388 | merged; **`@kinetixui/ui` change unreleased** | merged | P2 | Visual polish with a motion purpose | the PR | X (visual) | Idea | **Do not** say it is in the npm package until a release ships it; "on the site" only after the owner confirms |
| 9 | Range Slider (one thumb per value) | #387 | merged; ui change unreleased | merged | P2 | A bug fix with a clear before/after | the PR | X | Idea | Same as #8 |
| 10 | Speed-dial Fab example with staggered motion | #386 | merged | merged (docs example) | P2 | A short motion clip | the PR | X, LinkedIn video | Idea; motion brief would be MOT-series | A recorded clip from the live site; reduced-motion behaviour shown too |
| 11 | Cross-platform design system guides (SEO cluster) | #364, #366 | merged; guides described as published 2026-10-12 | deployed per the SEO records | P1 | Evergreen explainer; ART-001-PILLAR points dev.to readers at it | `marketing/seo/` | dev.to edit, LinkedIn | ART-001-PILLAR is PLANNED | Owner confirms the dev.to pillar-link edit is live (a tagged `art_pillar` arrival on 2026-10-17 suggests it; not confirmed) |
| 12 | IoT hierarchy and stable command row (M5A/B) | #375 | merged; `@kinetixui/iot` changes **held** | merged | IoT / connected-device teams (Pillar E) | Requested → pending → confirmed state as a reusable pattern | `/iot` | LinkedIn | Idea | No real-device claim: IoT is paused for real-hardware validation. Pillar E stays outside the core campaign |
| 13 | Next package release | #348 | open (version PR) | — | all | A release note only when it contains something material | the PR, `release/publish-packages.json` | GitHub Release, X | Not started | It must merge and publish first; this register never anticipates a version number |
| 14 | Adoption onboarding (BD-W4) | none yet | not started | — | P2 | From component discovery to a first working component | — | — | — | Handoff items in `audits/M1-CAMPAIGN-RECONCILIATION.md` §10 |

## How a row becomes content

1. The PR merges and the owner confirms the page is live (or the package is on npm, for a package claim).
2. Re-read the numbers from `pnpm marketing:stats`; check the claim in `CLAIMS.md`.
3. Register an asset in `content/register.json` (`brief` → `drafted` → `ready`), with its campaign.
4. The owner approves it (`approval` on the asset), posts it by hand, and the distribution row records the
   live URL.
