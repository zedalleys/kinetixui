# Motion coverage register — five platforms

**Measured:** 2026-10-21 · **Baseline:** `origin/main` at `72770976` (after #438) · **Status:** register of what
is true, plus the named gap behind each cell. It claims nothing that a file or a gate does not already prove.

This register does **not** replace [`MOTION.md`](../../MOTION.md) (the canonical contract: tiers, easings, roles,
reduced-motion forms, RTL rules, anti-patterns) or
[`tokens/contracts/motion.json`](../../tokens/contracts/motion.json) (the machine-readable role table). Those stay
the source of truth for *what motion should be*. This register records *where it is, on which platform, and what
proves it*. It starts from the MX1b-1c handoff
([`MX1B-1C-SELECTION-PARITY.md`](MX1B-1C-SELECTION-PARITY.md) §3) and MX1d
(`/mnt/project-files/mx1d/`), and restarts nothing.

---

## 0. How to read a cell

Ziad's rule, carried forward from the MX1 briefs: **React is first, not final**, and *source inspection never
counts as runtime*.

**Evidence level** is the repository's own ladder (`docs/VERIFICATION-EVIDENCE-TIERS.md`, decided in
`scripts/evidence-levels.mjs`), read from `verification.json` `componentLevels` — never asserted here:

| Level | What it means |
| --- | --- |
| `not-impl` | the manifest declares no implementation on that platform |
| `source` | the implementation exists; no required CI step compiles it |
| `build` | a required, unconditional CI step compiles it |
| `headless` | build, plus CI-executed tests assert interaction **and** accessibility, at least one headless (`jsdom`, `xctest`, `robolectric`, `flutter_test`) |
| `runtime` | interaction **and** accessibility both observed in a runtime environment. The only runtime environment that exists today is `chromium` |

**Motion status** is narrower than the level, because the level is a whole-component figure:

| | Meaning |
| --- | --- |
| **M** | motion is implemented *and* a gate measures rendered intermediate behaviour (not only that a class or token is present) |
| **m** | motion is implemented; only its wiring, class strings or resolver values are checked |
| **!** | motion is implemented and its **reduced form is an acknowledged open gap**, recorded in `KNOWN_GAPS` in `scripts/native-motion-spec.mjs` |
| **·** | no motion by design on that platform, and that is a recorded decision |
| **○** | no motion, and no decision — an open gap |

`!` and `·` both appear against a `KNOWN_GAPS` entry and are not interchangeable. `·` is for an entry whose note
*settles* the question — SwiftUI's `Dialog.swift`, where "positional movement is what Reduce Motion removes, and a
fade is the accepted replacement, so there is nothing concrete to fix". `!` is for an entry whose note *defers* it
to another slice. Collapsing the second into the first would hide a live reduced-motion gap, which is exactly what
this register exists to prevent.
| **—** | not in the catalogue for that platform |

---

## 1. The five-platform register

Platforms: **R** React · **A** Angular (Preview) · **S** SwiftUI · **C** Compose · **F** Flutter.
First symbol is motion status, second is the component's evidence level.

### 1.1 Selection family — MX1, the most advanced

| Component | R | A | S | C | F |
| --- | --- | --- | --- | --- | --- |
| Switch | **M** headless | **M** runtime | m build | m headless | **M** headless |
| Toggle | **M** headless | **M** runtime | ○ build | ○ build | ○ headless |
| ToggleGroup | **M** headless | **M** runtime | ○ build | ○ build | ○ build |
| Checkbox | **M** headless | **M** runtime | ○ build | ○ headless | ○ headless |
| RadioGroup | **M** headless | **M** runtime | ○ build | ○ build | ○ build |
| SegmentedControl | m build | m runtime | ○ build | ○ build | ○ build |
| Tabs (indicator) | **M** headless | ○ runtime | ○ build | ○ headless | ○ headless |
| TabBar | ○ build | ○ runtime | ○ build | ○ build | ○ build |

**What each M rests on.** React: `check:motion` (rendered midpoint and duration in Chromium), plus
`check:toggle-motion`, `check:checkbox-radio-motion`, `check:switch-motion`, `check:tabs-indicator` (#388, #396,
#400, #404). Angular: `check:angular-selection-motion` — 245 checks, a 32-cell matrix, nine negative controls,
the package driven as a live Angular application in Chromium (#416, merged `822304a`).

**The native ○ cells are the register's largest honest gap**, and three open PRs move the *semantics and
implementation* half of them without closing the motion half. Flutter's Switch is **M** rather than ○ or m because
`switch_motion_test.dart` measures the thumb's inset mid-travel off the render tree; its ceiling is still headless,
not a device:

| PR | Platform | What it adds | Level change | Runtime? |
| --- | --- | --- | --- | --- |
| [#411](https://github.com/zedalleys/kinetixui/pull/411) | SwiftUI | mixed-Checkbox announcement, toggle trait on Switch only, radio grouping, selection motion | **none by design** (the `kx-verify` marker was deliberately omitted) | no |
| [#412](https://github.com/zedalleys/kinetixui/pull/412) | Compose | Switch track colour animates, selection-state motion, ToggleGroup name | toggle, toggle-group, radio-group `build` → `headless` | no |
| [#414](https://github.com/zedalleys/kinetixui/pull/414) | Flutter | RadioGroup `Semantics`, selection-state motion | radio-group `build` → `headless`; Flutter `reducedMotion` **reduced** 10 → 8 components | no |

All three were GO at 39/39 checks on 2026-10-19 (`/mnt/project-files/mx1d/MX1D-MERGE-READINESS.md`). **No native
platform claims `runtime` for any component, and none can**: the repository has no simulator, emulator, device or
`integration_test` job, and `scripts/evidence-levels.mjs` lists only `chromium` as a runtime environment.

### 1.2 Disclosure family — the most even

| Component | R | A | S | C | F |
| --- | --- | --- | --- | --- | --- |
| Accordion | **M** headless | **M** runtime | m build | m build | **M** build |
| Collapsible | **M** headless | **M** runtime | m build | m build | **M** build |

The `disclosure` role is `proven` with consumers on all five platforms — the only role that is.

**SwiftUI and Compose are `m`; Flutter is `M`.** SwiftUI's suite says so in its own header — "no ViewInspector, no
XCUITest host, so **nothing here** renders" — and asserts resolver values (`durationSeconds`, the easing pair,
`nil` under Reduce Motion). Compose's `DisclosureMotionTest.kt` composes through Robolectric and asserts that a
node *exists* after a click, which is state, not a midpoint. Flutter's `disclosure_motion_test.dart` pumps to
100 ms — halfway through 200 ms — and measures the `AnimatedSize` height off the render tree, asserting it is
strictly between the two ends. That is a rendered intermediate measurement, which is what **M** means here.

### 1.3 Overlay and spatial family — MX3, barely started

| Component | R | A | S | C | F |
| --- | --- | --- | --- | --- | --- |
| Dialog | m headless | m runtime | · build (fade only, recorded in `KNOWN_GAPS`) | ○ build | ○ build |
| AlertDialog | m headless | m runtime | ○ build | ○ build | ○ build |
| Sheet | m headless | m runtime | m build (slide helper) | ○ build | ○ build |
| Drawer | ○ headless (Vaul) | m runtime | ○ build | ○ build | ○ build |
| Popover · Tooltip · HoverCard | m headless | m runtime | ○ build | ○ build | ○ build |
| Menu family · DropdownMenu · ContextMenu | m headless | m runtime | ○ build | ○ build | ○ build |
| Menubar | ○ headless (**G6**: no exit animation) | m runtime | ○ build | ○ build | ○ build |
| NavigationMenu | m build | m runtime | — | — | — |
| Sidebar | m headless | m runtime | m build | ○ build | ○ build |

The `overlay` role is still **`observed`** with two consumers (react, angular); `spatial` is `observed` with one
(react). Neither has a gate that measures rendered overlay timing — `overlay-visual` and `menu-visual` check
rendered *states*, not motion. **React's Drawer takes its motion from Vaul** at a fixed 500 ms curve with no
Kinetix token: that is an un-recorded third-party curve inside a `proven`-looking family.

**The native Drawer cells are a gap the gate cannot see.** `Drawer.swift`, `Drawer.kt` and `drawer.dart` all exist
and all carry `build` in `componentLevels`, and **none of the three contains a single animation call**. Because
`check:native-motion` only flags a file that *animates* and belongs to no family, a native overlay that animates
nothing passes it silently and never reaches `KNOWN_GAPS`. The same holds for AlertDialog, Popover, Tooltip,
HoverCard and the menu family on all three native platforms. That is the largest blind spot in the instrument, not
just in the coverage.

### 1.4 Continuous input and progress — MX2, not started

The four `!` cells below are the ones this register nearly hid. `Progress.swift:34` is
`.animation(.default, value: value)`, `CircularProgress.swift:45` is `.animation(.easeOut(duration: 0.3), value:
fraction)`, and both Compose files drive their fraction through `animateFloatAsState`. All four animate, none
reaches the reader's reduced-motion setting, and all four sit in `KNOWN_GAPS` under a note that **defers** the
progress-feedback family to its own slice rather than settling it. They are open reduced-motion gaps, not static
components.

| Component | R | A | S | C | F |
| --- | --- | --- | --- | --- | --- |
| Slider (incl. range) | ○ headless | ○ runtime | ○ build | ○ build | ○ build |
| Progress | ○ build (**G7**: physical `translateX`, RTL unmeasured) | ○ headless | **!** build | **!** build | ○ build |
| CircularProgress | ○ build | ○ headless (slows to 3 s instead of stopping) | **!** build | **!** build | ○ build |

### 1.5 Loop and feedback — MX4, partly gated

| Component | R | A | S | C | F |
| --- | --- | --- | --- | --- | --- |
| Spinner | **M** build (`check:loop-motion`) | ○ headless (slows, does not stop; no loop gate) | m build (strict family) | m build (strict) | **M** build (strict) |
| Skeleton | **M** build | m headless (stops) | m build (strict) | m build (strict) | **M** build (strict) |
| Marquee | m build (no browser gate) | m headless (stops) | m build (strict) | m build (strict) | **M** build (strict) |
| MessageBubble typing | m build (no browser gate) | — | m build | m build | **M** build |
| InputOTP caret | m build (no browser gate) | ○ runtime | ○ build | ○ build | ○ build |
| Carousel | ○ build | m runtime | ○ build | **!** build (`KNOWN_GAPS`: pager family) | ○ build |
| Sonner · Alert · Banner | ○ build/`sonner` build | m runtime | ○ build | ○ build | ○ build |
| Chart | ○ build (**G3**: Recharts ignores reduced motion) | — | · build (renders statically) | · build | · build |
| JsonViewer | m headless (an untokenised `transition-transform` on the chevron, part of the **G1** debt register; no motion gate) | — | ○ build | ○ build | **!** build (`KNOWN_GAPS`: disclosure-shaped, own slice) |

**The contract has no role for feedback entry.** A toast appearing is motion with a trigger and a purpose, and
`tokens/contracts/motion.json` has nothing to put it under. Either add a role or record each as static by design;
silence is the one option the project's own rules reject.

---

## 2. Nine-dimension assessment, per platform

Ziad's nine dimensions, assessed once per platform rather than once per component, because the mechanism is
per-platform and the component list above says where it is wired.

| Dimension | React | Angular | SwiftUI | Compose | Flutter |
| --- | --- | --- | --- | --- | --- |
| **Interaction purpose and feedback** | stated per component in MOTION.md §"Specs" for Toggle, Checkbox/Radio, Switch; absent for overlays, slider, feedback | same three, measured | implicit in the helpers; no written spec | same | same |
| **Duration and easing tokens** | generated CSS vars + Tailwind preset; `motion-contract.test.ts` checks class strings | reads the CSS variables; `check:angular-selection-motion` reads *computed* values in Chromium | `KinetixMotion.swift` from `tokens/dist/ios` | `KinetixMotion.kt` from `tokens/dist/android` | `kinetix_motion.dart`; `flutter-tokens` test checks values |
| **State transitions** | measured for selection and disclosure | measured for selection, disclosure, overlay duration | resolver values only | one `animateDpAsState`/`animateColorAsState` per family | rendered midpoint in headless widget tests |
| **Motion cancellation** | contract requires retarget-from-current, no queueing (MOTION.md §Principles 4). `check:switch-motion` tests mid-travel reversal and rapid input; nothing tests it for overlays | rapid input and mid-travel reversal in the 32-cell matrix | **untested** | **untested** | **untested** |
| **Reduced motion** | preset 0.01 ms floor (never `animation: none`) + explicit loop stops. **Registry installs have no preset**: each delivered loop carries its own reduced form (`check:registry-motion`), plain transitions do not shorten | per-component media blocks. **No global floor (G5)** | `@Environment(\.accessibilityReduceMotion)` via helpers | animator duration scale via `rememberReduceMotion()`, read on composition | `MediaQuery.disableAnimationsOf` via helpers |
| **RTL / direction awareness** | logical properties; Switch thumb on `inset-inline-start`; Tabs indicator geometry measured under RTL. **Progress still physical (G7)** | RTL legs in the matrix; the radio-dot RTL defect was found and fixed in #416 | **no direction testing at all** (`rtl` evidence 0/90) | `rtl` evidence 1/90 | `rtl` evidence 58/90 — layout, not motion |
| **Platform-native conventions** | Radix `data-state` | native elements + directives, `aria-pressed`/`aria-checked` | correctly **omits** `.isToggle` on Checkbox (Apple reads button+toggle as a switch button) | `toggleable(Role.Checkbox)` because Compose has no toggle-button role | `Semantics(button, toggled)` |
| **Automated verification** | `check:motion`, `:motion-tokens`, `:loop-motion`, `:toggle-motion`, `:checkbox-radio-motion`, `:switch-motion`, `:tabs-indicator`, `:registry-motion` | `check:angular-selection-motion`, `check:angular-browser` motion steps | `check:native-motion` wiring + `SwitchMotionTests.swift` | `check:native-motion` + `SwitchMotionTest.kt` (Robolectric) | `check:native-motion` + `switch_motion_test.dart` |
| **Simulator / real-device gaps** | n/a (Chromium is the real engine) | n/a | **total**: no simulator job exists | **total**: no emulator job | **total**: no device/integration_test job |

### The measurement finding worth acting on

`verification.json` `componentLevelTotals`:

| | not-impl | source | build | headless | runtime |
| --- | --- | --- | --- | --- | --- |
| React | 0 | 0 | 61 | 48 | **0** |
| Angular | 29 | 0 | 0 | 20 | **60** |
| SwiftUI | 19 | 0 | 90 | 0 | 0 |
| Compose | 19 | 0 | 86 | 4 | 0 |
| Flutter | 19 | 0 | 85 | 5 | 0 |

**React has zero `runtime` cells and Angular has sixty.** React is the reference implementation and the ladder
says it is less verified than the Preview platform. This is not a React regression: the ladder needs interaction
*and* accessibility both observed in a runtime environment, and React's interaction tests live in jsdom while its
accessibility and motion gates run in Chromium. Angular's interaction evidence comes from `angular-browser.mjs`,
so both halves are runtime. The figure is correct under the rule and misleading to a reader. **It belongs on the
owner's desk as a decision, not as a silent artefact** — see the master roadmap's decision register.

---

## 3. Known gaps, carried forward with their original numbers

G-numbers are from the Phase M0 audit (`/mnt/project-files/motion-audit/`) and must not be renumbered.

| # | Gap | State on `72770976` |
| --- | --- | --- |
| G1 | No default transition duration; ~24 components run Tailwind's untokenised 150 ms | **frozen** as the `UNTOKENISED_TRANSITIONS` debt register in `motion-contract.test.ts` (two-way ratchet); retired per component in MX1b slices |
| G2 | No stagger/delay tokens | **settled** (#393): stagger stays untokenised while it has one consumer |
| G3 | Library `Chart` (Recharts) ignores reduced motion | **open**, unassigned. A chart draw is a finite entry, not a `loop`: it needs a role first |
| G4 | `/docs/tokens` claimed `duration.instant` and `easing.enter/exit` unconsumed | **closed** (#393) |
| G5 | Angular has no global reduced-motion floor | **open**. Visible as Spinner and indeterminate CircularProgress slowing to 3 s instead of stopping |
| G6 | Menubar has no exit animation | **open** |
| G7 | Progress fills with a physical `translateX`; RTL unmeasured | **open**. Measure before changing |
| G9 | No per-component motion docs | **partly closed**: MOTION.md now carries specs for Toggle, Checkbox/Radio, Switch. Overlays, slider and feedback have none |
| G10 | Native ledger gaps | **open and explicit**: `KNOWN_GAPS` in `scripts/native-motion-spec.mjs` lists 5 SwiftUI, 3 Compose, 1 Flutter file |
| G11 | No layout-transition policy | **open** |
| G12 | Gesture tokens unwired | **open**. React Drawer's Vaul curve is the live instance |

---

## 4. What this register does not claim

- **No simulator, emulator or device evidence exists on any platform but the web**, and so no native cell reaches
  `runtime`. That is the claim; "no rendered native evidence at all" would be too strong. **Flutter is the
  exception worth naming:** `switch_motion_test.dart` pumps to 50 ms and measures the thumb's inset off the render
  tree, `disclosure_motion_test.dart` pumps to 100 ms and measures the `AnimatedSize` height, and
  `loop_motion_test.dart` measures the spinner's turns, the skeleton's opacity, a typing dot's offset and the
  marquee's translation — each asserting a value strictly between the two ends, each with its reduced form proving
  no frame is scheduled. Those are rendered intermediate measurements in a headless renderer, which is **M** under
  this register's own definition and the reason Flutter carries seven of them. SwiftUI's suite states in its own
  header that nothing it contains renders, and Compose's disclosure test asserts that a node exists after a click,
  which is state rather than a midpoint.
- `check:native-motion` proves that an animating file references the platform setting and that tests cover both
  directions. It does not render, and a file in `KNOWN_GAPS` is excused from even that.
- Angular's `runtime` cells are motion and accessibility evidence. They are **not** a graduation: 27 catalogue
  entries are still planned and Angular stays **Preview**.
- A `headless` level does not mean the component's *motion* is verified; it is a whole-component figure. The
  motion status column is the narrower claim.
