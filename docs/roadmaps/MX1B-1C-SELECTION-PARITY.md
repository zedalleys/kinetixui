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
| Toggle | ✓ ✓ ✓ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ |
| ToggleGroup | ✓ ✓ ✓ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ |
| Checkbox | ✓ ✓ ✓ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ |
| RadioGroup | ✓ ✓ ✓ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ | ○ ○ ○ |
| Switch | ✓ ✓ ✓ | ○ (deviation) ○ ○ | ✓ ✓ ○ | ✓ ✓ ○ | ✓ ✓ ○ |

What is there today, by platform (file:line from the tree at 4980c21):

| | Angular | SwiftUI | Compose | Flutter |
| --- | --- | --- | --- | --- |
| Toggle | fast · standard on background and colour (`styles.css:1074`). Has no instant layer. `aria-pressed` | none (fill swap). `.isSelected` trait | none. `toggleable(Role.Checkbox)`, because Compose has no toggle-button role | none. `Semantics(button, toggled)` |
| ToggleGroup | items reuse `.kx-toggle`. Single mode is native radios (`toggles.ts:229-240`) | none. No group semantics | none. No group semantics | none. No group semantics |
| Checkbox | **instant** on all properties (`styles.css:295-298`). Glyph mounted with `@if`. `aria-checked` `mixed` from the `indeterminate()` signal, so it does not have React's old glyph defect | none. Glyph mounted with `if`. **Mixed is not announced** (only `.isSelected`) | none. `triStateToggleable(Role.Checkbox)` | none. `Semantics(checked, mixed)` |
| RadioGroup | **instant** border, and the dot as an inset shadow (`styles.css:698`). Native radios | none. No group semantics | none. `selectableGroup` + `selectable(Role.RadioButton)` | none. **No `Semantics` at all** (`radio_group.dart`) |
| Switch | **base 300ms** on thumb and track (`styles.css:323-343`). This is a recorded deviation. `role="switch"`. **Forced colours: the thumb vanishes** (measured, §4) | `KinetixSwitchMotion`: instant · standard. `nil` when Reduce Motion is on. `accessibilityValue` On/Off, but **no toggle trait** | `animateDpAsState(tween(instant, standard))` for the thumb only (the track colour does not animate). `tween(0)` at animator scale 0. `Role.Switch` | `AnimatedContainer(instant, standard)`. Disabled-animations aware. `Semantics(toggled)` |
| Auto evidence | `display-forms.spec.ts`, `kinetix-angular.spec.ts`, `selection-render.spec.ts` (vitest). None assert a duration token | `SwitchMotionTests.swift`: resolver values only, nothing rendered | `SwitchMotionTest.kt`, `SemanticsTest.kt` (Robolectric) | `switch_motion_test.dart`: rendered midpoint in a headless widget test |
| Runtime evidence | headless Chromium: `check:angular-browser` (reduced-motion midpoint for the Switch thumb), `check:selection-visual` | none | none | none |

## 4. MX1b-2: Angular selection-control parity (handoff)

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
  - Switch's track colour is not animated today; decide whether it joins the thumb on `instant`.
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
