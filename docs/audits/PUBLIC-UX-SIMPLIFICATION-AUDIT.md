# Public UX simplification audit

**Date:** 2026-10-05 · **Audited commit:** `5db94f0` (current `main`, PR #299 merged) · **Status:** findings only, nothing implemented
**Framework:** `simplify-product` (REMOVE → AUTOMATE → COMBINE → DEFAULT → DEFER → CLARIFY → REDESIGN, nine principles)
**Evidence:** `next build` + `next start` of `apps/web` at this commit, measured in Chromium 1440×900 and 390×844 with
Playwright. Screenshots, a per-route metrics file and the scripts' output are in the project's shared folder under
`ux-simplification-audit/` (`screens/*.png`, `metrics.json`). Line references are to this commit.

Every claim below is tagged:

- **FACT** — read from source, a manifest, a dependency, or measured in the browser. Reproducible.
- **OBS** — something seen in a screenshot that a person could judge differently.
- **INF** — an inference about visitor behaviour. Not measured; there is no user research behind it.
- **REC** — a recommendation.

Nothing here changes positioning, Qualified Evaluation, Adoption Intent, the token architecture, component APIs,
platform support or package distribution. Where a recommendation would touch an analytics event, the constraint is
stated next to it.

---

## 1. Executive verdict

**The site is rigorous and complete, and it makes the evaluator manage that rigour.** The proof KinetixUI needs is
all present: real cross-platform code, generated coverage counts, published gaps, a token trace across four
outputs. The problem is order and duplication, not absence. Proof usually arrives after explanation, the same
architecture is explained several times, and the navigation mirrors how the repository is organised rather than the
questions an evaluator asks.

Three things matter most:

1. **The public surfaces disagree with each other** (P1-1). The product's promise is "claims you can check", and an
   evaluator who checks finds seven contradictions: Style Dictionary "v4" in four places while the repository runs
   5.5.5; "no runtime dependency" beside an npm package with real runtime dependencies; "98 components" on two pages
   and "97 + 1 recipe" on the homepage; Button described as "generated 1:1 from Figma" on a site that says components
   are hand-written. None is large. Together they undercut the one claim the product is built on.
2. **The way to verify a component is buried** (P1-3, P1-5). On a component page the rendered preview starts below
   the first desktop viewport, and platform code sits two tabs deep. On `/docs/platforms` each platform appears in two
   separate sets of five cards, and you have to learn three terms before you can compare them.
3. **Navigation grows with the repository, not with the evaluator's questions** (P1-2, P1-7). There are eight numbered
   primary destinations. The secondary evaluation concept, platform coverage, isn't one of them. A phone visitor gets
   no search and a 127-link menu.

Nothing found requires removing a capability. Most fixes are REMOVE, COMBINE and DEFER on existing content. One
finding is P0: two loops that never stop (WCAG 2.2.2), already known from the 2026-10-03 accessibility audit. Half of
it, the platform ticker, is being fixed in the separate motion thread.

**Counts:** P0 **1** · P1 **8** · P2 **12** · P3 **6**. Section 23 lists them.

**Demo state isolation (section 27):** the Fields preview RTL toggle does flip the whole site. It's a deliberate
`<html dir>` write in the shared preview harness, made to cover a real library gap: `@kinetixui/ui` overlays don't
carry direction into their portals. P1, fixed centrally in two layers.

---

## 2. REAL USER NEED

```
REAL USER NEED:
Decide, quickly and without trusting marketing, whether KinetixUI can keep my web and native products visually
and behaviourally consistent on the platforms I actually ship — and what the smallest safe first step would be.
```

## 3. P1 need — design-system engineer supporting multiple platforms

Source: `marketing/PERSONAS.md` P1, `marketing/STRATEGY.md` §7.

> **Prove that the coverage claim is true for my platforms, before I spend a sprint finding out it is not.**

What they need to establish before adopting:

1. Which platforms have a real implementation of each component they depend on, with no rounding.
2. How each platform is verified, and where verification is thin.
3. That tokens are generated per platform while components are written natively. They will not adopt one
   framework's code wrapped for the others.
4. That the vendor publishes its own gaps and mistakes. This persona has been oversold before.
5. How it is distributed per platform: npm, a source checkout, or nothing.

Their best entry point, per the persona, is `/docs/platforms`, then the repository.

## 4. P2 need — product team spanning web + native

Source: `PERSONAS.md` P2.

> **Understand whether our web and native apps can stop drifting, without adopting a whole design system to find
> out.**

What they need to understand before evaluating:

1. That it solves drift (spacing, radius and brand colour that differ between apps).
2. That there is a small first step: tokens only, with their own components kept.
3. What that first step looks like on *their* platforms, not only React.
4. That design and engineering can point at the same thing.

Their best entry point, per the persona, is the homepage flagship demo, then `/docs/tokens`.

---

## 5. Core product promise

Derived from `MESSAGING.md` §A–B and `STRATEGY.md` §5, not rewritten:

> **We help product teams keep one design language consistent across React, Angular, SwiftUI, Jetpack Compose and
> Flutter, without having to maintain each platform's tokens by hand or trust a coverage claim they cannot check.**

Test for every surface: does it help a visitor (a) see the consistency, (b) check the claim, or (c) take the smallest
first step? A surface that does none of these is a DEFER or REMOVE candidate. That's a judgement about where it sits,
not about whether it is good work.

---

## 6. Current mental model

To evaluate KinetixUI today, a visitor has to learn these concepts, roughly in this order (FACT, from the routes and
copy below):

| Concept the site expects you to learn | Where it is first required |
| --- | --- |
| Token contract vs component contract | Homepage §01 paragraph, before the demo |
| Native vs web platform families | Gallery platform filter (native only), `/docs/platforms` card titles |
| Availability vs package maturity vs verification (three axes) | `/docs/platforms`, before the verification cards |
| Verification ladder (experimental → beta → stable) and "catalogue verification is the floor" | `/docs/platforms` |
| Guidance types (native-equivalent, composition, planned wave) | Platform badges (`title` tooltips), component Code tab |
| Registry (copy-in) vs npm (dependency) | `/docs/installation`, first table |
| `kinetixui.json`, CLI, component specs | "Getting Started" in the docs sidebar |
| Primitive ("Built on Radix …") | Every gallery card, every component page |
| Catalogue entry vs component vs recipe | Homepage spec panel (97 + 1) vs gallery (98) |
| Module vs platform (IoT) | Homepage §04, primary nav |
| Docs vs Components as two homes for the same component | Primary nav highlights "Docs" on a component page reached from "Components" |

**INF:** a visitor who needs to answer "does Dialog exist on SwiftUI and how proven is it" has to hold about six of
these at once. Each is legitimate and precise. Few are needed *before* the visitor's first answer.

---

## 7. Fundamental evaluation flow

Built from the user need, ignoring the current navigation:

```
1. Recognise the problem        "my web and native apps drift"
2. See the difference           one interface, real code on each platform
3. Check my platforms           does what I need exist where I ship, and how proven is it
4. Inspect one component        see it work, read its code on my platform
5. Know the first step          tokens only, or one component, on my platform
6. Try it                       one command, or one file to copy
```

**Could this need fewer concepts?** Yes. Steps 3–5 can each be answered with a **platform** and a **component**. Those
are the only two things the visitor brings. Everything else (verification ladder, guidance types, registry vs npm,
primitives, catalogue vs recipe) is detail that should appear *when the visitor asks for it*. It shouldn't be a
prerequisite.

**Could a visitor evaluate without understanding the site's internal architecture?** Not today. Section 16 lists where
the architecture leaks: `components.manifest.json` in the lede of `/docs/platforms`, Figma node ids in component
ledes, `kinetixui.json` as a Getting Started page, native-vs-web as a filter boundary.

---

## 8. Complexity detected

Main sources, most costly first:

1. **Contradictory truth across surfaces.** An evaluator has to work out which statement wins (P1-1).
2. **Proof after explanation.** On the homepage flagship, the component page and `/docs/tokens`, the evidence sits below
   paragraphs that describe it (P1-3, P2-2, P2-9).
3. **The same platform information in several shapes.** In and around the hero: the headline count, the fan diagram,
   the spec panel and the ticker. On `/docs/platforms`: two separate five-card sets. On the gallery: five abbreviations
   per card plus a three-platform filter (P2-1, P1-5, P1-6).
4. **Navigation that grows with artifacts.** Charts (one component), Infographic (a marketing page), Themes and Create
   (overlapping) and IoT (a module) are all top-level beside Components (P1-2).
5. **Expert controls shown by default.** `/create` shows nine decisions before the export, and Installation opens on a
   2×2 matrix (P2-5, P1-4).
6. **Unbounded long pages with no index.** Blocks is 12,244px with 20 full previews, `/iot` is 24,707px, `/docs/iot` is
   25,848px and 7,791 words, and the mobile gallery is 32,946px (P2-4, P2-6, P2-7).

---

## 9. REMOVE

| # | Remove | Evidence | Why it can go | What the visitor still has |
| --- | --- | --- | --- | --- |
| R1 | **The hero typing loop.** Show a static `npx @kinetixui/cli add button` | FACT `hero-command.tsx:20-58`: loops forever, no pause; screen readers can land on half-typed words (a11y audit item 8). Copy already copies the target, not the typed text | The loop only shows that other component names exist. "Explore components" says that better | The same command, copyable, readable |
| R2 | **Homepage §03 "Why KinetixUI" (four principles)** | FACT `page.tsx:55-78, 399-434`. Principle 1 says "Style Dictionary v4" (repo: 5.5.5). Principle 2 repeats §01's paragraph. Principle 3 says "No runtime dependency", which §05 contradicts ("resolves the npm packages those files import"). Principle 4 repeats "verified" from §02 | Everything true in it is already said better elsewhere on the page. It is 964px of desktop height | §01 (mechanism), §02 (verification), §05 (adoption) |
| R3 | **"Infographic" from primary navigation** | FACT `infographic/page.tsx`: "0 to install", "KinetixUI isn't an installed package" (`deps-bar.tsx`), "Published package ◐ partial" for natives that are unpublished, "Native mobile libraries ●", a four-column matrix that omits Angular, unsourced competitor claims | It contradicts the homepage's own corrections, and it is the only primary destination with zero links out (`metrics.json`: 0 links in main) | The route can stay for now. REC: fix or retire it in a separate decision |
| R4 | **Figma provenance in component ledes and meta descriptions** ("Generated 1:1 from Figma node 54863:351") | FACT 3 pages: button, input, textarea. Button is the page `/docs/tokens` sends evaluators to (PR #299 bridge) | "Generated" contradicts "components are hand-written per platform", and node ids are maintainer data | Move to a "Design source" footnote or the component spec. Don't delete the traceability |
| R5 | **The duplicate CLI command on component pages** | FACT 98/98 pages show `npx @kinetixui/cli add <slug>` in the meta panel *and* under `## Installation` | One copyable command is enough | The Installation section |
| R6 | **"Beta 1" filter chip on the gallery** | FACT: one component carries `beta`; the chip filters to one card | A filter that returns one result is a label, not a filter | The card's own `beta` tag |

## 10. AUTOMATE

| # | Automate | How | Burden removed |
| --- | --- | --- | --- |
| A1 | **The cross-surface truth that drifted (P1-1)** | Derive "Style Dictionary" version, the catalogue phrasing (97 + 1) and gallery tags from the manifest and `package.json`, as `site.ts` already does for the tagline. Extend the existing `marketing-claims` / `homepage-truth` guards to `docs/page.mdx`, `site-footer.tsx`, `infographic/*`, `component-gallery.tsx` and component ledes | The evaluator never has to reconcile two numbers, and maintainers never have to find all copies |
| A2 | **Platform filter values from canonical platforms** | The gallery filter iterates `NATIVE_PLATFORMS`. It should iterate the platforms that are *not* catalogue-complete, or all of them (P1-6) | Angular gaps become findable. A new platform appears without code |
| A3 | **Preview appearance on `/create` follows the site theme** | Default the preview's Light/Dark to the current site mode. Keep the toggle | Removes a decision that needed a paragraph to explain |
| A4 | **Remember the visitor's platform** | Once a platform tab or chip is chosen, pre-select it on component Code tabs, Installation and Blocks code tabs (per-viewer storage only). REC constraint: `platform_selected` must keep meaning a deliberate switch. Restoring a remembered platform must not emit it | Removes repeated platform selection on every page |
| A5 | **Logos in the platform strip from canonical platform data** | The motion thread already requires a logo per platform. REC: key the logo map on `platformDefinitions` keys so a sixth platform without a logo fails a check | Prevents a silent unlabelled platform |

## 11. COMBINE

| # | Combine | Into | Why |
| --- | --- | --- | --- |
| C1 | **`/docs/platforms`: support cards (5) + verification cards (5) + the three-axis explainer** | One comparison row per platform: *Components n of 97 · Install from (npm / build from source) · Verified to (level) · RTL · Details ›*, with the current cards and explainer under it as detail | Each platform currently appears twice, about 2,200px apart (FACT: support cards y≈490–2,260, verification cards y≈2,714–3,800 at 1440px) |
| C2 | **Component meta panel rows** (Category, Platforms list, Verification details, CLI, Registry, A11y) | One line under the title, e.g. *"On React, Angular, SwiftUI, Jetpack Compose, Flutter · Verified to beta · Accessibility ›"*, with the full panel behind "Details" | The panel is about 310px before the description and preview (OBS, screenshot) |
| C3 | **Themes + Create** | One destination, Create. Themes' "the contract" content belongs in `/docs/theming` | Two nav items for "see and change the theme". Themes is 174 words (FACT) |
| C4 | **Charts into Components** | `/charts` stays as the Chart component's gallery, linked from `/docs/components/chart` and from the gallery card | A single component should not be a primary destination |
| C5 | **`/create` Style + Radius + Surface** | "Style" (Default/Soft/Sharp) as the visible control. Radius and Surface as "Adjust shape" under it | The copy admits the overlap: "Change either afterwards and this simply stops naming a preset" (FACT `create-sidebar.tsx`) |
| C6 | **Hero platform representations** | The fan diagram explains the mechanism. The ticker or strip lists the platforms (with logos). The spec panel's platform count and the headline count are the same number twice | Four shapes of one fact (section 20) |
| C7 | **Same label, two destinations: "Explore IoT"** | Homepage "Explore IoT" → `/iot`, and `/iot` "Explore IoT" → `/docs/iot` (FACT `iot/page.tsx:197`). REC: "Read the IoT docs" on `/iot` | One label should mean one place |

## 12. DEFAULT

| # | Default | Evidence | Change |
| --- | --- | --- | --- |
| D1 | **Gallery opens on the components evaluators check first** | FACT: the default view is grouped by taxonomy, and the first card is Aspect Ratio. Mobile is 32,946px tall | A short "Start with" row (for example Button, Input, Dialog, Tabs, Select, Card, chosen by usage or by the flagship). The full grouped catalogue follows unchanged |
| D2 | **Installation opens on the evaluator's platform** | FACT `installation/page.mdx`: React only, with registry vs npm as the first decision | A platform chooser (React default) on the *same route*, so `installation_viewed` keeps firing on `/docs/installation` (its `platform` property already exists, `analytics.ts:130`). Within React, default to the CLI path and put npm one line below |
| D3 | **Component Code tab defaults to the visitor's platform** | FACT: Code tab → React first, always | With A4: the last chosen platform, else React |
| D4 | **`/create` export target follows the preview** | FACT: Export sits at y=2,363 (desktop) with Web CSS first | Keep Web CSS default. Bring export into the first viewport (see DEFER) |

## 13. DEFER

| # | Defer | Until | Evidence |
| --- | --- | --- | --- |
| F1 | **Verification ladder, guidance-type vocabulary, three-axis explainer** (`/docs/platforms`) | After the comparison row, as "How to read this" | FACT: 2,114 words before you reach "Not on every platform" |
| F2 | **Repository trees and the maintainer build command** (`/docs/tokens` §Architecture) | After "One token on every platform" | FACT: the `tokens/` and `packages/tokens/dist` trees and `pnpm build:tokens  # maintainers` are the first content after the lede. The evidence #299 added is the third H2. REC preserves every #299 property and changes order only |
| F3 | **`/create`: Hue/Chroma/Lightness sliders, OKLCH field, Neutral, Chart palette** | Behind "Fine-tune colour" and "More options" | FACT: 9 visible decisions plus 5 inputs for one colour before Export. Hex plus the swatch is the common path (INF) |
| F4 | **IoT on the homepage** | One line in the adoption or "Who it's for" area: "Building connected-device products? See the IoT module (experimental)" | FACT: §04 is a full section (387px), plus a primary nav item. `MESSAGING.md` IoT: "React only, experimental … a module, not a platform". Neither persona's need includes it |
| F5 | **Primitive metadata on gallery cards** ("RADIX ASPECT RATIO") | Component page detail | Implementation detail on a browse surface (OBS) |
| F6 | **Copy as Markdown** | Out of the first row, beside the TOC or in page actions | FACT: it is the first focusable action on every docs page. Useful, but not the evaluator's first job |
| F7 | **Docs sidebar component list** | Collapsed by default to category headings on non-component docs pages | FACT: 119 links, 9,403px sidebar on desktop |

## 14. CLARIFY

The full list is in section 17. The most important:

- The headline says **5 platforms**, but the flagship eyebrow says "One interface, **four** native implementations"
  and has 4 tabs (FACT `page.tsx:257`, tabs React/SwiftUI/Jetpack Compose/Flutter). Say why Angular is absent, or
  label it "four implementations shown".
- **"Package maturity: … the others are Stable packages"** (`/docs/platforms`) sits beside three native packages that
  are not published, a catalogue verification of "experimental" for all three natives (FACT `platform-parity.json`
  `catalogueVerification`), and "Nothing is verified Stable today". REC: lead with what you can *do*
  ("Install from npm" / "Build from source"), which `MESSAGING.md` §5 already prefers ("source you build").
- **Gallery intro** says "React, SwiftUI, Jetpack Compose and Flutter snippets ship with every one" (FACT: 90/98 on each
  native) and "the RE SW JC FL tags", while every card renders five tags including NG.

---

## 15. Surface-by-surface audit

Measured metrics are from `metrics.json` (1440×900 desktop, 390×844 mobile, reduced motion).

### 15.1 Homepage `/`

FACT: 7 sections, 6,031px desktop / 9,075px mobile, 1,125 words. In-main actions: hero 5 (Explore components, See
what each platform covers, copy command, Installation, Beta→changelog). `/docs/platforms` is linked **4×**,
`/components` 2×.

| Principle | Finding |
| --- | --- |
| 1 Real problem | Hero copy names drift, which is P2's problem in their words. Good (KEEP) |
| 2 First principles | Seven sections serve four jobs: see the difference (§01), check (§02), start small (§05), who it's for (§06). §03 and §04 serve none of them (R2, F4) |
| 3 Friction | The flagship demo starts about 1,650px down, under three paragraphs (OBS, screenshot `desktop-home-flagship.png`) |
| 4 Choices | Hero offers five actions. One primary is correct. The changelog "Beta" link reads as a sixth heading (`[00]`) |
| 5 Psychology | The headline is strong. The right rail (fan + spec) competes with the CTAs at desktop. On mobile the fan sits after the CTAs, which is correct |
| 6 Vision | §04 IoT as a peer section shifts the story from "one design language" to "and also devices" (INF) |
| 7 Language | "Targets →", "spec", `[00]`, "Documented recipes 1" are internal shorthand. "See what each platform covers" is good |
| 8 Implementation UX | "Source: DTCG", "Core version" in the spec panel matter to maintainers, not to a first visit |
| 9 Future complexity | Every new initiative (IoT, Charts, Infographic) earned a homepage or nav slot. See section 22 |

**Can a first-time design-system engineer answer the five questions within seconds?**
1. What it is: yes (headline). 2. Why different: partly. "Claims you can check" is in the headline, but the check
itself is in §02, about 2,100px down. 3. Platforms: yes, twice over. 4. Credible: only after scrolling. 5. What next:
yes, "Explore components".

**Competing messages:** the mechanism (tokens generated, components native) is stated in §01 ¶2, §03 item 2 and §06
¶1. Verification appears in the headline, §01 ¶2, §02 and §03 item 4. Adoption appears in the hero install command,
§03 item 3 and §05.

### 15.2 Primary navigation

FACT `site.ts:57-73`: Docs · Components · Blocks · Charts · Infographic · Themes · Create · IoT, numbered 01–08.
Missing: **Supported platforms** (the secondary evaluation concept) and Tokens (P2's entry point). On component pages
the nav highlights **Docs**, not Components (`site-header.tsx:77`).

REC: Components · Blocks · Platforms · Docs (+ Create as a tool). Charts → Components (C4), Themes → Create (C3),
Infographic out (R3), IoT → footer, docs Modules and one homepage line (F4). Drop the 01–08 numbers. They imply a
sequence that doesn't exist (P3-1).

Analytics constraint: a nav link to `/docs/platforms` reports `source: header`, and it is *not* the homepage
`platform_coverage` CTA, so it does not create Qualified Evaluation. QE stays as defined. Any new link to
`/docs/platforms` must not reuse `ctaAttrs(..., "platform_coverage")` outside the surfaces that already carry it
without a strategy decision in `analytics.md` §3.

### 15.3 Mobile navigation

FACT: the search (`CommandMenu`) is `hidden sm:block`, so below 640px there is **no search anywhere**, including inside
the menu. The menu sheet holds **127 links**: the 8 primary items, 5 docs groups, and all 7 component categories
expanded. It is 4,657px tall (`mobile-menu-open.png`). REC: put search at the top of the sheet. Show primary items and
docs groups, with component categories collapsed (disclosure) or replaced by a "Browse components" link to the
gallery.

### 15.4 Components gallery `/components`

FACT: 12 chips (All + 7 categories + SwiftUI/Compose/Flutter + Beta 1), a search field, a 7-section grouped default.
Each card carries a slug, title, primitive, five platform abbreviations and an arrow. 12,357px desktop / **32,946px
mobile**. Only 2 interactive elements are in the mobile first viewport.

- **Platform filter excludes Angular** (FACT `component-gallery.tsx` uses `NATIVE_PLATFORMS`; Angular is 64/98).
  The three natives are at 90/98, so the existing filter removes 8 cards. The one platform whose filter would matter
  isn't offered (P1-6).
- Do users need to configure the gallery first? No. The search is good and stays. The chips can stay as a secondary
  row, and on mobile they're already in a Filters sheet (KEEP).
- The intro paragraph contains two FACT errors (section 14) and the "98 components" count (CLAIMS B2 says 97 + 1
  recipe).
- REC: D1 "Start with" row, A2 platform filter, F5 primitive off the card, R6 remove the Beta chip.

### 15.5 Component detail `/docs/components/[slug]` (Button)

Real job: *can this component work on my platform?*

FACT (Button, 1440×900): order is title → meta panel (≈310px) → lede with Figma node id → Preview/Code tabs at y=680.
The rendered buttons fall below the first viewport (`desktop-docs_components_button-fold.png`). Mobile: preview tabs at
y=681 of an 844px viewport, and the demo itself is below. Platform code is **Code tab → platform tab** (2 clicks). The
CLI command appears twice (R5). API: 96 pages render the generated "React API", and 3 of them (Button among them)
also carry a hand-written API table above it, so the props are listed twice. 27 of 98 pages have their own
Accessibility or Keyboard section.

REC (REDESIGN after C2/R4/R5): title → one-sentence purpose → one platform line → **preview** → code with platform
tabs visible (not hidden behind "Code"), or the preview and code side by side at desktop → install → API → details.
Information driven by the repository rather than the evaluator: Figma node, Registry JSON URL, "Built on" primitive,
"Copy as Markdown" as the first action.

### 15.6 Platform coverage `/docs/platforms`

QE stays as decided: landing here is not Qualified Evaluation. Nothing below proposes turning a view into a signal.

FACT: 7,164px, 2,114 words. The lede names `components.manifest.json` and how the verification column is written. Five
support cards (≈330px each), then a three-axis explainer, then five verification cards, then the ladder, gaps and the
not-supported table. Cards say "98 of 98 components" (B2).

Does it quickly answer "is coverage sufficient for my product?" Only after about two screens and three new terms.
REC: C1 comparison row first, F1 explainer after it, the CLARIFY item on "Stable packages", and "of 97 components +
1 recipe" or "of 98 catalogue entries". From each row, a link to that platform's component list (gallery filtered by
platform), so the next step is inspecting a component. That's a real action (`component_viewed`), not a counted view.

### 15.7 `/docs/tokens` (PR #299: preserve)

KEEP everything #299 added: the real token evidence (`TokenAcrossPlatforms`, read at build time), the generated
output on four platforms, the truthful install section, the bridge to `/docs/components/button` (`component_viewed`),
and ART-002 compatibility.

One finding: F2, order only. The repository trees and `pnpm build:tokens  # maintainers` come before the evidence.
Moving "One token on every platform" up to follow the lede keeps every property above. Check before doing it: any
ART-002 copy that deep-links to a heading anchor must still resolve. The anchors are unchanged by a reorder.

Indirect finding: the bridge lands on Button, which currently leads with "Generated 1:1 from Figma" (R4). Fixing R4
fixes the end of the tokens journey.

### 15.8 Installation `/docs/installation`

How many decisions before seeing KinetixUI work? FACT: registry or npm (×2, for tokens and for components), then
Tailwind preset, then dark mode. That's 4 before a component renders, and **every one of them is React-specific**.
Angular, SwiftUI, Compose and Flutter aren't mentioned. A native evaluator has to find "Platform libraries" in the
sidebar.

Exposed early: package architecture (registry vs npm), repository mechanics (`check:registry-deps`, `lib/utils.ts`
delivery). Not exposed: platform limitations (native is build-from-source), which is the one thing a native visitor
needs.

REC: D2. Platform chooser on the same route. React: CLI path first, npm second. Angular: `npm i @kinetixui/angular`,
Preview, link to waves. Native: "Build from source" with the exact checkout path from each platform page. Token-only:
"Keep your components" (P2's path), linking `/docs/tokens`. **Never** an install command for SwiftUI, Compose or
Flutter packages: they are unpublished (FACT `components.manifest.json` `distribution.published: false`).

### 15.9 Docs landing `/docs`

FACT: "A single design source becomes living tokens and **components**" (contradicts the positioning), "Style
Dictionary v4", "Nothing here is a runtime dependency" (npm is offered on Installation). A 4-step "How it flows" in
repository paths (`tokens/semantic/color.light.json`, `packages/tokens/dist/...`) comes before the Quickstart. The
"Evaluating rather than installing?" paragraph is the most useful thing on the page and sits third.

REC: CLARIFY the three statements, move "Evaluating?" up, DEFER "How it flows" to `/docs/tokens` (which already
covers it).

### 15.10 Docs navigation / sidebar

FACT `site.ts:236-286`: Getting Started (Introduction, Installation, Supported platforms, CLI, kinetixui.json,
Component specs) · Styling (8, including **Accessibility**) · Platform libraries (Angular, Compose, SwiftUI, Flutter;
React absent) · Modules (IoT) · Project (Contributing, Changelog) · then 7 component categories (98 links).

Does it reflect what users learn, or how the repository is organised? Mostly the repository: `kinetixui.json` is a
config file, and CLI and Component specs are reference material, all under "Getting Started". Accessibility under
"Styling" undersells a product contract.

REC (progressive, not flattened):

```
Start        Introduction · Installation · Supported platforms
Platforms    React · Angular (preview) · SwiftUI · Jetpack Compose · Flutter
Foundations  Tokens · Colours · Typography & icons · Theming · Dark mode · RTL
Quality      Accessibility · Component specs
Components   (categories, collapsed when not on a component page)
Reference    CLI · kinetixui.json · Contributing · Changelog
Modules      IoT
```

React gets a platform page entry (currently the only platform without one in the nav). It can point at the React
section of Installation if no dedicated page is wanted.

### 15.11 Blocks `/blocks`

FACT: 20 blocks, each a full-height preview with Preview/Code tabs. 12,244px, one link in main, no index. **All 20
carry real source for all five platforms** (`blocks/page.tsx` `everyBlockIsFivePlatform`). That's the most complete
cross-platform evidence on the site, stated mid-sentence in the intro.

Job relative to Components: Components answers "does this *primitive* exist on my platform". Blocks answers "does a
*real composition* hold up on my platform", which is what P2 actually ships. These are distinct needs, so don't merge
them (KEEP separate).

REC: CLARIFY the label to "Blocks: whole sections, real code on all 5 platforms". Add a thumbnail index or category
jump at the top (DEFER the full previews to one block per view or an anchor). Link Blocks from the homepage flagship,
which is itself a block.

### 15.12 Create `/create`

Every decision it asks for, in order (FACT from the rendered controls, `desktop-create-controls.png`):

| # | Decision | Options | Infer? | Stronger default? | Only when relevant? | Combine? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Appearance (preview) | Light / Dark | Yes, from the site theme (A3) | — | — | — |
| 2 | Style | Default / Soft / Sharp | — | Default ✓ | — | Absorbs 6, 7 (C5) |
| 3 | Theme colour | swatch + Hue + Chroma + Lightness + Hex + OKLCH | — | — | Sliders and OKLCH behind "Fine-tune" (F3) | — |
| 4 | Neutral | 5 | — | Kinetix ✓ | Defer (F3) | — |
| 5 | Preview scene | Dashboard / Form | — | — | — | — |
| 6 | Radius | 5 | — | — | Under Style (C5) | ✓ |
| 7 | Surface | 4 | — | — | Under Style (C5) | ✓ |
| 8 | Chart palette | 5 | — | Kinetix ✓ | Defer (F3), relevant only to data UIs | — |
| 9 | Contrast pairs | Show all pairs | — | Summary line ✓ (keep: "10/10 pairs meet WCAG AA" is good feedback) | Already deferred ✓ | — |
| 10 | Advanced overrides | 11 semantic fields | — | — | Already deferred ✓ | — |
| 11 | Export target | Web CSS / SwiftUI / Jetpack Compose / Flutter | — | Web CSS ✓ | — | — |
| 12 | Workspace actions | Reset, Randomize, Copy preset, Share | — | — | Copy preset/Share disabled until changed ✓ | — |

FACT: Export, the outcome, is at y=2,363 on desktop (2.6 viewports) and 1,290 on mobile. REC: keep every capability.
Visible by default: Style, Theme colour (swatch + hex), and a persistent **Export** button in the workspace bar that
opens the export panel. Everything else one layer down. Note that `analytics.md` §3 classes `preset_*` events as
"a theming toy, not product evaluation", while Create is primary nav item 07. Its prominence exceeds its role in
evaluation (INF).

### 15.13 IoT `/iot`, `/docs/iot`

FACT: `/iot` is 24,707px with 15 in-page anchors. `/docs/iot` is 25,848px and 7,791 words, the two longest pages on
the site. `MESSAGING.md`: React-only, experimental, a module not a platform. The showcase is a simulation.

Who needs it: teams building connected-device products, a subset of both personas. When: after they believe the core
promise. Is homepage prominence justified? A full section plus a primary nav item is more than an experimental,
React-only module warrants (INF from positioning). Terminology that assumes context: "Connected Product Lab", "State
honesty", "Transport boundary", "Missing data" as nav anchors.

REC: F4 (homepage → one line), nav → footer + docs Modules, keep `/iot` and its content untouched. In-page: replace the
15-item anchor row with the 4–5 questions a device-product team asks (What it is · Try it · What ships · Install ·
Limits). DEFER the rest under them. IoT implementation is not touched.

### 15.14 Changelog entry point

FACT: reached from the hero "[00] Beta — every package is 0.x" link, the footer and the docs sidebar. The page covers
the `tokens/ui/cli` train and points to Angular for its own version. The search, 6 filter chips and a version jump row
work. REC: KEEP. Rename the hero link to plain text: "Beta, every package is 0.x · Changelog" (P3).

### 15.15 Supported-platform carousel

See section 20.

### 15.16 Homepage flagship example

FACT: React live preview + 4 code tabs. CLARIFY "four" vs "5 platforms" (section 14). REDESIGN after REMOVE: the demo
first, one sentence above it, the two architecture paragraphs moved below or into a "How this works" disclosure.
`platform_selected` events on these tabs stay as they are.

### 15.17 Footer

FACT `site-footer.tsx`: Docs (Introduction, Installation, Theming, Accessibility) · Explore (Components, Blocks,
Charts, Create) · Project (Changelog, Source, Design source). There's also "tokens · DTCG → Style Dictionary v4"
(P1-1). Missing: **Supported platforms**, Tokens, IoT. REC: the footer becomes the long tail (Charts, IoT,
Infographic if kept, Design source), and gains Supported platforms and Tokens.

### 15.18 Search / discovery

FACT: ⌘K command menu, desktop and tablet only. It indexes nav titles and the docs groups including all components.
It has no content search (for example "install angular" finds nothing). Docs sidebar "Filter…" (desktop). Gallery
search. Changelog search. REC: P1-7 (mobile search). Platform names as search keywords on component items, so
"swiftui dialog" resolves (P3).

### 15.19 Other surfaces discovered

- **`/charts`** (18,058px, 29 chart types): a single component's gallery at primary-nav level (C4).
- **`/themes`** (174 words): overlaps Create (C3).
- **`/infographic`**: R3.
- **Platform pages** (`/docs/angular`, `/docs/swiftui`): strong, honest ("Not ported (deliberate)", "Known gaps"). KEEP.
  They are the natural target for Installation's platform chooser.

---

## 16. Navigation / IA findings

1. **Repository structure leaks into navigation.** Routes are grouped by artifact type (Docs, Components, Blocks,
   Charts, Infographic, Themes, Create, IoT), not by question (What is it, Does it cover my platforms, Show me, How do
   I start).
2. **Components live in two places.** `/components` (gallery) and `/docs/components/*` (pages, under the Docs nav).
   Arriving from the gallery, the header says you're in Docs. REC: the nav highlights Components for
   `/docs/components/*`. URLs unchanged.
3. **The secondary evaluation concept has no nav entry.** Supported platforms is reachable from the hero CTA, docs
   sidebar and docs pages, but not from the header or footer.
4. **Native vs web as a UI boundary.** The gallery filter (natives only) and the platform cards ("Web · React",
   "Android · Jetpack Compose") use a family distinction the visitor doesn't need in order to choose their platform.
5. **One sidebar for guides and catalogue.** 119 links. Progressive disclosure (F7) beats a second nav.

## 17. Language findings

| Current | Recommended | Why |
| --- | --- | --- |
| "compiled by Style Dictionary v4" (homepage, `/docs`, footer, infographic) | "compiled by Style Dictionary" (or the derived version) | FACT: 5.5.5 installed |
| "No runtime dependency, no lock-in" | "The source lands in your repo, so you can change it. Its npm dependencies are listed per component." | FACT: the CLI installs the npm packages a component imports (`installation/page.mdx`) |
| "Nothing here is a runtime dependency you install and theme" (`/docs`) | "Copy components in with the CLI, or install `@kinetixui/ui` from npm." | Installation offers npm |
| "A single design source becomes living tokens and components" (`/docs`) | "One token source generates every platform's tokens. Components are written natively per platform." | Positioning (MESSAGING §B) |
| "Generated 1:1 from Figma node 54863:351" | "Matches the Button in the KinetixUI Figma file." (footnote) | "Generated" contradicts hand-written. Node id is maintainer data |
| "98 components across 7 categories" / "98 of 98 components" | "97 components and one documented recipe, in 7 categories" / "97 of 97 components" | CLAIMS B2 |
| "the RE SW JC FL tags" | Derived list of the five abbreviations, or "the platform tags" | NG is missing |
| "One interface, four native implementations" | "One interface, four implementations shown" (+ why Angular is not) | Hero says 5. React is not "native" in the native/web sense the site uses |
| "Targets →" | (remove the label; the strip is self-evident with logos) | Internal shorthand, announced to screen readers with nothing after it (section 20) |
| "[00] Beta — every package is 0.x, MIT →" | "Beta: every package is 0.x · Changelog" | `[00]` is decoration |
| "spec" panel | (fold into C6) | Internal |
| "Connected Product Lab" | "IoT module" | Module is MESSAGING's term |
| "Explore IoT" (on `/iot`, to `/docs/iot`) | "Read the IoT docs" | Same label, two destinations |
| "Package maturity … the others are Stable packages" | "React: stable package on npm. SwiftUI, Compose, Flutter: build from source." | Unpublished; catalogue verification "experimental" |
| "See what is verified, platform by platform" | KEEP | Verb + outcome |
| "See what each platform covers" | KEEP | Verb + outcome, MESSAGING §H |
| "Explore components" | KEEP | Primary CTA, do not change |
| "kinetixui.json" (Getting Started) | Move to Reference | A filename is not a learning step |
| "Getting Started" | "Start" | Shorter. Contains only start steps after the regroup |
| Gallery "Registry" eyebrow | "Components" or remove | Repository term above the H1 |
| `/create` "[08] Kinetix theme preview" | "Preview" | Numbering + brand prefix |

Don't dumb these down: verification ladder names, `@kinetixui/*` coordinates, DTCG, OKLCH (deferred, not renamed).

## 18. Mobile findings

Measured at 390×844:

1. **No search** (P1-7). **127-link menu** (P1-7).
2. **Homepage** 9,075px. The hero is good: headline, two CTAs and the command all in the first viewport (FACT
   screenshot). The fan diagram follows and takes most of the second viewport. REC: on mobile the fan can go after the
   ticker, or be hidden, since the strip carries the platform list and §01 carries the mechanism (C6).
3. **Gallery** 32,946px, about 300px per card. A desktop grid becomes a very long single column. REC: compact list rows
   on mobile (title + platform tags, no thumbnail), or the "Start with" row plus category jump. The Filters sheet
   pattern is good (KEEP).
4. **Component page**: the preview starts at y=681. With C2 the meta panel collapses to one line and the preview moves
   up about 250px.
5. **`/docs/platforms`** 11,426px. The C1 comparison row has to stack per platform as label: value pairs, not a
   horizontal-scroll table.
6. **Code blocks** scroll horizontally inside their frame (expected). The `/docs/components/pagination` overflow at
   320px/200% is already recorded (a11y audit item 17).
7. **`/create`** puts Customize in a sheet (good, 7 controls in the first view). Export is at y=1,290. The persistent
   Export button (15.12) matters most here.
8. **Footer**: three columns stack. Fine once the long tail moves there.
9. **Carousel**: section 20.

## 19. Accessibility implications

- Progressive disclosure must use real disclosure semantics (`<details>`/`<summary>` or button + `aria-expanded`). It
  has to be keyboard reachable and must not hide content from find-in-page where it is reference material. Prefer
  "collapsed by default" over "removed from the DOM" for the docs sidebar (F7).
- C2's single platform line must keep the full per-platform availability in its accessible name, as
  `PlatformBadges` already does (`role="img"` with a sentence label).
- Removing the typing loop (R1) also fixes the screen reader reading half-typed words.
- Icon-only additions (mobile search trigger, Export button on mobile) need visible text or `aria-label` plus tooltip.
  Don't swap "Filters" or "Customize" text for icons.
- Platform logos (section 20) are decorative next to their name: `alt=""` / `aria-hidden`, with the name as text. A
  logo must never be the only label.
- Any new comparison table (C1) needs `<th scope>` and must reflow at 320px/200% without horizontal page scroll.
- Not weakened by anything here: focus order, skip link, reduced motion, RTL mirroring, 200% text fixes from #281.

## 20. Supported-platform carousel recommendation

The motion thread owns all carousel code and the logo enhancement. This section only decides its *role*.

**What problem does it solve?** It shows, without reading, that this is a multi-platform system and which platforms
are included (FACT: the items are derived from `PLATFORMS`, `page.tsx:21`).

**Is the information communicated elsewhere?** Yes, three more times above the fold or next to it: the headline count,
the fan diagram (names all five, Angular marked "preview"), and the spec panel count (desktop only). Below: §01 ¶2
and §06.

**Does continuous movement improve understanding?** FACT from the motion thread's baseline
(`motion-audit/baseline/platform-ticker-before.log`): at 1280px and 1920px the five names leave 442–757px gaps, so they
fit in one static row with room to spare. Movement there adds nothing. At 320–390px they don't fit, and movement
reveals the rest. INF: for five items, movement is mostly decorative.

**Is it proof, navigation, or decoration?** Today it's **decoration**: the track is `aria-hidden` (FACT
`reveal.tsx:69`), it isn't interactive, and its visible label "Targets →" is the only part exposed to assistive tech.
With logos it becomes **recognition**: a visitor spots "their" platform faster by mark than by word. That's a real,
small job. It shouldn't become navigation while it moves (moving link targets fail motor and attention users).

**Recommendation: KEEP, with a narrower role.**

1. It is *the* platform list in the hero. The headline keeps the count. The fan keeps the mechanism. The spec panel
   drops its Platforms row (C6).
2. **Static when it fits, moving only when it overflows**, and static under reduced motion as the motion thread already
   implements (`rows: 3` wrap). If Ziad prefers it always infinite, it needs a visible pause control (WCAG 2.2.2) and
   a seamless loop. Both are already in the motion thread's failing baseline.
3. Every item is `[logo] Platform name`, from canonical platform data (A5). Angular's "preview" status stays out of the
   strip: the strip says *which*, and `/docs/platforms` says *how far*.
4. Exactly one copy exposed to assistive technology, as a named list ("Supported platforms"), with duplicates
   `aria-hidden` and inert. This matches the motion thread's assertions.
5. Remove the "Targets →" label (section 17).
6. Logos keep visual balance: equal optical height, monochrome or brand colour consistently, never a mix.

## 21. Before → After recommendations

**1. Truth across surfaces** (CLARIFY + AUTOMATE) · P1
Before: Style Dictionary "v4" ×4. "No runtime dependency". "98 components" vs "97 + 1". "Generated 1:1 from Figma".
Gallery claims snippets on "every one".
After: one derived phrasing per fact, guarded by the existing marketing-claims tests.
Why: the evaluator stops reconciling statements, and "claims you can check" holds when they check.

**2. Component page** (COMBINE + REMOVE + REDESIGN) · P1
Before: meta panel → Figma provenance → preview at y=680 → code 2 clicks deep → CLI twice.
After: purpose line → platform line → preview → code with visible platform tabs → install once → API → details.
Why: "can this work on my platform" is answered in the first viewport.

**3. `/docs/platforms`** (COMBINE + DEFER) · P1
Before: five support cards, three-axis essay, five verification cards.
After: one comparison row per platform (count, install path, verified to, RTL), then detail.
Why: one scan instead of two screens and three new terms.

**4. Installation** (DEFAULT + CLARIFY) · P1
Before: React-only, registry vs npm first.
After: pick your platform (React default) on the same route. React leads with one command. Native says "build from
source" truthfully. Token-only path is visible.
Why: native and Angular evaluators get an answer, and React evaluators make one decision, not four.

**5. Primary nav** (REMOVE + COMBINE) · P1
Before: 8 numbered items, no Platforms.
After: Components · Blocks · Platforms · Docs · Create.
Why: fewer choices, and the evaluation concept is one click from anywhere.

**6. Gallery** (AUTOMATE + DEFAULT + DEFER) · P1/P2
Before: Aspect Ratio first, three native filters, Angular unfilterable, primitive on every card.
After: "Start with" row, platform filter that includes Angular, primitive on the detail page.
Why: the first screen shows components people evaluate, and the platform with gaps can be filtered.

**7. Mobile discovery** (CLARIFY + DEFER) · P1
Before: no search, 127 links.
After: search at the top of the menu, component categories collapsed.
Why: finding "Dialog" on a phone takes one field, not a long scroll.

**8. Homepage** (REMOVE + COMBINE + DEFER) · P2
Before: 7 sections, mechanism explained 3×, `/docs/platforms` linked 4×, typing loop, IoT section.
After: hero (static command) → flagship demo first → verification → start small → closer. IoT is one line.
Why: about 1,350px less to scroll (§03 964px + §04 387px), and each section has one job.

**9. `/create`** (COMBINE + DEFER + DEFAULT) · P2
Before: 9 visible decisions, Export 2.6 viewports down.
After: Style + Theme colour visible, persistent Export, everything else one layer down.
Why: theme → export in two decisions. Expert controls are still one click away.

**10. Blocks** (CLARIFY + DEFER) · P2
Before: 20 stacked full previews, five-platform proof mid-sentence.
After: an index at the top, "real code on all 5 platforms" as the subtitle.
Why: you find "Pricing" without scrolling 12,000px, and the strongest proof is visible.

**11. IoT** (DEFER + CLARIFY) · P2
Before: homepage section + nav item. Two 25,000px pages. "Explore IoT" ×2 destinations.
After: one homepage line, footer and docs Modules, a 5-question index on `/iot`.
Why: the core story stays core, and device teams still find it in one step.

**12. `/docs/tokens`** (DEFER, order only) · P2
Before: repository trees and maintainer command before the evidence.
After: evidence first, architecture after. Every #299 property preserved.
Why: the proof P2 came for is the first thing they see.

## 22. Future-complexity risks

| Pattern | Where it already shows | Scalable alternative |
| --- | --- | --- |
| Every new platform adds a visible control | Gallery chip per platform. Platform card ×2 on `/docs/platforms`. Code tab per platform. Ticker item | Platforms as **one** remembered preference (A4) plus one comparison row. Chips derived, not added |
| Every new component category adds a sidebar group | 7 groups, 98 links in the sidebar and mobile menu | Categories collapsed. The gallery is the catalogue. The sidebar is for learning |
| Every new package adds navigation | IoT → nav + homepage section + docs group | Modules live in one "Modules" group and the footer. The homepage gets one line per module at most |
| Every new feature adds a homepage section | §03 principles, §04 modules | The homepage has a fixed job list (see, check, start). New features join a section or get a changelog entry |
| Every maturity state adds a badge | Gallery: status + primitive + 5 platform tags. Nav: "preview". Spec: version | One status vocabulary from the manifest. Badges only for exceptions (`site.ts:8` already says this, so keep applying it) |
| Every marketing initiative creates a CTA or page | Infographic, Themes, `[00]` link | New proof goes into an existing evaluation step (platforms, component page, blocks). A page needs a job in section 7's flow |
| Hand-typed facts in prose | Style Dictionary v4, "98", "RE SW JC FL", "every one" | Derive from manifest/package metadata and guard them, as `site.ts` already does for the tagline |

## 23. P0 / P1 / P2 / P3 findings

**P0 — usability/accessibility blocker (1)**

- **P0-1** Two loops never stop, with no pause control (WCAG 2.2.2, Level A): the hero typing loop
  (`hero-command.tsx`, unowned) and the platform ticker (pause on mouse hover only; owned by the motion thread, already
  in its failing baseline). Known from the 2026-10-03 a11y audit item 8. → R1 for the typing loop, section 20 for the
  ticker.

**P1 — major evaluation/adoption friction (8)**

- **P1-1** Seven cross-surface truth contradictions (section 17, rows 1–7). Includes CLAIMS B2 drift on `/components`
  and `/docs/platforms`.
- **P1-2** Primary nav: 8 numbered items, artifact-shaped, no Supported platforms. "Docs" active on component pages.
- **P1-3** Component page: preview below the first viewport, metadata and Figma provenance first, code 2 clicks deep,
  CLI shown twice.
- **P1-4** Installation is React-only and leads with registry-vs-npm. 4 of 5 platforms are unaddressed.
- **P1-5** `/docs/platforms`: two five-card sets for one comparison. Three new terms required first. Manifest filename in
  the lede.
- **P1-6** Gallery platform filter excludes Angular, the only platform with significant gaps (64/98).
- **P1-7** Mobile: no search at any width below 640px. 127-link, 4,657px menu.
- **P1-8** Preview direction leaks to the whole site (every component page). It masks a library gap: 10 of 13
  overlay families lose RTL in their portal when direction is scoped. Section 27.

**P2 — meaningful simplification or hierarchy (12)**

- **P2-1** Homepage repetition: `/docs/platforms` ×4, mechanism ×3, platforms in 4 shapes, version ×3.
- **P2-2** Flagship: "four" vs "5 platforms". The demo comes after three paragraphs.
- **P2-3** Homepage §03 principles duplicates §01/§02/§05 and carries P1-1 errors (R2).
- **P2-4** IoT prominence: homepage section + nav. The two longest pages on the site. "Explore IoT" ×2 destinations.
- **P2-5** `/create`: 9 visible decisions, Export at y=2,363. Style overlaps Radius/Surface.
- **P2-6** Blocks: no index, 12,244px. Five-platform proof buried.
- **P2-7** Gallery default (taxonomy order, Aspect Ratio first). Card metadata density. 32,946px mobile.
- **P2-8** Docs IA: reference pages under Getting Started, Accessibility under Styling, React has no platform entry.
- **P2-9** `/docs/tokens`: repository trees before evidence (order only; #299 preserved).
- **P2-10** Footer omits Supported platforms and Tokens, and repeats "Style Dictionary v4".
- **P2-11** Ticker: "Targets →" exposed to AT with no list after it. Platforms announced 0 times (motion thread).
- **P2-12** `/docs` landing: repository-path "How it flows" before Quickstart. "Evaluating?" paragraph third.

**P3 — polish (6)**

- **P3-1** Decorative numbering (`[00]`, nav 01–08, `/create` [01]–[08], section indexes) implies a sequence.
- **P3-2** "Copy as Markdown" is the first action on every docs page.
- **P3-3** Hero changelog link reads as `[00]` code. Rename to plain text.
- **P3-4** Header "v0.23.3 — beta" describes the core train only (Angular is 0.24.0). Consider "beta" alone, with the
  version on the changelog.
- **P3-5** Command menu: no platform keywords, so "swiftui dialog" doesn't resolve.
- **P3-6** `/themes` (174 words) overlaps Create and `/docs/theming`.

## 24. Proposed simplified experience

```
Homepage
  One design language. 5 platforms. Claims you can check.
  [drift sentence]
  [Explore components]  See what each platform covers
  npx @kinetixui/cli add button        (static, copyable)
  [React] [Angular] [SwiftUI] [Jetpack Compose] [Flutter]   ← logos + names, static when it fits

  01 The demo (live React + 4 platform code tabs), one sentence above, mechanism below
  02 Why you can believe the coverage table (unchanged)
  03 Start small: tokens · components · blocks (unchanged)
  04 Who it's for + Get started · Read the source
     Building connected-device products? IoT module (experimental) →

Nav: Components · Blocks · Platforms · Docs · Create      [Search]

Component page
  Button
  Trigger an action.
  On React, Angular, SwiftUI, Jetpack Compose, Flutter · verified to beta · Details ▸
  [ live preview ]                 [ code: React | Angular | SwiftUI | Compose | Flutter ]
  Install  npx @kinetixui/cli add button
  Usage · Variants · API · Accessibility

Platforms
  Platform          Components    Install from        Verified to    RTL
  React             97 / 97       npm · CLI           beta           in progress
  Angular (preview) 64 / 97       npm                 preview        …
  SwiftUI           90 / 97       build from source   experimental   core controls
  …
  How to read this ▸   Deliberate gaps ▸   Not supported ▸

Installation
  Your platform: (React) Angular SwiftUI Compose Flutter · or Tokens only
  → one path, one command or one checkout instruction
```

The counts in the sketch are today's manifest values with the `combobox` recipe excluded (React 97, Angular 64,
SwiftUI/Compose/Flutter 90 each). An implementation must derive them, never type them.

## 25. Recommended implementation slices

Three slices, each independently shippable. None changes positioning, QE, Adoption Intent, tokens, component APIs or
distribution.

### Slice 1: Truthful, proof-first evaluation journey
*Findings: P1-8 (first PR: overlay portal direction in `packages/ui` + preview-scoped direction; section 27), P0-1 (typing loop half), P1-1, P1-3, P1-4, P1-5, P2-2, P2-3, P2-12*

- Fix the seven contradictions, derive them, and extend the existing claim guards to the newly covered files.
- Static hero command (R1). Remove homepage §03 (R2). Flagship demo before its paragraphs.
- Component page: purpose → platform line → preview → visible platform code → one install → details (C2, R4, R5).
- `/docs/platforms`: comparison row first, explainer deferred (C1, F1).
- Installation: platform chooser on the same route, using `installation_viewed`'s existing `platform` property (D2).
- Gates: `marketing-claims` / `homepage-truth` / `current-truth` tests, `check:a11y-site` on the changed routes,
  large-text at 320/200%, analytics architecture tests (no new event names, no QE change).

### Slice 2: Navigation and discovery
*Findings: P1-2, P1-6, P1-7, P2-7, P2-8, P2-10, P3-5*

- Primary nav: Components · Blocks · Platforms · Docs · Create (C3, C4, R3, F4 nav half). Highlight Components on
  component pages.
- Mobile: search in the menu, categories collapsed.
- Docs sidebar regroup (section 15.10), categories collapsed off component pages (F7).
- Gallery: Angular in the platform filter (A2), "Start with" row (D1), primitive off cards (F5), Beta chip out (R6).
- Footer: add Supported platforms and Tokens. Long tail moves here.
- Gates: keyboard and a11y-site sweep on header, menu and gallery. Analytics: header links stay `source: header` and
  aren't QE.

### Slice 3: Progressive disclosure and polish
*Findings: P2-1, P2-4, P2-5, P2-6, P2-9, P3-1–P3-4, P3-6*

- `/create`: Style + colour visible, persistent Export, the rest deferred (C5, F3, A3).
- Blocks: index + five-platform subtitle.
- IoT: homepage one line, `/iot` 5-question index.
- `/docs/tokens`: evidence above architecture (order only).
- Homepage hero rail: fan = mechanism, strip = platforms, spec panel trimmed (C6). This depends on the motion thread's
  ticker landing first.
- Decorative numbering, `[00]`, Copy as Markdown placement.

The ticker itself (logos, pause, seam, single AT copy) is **not** in these slices. It stays in the motion thread.

## 26. Explicit things that should NOT change

- **Positioning:** cross-platform design-system infrastructure first, component library second. Primary ICP P1,
  secondary P2. Headline and "Explore components" as the primary CTA. Platform coverage as the secondary evaluation
  concept.
- **QE and Adoption Intent definitions** (`analytics.md` §3–4), including that landing on `/docs/platforms` is not QE.
  No view becomes a signal. Existing `ctaAttrs` targets keep their meaning.
- **`/docs/tokens` as #299 left it:** real token evidence, generated output on four platforms, truthful installability,
  the Button bridge, ART-002 compatibility. Only order may change (F2).
- **Supported platforms, component capabilities, IoT implementation, Angular Preview status, the canonical token
  architecture, component APIs, native-per-platform implementations.**
- **Distribution truth:** no install command for unpublished SwiftUI, Compose or Flutter packages. React and Angular from
  npm, natives from source.
- **Technical precision in reference docs:** CLI flags, verification ladder, DTCG, OKLCH, API tables stay. They move
  later in the page, not out.
- **Accessibility gains already shipped:** 200% text fixes, focus, skip link, reduced-motion behaviour, RTL.
- **The motion thread's scope:** carousel code and the logo enhancement.
- **Release PR #251**, packages, ART-002 publication: untouched by any slice.

---

### Appendix A: Measured page sizes (1440×900 / 390×844)

| Route | Desktop px | Mobile px | Words | Notes |
| --- | --- | --- | --- | --- |
| `/` | 6,031 | 9,075 | 1,125 | `/docs/platforms` linked 4× |
| `/components` | 12,357 | 32,946 | 1,797 | 12 filter chips |
| `/docs/components/button` | 4,248 | 5,109 | 617 | preview tabs at y=680/681 |
| `/docs/platforms` | 7,164 | 11,426 | 2,114 | two five-card sets |
| `/docs/tokens` | 9,982 | 14,848 | 2,415 | evidence is the third H2 |
| `/docs/installation` | 2,904 | 3,983 | 551 | React only |
| `/docs` | 3,017 | 4,231 | 634 | |
| `/blocks` | 12,244 | 13,471 | 961 | 20 blocks, no index |
| `/create` | 3,288 | 2,739 | 458 | Export at y=2,363 / 1,290 |
| `/iot` | 24,707 | 35,946 | 2,877 | 15 anchors |
| `/docs/iot` | 25,848 | 39,135 | 7,791 | longest page |
| `/docs/changelog` | 19,277 | 28,693 | 6,062 | search + 6 chips |
| `/charts` | 18,058 | 20,043 | 1,021 | 29 chart types |
| `/infographic` | 5,585 | 6,912 | 751 | 0 links in main |
| `/themes` | 2,415 | 3,222 | 174 | |
| Mobile menu | — | 4,657 | — | 127 links, no search |
| Docs sidebar | 9,403 | — | — | 119 links |

### Appendix B: Method and limits

- Built from `5db94f0` with `pnpm turbo run build --filter='@kinetixui/web^...'`, `build:iot`, `next build`, then
  `next start`. Measured with Playwright 1.63 in Chromium with reduced motion on (the ticker is static in the
  screenshots for that reason).
- Not measured: real visitor behaviour, time-to-answer, PostHog funnels. Every INF line is a hypothesis. A moderated
  5-person test of the section 7 flow would confirm or reject the P1 ranking.
- Not re-audited: WCAG conformance beyond what bears on simplification (see the 2026-10-03 a11y audit), and motion
  timing (the motion thread).
- The production deployment was not checked. This audit describes `main`, which may differ from kinetixui.com.

---

## 27. Demo State Isolation

Added at Ziad's request on 2026-10-05. It starts from the reported Fields defect: switching the Fields preview to RTL
appears to flip the whole website. The evidence was measured in Chromium on the same local build of `5db94f0`.
Scripts' output and screenshots are in the shared folder under `ux-simplification-audit/demo-isolation/`
(`fields-journey.json`, `portal-matrix*.json`, `01–06-*.png`, `portal-*.png`).

### Summary

| Item | Result |
| --- | --- |
| **Fields reproduction** | **FAIL.** The LTR/RTL toggle on `/docs/components/field` sets `<html dir="rtl">`. The header, primary nav, docs sidebar, breadcrumb, meta panel, TOC and the toggle itself all mirror |
| **Root cause** | Deliberate, not accidental. `PreviewEnvironment` keeps one module-level direction store and writes it to the document: `document.documentElement.setAttribute("dir", next)` (`apps/web/src/components/preview-environment.tsx:65`). It was introduced in #268, and a unit test locks it in (`preview-environment.test.tsx:40`, "mirrors the document, not just the preview box, so portaled overlays follow") |
| **Why it was built that way** | `@kinetixui/ui` overlays portal to `document.body` and do not carry the preview's direction with them. Scoping `dir` to the preview made a "RTL" Dialog render LTR, so the page was mirrored to make portals inherit RTL. Measured below: that portal gap is real |
| **Affected architecture** | Shared preview infrastructure (`PreviewEnvironment`, used by `ComponentPreview` on every component page), **and** the library's overlay components. It is not Fields-specific |
| **Other affected components** | Every component page with a preview: 98/98 (`<ComponentMeta />` + `ComponentPreview`). On pages with several previews (Button has 3), one toggle switches all of them and the page together |
| **Portal behaviour** | Current (global): all overlays RTL, because they inherit `<html>`. Preview-scoped (simulated): **10 of 13 overlay families fall back to LTR.** Only Select, DropdownMenu and Menubar keep RTL |
| **Persistence** | None, which is correct. Direction resets on client-side navigation, reload, back/forward. Nothing is written to localStorage, sessionStorage, cookies or the URL |
| **Accessibility impact** | Moderate, not a blocker (see severity). English page content rendered `dir="rtl"` with `lang="en"` gets bidi-reordered punctuation ("…Search", "r/field.json/", ".state)"). The toggle the user just pressed moves 713px out from under the pointer (RTL button x=344 → x=1057). Screen-reader reading order is unchanged |
| **Severity** | **P1** (P1-8): preview state leaks to the whole site, and the leak hides a real library directionality gap. Not P0: no content is lost, keyboard and SR order are intact, it is one click to undo, and nothing persists |
| **Recommended fix boundary** | Central, in two layers: (1) `@kinetixui/ui` overlays carry direction into their portal; (2) `PreviewEnvironment` scopes `dir` to the preview and stops writing `<html>`. Don't patch Fields |
| **Regression tests required** | Listed under "Regression protection" below |

### Reproduction (Fields), step by step

FACT, from `fields-journey.json` (1440×900):

| Step | `<html dir>` | Header / sidebar / article (computed) | First nav link x | Preview stage(s) |
| --- | --- | --- | --- | --- |
| 1 Load `/docs/components/field` | ltr | ltr / ltr / ltr | 32 | ltr |
| 2 Toggle the Fields preview to RTL | **rtl** | **rtl / rtl / rtl** | **1322** | rtl |
| 11 Toggle back to LTR | ltr | ltr / ltr / ltr | 32 | ltr |
| 12a RTL, then client-nav to `/docs/components/input` (sidebar) | ltr | ltr | 32 | ltr, ltr |
| 12b → `/blocks` (header) | ltr | ltr | 32 | — |
| 14 Back / forward | ltr | ltr | 32 | ltr / — |
| 13 RTL, then reload | ltr | ltr | 32 | ltr |
| 12c RTL, then client-nav to `/` via logo, then `/iot` | ltr | ltr | 32 | — |
| 9 `/docs/components/button` (3 previews): toggle the first | **rtl** | **rtl** | **1322** | **rtl, rtl, rtl** |

Screenshot `02-field-after-preview-rtl.png` shows the mirrored header, sidebar, breadcrumb and meta panel, and the
bidi-reordered English punctuation.

Where state is written, checked one by one:

| Location | Written? |
| --- | --- |
| `document.documentElement.dir` | **Yes**, the only write (`preview-environment.tsx:65`) |
| `document.body.dir` | No |
| Global React context | No. `KinetixDirectionProvider` wraps only the stage. Note that `useDocumentDirection()` (`lib/use-document-direction.ts`) makes `ComponentPreview`'s tabs, Blocks (`showcase.tsx`) and the IoT showcase *read* `<html dir>`, so they follow the leak |
| Module-level store | **Yes**, `let direction` shared by every preview on the page |
| localStorage / sessionStorage / cookies / URL | No |
| Global CSS selectors | No new ones. Existing `[dir=rtl]` / logical properties respond because `<html>` changed |
| Portal roots | Inherit `<html>`. No container of their own (Dialog: `DialogPrimitive.Portal` with no `container`, `packages/ui/src/components/dialog.tsx:32`) |

### Portal and overlay isolation

FACT, `portal-matrix.json` (current) and `portal-matrix-scoped.json`. "Scoped" is simulated by toggling RTL and then
resetting `<html dir>` to `ltr`, so the stage and `KinetixDirectionProvider` stay RTL, which is what a preview-scoped
implementation would produce:

| Component | Current (html mirrored) | Preview-scoped | Why |
| --- | --- | --- | --- |
| Dialog | rtl | **ltr** | Portal to body, Content does not read direction context |
| Alert Dialog | rtl | **ltr** | same |
| Modal | rtl | **ltr** | same |
| Sheet | rtl | **ltr** | same (and its side would not flip) |
| Drawer | rtl | **ltr** | same |
| Popover | rtl | **ltr** | same |
| Tooltip | rtl | **ltr** | same |
| Date Picker (popover) | rtl | **ltr** | same |
| Tour | rtl | **ltr** | same |
| Multi Select (popover) | rtl | **ltr** | same |
| Select | rtl | rtl | Radix stamps `dir` from `DirectionProvider` on the content |
| Dropdown Menu | rtl | rtl | same |
| Menubar | rtl | rtl | same |
| Hover Card, Combobox, Command, Navigation Menu | rtl | rtl | Rendered inline inside the stage in their demos (no portal observed) |
| Context Menu, Color Picker | not measured | not measured | Automation did not open them reliably. Listed, not claimed |

**Architectural finding:** this is a library directionality-isolation problem, not only a docs problem. An application
that renders an RTL region inside an LTR page (a mixed-language editor, an Arabic widget in an English console) and
wraps it in `KinetixDirectionProvider dir="rtl"` gets LTR dialogs, sheets, popovers and tooltips from it today. The
docs site hid this by mirroring the page. The existing ui tests (`components-rtl.test.tsx`) run with a document-level
direction, so they cannot see it (INF from the test setup; not exhaustively read).

### Demo control matrix

| Demo | Control | Expected scope | Actual scope | Leakage? | Severity |
| --- | --- | --- | --- | --- | --- |
| Every component preview (98) | LTR / RTL | That preview | **Whole page + every preview on it** | **Yes** | **P1** |
| Every component preview | Reduced motion | Read-only status | Read-only status | No | — |
| Every component preview | Preview / Code tab | That preview | That preview (Radix Tabs) | No | — |
| Every component preview | Platform code tab | That preview | That preview (`useState`, `component-preview.tsx:70`) | No | — |
| Homepage flagship | Platform tab | That demo | That demo (`useState`, `cross-platform-flagship.tsx:52`) | No | — |
| Blocks | Preview / Code, platform tab | That block | That block (`useState`, `showcase.tsx:90`) | No | — |
| Blocks / IoT showcase | Direction | — (no control) | Follows `<html dir>` | Inherits the leak only while on a page that set it. Direction resets on navigation, so measured no | — |
| `/create` | Appearance Light / Dark | Preview | Preview only. `<html>` class unchanged (measured) | No | — |
| `/create` | Style, colour, radius, surface, chart | Preview + export | Preview + export. Nothing in storage | No | — |
| `/create` | (after back navigation) | — | Configuration is lost on back (OBS) | Not a leak | P3 note |
| Site header | Theme toggle | Whole site (documented global) | Whole site | No (by design) | — |
| Demos with internal state (variants, sizes, disabled, loading) | Built-in demo state | That demo | That demo (local React state) | None found | — |
| Density, orientation, viewport simulation | — | — | No such controls exist (`preview-environment.tsx` documents why width is absent) | — | — |

Only one control leaks: direction.

### Directionality architecture

| Concern | Today | Coupled to |
| --- | --- | --- |
| **Site direction** (the docs' own direction) | No independent concept. `<html dir>` is hard-coded `ltr` in `layout.tsx:85` and overwritten by the preview | Preview direction |
| **Preview direction** | Module store + `<html dir>` | Site direction, and every other preview on the page |
| **Component direction** | `KinetixDirectionProvider` on the stage (Radix `DirectionProvider`) + CSS from the nearest `[dir]` ancestor | Correctly scoped for inline content |
| **Portal direction** | Inherited from `<html>` (CSS), plus Radix's context for menus and select only | Site direction |

**Nested boundaries:**
- LTR site → RTL preview → RTL component: works for inline content. Portals only work by also mirroring the site.
- RTL site → LTR preview → LTR component: **not possible today.** Choosing LTR in a preview sets `<html dir="ltr">`.

RTL functional checks (padding, chevrons, adornments, focus rings, arrow keys, sheet sides, motion direction) aren't
re-run here. They are owned by the existing gates (`check:rtl`, `components-rtl.test.tsx`, the visual-maturity
slices' RTL screenshots), and all of those run with document-level direction. Any fix has to re-run them in the
nested, preview-scoped configuration, because that is the configuration they've never seen.

### Recommended fix boundary

Central, not per component. In this order:

1. **Library (`packages/ui`)**: every portaled overlay Content (Dialog, AlertDialog, Modal, Sheet, Drawer, Popover,
   Tooltip, HoverCard, Tour, and the popovers used by DatePicker, MultiSelect, Combobox, ColorPicker) reads Radix
   `useDirection()` and sets `dir` on its portaled root, the way Radix Menu and Select already do. Sheet and Drawer
   resolve their `side` logically from that direction. This is a behaviour fix with no API change: components already
   accept `dir` through the provider. It's a library change, so it gets a changeset and a test, and it should be the
   first PR.
2. **Docs (`PreviewEnvironment`)**: remove the `<html dir>` write and the module-level store. Each preview owns its
   direction (`dir` + `KinetixDirectionProvider` on the stage). Rename the screen-reader text from "applies to the
   whole page". `ComponentPreview`, `showcase.tsx` and the IoT showcase take direction from the nearest boundary
   (context) instead of `useDocumentDirection()`.
3. **Replace, don't delete,** the unit test that asserts the leak (`preview-environment.test.tsx:40`, `:70`, `:92`).
   Its purpose, "portaled overlays follow the preview direction", stays the requirement, asserted on the portal, not
   on `<html>`.
4. Optional, later: a documented site-direction preference, if KinetixUI ever wants the docs readable RTL. It would be
   a separate, global control.

Not acceptable: patching Fields, keeping `<html dir>` and hiding the chrome with CSS, or adding `dir="ltr"` to the
header and sidebar to mask the leak.

### Regression protection

Browser tests (Playwright, real layout), extending the existing `a11y-browser` / `large-text` harness pattern:

1. Fields: RTL changes only the preview stage. `getComputedStyle(stage).direction === "rtl"`.
2. `<html dir>` stays `ltr` and `<body>` has no `dir` after the toggle.
3. Header, primary nav and docs sidebar keep `direction: ltr`. The first nav link's x position is unchanged.
4. On a page with several previews (Button), toggling one leaves the others `ltr`.
5. Toggling back to LTR restores only that preview.
6. Client-side navigation, reload and back/forward don't carry preview direction (keep today's correct behaviour).
7. Portals: for each overlay in the matrix, opened from an RTL preview on an LTR page, the portaled content computes
   `direction: rtl`. **Negative control:** remove the library `dir` propagation and the Dialog, Sheet, Popover and
   Tooltip rows must fail.
8. Nested: an RTL preview containing an explicit `KinetixDirectionProvider dir="ltr"` subtree renders that subtree LTR,
   including its portals.
9. Coexistence: two previews on one page, one RTL and one LTR, each open a Dialog. Each dialog matches its preview.
10. Unit (`packages/ui`): overlay Content renders `dir` from `DirectionProvider` (jsdom proves the attribute, not the
    layout; the browser tests above prove layout).

### Effect on the rest of this audit

- Adds **P1-8** (section 23). Counts become P0 1 · P1 8 · P2 12 · P3 6.
- Slice 1 gains the fix as its **first** PR, because it changes `packages/ui` (changeset) and the docs' preview
  harness, which every later evaluation-journey change sits on.
- Reinforces section 15.5: the preview is the evaluator's main instrument, and today its direction switch rearranges
  the instrument panel.
