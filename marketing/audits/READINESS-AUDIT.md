# KinetixUI — Marketing Readiness Audit

**Audit date:** 2026-09-28 · **Commit audited:** `789c90e` (`main`) · **CI at that commit:** green (41/41 steps)
**Auditor's rule for this document:** no number appears here unless it was read out of source, a manifest, a
test run, a workflow result or the npm registry during this audit. README copy, website copy, package
descriptions and changelog prose were treated as **claims to be checked**, not as evidence.

> **Status: findings below are the state at `789c90e` and are left as written.** This is a dated
> snapshot, not a living document — the same reason `releases.ts` and the CHANGELOGs are never
> retro-edited here. What has since been fixed, mitigated or deferred is tracked in
> [`PHASE-0.5-REMEDIATION.md`](./PHASE-0.5-REMEDIATION.md); read that for current state.
> This file moved from `docs/marketing/` to `marketing/audits/` during that remediation, which
> resolves finding §6.4.3 and recommendation P1 #18 below.

## Audit method and its one limitation

Everything below was verified by reading the repository at `789c90e`, running its own test and check scripts,
querying `registry.npmjs.org` directly, downloading and unpacking the published tarballs, and reading the
GitHub API for repository, workflow and release state.

**One limitation, stated plainly:** `kinetixui.com` could not be reached from the audit environment — its
network policy denied the host (HTTP 403 on CONNECT to `kinetixui.com:443`), which is a property of this
container, **not evidence about the site**. Every website finding below is therefore derived from
`apps/web` source, which is the site's build input. Four statements could not be closed and are marked
**[needs live check]**: whether the deployed site currently serves `/r/registry.json`, `/specs/*.json`,
`/sitemap.xml` and `/robots.txt`. They are listed as a P0 verification, not as defects.

---

## 1. Executive summary

KinetixUI is in an unusual and, for marketing purposes, very favourable position: **the product is
substantially more rigorous than its own marketing surface admits, and the repository already contains the
machinery to keep claims honest.** The risk here is not the usual one of a project overclaiming. It is
three narrower problems:

1. **The npm shop window is empty.** Four of the five published packages — including the flagship
   `@kinetixui/ui` — ship **no README**. A developer arriving from a post, a search or a Product Hunt link
   lands on a blank npm page. This is the single highest-impact defect found.
2. **Distribution and maturity are conflated at the top of the funnel.** SwiftUI, Jetpack Compose and
   Flutter are marked `maturity: "stable"` and are named in the homepage headline sentence alongside React,
   but all three are `published: false` — there is no installable artifact for any of them. The deep docs
   are scrupulously honest about this ("Not on Maven Central yet", "Not on pub.dev"). The hero is not.
3. **Release visibility is badly stale.** npm is at `0.23.3`; GitHub's Releases sidebar still advertises
   `v0.5.0` from 2026-09-06. 94 git tags exist, only 2 have Release objects.

Against that, the defensible core is genuinely strong: one DTCG token source compiling to four platform
outputs, **2,546 passing tests**, **zero known accessibility violations** across 102 stories in light and
dark with every axe rule enabled, **20 Blocks at true 5-platform parity**, and roughly 35 CI gates of which
8 exist purely to stop documentation drifting from source. The repository even ships
`pnpm marketing:stats`, a script whose stated purpose is to prevent marketing from quoting numbers the code
cannot prove.

**Verdict: not ready for active promotion today; roughly 1–2 focused days of work from ready.** No claim
currently made on the site or README is outright false. The blockers are omissions, staleness and one
category error (maturity read as availability), all of which are cheap to fix.

---

## 2. Verified product state

### 2.1 Workspace and versions

10 workspace projects (7 `packages/*`, 2 `apps/*`, plus the root). Five are published:

| Package | Version | Published | License | Provenance |
|---|---|---|---|---|
| `@kinetixui/ui` | 0.23.3 | ✅ npm | MIT | ✅ SLSA v1 attestation |
| `@kinetixui/tokens` | 0.23.3 | ✅ npm | MIT | ✅ |
| `@kinetixui/cli` | 0.23.3 | ✅ npm | MIT | ✅ |
| `@kinetixui/angular` | 0.24.0 | ✅ npm | MIT | ✅ |
| `@kinetixui/iot` | 0.2.0 | ✅ npm (published 2026-09-28 18:53:53Z) | MIT | ✅ |
| `@kinetixui/create-theme` | 0.0.0 | private | — | — |
| `@kinetixui/create-preset` | 0.0.0 | private | — | — |
| `@kinetixui/web` | 0.1.0 | private | — | — |
| `@kinetixui/docs` | 0.1.0 | private | — | — |

`@kinetixui/{ui,tokens,cli}` are a Changesets `fixed` cohort and share one version line.
`@kinetixui/angular` and `@kinetixui/iot` version independently.

### 2.2 Components — the count needs care

| Measure | Value | Source |
|---|---|---|
| Catalogue entries | **98** | `components.manifest.json` → `components` |
| Lifecycle | 97 `stable`, 1 `beta`, 0 `deprecated` | `component-status.json` |
| Component files in `packages/ui/src/components` | 96 | filesystem |
| Exports from `packages/ui/src/index.ts` | 97 | source |
| Registry items | 97 | `registry/registry.json` → `items` |
| Static registry payloads on the site | 98 in `public/r`, 97 in `public/specs` | filesystem |

The gap is documented, not accidental, and it matters for copy:

- **`combobox` is explicitly not a component.** Its manifest entry reads: *"not a component — a documented
  composition of Command (CommandInput/CommandList/CommandItem). There is no Combobox export on any
  platform."* It is `registry: false`.
- **`avatar-group`** is real but co-located in `avatar.tsx` rather than its own file, which explains the
  96-vs-98 file count.

> **Safe wording:** "98 catalogue entries — 97 components plus one documented recipe." Saying "98
> components" is a 1-unit overstatement that a reader can catch from the repository, which is exactly the
> kind of small inaccuracy that damages a verification-led positioning.

### 2.3 Blocks

**20 Blocks, present on all 5 platforms — 100 of 100 implementations, 0 drafts** (`block-parity.json`:
`total: 20`, `onEveryPlatform: 20`, every platform `20/20`). This is the repository's **cleanest**
cross-platform claim and is currently under-marketed relative to the component catalogue.

### 2.4 Design tokens

Single DTCG source in `tokens/` → Style Dictionary v4 → four platform outputs.

| | Count |
|---|---|
| Token definitions in source (`$value` leaves) | **357** (215 primitive, 142 semantic) |
| CSS custom properties, light | 277 |
| CSS custom properties, dark | 52 |
| Generated artifacts in `packages/tokens/dist` | 28 files across `web/`, `ios/`, `android/`, `flutter/` |

`exports` expose `.`, `./css`, `./css/dark`, `./css/extras`, `./css/extras/dark`. `sideEffects: ["*.css"]`
is correctly declared.

### 2.5 Theming, dark mode, RTL, responsive

- **Dark mode:** class-based (`darkMode: ["class"]` in the Tailwind preset), `next-themes` with
  `defaultTheme="system"`, and a dedicated 52-variable dark token set. **Verified.**
- **Theming:** `@kinetixui/create-theme` (private, **617 tests across 12 files**), a `/themes` route, a
  `/create` route with a portable preset code (`KX1_…`), and `kinetixui theme` / `preset` / `decode` CLI
  commands. Substantial and verified.
- **RTL:** two distinct things, easily conflated. (a) A CI guardrail (`check:rtl`) converting components
  from physical to logical Tailwind utilities, with an explicit `NOT_YET_CONVERTED` allowlist — so the
  conversion is **incremental and incomplete by design**. (b) Behavioural RTL verification covers only
  **3 of 98** React components (Flutter, interestingly, covers 58/90). **Partially verified.**
- **Responsive:** `a11y-site.yml` runs a real-browser pass at phone / tablet / desktop widths including a
  horizontal-overflow check. That is genuine responsive verification of the site's own pages; it is not
  per-component responsive verification.

### 2.6 Accessibility — the strongest verifiable claim

`a11y-baseline.json` is `[]` — **an empty baseline, meaning zero known violations.** The harness
(`scripts/a11y-browser.mjs`) runs the built Storybook in headless Chromium over **every story in light and
dark with every axe rule enabled**, and the baseline is designed to only ever shrink (a stale entry fails
the run). Beyond axe it asserts four browser-only behaviours: reduced-motion (no looping animation faster
than 3s), forced-colors (every focus stop keeps a visible indicator), keyboard drag-and-drop on
KanbanBoard, and DataGrid rectangle selection.

Per-component evidence from `verification.json`, React: **accessibility 98/98, build 98/98, interaction
23/98, rtl 3/98, largeText 0/98, visual 0/98.**

> Note `visual: 0` on **every** platform. There is no visual-regression verification anywhere in this
> repository. No campaign asset may imply pixel-level regression safety.

### 2.7 Testing and CI

**2,546 tests passing, 0 failing, 0 skipped**, verified by running the suites during this audit:

| Suite | Files | Tests |
|---|---|---|
| `@kinetixui/web` | 38 | 1,071 |
| `@kinetixui/create-theme` | 12 | 617 |
| `@kinetixui/ui` | 6 | 290 |
| `@kinetixui/iot` | 5 | 241 |
| `@kinetixui/angular` | 3 | 111 |
| Release tooling (`node:test`) | 11 | 216 |
| **Total** | **75** | **2,546** |

Native test files exist but are not counted above (they run in their own workflows): **24 Swift, 29 Kotlin,
33 Dart**. 102 Storybook stories.

CI on `main` at `789c90e`: **41 steps, all green**, including 8 drift checks whose only job is to fail when
documentation stops matching source — component snippets, usage examples, Block snippets, IoT examples,
the flagship homepage example, icon mappings, verification evidence, and generated-file sync.

**Gap: `packages/cli` has zero tests.** The CLI is the primary activation path (`npx @kinetixui/cli add`)
and the only untested first-party surface.

---

## 3. Platform coverage

Read from `components.manifest.json` → `platformDefinitions` and `platform-parity.json` → `coverage`.
**Nothing in this table is inferred from documentation.**

| Platform | Maturity | Catalogue | Components | Real source | Distribution | Published |
|---|---|---|---|---|---|---|
| React | stable | complete | **98 / 98** | `packages/ui` | npm `@kinetixui/ui` | ✅ |
| Angular | **preview** | incomplete | **31 / 98** | `packages/ui-angular` | npm `@kinetixui/angular` | ✅ |
| SwiftUI | stable | complete | **90 / 98** | 125 files, 10,557 LOC | Swift Package Manager | ❌ **no** |
| Jetpack Compose | stable | complete | **90 / 98** | 141 files, 13,910 LOC | Maven Central | ❌ **no** |
| Flutter | stable | complete | **90 / 98** | 137 files, 13,385 LOC | pub.dev | ❌ **no** |

90 of 98 on all four catalogue-complete platforms; **8 documented exceptions**, each carrying a written
reason in the manifest.

### 3.1 Verification evidence, as fractions

A partial count is not a tick. From `verification.json`:

| Platform | build | interaction | accessibility | rtl | largeText | visual |
|---|---|---|---|---|---|---|
| React | 98/98 | 23/98 | **98/98** | 3/98 | 0/98 | 0/98 |
| Angular | 31/31 | **31/31** | **31/31** | 1/31 | 0/31 | 0/31 |
| SwiftUI | 90/90 | **0/90** | **0/90** | 0/90 | 0/90 | 0/90 |
| Compose | 90/90 | 5/90 | 4/90 | 1/90 | 0/90 | 0/90 |
| Flutter | 90/90 | 6/90 | 5/90 | 58/90 | 58/90 | 0/90 |

SwiftUI has 24 test files, but they are token, contrast, spatial-scale and Block-structure tests — none
classified as per-component interaction or accessibility verification. **"Accessible on every platform" is
false as stated.** It is true, and strong, for React and Angular.

### 3.2 The distribution problem, precisely

The three native platforms have **real, substantial, CI-compiled implementations** and **no installable
artifact**. The manifest says so in its own words — SwiftUI: *"publish-swiftui.yml splits
packages/ui-swiftui to a mirror repo; it needs SWIFTUI_MIRROR_REPO and has never been run for real."*
Compose and Flutter workflows exist but need credentials and default to a dry run.

The docs pages handle this honestly (`/docs/compose`: "Not on Maven Central yet. Consume it by cloning the
repo and copying"; `/docs/flutter`: "Not on pub.dev (`publish_to: none`)"; `/docs/swiftui` uses
`.package(path: …)`). The **homepage hero does not**, because `platformSentence` is derived from `maturity`
alone and carries no publication state.

### 3.3 Wearables

`WEARABLES.md` states: **"decided in principle, nothing built."** The site says the same
(`platform-support.ts`: *"No implementation yet"* for both Wear OS and watchOS). **Zero implementation.**
Wearables must not appear in any campaign claim, including as "coming soon" with a date.

### 3.4 IoT

`@kinetixui/iot@0.2.0`, published today, maturity `experimental` (derived from `IOT_MATURITY`, and the site
label is composed from the package version so it cannot drift). Surface: **14 React exports** (5 primitives
+ 9 patterns), **48 exports** from the React-free `./functions` entry, 62 from the root, 6 documented
examples, 37 source files, 241 tests. React only — no native IoT implementation exists.

---

## 4. Package / distribution state

### 4.1 The critical defect: no README on npm

Verified by unpacking each published tarball **and** by reading `.readme` from the registry:

| Package | README in tarball | README rendered on npmjs.com | LICENSE in tarball |
|---|---|---|---|
| `@kinetixui/ui` | ❌ | ❌ **blank page** | ✅ |
| `@kinetixui/cli` | ❌ | ❌ **blank page** | ✅ |
| `@kinetixui/tokens` | ❌ | ❌ **blank page** | ✅ |
| `@kinetixui/angular` | ❌ | ❌ **blank page** | ✅ |
| `@kinetixui/iot` | ✅ (84 lines) | ✅ | ✅ |

No `packages/*/README.md` exists except for `iot`. LICENSE is correctly present in all five tarballs.
**This is the highest-ROI fix in the entire audit** — it is the destination of every npm link in every
campaign asset.

### 4.2 Metadata gaps

| Field | ui | cli | tokens | angular | iot |
|---|---|---|---|---|---|
| `keywords` | 7 | ❌ **none** | 5 | 5 | 7 |
| `author` | ✅ | ❌ | ✅ | ❌ | ✅ |
| `bugs` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `funding` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `homepage` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `repository` | ✅ object | ⚠️ shorthand string, no `directory` | ✅ object | ✅ object | ✅ object |

`bugs` is missing on all five — npm renders an "Issues" link from it. `funding` is missing on all five.
`@kinetixui/cli` having **no keywords at all** is a direct npm-search loss on a package whose whole job is
to be found and run.

### 4.3 Tree-shaking — measured, not assumed

`@kinetixui/ui` declares `sideEffects: false`, but its `dist/` is **two files**: `index.js` (292 KB) and
`index.d.ts`. Measured with esbuild (`--bundle --minify`, react/react-dom external):

| Import | Minified bundle |
|---|---|
| `import { Button } from "@kinetixui/ui"` | **677,991 bytes** (205,562 gzipped) |
| `import * as all from "@kinetixui/ui"` | 1,014,740 bytes |

**One component costs 67% of the whole library.** The esbuild metafile shows why: all 140,476 bytes of
`@kinetixui/ui/dist/index.js` are included, and 343 inputs across ~40 transitive UI dependencies
(`react-resizable-panels`, `@dnd-kit/*`, `vaul`, `sonner`, `embla-carousel`, `cmdk`, `react-day-picker`, …)
come with it. A single pre-bundled module with no subpath exports cannot be shaken per component.

The fix pattern **already exists in this repository**: `@kinetixui/iot` ships three entry points with
chunk splitting, and one function from `@kinetixui/iot/functions` bundles to **195 bytes**.

> **Do not claim "tree-shakeable" for `@kinetixui/ui`.** It is accurate for `@kinetixui/iot` and
> `@kinetixui/tokens`. For `ui`, the honest and still-attractive framing is the registry: copy only the
> component you want.

### 4.4 Release engineering

Genuinely strong and worth marketing to a technical audience: Changesets-driven; a preflight that builds,
packs, validates every tarball, smoke-tests each in a clean consumer and dry-run publishes **before** the
first upload; publication confirmed against the registry before any tag is created; npm provenance
(SLSA v1) on all five packages; 216 release-tooling tests; a `fixed` cohort plus independent lifecycles
correctly modelled. This audit watched run #332 publish `@kinetixui/iot@0.2.0` and create its tag only
after registry confirmation.

### 4.5 Release visibility — stale

| | |
|---|---|
| Git tags | **94** |
| Tags with a GitHub Release object | **2** (`v0.4.1`, `v0.5.0`, both 2026-09-06) |
| npm latest | 0.23.3 / 0.24.0 / 0.2.0 |
| GitHub "Releases" sidebar shows | **v0.5.0** |

A developer landing on the repository sees a latest release five months of development behind the published
packages. There is also no root `CHANGELOG.md`; per-package `CHANGELOG.md` files exist and the site renders
`/docs/changelog`.

---

## 5. GitHub readiness

### 5.1 The 30-second test

| Question | Answered? | Where |
|---|---|---|
| **WHAT** is it | ✅ Yes | H1 + one-paragraph description, line 1–14 |
| **WHO** it is for | ⚠️ Implied only | No persona sentence; "developers building on multiple platforms" is inferred |
| **WHY** different | ✅ Yes | "one token contract, native per platform, not generated from one another" |
| **WHICH** platforms | ⚠️ Yes but incomplete | Names 5 correctly; does **not** say three are unpublished |
| **HOW** to try | ✅ Yes | `npx @kinetixui/cli init` in the Quick start block |

**4 of 5 clear within 30 seconds.** The README is above average for a project this age: centred header,
three badges (CI, npm, license), a real screenshot (`.github/assets/home.png`), a link to a live flagship
demo, and a Quick start before any prose.

### 5.2 README drift — verified

| Claim in README | Reality | Status |
|---|---|---|
| Packages table lists 6 entries | Omits `@kinetixui/angular` (published 0.24.0) and `@kinetixui/iot` (published 0.2.0) | **stale** |
| Monorepo layout tree | Omits `packages/ui-angular`, `packages/iot`, `packages/create-theme`, `packages/create-preset` | **stale** |
| "Storybook 8" | Storybook **10.6** | **outdated** |
| "merging that publishes `@kinetixui/{tokens,ui,cli}`" | Also publishes `angular` and `iot` cohorts | **incomplete** |
| "CI … runs the `@kinetixui/ui` tests" | ~35 gates, 5 test suites, 8 drift checks | **understated** |
| "`ui-compose`/`ui-swiftui`/`ui-flutter` … Registry: — (Gradle)/(SwiftPM)/(Dart)" | Accurate but never says "not published" | **ambiguous** |

### 5.3 Repository settings and community

| Item | State |
|---|---|
| Description | ⚠️ *"…React, SwiftUI, Jetpack Compose and Flutter components."* — **omits Angular and IoT** |
| **Topics** | ⚠️ **none returned** by the repository API object — a primary GitHub discovery channel appears unused. **[needs confirmation]** in repo settings, since an empty list may simply be omitted from the response |
| Homepage | ✅ `https://kinetixui.com/` |
| Discussions | ❌ **disabled** (`has_discussions: false`) |
| Issue templates | ✅ bug + feature, blank issues disabled, security advisory + docs contact links |
| PR template | ✅ |
| `CONTRIBUTING.md` | ✅ (plus `GOVERNANCE.md`, `SECURITY.md`) |
| `CODE_OF_CONDUCT.md` | ❌ missing |
| `.github/FUNDING.yml` | ❌ missing — no Sponsor button |
| `CODEOWNERS` | ❌ missing |
| Wiki | ⚠️ enabled and unused (empty tab) |
| Stars / forks / open issues | 2 / 0 / **0 issues**, 6 open PRs (all Dependabot, all from today) |
| Roadmap | ⚠️ `marketing/roadmap.md` exists in-repo; no public roadmap surface |
| Badges | 3 (CI, npm version, license). No downloads, no bundle size, no community |

---

## 6. Website readiness

Audited from `apps/web` source. 127 page files, **128 `metadata` exports** — per-page titles and
descriptions are essentially complete.

### 6.1 Information architecture

`mainNav` carries **8 items**: Docs, Components, Blocks, Charts, Infographic, Themes, Create, IoT.
Docs comprise **98 component pages + 19 concept pages** (`installation`, `theming`, `tokens`, `dark-mode`,
`accessibility`, `rtl`, `platforms`, `cli`, `angular`, `swiftui`, `compose`, `flutter`, `iot`,
`foundations`, `colors`, `icons`, `component-specs`, `kinetixui-json`, `contributing`, `changelog`).

Coverage is excellent. **8 top-level nav items with no visual hierarchy is the main IA risk** — "Charts",
"Infographic" and "Themes" compete with the primary path (Docs → Components → Blocks), and nothing in the
bar signals what a first-time visitor should click.

### 6.2 What the site does exceptionally well

The site **derives its copy from the manifests instead of typing it**, with tests that fail the build if
hand-typed lists reappear. `platform-prose.ts` carries a comment explaining exactly why: *"six separate
sentences across the homepage, the site description, the README and the docs landing still read 'React,
SwiftUI, Jetpack Compose and Flutter' long after Angular became a real platform."* `siteConfig.version` and
`license` are read from `@kinetixui/ui/package.json`; the IoT maturity label is composed from the IoT
package version. This is materially better than most commercial design-system sites.

### 6.3 SEO and social

| Item | State |
|---|---|
| `robots.ts` | ✅ crawlable, `/r/` excluded with a written rationale |
| `sitemap.ts` | ✅ derived from nav (`publicRoutes()`), no parallel list; `lastModified`/`priority` deliberately omitted with a reason |
| `metadataBase` | ✅ |
| Structured data | ✅ JSON-LD `WebSite` + `SoftwareApplication`, with its own test |
| OpenGraph | ⚠️ present, but **one site-wide image** — "every page that doesn't define its own (the whole site today)" |
| Twitter card | ⚠️ `summary_large_image` with **no `site`/`creator`** — deliberate: no X account exists |
| **Canonical URLs** | ❌ **no `alternates.canonical` anywhere in `src/app`** |
| Analytics | ✅ PostHog, gated on `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST`, with architecture + attribution tests |
| CTA instrumentation | ✅ `ctaAttrs(location, action)` on hero and section CTAs |
| `<html dir>` | ⚠️ hardcoded `ltr` — the site itself is not RTL although the library markets RTL |

### 6.4 Site-vs-repository mismatches

1. **Homepage hero implies availability for three unpublished platforms** (§3.2). Highest-severity site
   finding.
2. **`marketing:stats`, the repository's own source of truth for campaign numbers, omits `@kinetixui/iot`.**
   `scripts/marketing-stats.mjs:53` hardcodes `["@kinetixui/ui","@kinetixui/cli","@kinetixui/tokens","@kinetixui/angular"]`.
   The script that exists to stop stale numbers now under-reports the product by one published package, and
   prints no IoT figures at all.
3. **Two parallel marketing directories.** A populated `marketing/` at the repository root (positioning,
   messaging, personas, SEO, content calendar, drafts) and now `docs/marketing/` for this audit. One of
   these should absorb the other before more documents land.
4. Wearables appear on the site only as "No implementation yet" — **correct**, no mismatch.

---

## 7. Activation journey

| Stage | State | Friction |
|---|---|---|
| **Discovery** | ⚠️ Weak | No GitHub topics returned **[needs confirmation]**; stale repo description omitting Angular + IoT; `cli` has no npm keywords; no X account; 2 stars / 0 discussions offers no social proof |
| **npm landing** | ❌ **Broken** | 4 of 5 packages render a blank npmjs.com page |
| **Homepage** | ✅ Strong | Clear H1, two CTAs, an install command visible above the fold, instrumented. Risk: 8-item nav; hero implies native availability |
| **Docs** | ✅ Strong | `/docs/installation` opens with a two-column "registry vs npm" table — genuinely good. 117 pages |
| **Component / Block** | ✅ Strong | 98 component pages; per-platform source shown from real compiled files, drift-checked in CI |
| **Installation (React)** | ✅ Works | `npx @kinetixui/cli init && add button` — verified to resolve against the static registry payloads that ship in `apps/web/public/r` (98 files) **[needs live check]** that the deployed site serves them |
| **Installation (native)** | ❌ **Not a path** | "clone the repo and copy" is not an install. Any developer arriving for SwiftUI/Compose/Flutter cannot start |
| **First success (React)** | ✅ Likely | Tailwind preset + token import + dark mode all documented on one page |
| **First success (Angular)** | ⚠️ Partial | Installable and 31/98 components, correctly labelled Preview |

**Two hard stops:** the blank npm pages, and the absence of any native install path. The single point of
total dependency is `kinetixui.com` — `DEFAULT_REGISTRY = "https://kinetixui.com/r"`
(`packages/cli/src/lib/config.ts:6`). If that origin is unavailable, `add` fails for every user, and there
is no fallback and **no CLI test** covering it.

---

## 8. Claim verification matrix

| # | Claim | Evidence | Status | Safe wording | Risk if used as-is |
|---|---|---|---|---|---|
| 1 | "Cross-platform design system" | 5 platforms with real source: 98/31/90/90/90 components; 20/20 Blocks everywhere | **VERIFIED** | "Five platform implementations on one token contract" | Low |
| 2 | "Available on every platform" | 3 of 5 `published: false` | **FALSE / OUTDATED** | "React and Angular ship on npm today; SwiftUI, Compose and Flutter are built in CI and not yet distributed" | **High** — a reader tries to install and cannot |
| 3 | "Single source of truth" (tokens) | 357 DTCG definitions → 28 generated artifacts across web/iOS/Android/Flutter; `build:tokens` + vendor scripts; drift-gated | **VERIFIED** | "One DTCG token source compiles to every platform's own token output" | Low |
| 4 | "Single source" (components) | Component code is written natively per platform, **not generated** | **FALSE if implied** | "Shared token contract; native component code per platform" | **High** — README already words this correctly; keep it |
| 5 | "Platform parity" | 90/98 on 4 catalogue platforms; Angular 31/98; 8 documented exceptions | **PARTIALLY VERIFIED** | "90 of 98 components on all four catalogue-complete platforms, with 8 documented exceptions. Angular is Preview at 31." | Medium |
| 6 | "Block parity across 5 platforms" | `block-parity.json`: 20/20 × 5, `onEveryPlatform: 20`, 0 drafts | **VERIFIED** | "All 20 Blocks on all five platforms" | Low — *under-used today* |
| 7 | "98 components" | 98 entries, one of which is documented as "not a component" | **PARTIALLY VERIFIED** | "97 components plus one documented recipe (98 catalogue entries)" | Medium |
| 8 | "Production ready" | 2,546 tests green, ~35 CI gates, provenance; but `0.x` versions, IoT `experimental`, Angular `preview`, site says "Free while in beta" | **UNVERIFIED** | "Beta. Used to build kinetixui.com itself." | **High** — contradicted by the project's own beta labelling |
| 9 | "Accessible" | React a11y 98/98; **empty axe baseline** across 102 stories × light/dark, all rules; forced-colors, reduced-motion, keyboard-drag checks; WCAG AA contrast audit on every token pair | **VERIFIED (React, Angular)** | "Every React component passes axe with all rules enabled, light and dark, with zero baselined violations" | Low — *strongest asset* |
| 10 | "Accessible on every platform" | SwiftUI a11y **0/90**; Compose 4/90; Flutter 5/90 | **FALSE** | "Accessibility is verified per component on React and Angular; native coverage is token and structure level today" | **High** |
| 11 | "WCAG AA" | `check:contrast` audits every semantic token pair, light + dark, in CI | **VERIFIED (token pairs)** | "Every semantic token pair audited against WCAG AA contrast in CI" | Low — do not extend to "WCAG AA compliant product" |
| 12 | "RTL support" | Logical-property guardrail with an explicit not-yet-converted allowlist; behavioural RTL 3/98 React | **PARTIALLY VERIFIED** | "RTL conversion is in progress and enforced forward in CI" | **High** if stated flatly |
| 13 | "Responsive" | Site pages verified at 3 widths with overflow checks; no per-component responsive suite | **PARTIALLY VERIFIED** | "The documentation site is verified at phone, tablet and desktop widths" | Medium |
| 14 | "Dark mode" | `darkMode: ["class"]`, 52-variable dark set, every story axe-tested in dark | **VERIFIED** | "First-class dark mode, verified in both themes" | Low |
| 15 | "Generated" (tokens) | Style Dictionary v4 pipeline, 28 outputs, vendor scripts, drift-gated | **VERIFIED** | "Tokens are generated; components are not" | Low |
| 16 | "Native" | 10,557 Swift / 13,910 Kotlin / 13,385 Dart LOC, compiled in per-platform CI | **VERIFIED (as code)** | "Native implementations, compiled per platform in CI — not wrappers or web views" | Low — never pair with "available" |
| 17 | "Wearables" | `WEARABLES.md`: "decided in principle, **nothing built**" | **UNVERIFIED — zero implementation** | Say nothing | **Critical** — do not mention, not even as "soon" |
| 18 | "IoT" | `@kinetixui/iot@0.2.0` published; 14 React exports, 48 functions, 241 tests; maturity `experimental`; React-only | **VERIFIED as experimental React module** | "An experimental React module for connected-device UI" | Medium — must carry "experimental" and "React-only" |
| 19 | "Tree-shakeable" | `ui`: one `Button` import = 678 KB of a 1,015 KB library. `iot/functions`: 195 bytes | **FALSE for `@kinetixui/ui`** | "Copy only the component you need via the registry" | **High** — trivially disproven by any reader |
| 20 | "Tested" | 2,546 passing, 0 failing, 0 skipped, verified this audit | **VERIFIED** | "2,546 tests, green on `main`" | Low |
| 21 | "Verified in CI, not asserted" | ~35 gates, 8 drift checks, `verification.json` generated from the test files themselves | **VERIFIED** | Use verbatim — it is true and rare | Low — *strongest differentiator* |
| 22 | "Type-safe" | Typecheck across all 9 workspaces in CI; `.d.ts` shipped; Angular strict template typecheck | **VERIFIED** | "Typechecked across every workspace in CI" | Low |
| 23 | "npm provenance" | SLSA v1 attestation on all 5 packages, confirmed at the registry | **VERIFIED** | "Every package published with npm provenance" | Low |
| 24 | "MIT / free" | MIT in all 5 manifests and all 5 tarballs; site says "Free while in beta" | **VERIFIED** | "MIT licensed" — note "free **while in beta**" implies future paid; be deliberate | Low, but a positioning decision |
| 25 | "Design system" | Tokens + components + Blocks + docs + CLI + governance + a11y contract | **VERIFIED** | Safe | Low |

---

## 9. Competitive assets

### STRONG DIFFERENTIATOR — market these

1. **Claims are gated in CI, and the evidence is generated from the tests.** `verification.json` is
   produced by reading marked passages in the test files and the symbols they call; 8 drift checks fail the
   build when documentation stops matching source; `marketing-stats.mjs` exists so campaigns cannot quote
   unprovable numbers. No competitor in this category markets this, because almost none do it.
2. **Per-component, per-platform, per-kind verification published as data** — a 5 × 6 evidence matrix where
   a partial count shows as a fraction, not a tick. This is auditable honesty as a product feature.
3. **Zero baselined accessibility violations** across 102 stories in light and dark with every axe rule on,
   plus forced-colors and reduced-motion assertions. Concrete and checkable.
4. **20 Blocks at true 5-platform parity** (100/100). Cleaner than the component story and currently
   under-marketed.
5. **One DTCG token source → four native token outputs**, with vendor scripts and CI drift gates.
6. **Release engineering**: preflight-then-publish with packed-artifact smoke tests, registry confirmation
   before tagging, provenance on every package, 216 tests on the release tooling itself.

### USEFUL FEATURE

7. Dual distribution — registry copy-source *and* versioned npm.
8. `@kinetixui/create-theme` + `/create` + portable `KX1_` preset codes (617 tests).
9. The IoT module as a domain vocabulary on top of the token contract (experimental).
10. shadcn-registry compatibility (`kinetixui.com/r/*.json`).
11. A CLI with `doctor`, `lint`, `parity` and `inspect` beyond the usual `init`/`add`.

### TABLE STAKES

12. MIT, TypeScript types, dark mode, Tailwind preset, Storybook, 98-entry catalogue, Radix foundations.

### NOT READY TO MARKET

13. **Wearables** — nothing built.
14. **SwiftUI / Compose / Flutter as available products** — real code, no distribution.
15. **Visual regression safety** — `visual: 0` on every platform.
16. **`@kinetixui/ui` tree-shaking** — measurably poor.
17. **Native accessibility** — 0/90 on SwiftUI.
18. **"Production ready"** — contradicted by the project's own beta labelling.

---

## 10. Marketing blockers

| # | Blocker | Impact |
|---|---|---|
| B1 | 4 of 5 published packages render a blank npm page | Every npm link in every asset lands nowhere |
| B2 | Homepage implies availability for 3 unpublished platforms | The core claim breaks on first contact for native developers |
| B3 | GitHub Releases stuck at `v0.5.0` while npm is at `0.23.3` | Reads as abandoned to anyone checking recency |
| B4 | No GitHub topics returned by the API **[needs confirmation]**; repo description omits Angular + IoT | Organic GitHub discovery is weakened or off |
| B5 | `marketing:stats` omits `@kinetixui/iot` | The anti-drift tool now has drift |
| B6 | README omits two published packages; says Storybook 8 | First-impression accuracy on a verification-led project |
| B7 | No community entry point (Discussions off, 0 issues, no CoC) | Launch traffic has nowhere to land |
| B8 | No canonical URLs; one site-wide OG image | SEO duplication risk; every share looks identical |
| B9 | No native install path | An entire audience cannot activate |
| B10 | `packages/cli` untested, and `kinetixui.com` is a single point of failure for `add` | An outage or regression silently breaks activation |

---

## 11. Recommendations

### P0 — before any active promotion

1. **Write a README for `@kinetixui/ui`, `@kinetixui/cli`, `@kinetixui/tokens`, `@kinetixui/angular`** and
   confirm each lands in the tarball. Model on `packages/iot/README.md`. *(B1)*
2. **Separate availability from maturity in all top-of-funnel copy.** Extend `platform-prose.ts` to carry
   `distribution.published` so the derived sentence says what is installable; add a test, matching the
   existing pattern that forbids hand-typed lists. *(B2)*
3. **Fix `scripts/marketing-stats.mjs`** — derive the package list from `release/publish-packages.json`
   instead of the hardcoded array at line 53, and print IoT. *(B5)*
4. **Publish GitHub Releases for the current versions**, or point the repository's release surface at
   `/docs/changelog`. Do not leave `v0.5.0` as latest. *(B3)*
5. **Confirm and set GitHub topics** (`design-system`, `design-tokens`, `react`, `swiftui`, `jetpack-compose`,
   `flutter`, `angular`, `tailwindcss`, `accessibility`, `dtcg`) and **update the repository description**
   to include Angular and IoT. *(B4)*
6. **Update the README**: add `@kinetixui/angular` and `@kinetixui/iot` to the Packages table and the
   layout tree, mark the three native ports "not yet distributed", correct Storybook 8 → 10, and describe
   CI as it now is. *(B6)*
7. **Add `keywords` to `@kinetixui/cli`** and `bugs` to all five packages. *(B1/B4)*
8. **[needs live check]** Confirm the deployed site serves `/r/registry.json`, `/specs/*.json`,
   `/sitemap.xml` and `/robots.txt`, and that `npx @kinetixui/cli add button` succeeds against production.
   This audit could not reach `kinetixui.com`. *(B10)*
9. **Decide the "production ready" question and say it once, consistently.** Current state is Beta, and
   "Beta, and we publish our evidence" is a stronger story than a claim the repository contradicts.

### P1 — during the first marketing cycle

10. Enable **GitHub Discussions**; add `CODE_OF_CONDUCT.md` and `.github/FUNDING.yml`; disable the empty wiki.
11. **Add tests for `packages/cli`** — the only untested first-party surface and the primary activation path.
12. **Add `alternates.canonical`** to page metadata.
13. **Per-page OG images** for at least `/`, `/components`, `/blocks`, `/iot` and the top component pages.
14. **Lead with Blocks** in at least one campaign asset — 20/20 on five platforms is the cleanest claim available.
15. **Reduce nav weight**: promote Docs / Components / Blocks; group Charts, Infographic, Themes, Create.
16. **Publish the roadmap** — `marketing/roadmap.md` exists privately; a public one converts.
17. **Give SwiftUI/Compose/Flutter a real install path**, even a tagged mirror or a pre-release, or state a
    dated intent. *(B9)*
18. **Reconcile `marketing/` and `docs/marketing/`** into one location.
19. Add **npm downloads** and **bundle-size** badges once the README work lands.

### P2 — optimisation

20. **Fix `@kinetixui/ui` tree-shaking** with per-component subpath exports or preserved modules, following
    the `@kinetixui/iot` pattern; then the claim becomes usable.
21. Add visual-regression verification so `visual` stops reading 0 everywhere.
22. Raise React `interaction` coverage above 23/98.
23. Complete the RTL logical-property conversion and empty `NOT_YET_CONVERTED`.
24. Make the site itself RTL-capable (`<html dir>` is hardcoded `ltr`).
25. Create the X account referenced as absent in `layout.tsx`, then add `twitter.site`/`creator`.
26. Consider a registry fallback (a CDN or GitHub-raw mirror) so `add` survives a site outage.

---

## 12. Marketing readiness scorecard

Scored 0–10 against the evidence in this document, not against ambition.

| Dimension | Score | Rationale |
|---|---|---|
| **Product clarity** | **7 / 10** | WHAT and WHY land in seconds and the token story is crisp. Loses points because availability is conflated with maturity, and the component count needs a footnote. |
| **Developer trust** | **5 / 10** | The engineering deserves 9 — 2,546 tests, ~35 gates, provenance, empty a11y baseline. The *signals* deserve 5: blank npm pages, `v0.5.0` as latest release, a README naming Storybook 8. |
| **Conversion readiness** | **5 / 10** | Homepage and installation docs are strong and instrumented. The npm destination is blank, native visitors cannot activate, and 8 flat nav items dilute the path. |
| **Documentation** | **9 / 10** | 117 doc pages, 98 component pages, honest per-platform pages, generated-and-drift-checked snippets. Best-in-class for this stage. |
| **Discoverability** | **3 / 10** | No GitHub topics returned by the API, stale description, `cli` with no keywords, four packages with no README, no canonical URLs, one OG image, no social presence. |
| **Analytics** | **8 / 10** | PostHog wired and env-gated, CTA attribution instrumented, with architecture and attribution tests. Needs live key verification and funnel definition. |
| **Community readiness** | **3 / 10** | Good templates, CONTRIBUTING, GOVERNANCE, SECURITY. But Discussions off, no CoC, no FUNDING, 2 stars, no public roadmap — nowhere for launch traffic to land. |
| **Launch readiness** | **4 / 10** | The product can carry a campaign; the surface cannot yet. P0 items 1–7 are roughly 1–2 days of work and move this to ~8. |
| **Overall** | **5.5 / 10** | *Strong product, unready shop window.* |

---

## Appendix — evidence index

| Fact | Source |
|---|---|
| Component / platform / Block counts | `components.manifest.json`, `platform-parity.json`, `block-parity.json`, `component-status.json` |
| Verification fractions | `verification.json` (generated by `pnpm gen:verification` from the test files) |
| Token counts | `tokens/primitives/*.json`, `tokens/semantic/*.json`, `packages/tokens/dist/**` |
| Test counts | `pnpm test` and `pnpm test:release`, run 2026-09-28 at `789c90e` |
| CI state | GitHub Actions run 36467920161 (CI) and 36467920005 (Release), both success |
| Publication state | `registry.npmjs.org` queried directly; all five tarballs downloaded and unpacked |
| Tree-shaking figures | esbuild 0.28.2 `--bundle --minify`, react/react-dom external, with `--metafile` |
| Repository settings | GitHub API repository object |
| Accessibility harness | `scripts/a11y-browser.mjs`, `scripts/a11y-site.mjs`, `a11y-baseline.json` (empty) |
| Native source volume | `find` + `wc -l` over `packages/ui-{swiftui,compose,flutter}` |

**Reproduce the headline numbers:** `pnpm marketing:stats` (after P0 #3, which adds the IoT package).
