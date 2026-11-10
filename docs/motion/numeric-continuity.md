# Numeric continuity

An opt-in numeric transition for values that change after an action. Initial render shows the target; it never counts up from zero. Changes retarget from the displayed value, finish on the exact target, and do not queue. Duration is `base`, easing is `linear`: direct value tracking, rather than a spring or a rolling-digit effect.

The accessible value is always the target, never the intermediate frames. There is no automatic live region; applications can announce completed business events separately. Formatting belongs to the caller so locale and precision are explicit. Reduced motion snaps to the same target, including a preference change during interpolation. Non-finite values are shown without interpolation. Hidden web documents settle immediately and all callbacks/listeners are removed on teardown.

These are reusable opt-in primitives, not changes to the existing Metric API. Native implementations use their toolkit's animation machinery. They do not imply that a web preview runs native code or that every motion family has platform parity.

| Platform | API | Preference source |
|---|---|---|
| React | `AnimatedNumber` | `prefers-reduced-motion` (live) |
| Angular | `KxAnimatedNumber` | `prefers-reduced-motion` (live, browser only) |
| SwiftUI | `KinetixAnimatedNumber` | `accessibilityReduceMotion` |
| Compose | `KinetixAnimatedNumber` | existing `rememberReduceMotion()` observer |
| Flutter | `KinetixAnimatedNumber` | `MediaQuery.disableAnimationsOf` |

Use this for local summaries or a user-adjusted preview. Financial balances, countdown announcements, and screen-reader updates need application-specific behavior; this primitive only supplies numeric interpolation.

## Validation and integration boundary

React: 668 tests passed. Angular: 369 tests passed and the package builds; its public API snapshot is regenerated. Flutter: 199 widget tests passed. SwiftUI: 93 XCTest tests passed, including two new resolver/compile checks; this is not a mounted VoiceOver or animation test. Compose: the complete Robolectric suite passed, including target semantics, an intermediate formatted value, retargeting and reduced motion. Android device/emulator and iOS device interaction tests were not run.

The native guard composes `native-motion-additions.mjs` over `native-motion-spec.mjs`. Existing consumer identities and all nine declared gaps are preserved. PR #552 owns the original ledger and token contract; this work changes neither file. Strict numeric membership is checked with negative controls on all three native platforms. These bookkeeping checks supplement, rather than replace, platform behavior tests.

This utility is deliberately outside the curated component catalogue; it does not change component or verification counts. No release version, changeset, publication credential, or protected environment is changed. Branch-specific Vercel settings disable automatic deployment for these two review branches.

## Usage

React (formatting and locale stay with the caller):

```tsx
<AnimatedNumber value={completion} format={(v) => `${Math.round(v)}%`} />
```

Angular (import `KxAnimatedNumber` in the standalone consumer):

```html
<kx-animated-number [value]="completion" [format]="formatPercent" />
```

SwiftUI:

```swift
KinetixAnimatedNumber(value: completion, format: { "\(Int($0))%" })
```

Compose:

```kotlin
KinetixAnimatedNumber(value = completion, format = { "${it.toInt()}%" })
```

Flutter (under the application's MediaQuery):

```dart
KinetixAnimatedNumber(value: completion, format: (v) => '${v.round()}%')
```

## Remaining native ledger entries

These nine pre-existing entries are preserved; this PR does not claim full native motion parity.

| Platform | Component | Recorded scope |
|---|---|---|
| SwiftUI | CircularProgress | Determinate ring sweep; progress feedback family |
| SwiftUI | Dialog | Opacity-only fade is already an accepted reduced form; no demonstrated positional-motion defect |
| SwiftUI | Input | Focus-ring feedback transition |
| SwiftUI | Progress | Determinate bar; progress feedback family |
| SwiftUI | Textarea | Focus-ring feedback transition |
| Compose | CircularProgress | Determinate ring sweep; progress feedback family |
| Compose | Progress | Determinate bar; progress feedback family |
| Compose | Carousel | Programmatic pager scrolling; separate carousel/pager family |
| Flutter | JsonViewer | Data-viewer disclosure; separate follow-up |

The historical local totals above describe the original implementation base. After refresh to main `66f5c26c`, React passes 693 tests and Angular passes 369, with package builds and generated checks rerun. Native source is unchanged by this refresh; the prior 93 SwiftUI, 199 Flutter and 125 Compose results are historical local evidence, not fresh remote CI receipts. Current-head CI and Codex review are required separately before any merge decision.
