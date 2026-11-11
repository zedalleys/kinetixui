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

The M4 refresh passed 719 React, 372 Angular, 93 SwiftUI, 126 Compose and 199 Flutter tests. React and Angular numeric fixtures exercised Chromium. The native runtime probes exercised SwiftUI and Flutter on the iPhone simulator and Compose on Android API 37. Compose also verifies that restoring motion cannot replay an interrupted value. Screen-reader speech and physical-device frame pacing remain outside these checks.

### Contract decision

Numeric continuity is an opt-in display utility for arbitrary numbers, including negative and unbounded values. It exposes exact target text to assistive technology and settles at that value when motion is reduced. Determinate progress communicates completion within a known range and carries progress semantics. Sharing timing tokens does not make these the same role.

`native-motion-additions.mjs` adds strict preference and direction evidence for the utility on all three native platforms. The #552 catalogue ledger, role mappings and registered consumer identities retain their existing contract. The additive guard checks that numeric entries cannot replace a catalogue family or declare a catalogue role. These checks supplement platform behavior tests.

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

The acceptance record uses GitHub checks and Codex review for the current commit.
