# Developer adoption audit — 2026-10-08

Scope: homepage → catalogue → component documentation → installation → first component, independently of IoT M4C-A. Base: `origin/main` at `04509087`. Live site: https://kinetixui.com. Dates use America/Los_Angeles.

The approved primary positioning remains **cross-platform design system infrastructure**, and the primary CTA remains **Explore components**. The homepage, component APIs, packages, tokens, analytics vocabulary, and IoT implementation are unchanged by this patch. This audit verifies concrete mechanisms, not improvements to conversion rates.

## Prioritized findings

No P0 outage or security blocker was demonstrated.

| Priority | Finding | Evidence and confidence | Disposition |
| --- | --- | --- | --- |
| P1 | React npm onboarding omits package source from Tailwind content | Live `/docs/installation` and source scan only `./src/**/*.{ts,tsx}`. In a clean Vite consumer, removing the package glob removes `.bg-action`; restoring it produces Button background/foreground utilities. **Verified failure.** | Fixed: scan shipped package source; explain Tailwind 3, CSS/PostCSS setup, and include a complete interactive App. CI builds the actual fenced examples in a clean consumer. |
| P1 | Component docs mix CLI installation with npm usage imports | Live Button page says `npx @kinetixui/cli add button`, then imports `@kinetixui/ui`. Published CLI 0.24.0 actually writes `components/ui/button.tsx`, `lib/utils.ts`, `app/globals.css`, installs four helper dependencies, and leaves `@kinetixui/ui` unresolved (`ERR_MODULE_NOT_FOUND`). **Verified failure for CLI-only instructions.** | Fixed: shared metadata explains the two import routes and links to full installation. Installation explains local imports, aliases, CSS, and preset prerequisites. Existing npm examples remain valid for that route. |
| P1 | Mobile fenced-code copy buttons are undiscoverable | At 390px, live Button page's `Copy code` controls have computed opacity `0`, width 28px, while the page has no horizontal overflow. Touch users lack hover. **Verified UI state; adoption impact is a hypothesis.** | Fixed: visible below the desktop breakpoint, retaining desktop hover/focus reveal. Local mobile computed opacity is `1`. |
| P1 | Platform snippets have no immediate setup path | Live Button code tabs show React/Angular/SwiftUI/Compose/Flutter snippets but no setup links. Generic Installation is React-only. Angular Preview is already labelled correctly. **Verified missing navigation; abandonment impact unknown.** | Fixed: per-platform setup link beside real snippets, state that the live preview uses React, and route Installation readers to all supported platforms. Planned Angular components retain their existing no-example guidance. |
| P1 | Compose setup is an illustrative fragment, not a pasteable first screen | `/docs/compose` has top-level `KinetixTheme { ... }`, no `@Composable` function, no imports for `Column`, `Modifier`, `dp`, and undeclared `email`, `emailError`, `enabled`. **Verified from source; clean compiler failure not executed.** | Follow-up: replace with a complete stateful screen and a clean Gradle consumer, covering module/settings/plugin/resource setup. Android SDK 37 is unavailable here; no uncompiled patch included. |
| P2 | Native distribution requires manual repository integration | SwiftUI is a local nested SwiftPM package, Compose is an Android module, Flutter is a path dependency (`publish_to: none`). Site says these are source distributions, not registry installs. **Verified, not a broken package claim.** | Keep honest availability language. Test novice setup in Xcode, Android Studio, and Flutter; do not advertise nonexistent registry coordinates. |
| P2 | First React npm component carries a large bundle | Clean Vite fixture's production JS is 1,074.08 kB, 320.17 kB gzip; CSS with the package-wide source scan is 105.59 kB, 17.40 kB gzip. **Measured for this fixture, not a universal app size or speed result.** | Investigate package import/side effects and component-level exports separately. Do not turn this documentation fix into packaging work. |
| P2 | Angular dark-theme loading needs a clearer recipe | Angular setup imports tokens, extras, and component styles, but no `@kinetixui/tokens/css/dark` despite stating the `.dark` contract. README includes dark but omits extras. **Verified documentation discrepancy; visual failure not reproduced in a browser consumer.** | Follow-up: reconcile stylesheets and verify both themes in a clean Angular app. |

## Journey checks

- **Homepage:** live primary CTA is Explore components and opens the catalogue. Installation is linked next to the CLI command; supported-platform availability explicitly distinguishes React/Angular package installs from native source consumption. No positioning change proposed from traffic assumptions.
- **Catalogue:** live entries link to docs; search has an accessible name; platform availability and missing Angular implementations are distinguished. At mobile width, a Filters menu exists. Filtering efficacy and its effect on adoption are not measured here.
- **Button docs:** real preview, all five platform tabs, Angular `preview` label, implementation/guidance distinction, and platform copy buttons. New tests click all five tabs and copy their code, checking closed-vocabulary events. The shared Setup row benefits all component pages.
- **Mobile navigation:** live Menu opens at 390px, displays 0.24.0 and beta, includes Installation and all native platform routes plus Angular Preview; Escape dismisses it and restores focus to Menu. Button page has no horizontal page overflow. Existing Radix dialog provides focus trapping; no independent assistive-technology certification is claimed.
- **First React component:** clean published-package app visibly renders a styled Save button; clicking it produces Saved. Computed foreground/background are non-default token colors. SwiftUI compiles; Angular AOT builds; native runtime interactions beyond Swift compilation were not run.

## Package and consumer verification

Registry readback during this audit:

| Package | Repository version | npm latest | Compatibility |
| --- | --- | --- | --- |
| `@kinetixui/ui` | 0.24.0 | 0.24.0 | React and React DOM >=18; this fixture tests installed React 19 |
| `@kinetixui/tokens` | 0.24.0 | 0.24.0 | Required stylesheet contract |
| `@kinetixui/cli` | 0.24.0 | 0.24.0 | Writes React source, not an app scaffold |
| `@kinetixui/angular` | 0.25.0 | 0.25.0 | Angular core/forms ^21.0.0; tokens >=0.24.0 <0.25.0; Preview |

- **React:** `node scripts/adoption/react-consumer.mjs --published --keep` passes TypeScript and Vite production build against npm releases. Local packed-artifact mode also passes; no workspace links or TS path aliases are present. It extracts the actual App, Tailwind config, CSS, and PostCSS fences from Installation. The old-content negative control removes the Button utility and demonstrates why the fix is needed. A real browser confirms the click works. The script never publishes.
- **CLI:** a disposable app running `npx --yes @kinetixui/cli@0.24.0 add button` successfully downloads live registry files and resolves helper dependencies; confirms the local/npm import mismatch.
- **Angular:** `pnpm check:angular-package` passes artifact validation, 170-symbol public API check, clean external tarball installation, production AOT build, and bundled styles. It exercises Button, Card, forms, Switch, Tag, Tabs, and leaf components. This is the existing package fixture, not a claim that every documentation fence was pasted into a consumer or that the npm artifact was independently AOT-tested.
- **SwiftUI:** the exact first Swift fence in `/docs/swiftui` was placed in a separate SwiftPM executable using the documented local package path and macOS 13 floor, plus a minimal SwiftUI App entry point. Apple Swift 6.4 compiled the consumer and full library successfully. No interactive window or iOS simulator test was run.
- **Compose:** source has compileSdk 37/minSdk 24 and Kotlin/JVM 17. No Android SDK 37 is installed/configured here, so no clean Android consumer was executed.
- **Flutter:** pubspec declares Dart >=3.6.0 <4.0.0 and Flutter >=3.27.0 and local path consumption. No Flutter binary is available here; runtime and consumer checks remain manual.

## Accessibility, SEO, and Qualified Evaluation coverage

**Accessibility:** full web tests cover existing keyboard/accessibility behavior. This audit additionally checks mobile menu dismissal/focus return, labelled controls, lack of Button-page overflow, Preview labelling, and copy discoverability. It does not substitute for a screen-reader audit, full browser axe pass, all viewport sizes, or native assistive technology. Existing CI accessibility gates remain enabled; the new React consumer adds a documentation failure gate.

**SEO:** live Button has a specific title, description, and one H1. Source/SEO tests validate public routes, canonical URLs for query-state pages, robots, sitemap, and core navigation. A plain Button docs page has no explicit canonical and no JSON-LD; repository SEO policy intentionally omits canonical on pages without query state. These are not treated as demonstrated indexing defects. No ranking claim, crawl coverage, Search Console, or Core Web Vitals result is inferred. A full production build generates 134 static pages.

**Qualified Evaluation Rate:** `marketing/analytics.md` §3 and `analytics-measurement.ts` agree on component_viewed, component_code_copied, block_code_copied, platform_selected, installation_viewed, and the platform_coverage/platform_availability/view_verification CTA targets. Route views, copy success, tab changes, and homepage CTAs have emitters and tests. New platform setup links navigate through the existing route-view provider; React Installation contributes installation_viewed, native platform docs contribute docs_viewed under the current definition. This patch does not broaden QE by counting every setup link, emit a redundant qualified_evaluation event, or send copied text/URLs.

QE is distinct PostHog sessions with at least one qualifying signal divided by eligible arriving sessions, not copy events divided by pageviews. Campaign attribution belongs to the session if any event carries its campaign, including evaluations in another tab. Copy intent does not prove installation. Source contract/integration tests passed; production PostHog ingestion and dashboard queries were not independently re-queried in this audit. No traffic counts or conversion uplift asserted. The documented baseline and stale-dashboard follow-ups remain manual.

## Validation and remaining checks

Local passing checks: 75 web test files / 1,727 tests, plus the updated two onboarding tests rerun after the test typing correction; web TypeScript; ESLint on changed TSX; production web build; published and packed React consumers; old-content negative control; Angular package consumer; SwiftUI consumer; content/distribution validators; git diff whitespace check. Production build reports existing unused-variable warnings in `marketing-claims.test.ts` and a JSX tooling warning; no build failure.

Before merge: inspect GitHub CI on this PR, visually review production preview at phone/desktop widths and 200% text, screen-reader-check code/setup links, run Android and Flutter clean consumers, reconcile Angular dark CSS, and verify production ingestion/QE dashboard session logic after deployment. No merge, package publication, or manual production deployment is authorized by this work.

Marketing correction lives on a separate branch/PR. The short link recorded in PR #321 was independently opened and verified as an IoT post about device state, confirming the LI-005 mismatch. The exact LinkedIn timestamp and any other October 7 post identities remain unverified. No IoT URLs, dates beyond that report, or performance counts are invented. See its separate correction record for evidence provenance and manual reconciliation.
