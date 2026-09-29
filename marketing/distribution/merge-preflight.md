---
type: merge preflight record
status: PR open, not merged. Nothing deployed
---

# Phases 1–6 → main: merge preflight

A dated record of the checks run before the Phase 1–6 PR was opened. Not a numbered marketing phase and not
an audit — this file answers one question: *if this branch were deployed, would the measurement system it
depends on actually work?*

## Identity

| | |
| --- | --- |
| **Branch** | `claude/last-changes-report-7m50v3` |
| **Branch head at preflight** | `f2d665d` |
| **`origin/main` base** | `e86b3ec` |
| **Rebase needed** | **No.** `merge-base == origin/main`, so the branch is already a clean descendant — 8 ahead, 0 behind. Head unchanged by the preflight |
| **Working tree** | Clean |
| **Date** | 2026-09-29 |

## Change-set classification

93 files, +9,625 / −742.

| Area | Content |
| --- | --- |
| **Marketing strategy** | `STRATEGY.md`, `MESSAGING.md`, `PERSONAS.md`, `CLAIMS.md`, `CONTENT-PILLARS.md` (new, replacing four lowercase files by `git mv`), plus `README.md`, `seo.md`, `roadmap.md`, `experiments.md` |
| **Public website** | `app/page.tsx` (Phase 2 hero, verification and adoption sections), `app/docs/page.mdx`, `blocks/blocks-content.tsx`, `components/showcase.tsx`, `lib/platform-support.ts` |
| **Analytics** | `lib/analytics.ts`, `lib/analytics-surfaces.ts` and their tests |
| **Content** | `content/` — calendar, register, LinkedIn, X, articles, community briefs, visual briefs, motion briefs, drafts |
| **Visual assets** | `content/visuals/` — 9 SVG + 9 PNG + manifest + render report; `.github/assets/home.png` refreshed |
| **Documentation** | `marketing/analytics.md`, `community.md`, `launches.md`, `content-calendar.md`, review templates, `audits/PHASE-1` … `PHASE-6` |
| **Validation / guards** | `check-content-register.mjs`, `check-distribution.mjs`, `gen-marketing-visuals.mjs`, `render-marketing-visuals.mjs`, 4 added `package.json` scripts, `current-truth.test.ts`, `marketing-claims.test.ts`, `homepage-truth.test.tsx`, `campaign-links.test.ts` |
| **Other** | `README.md` (repository) |

**Nothing outside that scope.** Each of the following was compared against `origin/main` and is unchanged:
package publication config and changesets · every package version and manifest · React component sources ·
registry generators and generated registry output · all four native implementation trees · tokens · the IoT
package · the CLI · deployment configuration and workflows · `components.manifest.json`,
`blocks.manifest.json`, `verification.json` · every `CHANGELOG.md`. No `.env`, secret, credential or
`vercel.json` is touched, and a credential-shaped scan over the whole diff returns nothing.

`package.json`'s only change is four added script entries. No dependency moved.

## Analytics deployment gate — PASS

**This is the check the whole preflight exists for**, and it was not answered by grepping constants. A
disposable harness ran the **real `posthog-js` SDK with the real production `posthogOptions`**, landed on the
**real Day 1 campaign URL read out of `distribution/register.json`**, drove the **real components and route
handlers**, and inspected what the SDK would have put on the wire. Nothing was sent: a recorder appended to
the production `before_send` chain returns `null`.

**14 events reached the SDK.** Every event the Phase 3 funnel depends on, with its properties:

| Event | Driven by | Properties on the wire |
| --- | --- | --- |
| `installation_viewed` | `trackRouteView("/docs/installation")` | `source: installation_page` |
| `component_viewed` | `trackRouteView("/docs/components/button")` | `component: button`, `source: component_page` |
| `docs_viewed` | `trackRouteView("/docs/tokens")` | `page: /docs/tokens`, `source: docs_page` |
| `cli_command_copied` | real `HeroCommand`, clicked | `source: homepage_hero`, `package: @kinetixui/cli` |
| `install_command_copied` | real `CodePre` on the installation page, clicked | `source: installation_page`, `package: @kinetixui/ui` |
| `platform_selected` | real `ComponentPreview` → code tab → SwiftUI tab | `platform: swiftui`, `component: button`, `location: platform_tabs` |
| `component_code_copied` | the same preview's Copy button | `component: button`, `platform: swiftui` |
| `cta_clicked` **× 6** | every Phase 2 target via the real `ctaAttrs` helper | `platform_coverage`, `view_verification`, `adopt_tokens`, `adopt_components`, `adopt_blocks`, `platform_availability` |
| `block_code_copied` | Phase 3's new event | `block: pricing-table`, `platform: flutter`, `source: blocks_gallery` |

**Every one of the 14 carried the campaign**: `kx_campaign: kx_p2_a_drift`, `kx_source: linkedin`,
`kx_medium: social`, `kx_content: li_primary`, `kx_landing_page: /docs/platforms`, plus the `kx_first_*`
first-touch mirror. **No leak:** no raw query string, no `?`, no `#`, no copied command text, no component
source sentinel. `sanitizeProps` is a fixed point on every event's own properties.

The harness was **removed before the PR** — it duplicated existing per-component coverage and its
`toBe(14)` assertion would break on any new event, which is the brittleness this repository avoids. What it
proved is recorded here.

## Campaign attribution — PASS

Verified against the **production normalizers**, not against a copy of their rules:

- All **10** campaigns survive `normalizeCampaign` unchanged — none is silently dropped.
- All three ICP prefixes are present and survive: **`p1`**, **`p2`**, **`neutral`**.
- All **23** linkable asset URLs resolve their full quartet — `utm_source` to a real `ATTRIBUTION_SOURCES`
  member (never `other`), `utm_medium` to a real medium, `utm_campaign` to itself, `utm_content` to itself.
- Every channel in the register (`linkedin`, `x`, `devto`) is a real attribution source.

## Content and visual integrity — PASS

`27` assets · `23` linkable, all attributed · `6` families · `10` visual briefs · `12` distribution rows ·
`127` routes verified · `14` attribution sources read from the runtime. Every asset file exists. Day 1–7
assets resolve: **LI-003, X-005, LI-004, X-003**. Nine visual assets present as both SVG and PNG, all with
alt text. Nothing regenerated.

## Full validation

| Gate | Result |
| --- | --- |
| `lint` (`--force`) | **PASS** — 0 errors, 2 warnings, both pre-existing in `marketing-claims.test.ts` |
| `typecheck` (`--force`) | **PASS** — 9/9 |
| Web suite (cache bypassed) | **PASS — 1,097 tests, 39 files** |
| `@kinetixui/ui` · `cli` · `iot` · `angular` · `create-theme` (`--force`) | **PASS** — 290 · 89 · 241 · 111 · 617 |
| `test:release` | **PASS** — 262 tests, 259 pass, 0 fail, 3 skipped by design |
| `build:web` | **PASS** |
| 23 repository guards | **PASS** — manifest, verification, blocks, platform-source, block-source, platform-code, registry-deps, releases, usage, flagship-examples, iot-examples, token-contract, angular-api, stories, contrast, rtl, swiftui-tokens, icons, typography, grid, iot-dist, content, distribution |

**Caches were forced.** A turbo cache hit had previously hidden the web suite from the changed guards, so the
web tests were run directly rather than through turbo.

## Production-build smoke — PASS

`next start` against the real build. `/`, `/components`, `/blocks`, `/docs`, `/docs/platforms`,
`/docs/tokens` all **HTTP 200**, with no runtime-error marker in any response.

**The Phase 2 sections render**, asserted from the served HTML rather than from source — all five new CTA
targets and both new sources are in the markup (`26` `data-analytics-cta` occurrences on the homepage alone),
and the retired `Runtime deps` row and `Copy a component, own the code` hero are **absent**.

## One finding, not fixed here

**`siteConfig.tagline` still carries the retired headline.**

`apps/web/src/lib/site.ts` line 17 is `"One token architecture, in motion across every platform."` —
untouched by this branch, and it drives the page `<title>`, `og:title`, `og:image:alt` and a footer
paragraph. It is in the rendered production HTML today.

Phase 2's own comment in `page.tsx` explains why that headline was retired: it *"led with the mechanism and
said 'every platform', which invites exactly the parity reading the positioning rejects."* So the branch
ships a homepage that rejects the sentence in its hero and in its source comment, while every shared link,
search result and social card still says it.

**Not a regression, and not a merge blocker** — it is identical on `main`. But it is a **Day 1 blocker**,
because Phase 6's distribution depends on shared links carrying the right message, and it belongs beside the
social-preview upload rather than after it.

**Deliberately not fixed in this PR.** The tagline is public copy, `MESSAGING.md` is canonical about wording,
and this preflight was authorised to prepare the existing change set rather than extend it. It also reveals a
guard gap worth naming: `site.ts` *is* in `marketing-claims.test.ts`'s `PUBLIC_SURFACES`, but no rule ties the
tagline to the canonical hero or catches "every platform" inside it.

## Known metric-definition issue — unresolved on purpose

`Adoption Intent Rate` can exceed 100%. `analytics.md` §6 divides Adoption Intent by Qualified Evaluation and
§4's prose says "having evaluated", but §4's signal list does not require it: `install_command_copied`,
`cli_command_copied` and the `adopt_*` CTAs are not Qualified Evaluation signals. Observed rather than
hypothetical — **6 Adoption Intent sessions against 5 Qualified Evaluation sessions** on 2026-09-21.

**This does not block event collection, and must not.** The events need to be arriving before the definition
can be settled against real data. For now: dashboard tiles report **counts**, no misleading percentage is
shown, insight 10 carries a `Both` overlap column, and `analytics.md` §11 marks the rate definition
unresolved with both candidate resolutions written down.

## Rate display — verified

No dashboard tile and no public surface reports `Qualified Evaluation Rate` or `Adoption Intent Rate` as a
headline percentage. Tiles 5 and 8 keep the spec's names and display numerator and denominator as **counts**.
The dashboard's text tile carries the baseline policy: **the first 6 weeks of real distribution, or 300
sessions with ≥30 qualified evaluations, whichever is later.** No target was manufactured.

## Deployment requirement

**Day 1 distribution is blocked until this is merged and `apps/web` is deployed.** Production runs `main`,
which contains none of the Phase 2–6 analytics vocabulary. Three of Qualified Evaluation's six signals cannot
fire there, so the primary Tier 1 metric would record a fraction of what happened — and a low number would
read as *the content did not work* when it means *the page could not report it*.

**No package publication is required.** No package version, manifest or changeset changed; this is a website
and documentation change set.

## Remaining manual settings

Three, all in GitHub **Settings → General**, none reachable from this environment — the proxy refuses
repository settings writes as a category, and the social preview has no REST endpoint at all:

1. Replace the repository description — wording in `MESSAGING.md` §I.
2. Set the 20 topics — currently empty; the list is in `audits/PHASE-0.75-PUBLIC-SURFACE.md`.
3. Upload `content/visuals/SOCIAL-PREVIEW.png` as the social preview.

**`CLAIMS.md` D1 (one-command installation) remains `PENDING LIVE VERIFICATION`.** Nothing in this change set
promotes it.
