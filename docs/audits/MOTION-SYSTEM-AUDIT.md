# KinetixUI motion system audit

**Audited:** `main` at `5db94f09269637f85bfc489630694a05ed7e5eb8` (PR #299), 2026-10-05.
**Question:** is KinetixUI's motion a mature, coherent, accessible, cross-platform system, or are components animating independently?
**Evidence logs:** negative controls, regression runs and before/after browser measurements are in the project files under `motion-audit/` (not committed; this report quotes what they show).

---

## 1. Executive verdict

**Overall: C — tokens exist but implementation is fragmented.** The web half is a **B**; the native half is **early**.

- **One canonical token source, generated everywhere.** 5 durations and 5 easings live in `tokens/primitives/motion.json`. Style Dictionary emits them as CSS custom properties, Swift, Kotlin and Dart. A fixed-point guard in CI (`ci.yml`, the generated-output `git diff --exit-code` step) keeps the generated files honest (negative control 10).
- **The web consumes them.**
  - React reaches every token through Tailwind utilities. `motion-contract.test.ts` bans raw `duration-N` and `transition-all` in `packages/ui`.
  - Angular's `styles.css` reads `var(--duration-*)` and `var(--easing-*)` on every transition.
  - Both web libraries prove a subset of their motion in a real browser, in both directions, under normal and reduced motion:
    - React: Accordion, Collapsible, Switch (`check:motion`).
    - Angular: Switch, disclosure, all eight overlays (`check:angular-browser`, `check:angular-overlays`).
- **Native consumption is thin.**
  - SwiftUI, Compose and Flutter consume tokens in exactly three motion families: Accordion, Collapsible, Switch.
  - Of 33 animated native components, **24 are declared gaps** (`scripts/native-motion-spec.mjs` `KNOWN_GAPS`). They are hard-coded and ignore the platform's reduce-motion setting. That includes every Spinner, Skeleton, Marquee and TypingIndicator: infinite loops that keep running under Reduce Motion on all three platforms.
  - Only 5 of 10 tokens (`instant`, `fast`, `standard`, `enter`, `exit`) are used by any native component.
- **No semantic motion layer.** The web shows repeated, consistent pairings: overlay enter `fast`+`enter`, overlay exit `instant`+`exit`, state change `instant`/`fast`+`standard`. Those pairings are conventions in prose (`TOKENS.md`), not tokens. Native platforms have no way to name them.
- **No P0 found.** Reduced motion never strands an overlay, traps focus or blocks dismissal where it was tested:
  - React keeps `animationend` firing by shortening durations rather than removing animation.
  - Angular's close is synchronous and does not wait on a transition.
- **The homepage platform ticker (§10A) was a FAIL and is fixed in this PR.** Screen readers heard no platforms. It had no pause control (WCAG 2.2.2). The loop jumped 59px at every boundary. It left a 757px blank gap at 1920px, broke entirely under RTL, and hid two platforms at phone width under reduced motion. It is now **PASS WITH NOTES** (section 10A).

**Recommendation: Option B, a small corrective slice** (section 25). That means native reduced motion for the looping and loading family, the React Spinner, the registry floor, three gate holes and four false doc sentences. A full Motion Maturity Wave is not justified yet. The systemic native gap is real, but it is a bounded set of named components, already listed in `KNOWN_GAPS`, and fixable with the helper pattern the three families already use.

---

## 2. Audit scope

**Covered:**
- canonical DTCG tokens and the Style Dictionary configuration
- generated web, Swift, Kotlin and Dart outputs
- `packages/ui` (React), `packages/ui-angular`, `packages/ui-swiftui`, `packages/ui-compose`, `packages/ui-flutter`, `packages/iot` (React)
- registry and blocks
- the docs site (`apps/web`)
- motion documentation and every motion gate

**Method:**
1. Source inventory across all packages, with `file:line` evidence.
2. Real-browser measurement (Chromium 1194 via Playwright) of Storybook and of the production site build (`next start`).
3. Every existing motion gate re-run.
4. 14 negative controls.

**Not covered: native runtime.** No Xcode, Android SDK or Flutter SDK exists in this environment, so no native test, simulator or device run happened here. Native findings come from source plus what the native test files assert. The native suites run in `native-swiftui.yml`, `native-compose.yml` and `native-flutter.yml`. They are path-filtered and did not run on the last main commits.

## 3. Canonical motion-token inventory

`tokens/primitives/motion.json` is the only motion source:

| Group | Token | Value | Repo description (abridged) |
|---|---|---|---|
| duration | `instant` | 100ms | press states, toggles |
| duration | `fast` | 200ms | icon rotation, chevrons, sidebar collapse |
| duration | `base` | 300ms | fades, stroke/progress |
| duration | `slow` | 500ms | sheet/drawer open |
| duration | `slower` | 1000ms | looping animations (caret blink) |
| easing | `linear` | (0,0,1,1) | constant speed |
| easing | `standard` | (0.4,0,0.2,1) | default ease-in-out |
| easing | `enter` | (0,0,0.2,1) | decelerate, surface opening |
| easing | `exit` | (0.4,0,1,1) | accelerate, surface closing |
| easing | `emphasized` | (0.2,0,0,1) | expressive, use sparingly |

**Absent, and whether that is a gap:**

- **Spring parameters: not a gap.** No component on any platform uses a tuned spring. The only springs are framework defaults (Compose `animateFloatAsState`, the Compose pager).
- **Delay and stagger: not a gap.** Delays exist only on the marketing site (hero stagger) and in typing dots (150ms phase offsets on three platforms). Those are local rhythm, not system timing.
- **Distance and scale: weak gap (P2).**
  - Every React overlay uses `zoom-in-95` and `zoom-out-95`, and NavigationMenu alone uses `zoom-in-90`.
  - Popover and Tooltip slide by `2` (0.5rem); Angular floating surfaces settle 4px.
  - These are consistent within each library but not shared across them.
- **Opacity: exists** as `tokens/primitives/opacity.json`, but no motion keyframe reads it.
- **Interaction-state motion: lives elsewhere.** `interaction.press.opacity` is in `tokens/primitives/interaction.json`, and its own description says it is not wired to any component.
- **Reduced-motion alternatives: not tokens.** They are implemented per platform (§9).
- **Transition composition tokens: none.** See §8.

## 4. Token-generation matrix

| Output | File | Generated by | Contents |
|---|---|---|---|
| Web CSS | `packages/tokens/dist/web/*.css`, `registry/kinetixui/globals.css:172-181` | `kinetix/css-easing` transform | `--duration-*`, `--easing-*` (cubic-bezier) |
| Tailwind | `packages/ui/tailwind.config.ts:146-168` | hand-wired; `motion-contract.test.ts` asserts every token is wired | `duration-{token}`, `ease-{token}` |
| SwiftUI | `packages/tokens/dist/ios/KinetixMotion.swift`, vendored at `packages/ui-swiftui/Sources/KinetixUI/KinetixMotion.swift` | `kinetix/motion-swift` (`style-dictionary/hooks.mjs:416`) | `KinetixDuration` (Swift `Duration`), `KinetixEasing` |
| Compose | `packages/tokens/dist/android/KinetixMotion.kt`, vendored at `packages/ui-compose/.../tokens/KinetixMotion.kt` | `kinetix/motion-compose` (`hooks.mjs:458`) | `KinetixDuration` (Int ms), `KinetixEasing` (`CubicBezierEasing`) |
| Flutter | `packages/tokens/dist/flutter/kinetix_motion.dart`, vendored at `packages/ui-flutter/lib/src/kinetix_motion.dart` | `kinetix/motion-dart` (`hooks.mjs:500`) | `KinetixDuration` (`Duration`), `KinetixEasing` (`Cubic`) |

Freshness of every vendored file is enforced by the CI generated-output guard (negative control 10 below).

## 5. Component consumption inventory

Status vocabulary used in sections 5, 6 and 23:

- **GENERATED**: a platform constant exists.
- **CONSUMED**: a component reads it.
- **PARTIAL**: some components read it and others on the same surface do not.
- **LOCAL/HARD-CODED**: the surface animates on literals or framework defaults.
- **MISSING**: the surface does not animate, or does not honour the setting, where it should.
- **NOT APPLICABLE**: the platform has no such surface.
- **UNVERIFIED**: a claim that exists in source only.

### React (`packages/ui`, `packages/iot`)

| Component | Trigger | Property | Duration | Easing | Tokenized | Reduced motion | Tested |
|---|---|---|---|---|---|---|---|
| Dialog / AlertDialog / Modal | open/close | opacity, scale .95 | fast / instant | enter / exit | yes | global floor | contract (static) |
| Sheet panel (`sheet.tsx:30`) | open/close | slide 100% | slow / base | standard | yes | floor | contract |
| Popover, HoverCard, Dropdown, ContextMenu, Select, NavigationMenu | open/close | opacity, scale (+0.5rem slide on Popover/Tooltip) | fast / instant | enter / exit | yes | floor | contract |
| Tooltip | open/close | opacity, scale, slide | instant | enter / exit | yes | floor | contract |
| Drawer (vaul) | open/drag | transform | vaul internal | vaul | no | floor (CSS only) | no |
| Toaster (sonner) | toast | library | library | library | no | library | no |
| Accordion / Collapsible | expand/collapse | height (keyframes) | fast | enter / exit | yes | floor | **`check:motion`** (midpoint and duration, both directions, normal and reduced) |
| Switch | toggle | `inset-inline-start` | instant | standard | yes | floor | **`check:motion`** |
| Inputs, Checkbox, Radio, Button, Tabs, SegmentedControl | focus/hover/select | colour, border, shadow | instant / fast | standard | yes | floor | no motion test |
| Card (interactive) | hover | shadow, border, bg | fast | standard | yes | `motion-reduce:transition-none` | `check:card-visual` |
| Sidebar | collapse | width, left/right, margin | fast | linear | yes | floor | no |
| Tour | step | top/left/width/height | fast | standard | yes | floor + JS `scrollIntoView` check | no |
| Spinner | loop | rotate | 1s (Tailwind `spin`) | linear | no | **frozen** (see §11) | `a11y-browser` loop rule only |
| Skeleton, chart loading | loop | opacity pulse | 2s | Tailwind | no | `motion-reduce:animate-none` | loop rule |
| Marquee | loop | translateX −50% | `--marquee-duration` | linear | no | `motion-reduce:animate-none` | loop rule |
| MessageBubble typing dots | loop | translateY, opacity | 1.2s | ease-in-out | no | `motion-reduce:animate-none` | loop rule |
| Carousel (embla) | prev/next | JS scroll | embla default | embla | no | **none**: the CSS floor cannot reach JS scrolling | no |
| ~25 hover `transition-colors` / `-opacity` without duration | hover | colour/opacity | Tailwind default 150ms | Tailwind default | **no** | floor | no |
| IoT controls and cards (`packages/iot`) | state | colour, width, dashoffset, transform | base / fast | literal `ease-out` | duration only | `motion-reduce:` + floor | `motion-rendered.test.tsx` (jsdom) |

### Angular (`packages/ui-angular/src/styles.css`)

| Component | Trigger | Property | Duration | Easing | Tokenized | Reduced motion | Tested |
|---|---|---|---|---|---|---|---|
| Button `.kx-btn` (:55) | hover/press | colours, shadow | fast | standard | yes | **not suppressed** | no |
| Inputs, checkbox, radio, switch, toggle, segmented, tabs | state | colour, border, shadow; switch thumb `inset-inline-start` | instant / fast / base | standard | yes | `transition:none` (:1147) | switch: `check:angular-browser` (LTR+RTL, normal+reduced) |
| Disclosure (accordion, collapsible, app bar) | expand | `grid-template-rows` 0fr↔1fr + discrete visibility | fast | enter / exit | yes | yes (:2059) | `check:angular-browser` |
| Dialog / alert / modal | open/close | opacity, scale .95, `overlay`/`display` allow-discrete | fast / instant | enter / exit | yes | yes (:2369) | `check:angular-overlays` (opacity midpoint, LTR+RTL, normal+reduced) |
| Sheet | open/close | logical `margin-inline-*` / `translate` | slow / base | enter / exit | yes | yes | `check:angular-overlays` (end side), `check:overlay-visual` |
| Popover / hover card / tooltip | open/close | opacity + 4px settle keyed on resolved physical side | fast or instant / instant | enter / exit | yes | yes | `check:angular-overlays` |
| Progress bar | value | `inline-size` | base | standard | yes | yes | no |
| Spinner / skeleton / circular indeterminate | loop | rotate / opacity | **0.7s / 1.6s / 1s literals** | linear token / standard / literal `linear` | partial | spinner **slows to 3s**, skeleton stops | `check:angular-browser` 3s loop rule |
| Marquee | loop | translateX ±50%, mirrored RTL keyframes | input | literal `linear` | no | `animation:none`, strip becomes scrollable, copy hidden | `content.spec.ts` (duration only) |

### SwiftUI / Compose / Flutter

| Family | SwiftUI | Compose | Flutter | Tokens | Reduced motion | Tested |
|---|---|---|---|---|---|---|
| Accordion (chevron + content) | `.move`+`.opacity`, `KinetixDisclosureMotion` | `AnimatedVisibility`, `tween` | `AnimatedRotation` / `AnimatedCrossFade` | `fast`, `enter`/`exit` | `accessibilityReduceMotion` / `ANIMATOR_DURATION_SCALE == 0` / `MediaQuery.disableAnimationsOf` | Swift: resolver only. Compose: Robolectric settles both ways. Flutter: rendered intermediate angle |
| Collapsible | same | same | `AnimatedSize` | same | same | Flutter: measured intermediate height both ways, RTL, 2× text |
| Switch | thumb, `KinetixSwitchMotion` | `animateDpAsState` | `AnimatedContainer` | `instant`, `standard` | same | Flutter: intermediate position both ways, reduced, RTL, 2× text. Swift/Compose: resolver |
| Spinner | `repeatForever` linear 0.8s | `infiniteRepeatable(tween(800))` | `RotationTransition` 800ms | **no** | **no** | no |
| Skeleton | easeInOut 1s loop | `tween(1000)` reverse | `FadeTransition` 1s | no (1000 = `slower`) | **no** | no |
| Marquee | 32s linear offset | 32000ms | 32s | no | **no** | no |
| TypingIndicator | 0.6s, delays | 1200ms, 150ms phases | 1200ms | no | **no** | no |
| Progress / CircularProgress | `.default` / easeOut 0.3 | default spring | static | no | no | no |
| Input/Textarea focus border | easeInOut 0.12 | none | none | no | no | no |
| Overlays | Dialog `.opacity`, Sheet/Drawer `.move(.bottom)`, Sidebar `.move(.leading)`: **no animation attached** (caller's `withAnimation`) | Material3 `Dialog`, `ModalBottomSheet`, `ModalNavigationDrawer`, `DropdownMenu`, `TooltipBox` (system motion) | custom Dialog/Sheet/Drawer/Sidebar/Toaster: **no motion** (mount/unmount). `MenuAnchor`, `Tooltip` (system) | no | SwiftUI: no. Compose: system honours animator scale. Flutter: n/a | no |

## 6. Cross-platform matrix

| Motion capability | Source | Web CSS | React | Angular | SwiftUI | Compose | Flutter |
|---|---|---|---|---|---|---|---|
| Duration tokens | yes | GENERATED | CONSUMED | CONSUMED | GENERATED, PARTIAL (instant, fast) | GENERATED, PARTIAL | GENERATED, PARTIAL |
| Easing tokens | yes | GENERATED | CONSUMED | CONSUMED (loops use literal `linear`) | PARTIAL (standard, enter, exit) | PARTIAL | PARTIAL |
| Reduced motion | n/a | n/a | CONSUMED (global floor), verified for 3 components | CONSUMED per component, verified for switch, disclosure and 8 overlays | PARTIAL (3 families) | PARTIAL (3 families) | PARTIAL (3 families) |
| Entrance | `enter` | | CONSUMED | CONSUMED | PARTIAL (disclosure only) | PARTIAL | PARTIAL |
| Exit | `exit` | | CONSUMED | CONSUMED | PARTIAL | PARTIAL | PARTIAL |
| State transition | `standard` | | CONSUMED | CONSUMED | PARTIAL (switch); inputs LOCAL | PARTIAL | PARTIAL |
| Overlay motion | | | CONSUMED, static-tested | CONSUMED, browser-verified | LOCAL (no animation attached) | system (idiomatic) | MISSING (custom), system (menus, tooltip) |
| Loading motion | | | LOCAL (Tailwind spin/pulse) | LOCAL (literals) | LOCAL, no reduce | LOCAL, no reduce | LOCAL, no reduce |
| Navigation motion | | | carousel LOCAL (embla), no reduce | NOT APPLICABLE (no carousel yet) | system `TabView` | LOCAL default spring | system `PageView` |

## 7. Hard-coded motion findings

| Occurrence | Where | Class | Why |
|---|---|---|---|
| Spinner / skeleton / typing / marquee loop timings (0.6–1.6s, 32s) | all five platforms | **ACCEPTABLE LOCAL VALUE**, with one caveat | Loop rhythm is component physics. The 2-step token scale cannot express "one turn per 0.8s" and should not. Caveat: the reduced-motion behaviour around these loops is the defect, not the number. |
| Skeleton 1000ms (SwiftUI, Compose, Flutter) | `Skeleton.swift:23`, `Skeleton.kt:32`, `skeleton.dart:21` | **SHOULD USE EXISTING TOKEN** (`slower`) | Exact duplicate of a token whose description is "looping animations". |
| CircularProgress `easeOut(0.3)` | `CircularProgress.swift:45` | SHOULD USE EXISTING TOKEN (`base`) | Exact duration duplicate. |
| JsonViewer 100ms | `json_viewer.dart:117` | SHOULD USE EXISTING TOKEN (`instant`) | Exact duplicate. |
| Native `linear` loops | Spinner on 3 platforms | SHOULD USE EXISTING TOKEN (`KinetixEasing.linear`) | Same curve. |
| ~25 React hover `transition-colors` with no duration | listed in the React inventory | SHOULD USE EXISTING TOKEN | A hidden Tailwind default of 150ms that sits between `instant` and `fast`. Harmless, but untraceable. |
| IoT literal `ease-out` (≈18 sites) | `packages/iot/src/react/*` | SHOULD USE EXISTING TOKEN, and semantically wrong | It equals `enter`, but these are state changes, where `standard` is the system's convention. Also 1 `transition-all` at `pairing-method-picker.tsx:160`. |
| Tailwind fallbacks `var(--duration-fast, 200ms)` | `tailwind.config.ts:214-217` | ACCEPTABLE LOCAL VALUE | The fallback exists because an undefined `var()` voids the whole `animation` shorthand. Documented in place. |
| Marketing site curves `cubic-bezier(0.16,1,0.3,1)`, 0.6s/1.1s | `apps/web/src/app/globals.css` | ACCEPTABLE LOCAL VALUE | A marketing surface, not the library. It has its own reduced-motion block. |
| Overlay zoom 95 / slide 0.5rem / Angular 4px | React overlays, Angular floating | **MISSING SEMANTIC TOKEN** (weak) | Repeated meaningful distance, consistent within each library, unshared across them. |
| `motion-reduce:animate-[spin_3s…]` on Spinner and FileUpload | `spinner.tsx:12`, `file-upload.tsx:142` | **LEGACY / DEAD** | Neutralised by the global floor's `!important` (measured: no animation runs, §11). |
| Menubar `data-[state=closed]:fade-out-0` | `menubar.tsx:34` | LEGACY / DEAD | No `animate-out` beside it. Already recorded in `motion-states.mjs`. |

**Is hard-coding systemic?**
- **No on the web.** React and Angular route every state and overlay transition through tokens, and `motion-contract.test.ts` enforces it for `packages/ui`.
- **Yes on native, outside three families.** But it is enumerated in `KNOWN_GAPS` rather than hidden.

## 8. Semantic-motion assessment

**Repetition is proven on the web:**

| Pattern | Pairing | Occurrences |
|---|---|---|
| Overlay enter | `fast` + `enter` | 10 React surfaces, 8 Angular surfaces |
| Overlay exit | `instant` + `exit` | same 18 |
| Disclosure | `fast` + `enter`/`exit` | React, Angular and all three natives |
| Control state change | `instant` + `standard` | ≈15 React controls and the Angular equivalents |
| Surface hover | `fast` + `standard` | Card, Tabs, Button (Angular) |

**Recommendation:**
- A semantic layer is **warranted later, but not first.** The web already applies these pairings consistently by convention. The cost of not having names lands on native, where a developer porting overlay motion has no `overlayEnter` to reach for.
- The smallest truthful step is to document the four pairings as named compositions in `TOKENS.md`. Do not add DTCG semantic tokens until a second native family consumes them. Adding them now would be speculative.

## 9. Reduced-motion audit

| Surface | Motion stops? | Same end state? | Info lost? | Dismissal/focus OK? | Evidence |
|---|---|---|---|---|---|
| React overlays | duration 0.01ms | yes | no | yes: `animationend` still fires (floor never uses `animation:none`) | `motion-contract.test.ts` (static) |
| React Accordion, Collapsible, Switch | ≤2ms | yes | no | n/a | `check:motion` (green, 7 interactions) |
| React Spinner, FileUpload loader | **frozen** | static arc | sighted users lose the "working" cue; `role=status` label still announced | n/a | browser probe: 3 running `spin` animations normally, **0 under reduce** |
| React Skeleton, typing, Marquee | stop | yes | no (decorative / duplicated text) | n/a | probe |
| React Carousel | **no**: embla JS scroll animates | yes | no | yes | source (`carousel.tsx:4`), not measured |
| Angular overlays, switch, disclosure | transition removed | yes | no | yes, close is synchronous | `check:angular-overlays`, `check:angular-browser` (green) |
| Angular `.kx-btn` hover | **no** (colour fade only) | yes | no | n/a | `styles.css:55`, no reduce rule |
| Angular spinner | slows to 3s | n/a | no | n/a | `styles.css:1148` |
| Native disclosure, switch (×3) | yes (nil animation / tween(0) / 1µs) | yes | no | n/a | native tests (CI, not run here) |
| **Native spinner, skeleton, marquee, typing (×3 platforms)** | **no: infinite loops keep running** | n/a | n/a | n/a | source; `KNOWN_GAPS` |
| **SwiftUI overlays** | n/a when no animation is attached; **slides if the caller uses `withAnimation`**, ignoring Reduce Motion | yes | no | yes | source (`Sheet.swift:57`, `Dialog.swift:68`) |
| Homepage ticker (before) | yes | **no**: at 390px under reduce, Jetpack Compose and Flutter sat outside the band | **yes** | n/a | `baseline/platform-ticker-before.log` |
| Homepage ticker (after) | yes | wraps to 2–4 rows | no | n/a | `check:platform-ticker` |

Platform mechanisms in use:
- **Web:** `prefers-reduced-motion`.
- **SwiftUI:** `@Environment(\.accessibilityReduceMotion)`.
- **Compose:** `Settings.Global.ANIMATOR_DURATION_SCALE == 0`, with a `ContentObserver`. Only an exact 0 counts, so a 0.5× scale does not.
- **Flutter:** `MediaQuery.disableAnimationsOf`.

## 10. Accessibility findings (beyond reduced motion)

- **No focus confusion from motion.**
  - Angular moves focus synchronously on open and close; native `<dialog>` restores it.
  - React relies on Radix focus management, which is independent of animation.
- **No layout shift from overlay motion.** Overlays are in the top layer or portalled.
  - The Sheet backdrop exits 200ms before the panel (100ms overlay vs 300ms panel). That is a P3 visual seam, not a shift.
- **Auto-moving content and WCAG 2.2.2:**
  - The homepage ticker had hover-only pause. Fixed in this PR.
  - The hero typing loop (`hero-command.tsx`) types install commands indefinitely with no pause. Its `matchMedia` check runs once on mount. **Open, P2.**
  - The hero token fan is `aria-hidden` and decorative: 2.2.2 does not apply to purely decorative content. **Accepted.**
- **Hover-only information:**
  - Tooltip content opens on focus in both web libraries (`check:angular-overlays` asserts the Angular case).
  - Touch is ignored by Angular's hover timers. That is correct for supplementary tooltips.
- **No flashing.** No animation exceeds 3 flashes/s. The fastest loop is the 0.7s Angular spinner, which is rotation, not luminance flashing.
- **Infinite animation without purpose:**
  - The `kx-grid-bg` 60s drift on the hero is ambient. It is reduced-motion gated, so **accepted P3**.
- **Delayed content:** tooltip and hover card open delays (700ms) are bypassed by keyboard focus in Angular.

## 10A. Supported-platform carousel: **PASS WITH NOTES** (was FAIL)

**Source of platform truth.**
- `components.manifest.json` `platformDefinitions` (via the generated `platform-parity.json`). The component reads `PLATFORMS` and `PLATFORM_DEFINITIONS[p].label`.
- The page's local display-name map (`PLATFORM_DISPLAY_NAME`) is deleted. The manifest already labels Compose "Jetpack Compose", so it was a second source.

**Platforms shown:** React, Angular, SwiftUI, Jetpack Compose, Flutter, in canonical order.

**Logo source and strategy.**
- Mechanism:
  - Inline single-path 24×24 SVG glyphs, the same approach as the existing `GithubIcon`.
  - No new dependency and no network asset, so there is no layout shift on load.
  - Keyed `Record<Platform, …>` in `apps/web/src/components/platform-logo.tsx`, so a new manifest platform without a mark is a type error.
- Provenance and licences:
  - Glyphs are copied from Simple Icons 16.34.0. Its data is CC0, except Angular's, which comes from Angular's press kit under CC BY 4.0 (attribution in the file header).
  - The marks remain their owners' trademarks and are used nominatively.
- Per-platform choices:
  - **SwiftUI has no separate public mark,** so it carries Apple's published Swift mark rather than an invented one.
  - Compose carries the Jetpack Compose mark, not Android's.
- Styling:
  - Monochrome `currentColor`, matching the muted ticker in light, dark and forced colours.
  - Each glyph keeps its own silhouette inside one square box, sized `1.125em` so it scales with text.

**Loop implementation.**
- Structure:
  - One CSS `transform` animation on one element (`kx-ticker` keyframes).
  - The strip is two identical halves of two lists each.
  - It translates by exactly one half per cycle: `−50%` in LTR, `+50%` in RTL, set through a custom property.
- Three defects found and fixed:
  1. **Loop jump.** As a flex item, the track shrank below its content at ≤1280px, so `−50%` stopped short. Measured jump: 58.8px every boundary, 117.6px at 200% text. Fixed with `flex: none` and non-wrapping labels.
  2. **Blank gap.** At 1920px one copy (636px) was narrower than the window (1394px). Measured worst gap: 757px. Fixed with two lists per half.
  3. **Silent keyframe override.** The site's `@keyframes marquee` was silently overridden by the `@kinetixui/ui` preset's identically named keyframe, so any direction change was discarded. Renamed to `kx-ticker`.
- Velocity: constant (linear), 22.5px/s, against the original 22.2–24.5px/s.

**Reduced-motion behaviour.**
- Nothing animates.
- The three repeats get `display: none`, and the one real list wraps inside the band: 1 row at ≥1280px, 2 rows at 390px, 3 at 320px, 5 at 390px with 200% text (measured `itemTops`).
- The edge fade mask applies only under `motion-safe`, and the pause button is hidden.

**Accessibility behaviour.**
- One `<ul aria-label="Supported platforms">`, and assistive technology hears each platform exactly once.
  - Before: zero times. The whole track was `aria-hidden`.
- The repeats are `aria-hidden` + `inert`.
- Marks are `aria-hidden`, `focusable="false"` and untitled.
- **Pause:** a keyboard-operable button with `aria-pressed` pauses and resumes (WCAG 2.2.2). The ticker moves continuously for more than 5s beside other content and names information, so the decorative exemption does not apply. Hover still pauses.

**RTL behaviour.**
- Movement reverses, so the next half arrives from inline-end and the loop stays seamless: 0px seam error and 0px gap at 1280 and 1920.
  - Before: a 1212px jump and a 576px gap.
- Marks are never mirrored.

**Responsive and 200% behaviour.**
- The gate runs these views:
  - 320, 390, 1280 and 1920px, each with motion and with reduced motion
  - 390px and 1920px at 200% text (CDP font size), plus 390px at 200% text with reduced motion
  - 1280px and 1920px in RTL, plus 390px RTL with reduced motion
- Assertions in every view:
  - no clipped label
  - no vertical cut-off
  - no page overflow

**Performance.**
- Compositor-only `transform`.
- No timers, no re-renders and no per-frame measurement. The only state is the pause boolean.

**Tests protecting it.**
- `apps/web/src/components/platform-ticker.test.tsx` (5 tests). It covers:
  - canonical platforms read from the manifest independently
  - one labelled list
  - the right mark per platform: decorative, square, intrinsic size
  - repeats hidden and inert, with the strip in even halves
  - a mark for every canonical platform
  - the pause toggle
- `scripts/platform-ticker.mjs` (`pnpm check:platform-ticker`, added to `a11y-site.yml`) asserts these in a real browser across the 14 views above:
  - seam
  - spacing across the seam
  - linear easing
  - gap-free coverage at 5 phases
  - keyboard pause and resume
  - reduced-motion static wrap
  - RTL
  - 200% text
  - page overflow
  - the accessibility-tree contents

**Notes (why "with notes").**
- The Swift and Jetpack Compose marks are solid shapes and read optically heavier than the outline-like React and Flutter marks. They are official silhouettes, so they are not reshaped.
- The `@kinetixui/ui` **Marquee catalogue component** has the same RTL defect. Measured in Storybook under `dir=rtl`: the blank gap grows 0→324px across a cycle. It is not touched here (catalogue scope, §25).
- The gate runs on Chromium only.
- Real VoiceOver and NVDA output was not observed. The accessibility-tree assertions use Chromium's tree.

## 11. Overlay audit

**Angular (C1): solid.**
- Entrance from `@starting-style`.
- Exit kept painting by `transition-behavior: allow-discrete` on `display` and `overlay`.
- Logical sheet sides through `margin-inline-*`, so no direction selector is needed.
- Floating settle keyed off the resolved physical side.
- Close, focus restore and scroll unlock are synchronous, so the exit is visual only and dismissal never waits on motion. That makes rapid open/close safe by construction: CSS transitions reverse natively.
- Not tested:
  - rapid toggling or reopening mid-exit
  - the `start`/`top` sheet sides (only `end` is motion-tested)
- The sheet animates `margin`, a layout property, on one large element per open. That is low demonstrated risk.

**React: same intent, same tokens, weaker proof.**
- Enter `fast`/`enter` and exit `instant`/`exit` match Angular exactly. That is the strongest cross-library coherence in the system.
- Motion is protected only by the static contract.
  - No React overlay motion is browser-verified. `check:motion` covers disclosure and switch only.
- Directionality:
  - Popover and Tooltip slide off Radix's resolved `data-side`, which is RTL-correct.
  - Sheet sides are physical (`left`/`right`, intentional per `sheet.tsx:32`).
- Drawer (vaul) and Toaster (sonner) use untokenized library motion.

**Native: no shared intent.**
- SwiftUI declares transitions but attaches no animation.
- Compose uses Material system motion, which is idiomatic and respects animator scale.
- Flutter's custom overlays appear and disappear instantly.
- None of these is harmful.
- They are not the same motion intent, and SwiftUI's caller-driven slides ignore Reduce Motion.

## 12. State-transition audit

**Web: intentional, tokenized and consistent.**
- Selection controls use `instant` + `standard`.
- Navigation and surfaces use `fast` + `standard`.
- Colour/border/shadow only, except the Switch thumb, which uses logical `inset-inline-start`.
- The checkbox mark and radio dot appear instantly. **Correct:** a check is information, not a journey.

**Native:**
- Switch is the only tokenized state transition.
- Other native controls change instantly, which is idiomatic and acceptable.
- One exception: SwiftUI Input/Textarea animate the focus border on `easeInOut(0.12)` without honouring Reduce Motion. P3; a border fade is not vestibular motion.

**Slider:** colour transition only, on all platforms. No thumb motion, correctly; it tracks the pointer.

## 13. Loading and progress audit

| Platform | Spinner | Skeleton | Progress | Reduced motion |
|---|---|---|---|---|
| React | 1s spin | 2s pulse | determinate, `transition-transform` (untokenized) | **spinner frozen** (intended 3s turn is dead code); skeleton stops |
| Angular | 0.7s spin | 1.6s pulse | `inline-size`, `base` | spinner slows to 3s ✔; skeleton stops ✔ |
| SwiftUI | 0.8s | 1s | `.default` | **none honoured** |
| Compose | 800ms | 1000ms | default spring | **none honoured** |
| Flutter | 800ms | 1s | static | **none honoured** |

- **Semantics:** loading semantics stay with the label, not the motion. React and Angular spinners are `role="status"` with a label.
- **Cost:** every loop is transform or opacity, so compositor-friendly.
- **No shimmer** exists anywhere.

## 14. RTL / directionality

| Component | React | Angular | SwiftUI | Compose | Flutter |
|---|---|---|---|---|---|
| Sheet / drawer | PARTIAL (physical sides by design) | PASS (logical, verified end side) | PASS (`.leading` is logical) | PASS (system) | NOT APPLICABLE (no motion) |
| Popover / tooltip settle | PASS (resolved side) | PASS (resolved side) | system | system | system |
| Switch thumb | PASS (verified) | PASS (verified LTR+RTL) | PASS (resolver) | PASS | PASS (test asserts RTL) |
| Disclosure | NOT APPLICABLE (vertical) | PASS (verified RTL) | n/a | n/a | PASS (RTL test) |
| Marquee (catalogue) | **FAIL**: blank gap to 324px under RTL (measured) | PASS (mirrored keyframes) | UNVERIFIED (source uses offset sign) | UNVERIFIED | UNVERIFIED |
| Homepage ticker | **PASS** (was FAIL) | n/a | n/a | n/a | n/a |
| Carousel | UNVERIFIED (embla `direction` not set) | not built | system `TabView` | pager | `PageView` |

## 15. 200% zoom / large text

- Disclosure height animations measure content, so no fixed heights:
  - React uses Radix CSS variables.
  - Angular uses `grid-template-rows`.
  - Flutter uses `AnimatedSize`, verified at 2× text.
- Overlays at 200% text: `check:large-text` (React) and `check:angular-overlays` (Angular, including narrow + 200%) are green.
- The homepage ticker had no 200% defect beyond the doubled loop jump (117.6px). It now passes at 390 and 1920px with 200% text.
- No animation found depends on a fixed width or height that clips enlarged content. Sidebar and Tour animate measured geometry.

## 16. Performance findings

All findings are classified by **demonstrated** risk. None was measured to drop frames, and no profiling was done.

| Finding | Where | Risk |
|---|---|---|
| width + left/right + margin on collapse | React `sidebar.tsx:162,171,272` | P3: one-off, user-initiated, layout per frame for 200ms |
| top/left/width/height | React `tour.tsx:161,171` | P3: one element per step |
| height keyframes | Accordion, Collapsible | accepted: the only way to animate measured content height in CSS today |
| width | AudioPlayer, FileUpload bars, IoT LevelControl fill | P3: small elements |
| margin | Angular sheet | P3: one element per open |
| `transition-all` | IoT `pairing-method-picker.tsx:160` | P3: outside the contract test's scan (negative control 11) |
| infinite loops | all spinners, skeletons, marquees | transform/opacity only: compositor-friendly |

## 17. Platform-native assessment

- **Not forcing web concepts onto native.**
  - SwiftUI uses `Animation` and `AnyTransition` from `KinetixEasing` control points.
  - Compose uses `tween` with `CubicBezierEasing` and `AnimatedVisibility`.
  - Flutter uses implicit `Animated*` widgets with a `Cubic`.
  - The tokens give shared rhythm and curve, not shared APIs. This is the right model.
- **Native overlays lean on system presentation** (Compose Material, SwiftUI `.popover`, Flutter `MenuAnchor`). That is idiomatic and should stay.
- **One web-ism to watch:** the Compose reduced-motion reader treats only an exact `ANIMATOR_DURATION_SCALE == 0` as reduced. That matches Android's "Remove animations" switch, which is the platform's actual setting, so it is idiomatic and not a defect.
- **Not idiomatic:** the SwiftUI overlays' `.transition` without an attached `.animation`. SwiftUI expects the presenter to own the animation, so the system relies on callers. Fine as an API style, but undocumented.

## 18. Documentation findings

| Surface | Verdict | Detail |
|---|---|---|
| `TOKENS.md` (motion tables per family) | **COMPLETE** for web | Trigger/property/duration/easing/reduced-motion tables per component family |
| `/docs/tokens` | PARTIAL | Lists tokens and platform constants; no usage guidance (correct for that page) |
| `/docs/foundations` (MotionTable) | **OUTDATED** | Line 126: native Reduce Motion "has not been audited yet". Since then, `check:native-motion` and three native motion families exist |
| `/docs/accessibility` | **OUTDATED, two false sentences** | Line 42: "transitions are short and `transition-colors` only; nothing animates position or opacity on a loop". The Switch moves position, overlays fade and scale, and Skeleton pulses opacity on a loop. Lines 53–55: "`Spinner` (and the `FileUpload` spinner) slow to one turn per three seconds rather than stopping". **Measured false for React:** no animation runs under reduce |
| `/docs/installation` | **OUTDATED, one false sentence** | "The preset … adds no plugins and no reset." It adds `tailwindcss-animate` and the reduced-motion base layer: the very floor reduced motion depends on |
| `/docs/angular`, `packages/ui-angular/README.md` | COMPLETE | Matches the gates |
| Component docs (marquee) | PARTIAL | Says "pausing on hover", with no keyboard pause and no RTL caveat |
| SwiftUI, Compose and Flutter docs pages | **MISSING** | No motion or Reduce Motion guidance |
| Dedicated "when (not) to animate" guidance | PARTIAL | Exists in `motion-states.mjs` (MOTION_REQUIRED / STATIC_BY_DESIGN / COMPOSITION_OWNED), not in user docs |
| `marketing/CLAIMS.md` | no motion claim | Nothing false. **Not modified** |

## 19. Test-coverage matrix

| Gate | Kind | What motion behaviour it actually asserts |
|---|---|---|
| `check:motion` (`scripts/motion.mjs`) | browser, Storybook | React Accordion, Collapsible, Switch: rendered midpoint, ≥50ms normal, ≤2ms reduced, same end state, both directions |
| `motion-contract.test.ts` | static | Every token wired to a utility; reduced floor shortens (never `animation:none`); every `animate-in/out` string names a token duration; no `duration-N`; no `transition-all`. **`packages/ui` only** |
| `a11y-browser` loop rule | browser | Under reduce, nothing KinetixUI ships loops faster than 3s. A stopped animation passes, so it cannot tell "slowed" from "frozen" |
| `check:angular-browser` | browser | Angular switch thumb and disclosure: midpoint, LTR+RTL, normal+reduced; 3s loop rule |
| `check:angular-overlays` | browser | 8 Angular overlays: opacity midpoint, end-sheet margin, reduced end state, LTR+RTL |
| `check:overlay-visual` | browser pixels | Angular close-button hover transition perceptible / removed under reduce; end sheet side in RTL |
| `check:native-motion` | static bookkeeping | Native family members reference the preference or helper; test files name both directions; every animated file is in a family or `KNOWN_GAPS`. **No values** |
| Native suites | Swift resolver unit tests; Compose Robolectric; Flutter widget tests | Disclosure and switch only (§5). Not run here |
| `iot` `motion-rendered.test.tsx` | jsdom | Class wiring, not rendered motion |
| CI generated-output guard | fixed point | Generated motion constants match the source |
| `check:platform-ticker` + `platform-ticker.test.tsx` | browser + jsdom | **New**, §10A |

**Untested motion:** every React overlay in a browser, every loading indicator's reduced-motion *presentation* (as opposed to the loop rule), all native overlays, Carousel.

## 20. Negative-control results

Each sabotage was applied, the gate run, and the change reverted. No sabotage was committed.

| # | Sabotage | Gate | Result |
|---|---|---|---|
| 00 | Original ticker (baseline) | `check:platform-ticker` | **CAUGHT**: 218 failures (AT gets nothing, 58.8px jump, 757px gap, RTL break, reduced-motion clipping, no pause) |
| 01 | Ticker: drop `flex:none`, restore preset `marquee` keyframe name, expose repeats to AT | `check:platform-ticker` | **CAUGHT**: RTL 2698px jump and 1348px gap; 4× announcements. `flex:none` alone no longer reproduces the jump, because labels are now `nowrap` (both guards are kept) |
| 02 | Ticker: one list per half, drop reduced-motion wrap, drop pause button | `check:platform-ticker` | **CAUGHT**: 463–719px gaps; platforms outside band under reduce; repeats rendered; "no pause control" |
| 03 | Drop Flutter's mark from `PLATFORM_LOGOS` | `tsc` + `platform-ticker.test.tsx` | **CAUGHT**: TS2741 and the test failure |
| 04 | `dialog.tsx` `duration-fast` → `duration-200` | `motion-contract.test.ts` | **CAUGHT** |
| 05 | Remove the reduced floor's `animation-duration` | `motion-contract.test.ts` | **CAUGHT** |
| 06 | Accordion easing token → arbitrary `cubic-bezier(0.9,0,0.1,1)` | `motion-contract.test.ts` | **NOT CAUGHT: gap.** No gate asserts easing provenance on animations; `check:motion` measures duration and midpoint only |
| 07 | Tabs gains `transition-[width,height]` | `motion-contract.test.ts` | **NOT CAUGHT: gap.** Only `transition-all` is banned, not named layout properties |
| 08 | Tabs gains `transition-all` | `motion-contract.test.ts` | **CAUGHT** |
| 09 | Flutter Switch duration → literal `Duration(milliseconds: 100)` (drops reduced motion) | `check:native-motion` | **NOT CAUGHT** by the source guard. It would be caught by `switch_motion_test.dart`'s "no midpoint when reduced" test in `native-flutter.yml`; **not run here** |
| 10 | Hand-edit generated `KinetixMotion.swift` (200→250ms) | generator chain + CI fixed-point guard | **CAUGHT**: regeneration rewrites it to 200ms, so a committed edit is a CI diff |
| 11 | IoT `device-power-control.tsx` gains `transition-all` | `motion-contract.test.ts` | **NOT CAUGHT: gap.** The contract scans `packages/ui` only |
| 12 | Angular `end` sheet slides in from inline-start | `check:angular-overlays` + `check:overlay-visual` | **CAUGHT** by `check:angular-overlays` ("KxSheet close (ltr/rtl): travels through a rendered midpoint: 0 → 0 → 0"). It is caught because the measured `margin-inline-end` stops moving, not by a direction assertion. `check:overlay-visual` stays green: it checks the open sheet's painted side, which this sabotage leaves correct |
| 13 | React reduced floor removed, rebuilt into Storybook | `check:motion` | **CAUGHT**: all 7 reduced passes fail ("still animates for 200ms (limit 2ms)") |

## 21. Findings by severity

**P0: none.**

**P1, open (4):**

1. **Native loops ignore Reduce Motion on all three platforms.** Spinner, Skeleton, Marquee and TypingIndicator, 12 infinite animations in total. It is a family-wide reduced-motion gap, already enumerated in `KNOWN_GAPS`.
2. **React Spinner freezes under reduced motion.** The intended 3s turn is dead code under the floor's `!important`, so React and Angular disagree. The docs claim the opposite.
3. **The registry/CLI install path ships no reduced-motion floor.**
   - `registry/kinetixui/globals.css` has no `prefers-reduced-motion` rule.
   - `registry.json` declares neither `tailwindcss-animate` nor the custom keyframes.
   - So a CLI-installed component's motion is either inert or unguarded.
   - *Inferred from registry contents; not reproduced in a consumer app.*
4. **Native overlay motion has no shared intent.**
   - SwiftUI overlays depend on caller `withAnimation` and ignore Reduce Motion when animated.
   - Flutter custom overlays have no motion.
   - Compose uses system motion, which is fine.

**P1, fixed in this PR (2):**

5. The homepage ticker exposed **no** platforms to assistive technology and had no keyboard/touch pause (WCAG 2.2.2).
6. Under reduced motion at phone width, the ticker hid two platforms outside the band.

**P2 (11):**

7. Ticker loop defects: jump, wide-viewport gap, RTL break. **Fixed in this PR.**
8. `@kinetixui/ui` Marquee RTL blank gap (measured).
9. React Carousel (embla) ignores reduced motion.
10. Hero typing loop has no pause control.
11. No semantic motion names. Documentation of the four proven pairings is the first step.
12. Gate gap: easing provenance unasserted (negative control 06).
13. Gate gap: layout-property transitions unasserted (07).
14. Gate gap: `packages/iot` outside the motion contract (11).
15. False or outdated docs: `/docs/accessibility` ×2, `/docs/installation` preset callout, `/docs/foundations` native note.
16. No React overlay motion is browser-verified.
17. SwiftUI, Compose and Flutter docs pages have no motion or Reduce Motion guidance.

**P3 (9):**

18. ~25 untokenized 150ms hover transitions (React).
19. IoT literal `ease-out` on state changes, plus 1 `transition-all`.
20. Native exact-duplicate literals (1000ms, 0.3s, 100ms, linear).
21. Angular `.kx-btn` hover not suppressed under reduce, and the `angular-browser.mjs:1669` comment "nothing else animates" is inaccurate.
22. Sheet backdrop exits 200ms before the panel (React).
23. Sidebar/Tour animate layout properties.
24. Menubar dead `fade-out-0`.
25. Angular sheet `start`/`top` sides not motion-tested; no rapid open/close test.
26. InputOTP caret: `animate-caret-blink` (1.25s) combined with `duration-slower` probably retimes it to 1s. *Inferred from class order; not measured.*

**Totals: P0 0 · P1 6 (4 open, 2 fixed) · P2 11 (1 fixed) · P3 9.**

## 22. Motion maturity score

| # | Dimension | Rating | Why |
|---|---|---|---|
| 1 | Canonical token model | **SOLID** | One DTCG source, honest descriptions, two kinds; no semantic layer |
| 2 | Generated platform outputs | **MATURE** | All five targets, typed natively, fixed-point guarded |
| 3 | Real component consumption | **PARTIAL** | Web: broad. Native: 9 of 33 animated components; 5 of 10 tokens used |
| 4 | Semantic motion model | **EARLY** | Consistent conventions on web, unnamed; nothing on native |
| 5 | Reduced-motion support | **PARTIAL** | Web: solid floor and per-component handling. React Spinner frozen; native loops and overlays ignore the setting |
| 6 | Accessibility | **SOLID** | No P0; dismissal and focus independent of motion; 2.2.2 gaps on the marketing site (one fixed) |
| 7 | RTL / directionality | **SOLID** | Logical properties and resolved sides on web; catalogue Marquee fails |
| 8 | Cross-platform parity | **PARTIAL** | Disclosure and switch share intent on all 5; overlays and loading do not |
| 9 | Native idiomatic behaviour | **SOLID** | Native APIs, not web emulation |
| 10 | Documentation | **PARTIAL** | `TOKENS.md` strong; 4 false or outdated statements; native docs silent |
| 11 | Regression testing | **PARTIAL** | Strong browser proof for 3 React + ~11 Angular surfaces; 4 of 8 negative controls on the existing static and bookkeeping gates show gaps |
| 12 | Performance discipline | **SOLID** | Loops are transform/opacity; layout animation confined to a few one-off cases |

## 23. Platform maturity comparison

| Platform | Token availability | Token consumption | Reduced motion | Component coverage | Tests | Verdict |
|---|---|---|---|---|---|---|
| React/Web | GENERATED | CONSUMED (all state and overlay motion; ~25 hovers default) | global floor; Spinner frozen; Carousel unguarded | broad | 3 components browser-verified + static contract | **B: solid, targeted gaps** |
| Angular | GENERATED (CSS vars) | CONSUMED (loops literal) | per component; best on the web | 64 components, 8 overlays animated | switch, disclosure, 8 overlays browser-verified | **B+: strongest motion proof in the repo** |
| SwiftUI | GENERATED | PARTIAL (3 families) | 3 families only | 15 animated | resolver unit tests | **C/D: mostly component-local** |
| Compose | GENERATED | PARTIAL (3 families) | 3 families (system overlays OK) | 10 animated | Robolectric for 2 families | **C** |
| Flutter | GENERATED | PARTIAL (3 families) | 3 families | 8 animated, overlays static | best native tests (rendered midpoints, RTL, 2× text) | **C** |

The next engineering investment belongs to **native reduced motion for loops and loading** (all three platforms), not to new tokens.

## 24. Marketing claim boundaries

**"Motion tokens are generated across supported platforms."** **YES.**
- Evidence: §4, the CI fixed-point guard, and negative control 10.
- Caveat: generated is not consumed. Do not pair this claim with "every component uses them".

**"KinetixUI provides a cross-platform motion system."** **QUALIFIED.**
- True: a shared duration and easing vocabulary consumed on all five platforms for disclosure and switch, and broadly on the web.
- Not true for overlays and loading on native.
- Safe wording: "shared motion tokens, consumed natively on every platform for disclosure and selection controls, and throughout the React and Angular libraries."

**"Reduced motion is supported across KinetixUI."** **QUALIFIED, leaning NO.**
- True for React (global floor) and Angular (per component, browser-verified).
- False for 24 animated native components, including every native spinner and skeleton.
- Safe wording: "honours reduced motion across the React and Angular libraries; on SwiftUI, Compose and Flutter, disclosure and switch controls honour it, and looping indicators do not yet."

`marketing/CLAIMS.md` makes none of these claims and was not modified.

## 25. Recommended next action

**Option B: a small corrective slice.** The defects are concentrated and named:
- native loop and loading reduced motion
- one React spinner rule
- one registry omission
- three gate holes
- four doc sentences

None needs a new abstraction. The native fix reuses the existing per-platform helper pattern (`KinetixDisclosureMotion` / `KinetixSwitchMotion`).

A Motion Maturity Wave (Option C) would only be justified once the slice lands and a second cross-platform family (overlays) needs shared semantic names. Reassess then.

## 26. Exact proposed implementation scope (Option B)

**1. Native looping and loading reduced motion** (SwiftUI, Compose, Flutter).
- Add a `KinetixLoopMotion` helper per platform, reading the existing preference reader.
- Under reduce:
  - Spinner slows to one turn per 3s, matching Angular.
  - Skeleton, Marquee and TypingIndicator stop at a legible rest frame.
- Move the four components from `KNOWN_GAPS` to a `loop` family in `native-motion-spec.mjs`.
- Tests per platform must assert the reduced presentation, not just the flag.
- Replace exact-duplicate literals with `slower` and `linear`.

**2. React Spinner.**
- Make the reduced-motion slow spin win over the floor: a scoped `!important` with higher specificity than `*`.
- Extend `check:motion` (or the a11y loop rule) to tell "slowed" from "frozen".
- Measured negative control: today's frozen state must fail.

**3. Registry floor.**
- Ship the reduced-motion base rule in the registry CSS.
- Declare `tailwindcss-animate` and the keyframes the components need.
- Verify in a scratch consumer.

**4. Gate holes.**
- `motion-contract.test.ts`:
  - assert animation easings reference `--easing-*`
  - ban `transition-[width|height|top|left…]` outside an allowlist (Sidebar, Tour)
  - scan `packages/iot`, then fix the one `transition-all` and the `ease-out` literals it finds
- Re-run negative controls 06, 07 and 11 to prove each now fails.

**5. Docs truth.**
- Correct `/docs/accessibility` lines 42 and 53–55, the `/docs/installation` preset callout, and `/docs/foundations` line 126.
- Add a short Reduce Motion paragraph to the SwiftUI, Compose and Flutter docs pages, stating exactly the families that honour it.

**Explicitly out of the slice:**
- semantic tokens
- SwiftUI and Flutter overlay motion (needs a design decision on system vs custom presentation)
- the catalogue Marquee RTL fix (a separate Visual Slice 5 item already in project memory)
- Carousel reduced motion
- the hero typing-loop pause

**Exit criteria:**
- `check:native-motion` reports 0 loop/loading gaps.
- Native CI is green on all three platforms.
- The new contract assertions each have a failing negative control.
- No doc sentence contradicts a gate.

## 27. Verification results

On this branch, at `5db94f0` plus this PR's changes:

| Check | Result |
|---|---|
| `pnpm build` (turbo, 6 packages incl. Angular, web) | pass |
| `pnpm build-storybook` | pass |
| `check:motion` | pass: 7 interactions, midpoint ≥50ms normal, ≤2ms reduced, same end state |
| `check:native-motion` | pass: 9 wired, 24 declared gaps |
| `check:angular-overlays` | pass |
| `check:overlay-visual` | pass |
| `check:a11y-browser` | pass |
| `check:token-contract` | pass (26 rows) |
| `check:rtl` | pass |
| `check:platform-ticker` (new) | pass: 14 views |
| `apps/web` vitest: `platform-ticker.test.tsx`, `homepage-truth.test.tsx`, `motion-contract.test.ts` | pass |
| `apps/web` `tsc --noEmit` | pass |
| Native (Swift, Gradle, Flutter) tests | **not run**: no toolchains in this environment |
| `check:a11y-site` (21 pages × 2 themes × 4 widths × 2 text sizes) | pass: 336 views, no axe findings, no overflow |
| `apps/web` full vitest | 1603/1604; the one failure is the known `iot-page` lazy-mount test that times out under full load and passes alone (31/31) |
| `apps/web` eslint | 0 errors (2 pre-existing warnings in `marketing-claims.test.ts`) |
| `check:motion` after restoring from negative control 13 | pass |

## 28. Limitations

- **Native:** no native code was executed. Native verdicts rest on source and on what the native tests claim to assert.
- **Browser:** Chromium only. Safari's handling of `allow-discrete`, `@starting-style` and the ticker was not checked.
- **Screen readers:** no screen reader was run. Accessibility claims come from Chromium's accessibility tree.
- **Performance:** frame-rate impact was reasoned from the animated properties, not profiled.
- **Registry (P1-3):** inferred from file contents, not reproduced in a consumer project.
- **InputOTP caret retiming (P3-26):** inferred, not measured.
- **Production deployment:** not checked. The ticker change is verified against a local production build (`next start`), not kinetixui.com.
