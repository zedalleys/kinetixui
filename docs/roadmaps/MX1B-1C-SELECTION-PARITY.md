# MX1b-1c: selection-control motion, React closure and parity handoff

Status: React closed by MX1b-1c (2026-10-18, base `main` 4980c21). Angular (MX1b-2) and native (MX1d) are
handoffs only: nothing in this document is implemented by MX1b-1c unless it says React.

Evidence words used below, weakest first:
- **source**: read from the code
- **headless**: unit, widget or Robolectric tests with nothing on screen
- **browser**: Chromium rendering a real build
- **simulator/emulator** and **device**: none exist yet for these controls

Native compilation is not runtime evidence.

## 1. The contract

| Role | Tier | Used by | Why |
| --- | --- | --- | --- |
| `selection-control` | `instant` 100ms · `standard` | Switch: thumb travel, track colour, halo | The thumb is a physical control; it should land with the finger. |
| `selection-state` | `fast` 200ms · `standard` | Toggle, ToggleGroup, Checkbox, RadioGroup: fill, border, text colour, glyph fade-in | A colour settling reads better slightly slower; it is not a moving part. |
| `press-feedback` | `instant` 100ms · `standard` | the hover/press state layer or halo on all five | Feedback to a pointer must be immediate. |

The two selection roles are not to be normalised to one duration. Semantics (`aria-checked`,
`aria-pressed`) never wait for paint on any platform. Reduced motion uses the `shorten` form: the same end
state, with no interpolation.

## 2. React, before and after MX1b-1c (browser evidence)

| Component | Role · property | Duration · easing (measured in Chromium) | Trigger | Reduced motion | Evidence |
| --- | --- | --- | --- | --- | --- |
| Toggle, ToggleGroup | selection-state: background, text, border colour | 200ms · standard | `data-state` / `aria-pressed` | preset floor + `motion-reduce:transition-none` | `check:motion`, `check:toggle-motion`, `toggle-motion.test.tsx` (#396) |
| | press-feedback: inset box-shadow layer | 100ms · standard | hover / `:active` | same | same |
| Checkbox | selection-state: fill, border, glyph colour; glyph opacity in | 200ms · standard; glyph out at once | Radix `data-state` | same | `check:checkbox-radio-motion`, `checkbox-radio-motion.test.tsx` (#400) |
| RadioGroup | selection-state: border, dot colour; dot opacity in and out | 200ms · standard | Radix `data-state` | same | same |
| Checkbox, Radio | press-feedback: 5px halo | 100ms · standard | hover / `:active` | same | same |
| Switch | selection-control: thumb `inset-inline-start`, track colour, halo | 100ms · standard (unchanged by MX1b-1c) | Radix `data-state` | **before:** preset floor only, so a registry install still slid for 150ms. **After:** `motion-reduce:transition-none` on track and thumb | `check:motion`, `check:selection-visual`, **new** `check:switch-motion`, **new** `switch-motion.test.tsx` |

Switch defects found and fixed in MX1b-1c, each reproduced before the fix:

1. **Registry reduced motion.** A registry install gets no preset, so it also gets no reduced-motion floor.
   Without the component's own reduced form, Switch's thumb ran a 150ms transition under
   `prefers-reduced-motion: reduce`. This was reproduced with a core-only Tailwind build in Chromium. With
   the fix, nothing runs. Toggle, Checkbox and Radio already carried this guard.
2. **Forced colours: the thumb vanished.** Forced colours repaint both the track and the thumb as `Canvas`,
   which is `rgb(255, 255, 255)` on both in the light run, and strip the shadow. On and off then looked
   identical. The thumb is now `CanvasText`, or `GrayText` when disabled. The new gate failed 8 forced-colour
   checks on the pre-fix build and passes them after the fix.

## 3. Five-platform matrix (Impl / Auto / Runtime)

The milestones are those in MX1B-1-PLAN §6:
- **Impl**: the component uses its role's pairing and is a contract consumer.
- **Auto**: a gate that fails on a negative control.
- **Runtime**: rendered behaviour was observed.

| Component | React | Angular (Preview) | SwiftUI | Compose | Flutter |
| --- | --- | --- | --- | --- | --- |
| Toggle | ✓ ✓ ✓ | ✓ ✓ ✓ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ |
| ToggleGroup | ✓ ✓ ✓ | ✓ ✓ ✓ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ |
| Checkbox | ✓ ✓ ✓ | ✓ ✓ ✓ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ |
| RadioGroup | ✓ ✓ ✓ | ✓ ✓ ✓ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ |
| Switch | ✓ ✓ ✓ | ✓ ✓ ✓ | ✓ ✓ ○ | ○ (thumb only) ✓ ○ | ✓ ✓ ○ |

Angular's five cells moved in MX1b-2 (PR for this slice): each component now uses its role's pairing and is
a contract consumer (Impl), `scripts/angular-selection-motion.mjs` fails on nine negative controls (Auto),
and that gate drives the package as a live Angular application in Chromium rather than in jsdom (Runtime).
Angular stays Preview: these are motion and accessibility cells, not a graduation.

Compose's Switch is not ticked for Impl: `selection-control` covers the thumb and the track colour, and
`Switch.kt` animates only `thumbOffset` while the track colour is applied directly. Its Auto tick is for the
thumb, which `SwitchMotionTest.kt` checks. `KinetixSwitchMotion.kt` itself does use the pairing and stays a
contract consumer, so the role's maturity is unchanged; the gap is the component not routing the track through it.

What is there today, by platform (file:line from the tree at 4980c21):

| | Angular | SwiftUI | Compose | Flutter |
| --- | --- | --- | --- | --- |
| Toggle | fast · standard on background and colour, with an `instant` inset press layer (MX1b-2). `aria-pressed` | none (fill swap). `.isSelected` trait | none. `toggleable(Role.Checkbox)`, because Compose has no toggle-button role | none. `Semantics(button, toggled)` |
| ToggleGroup | items reuse `.kx-toggle`, press layer included. Single mode is native radios | none. No group semantics | none. No group semantics | none. No group semantics |
| Checkbox | fast on fill, edge and glyph colour, halo on `instant`; both glyphs rendered and the state shows one, fading in on fast (MX1b-2). `aria-checked` `mixed`, and activating a mixed box now resolves it to checked | none. Glyph mounted with `if`. **Mixed is not announced** (only `.isSelected`) | none. `triStateToggleable(Role.Checkbox)` | none. `Semantics(checked, mixed)` |
| RadioGroup | fast border, halo on `instant`, and the dot on its own layer fading on fast (MX1b-2). Native radios | none. No group semantics | none. `selectableGroup` + `selectable(Role.RadioButton)` | none. **No `Semantics` at all** (`radio_group.dart`) |
| Switch | instant · standard on thumb and track (MX1b-2); the deviation is removed. `role="switch"`. Forced colours: the thumb is `CanvasText`, `GrayText` when disabled | `KinetixSwitchMotion`: instant · standard. `nil` when Reduce Motion is on. `accessibilityValue` On/Off, but **no toggle trait** | `animateDpAsState(tween(instant, standard))` for the thumb only (the track colour does not animate). `tween(0)` at animator scale 0. `Role.Switch` | `AnimatedContainer(instant, standard)`. Disabled-animations aware. `Semantics(toggled)` |
| Auto evidence | `check:angular-selection-motion` (245 checks, nine negative controls), plus `selection-motion.spec.ts` for the structure its selectors rely on | `SwitchMotionTests.swift`: resolver values only, nothing rendered | `SwitchMotionTest.kt`, `SemanticsTest.kt` (Robolectric) | `switch_motion_test.dart`: rendered midpoint in a headless widget test |
| Runtime evidence | Chromium, the package as a live Angular application: `check:angular-selection-motion` (timing, travel, pointer, keyboard, forced colours, rapid input, 32-cell matrix), `check:angular-browser`, `check:selection-visual` | none | none | none |

## 4. MX1b-2: Angular selection-control parity (handoff)

**Done in MX1b-2.** What was delivered, and the measurements behind it, are below; the handoff that follows is
kept as written so the before state and the plan stay readable.

| What | Before (measured on main at 984792b) | After |
| --- | --- | --- |
| Switch thumb and track | `background-color` 300ms, `inset-inline-start` 300ms | both 100ms · standard, and the `deviations` entry is gone |
| Checkbox | fill, edge and halo all 100ms; glyph mounted with `@if` | fill, edge and glyph colour 200ms, halo 100ms, glyph fading in on 200ms from its own element and leaving at once |
| Radio | border 100ms, dot inside the input's `box-shadow` | border 200ms, halo 100ms, dot on its own layer fading on 200ms |
| Toggle, ToggleGroup | colour 200ms, no press layer; hover was a `--muted` background step | colour 200ms, an inset 8% / 14% press layer on 100ms |
| Forced colours | every switch had track `rgb(255,255,255)` and thumb `rgb(255,255,255)` — no thumb at all | thumb `CanvasText` (`rgb(0,0,0)`), `GrayText` (`rgb(96,0,0)`) when disabled, both read back from the system; the radio dot likewise |
| Mixed checkbox | activating a mixed box left `aria-checked="mixed"` for ever | it resolves to checked, reports touched, and goes back to mixed when the caller writes the input again |

**Fixed after the Codex review of the first push.** Five findings, all real, all on the parts this slice
changed; each has a check of its own now, listed in the negative controls below:

| Finding | What was wrong | Fix |
| --- | --- | --- |
| Radio dot in RTL | the dot was centred with `inset-inline-start: 50%` and a physical `translate: -50%`, so on an RTL page it was pulled 8px out of its control | `inset: 0` with auto margins, which has no direction |
| Disabled radio label | wrapping the input in `.kx-radio__control` broke `.kx-radio__input:disabled + .kx-radio__label`, so a disabled row's label kept full opacity and a pointer cursor | the rule is keyed on the wrapper that holds a disabled input |
| Disabled single-select group item | there `.kx-toggle` is a `<label>`, which never matches `:disabled`, so the new hover and press layers answered a pointer over a disabled item | `pointer-events: none`, the pair `.kx-toggle:disabled` already carries |
| Mixed checkbox already checked | that branch resolves without a value change and so never called the CVA's `onTouched`: a form showing errors on touch did not hear the interaction | a `markTouched()` hook on the base, called on that branch |
| The gate's focus check | `boxShadow !== "none"` is vacuous for the Checkbox and the Toggle, which now rest on a transparent shadow, and the browser's own default outline would satisfy "something is visible" | the focused shadow is compared against `--shadow-focus` read from a probe in the same page, and read after the transition lands |

The last of those was a gate defect, not a component one: the Switch-focus negative control below passed
because only the Switch rests on no shadow. The strengthened check also found that reading the ring in the
same frame as the focus returns the transition's first frame, which is why it now settles first.

**Negative controls** (each a real defect applied to the tree, the gate run, then restored; `git status` clean
after every one). Nothing but the fourteen mutations was changed:

| Mutation | Caught by `check:angular-selection-motion` | Failing checks |
| --- | --- | --- |
| Switch thumb retimed to 200ms | timing | 4 (declared tiers and the running thumb transition, both themes) |
| Toggle retimed to 100ms | timing | 6 (Toggle and ToggleGroup declared tiers, the running colour transition) |
| Reduced-motion block's switch entries removed | timing | 8 (reduced form, "runs no transition", and the thumb mid-travel at 0.456 instead of at the end) |
| Thumb moved on `left` instead of `inset-inline-start` | travel | 4 (the RTL subtree jumps instead of travelling, and no longer moves leftward) |
| Switch focus ring removed | keyboard | 2 |
| `aria-checked` frozen at `false` | timing | 10 |
| Radio arrow keys swallowed by `preventDefault()` | keyboard | 6 (ArrowDown, and ArrowRight in both page directions) |
| Checkbox tick and dash swapped | timing | 4 (mixed shows the tick; the swap after activation is wrong) |
| Disabled `GrayText` thumb removed | forced | 4 (a disabled thumb reads as enabled) |
| Radio dot centred by `inset-inline-start: 50%` + `translate: -50%` again | travel | 4 (RTL only: off by 8px and outside its control, both themes) |
| Disabled radio label keyed on the input again | pointer | 2 (opacity 1 against the enabled row's 1, cursor `pointer`) |
| `pointer-events: none` dropped from the disabled group item | pointer | 2 (the 8% layer on hover and 14% on press over a disabled item) |
| `markTouched()` dropped from the mixed-and-checked branch | `packages/ui-angular/src/lib/selection-motion.spec.ts` (jsdom) | 1 |
| Checkbox focus ring removed | keyboard | 2 (the browser's default 1px outline is not `--shadow-focus`) |

One of the fourteen is a jsdom test rather than a browser check, and is marked as such: `onTouched` is a
callback, not something a page paints, so there is nothing in a browser to measure.

What the gate does **not** catch, recorded so it is not assumed: `check:angular-browser`'s axe pass sees none
of these — a frozen `aria-checked`, a missing focus ring and a retimed transition are all invisible to it,
exactly as MX1b-1c found on the React side.

**Not changed, on purpose:** `scripts/gen-verification.mjs` and `scripts/evidence-levels.mjs`. Angular's levels
in `verification.json` are untouched by this slice, so the new gate's evidence is cited in this document
rather than published through the generator; registering it there is a separate decision.


**Source**
- `packages/ui-angular/src/lib/toggles.ts`: KxToggle, KxToggleGroup, KxCheckbox, KxSwitch
- `packages/ui-angular/src/lib/forms.ts`: RadioGroup and `kx-radio`
- `packages/ui-angular/src/styles.css`:
  - `.kx-checkbox` 282-310, `.kx-switch` 312-350, `.kx-radio` 679-714, `.kx-toggle` 1060-1093
  - reduced-motion block 1147-1165, forced-colours block 3534+

**Changes required**
1. **Switch.** Move the thumb and the track colour from `base` to `instant`, with `standard` easing, and keep
   the halo on `instant`. Then remove the `deviations` entry for Angular from `selection-control` in
   `tokens/contracts/motion.json` and add Angular as a consumer.
2. **Checkbox.** Move background, border and glyph colour to `fast`, keep the halo on `instant`, and use
   per-property tiers the way React does. Replace the `@if` mount with an always-present glyph whose opacity
   fades in on `fast` and leaves at once. Pick the glyph from the same state that drives `aria-checked`.
3. **Radio.** Move the border to `fast` and keep the halo on `instant`. The dot is an inset `box-shadow` that
   shares a property with the halo. Either split the dot onto its own element so it can fade on `fast`, or
   record why it stays on `instant`.
4. **Toggle and ToggleGroup.** Selection is already on `fast`. Add an `instant` press layer that is kept off
   the selection properties, as React's inset `box-shadow` is.
5. **Forced colours: the thumb vanishes, as React's did.**
   - The `.kx-switch__thumb` fill is `--static-white`, and the forced-colours block (3534+) gives
     `.kx-switch` only a focus outline.
   - Measured in Chromium during MX1b-1c on the `check:selection-visual` Angular harness, under
     `forced-colors: active`: every switch, on or off, had track `rgb(255, 255, 255)` and thumb
     `rgb(255, 255, 255)`.
   - Fix: draw the thumb in `CanvasText` (`GrayText` when disabled), and add the same forced-colours check
     that `check:switch-motion` makes.
6. **Reduced motion.** Keep the per-component media block, which already lists `.kx-switch`, the thumb,
   `.kx-checkbox`, `.kx-radio__input` and `.kx-toggle`.

**Accessibility to keep**
- `role="switch"` and `aria-checked`.
- Checkbox `aria-checked="mixed"`.
- Native radio arrow keys, which follow `dir`.
- The focus outline in `Highlight` under forced colours.

**Tests to add**
- Extend `check:angular-browser` to read the computed `transition-*` per property, as the React gates do:
  - Switch at 100ms.
  - Checkbox, Radio and Toggle at 200ms for colour and 100ms for the layer.
- Add the same mid-travel, rapid-input, forced-colour and 320–1280px × 100/200% matrix checks as
  `check:switch-motion` and `check:checkbox-radio-motion`.
- Add an Angular adapter if it is cheaper than a copy.
- Each check needs a negative control (Switch on `base`, Checkbox on `instant`).

**Runtime environment:** headless Chromium in `a11y-browser.yml`, which already builds the Angular harness.

**Dependencies:** none new. Angular stays Preview.

**Acceptance criteria**
- Every Angular selection control is a `check:motion-tokens` consumer, with no deviations left.
- The browser gates measure 100ms and 200ms on the right properties, and fail on their negative controls.
- Forced colours keep the on and off states distinguishable.
- Reduced motion lands on the same end state.

## 5. MX1d: native selection-control parity (handoffs, one platform per slice)

Semantics come first on every native platform. Each one has an accessibility gap that matters more than
motion.

### SwiftUI
- **Source:** `Toggle.swift`, `ToggleGroup.swift`, `Checkbox.swift`, `RadioGroup.swift`, `Switch.swift`,
  `KinetixSwitchMotion.swift`.
- **APIs:**
  - `.animation(_:value:)` with `Animation.timingCurve(…standard…, duration: KinetixDuration.fast)` for
    selection-state.
  - The existing `KinetixSwitchMotion` (instant) for Switch.
  - Reduce Motion is read through `@Environment(\.accessibilityReduceMotion)`, returning `nil` animation, as
    Switch does.
- **Semantics to fix first:**
  - Checkbox must announce mixed through `accessibilityValue`.
  - Switch needs a toggle trait: `.isToggle` where the OS has it, otherwise the system `Toggle`.
  - RadioGroup needs grouping and selected-state.
- **Tests:** resolver tests like `SwitchMotionTests.swift` for each new helper, plus an XCUITest or
  snapshot run.
- **Runtime needed:** iOS Simulator in CI or on a device. `swift test` on macOS renders nothing.
- **Acceptance:**
  - Toggle, Checkbox and Radio are `selection-state` consumers.
  - The simulator run shows the duration change and Reduce Motion.
  - VoiceOver reads mixed and on/off correctly.

### Jetpack Compose
- **Source:** `Toggle.kt`, `ToggleGroup.kt`, `Checkbox.kt`, `RadioGroup.kt`, `Switch.kt`,
  `KinetixSwitchMotion.kt`.
- **APIs:**
  - `animateColorAsState(tween(KinetixDuration.fast, easing = KinetixEasing.standard))` for selection
    colour.
  - `rememberReduceMotion()` (animator duration scale) to pass `tween(0)`.
  - Switch's track colour is not animated today. It must join the thumb on `instant` (`animateColorAsState`
    with the selection-control spec) before Compose Switch gets its Impl tick.
- **Semantics:**
  - Toggle uses `Role.Checkbox` because Compose has no toggle-button role. Keep that and document it.
  - ToggleGroup needs group semantics.
- **RTL:** Switch's thumb offset must follow `LocalLayoutDirection`. Robolectric has not shown this.
- **Tests:** Robolectric unit tests for the specs (as `SwitchMotionTest.kt` does), plus instrumented tests on
  an emulator.
- **Runtime needed:** an Android emulator job. Today CI only runs `testDebugUnitTest` on the JVM.
- **Acceptance:**
  - The roles are adopted and are contract consumers.
  - The emulator run shows the duration, the 0 scale, and RTL thumb direction.

### Flutter
- **Source:** `toggle.dart`, `toggle_group.dart`, `checkbox.dart`, `radio_group.dart`, `switch.dart`,
  `kinetix_switch_motion.dart`.
- **APIs:**
  - `AnimatedContainer` or `TweenAnimationBuilder` with `KinetixDuration.fast` and `KinetixEasing.standard`.
  - `MediaQuery.disableAnimationsOf(context)` for the reduced form, as Switch does.
  - `Directionality` for the Switch thumb's alignment.
- **Semantics to fix first:** RadioGroup has no `Semantics` at all. It needs `checked`, `inMutuallyExclusiveGroup`
  and a label.
- **Tests:**
  - Widget tests (headless) that pump frames and read the midpoint, as `switch_motion_test.dart` does.
  - An `integration_test` on a device or emulator for runtime evidence.
- **Runtime needed:** `flutter test integration_test` on an emulator or simulator.
- **Acceptance:**
  - Radio semantics are present.
  - The roles are adopted.
  - The widget and integration tests both show the duration and the reduced form.

## 6. What MX1b-1c does not claim

- `selection-state` and `press-feedback` stay **observed**. The repository's rule for proven is consumers on
  two platforms plus a named check, and only React consumes them today. `selection-control` was already
  proven through the native Switch helpers.
- No Angular or native file is changed. The Angular forced-colours gap was measured in Chromium but is left
  for MX1b-2.
- No native cell gains a Runtime tick: there is no simulator, emulator or device run in this repository.
