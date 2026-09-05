# KinetixUI (SwiftUI)

SwiftUI port of KinetixUI — the iOS counterpart to
[`packages/ui-compose`](../ui-compose) (Jetpack Compose). Built in
batches the same way the Compose library was. **10 components so far:**
`KinetixButton`, `KinetixBadge`, `KinetixTag`, `KinetixLabel`,
`KinetixSeparator`, `KinetixSkeleton`, `KinetixSpinner`,
`KinetixProgress`, `KinetixCard` (+ `Header` / `Title` / `Description` /
`Content` / `Footer`), `KinetixAspectRatio`.

- `Sources/KinetixUI/Theme.swift` — `KinetixColors` (the semantic colour
  set), `@Environment(\.kinetixColors)`, and the `KinetixTheme { … }`
  wrapper that picks light/dark off the system `colorScheme`. The SwiftUI
  analogue of Compose's `KinetixColorScheme` / `KinetixTheme`.
- One file per component, each mirroring its
  `packages/ui/src/components/*.tsx` counterpart 1:1, with a doc comment
  stating what wasn't carried over.
- `Sources/KinetixUI/KinetixColorsSwiftUI.swift` / `.dark.swift` —
  **generated, vendored.** Do not hand-edit. Re-run
  `node scripts/vendor-swiftui-tokens.mjs` (or `pnpm vendor:swiftui`)
  after `pnpm build:tokens`.

## Standalone SwiftPM package

There's no `package.json` here on purpose — `pnpm-workspace.yaml`'s
`packages/*` glob only registers a directory with a `package.json`, so
this stays invisible to `pnpm install` / Turborepo, exactly like
`packages/ui-compose`. It lives in the monorepo only for proximity to the
token source it depends on.

Not on the SwiftPM registry. Consume it from a repo checkout:

```swift
.package(path: "../kinetixui/packages/ui-swiftui")
```

## Tokens: SwiftUI `Color`, not `UIColor`

The existing iOS token output (`packages/tokens/dist/ios/KinetixColors.swift`,
`Theme.swift`) is `UIColor`-based. `UIColor` is UIKit-only — it does not
compile on macOS, so a package that must `swift build` on a macOS CI
runner can't consume it. The token engine emits a **parallel SwiftUI-`Color`
semantic set** for this library
(`KinetixColorsSwiftUI` light / `KinetixColorsSwiftUIDark` dark), added in
`style-dictionary/sd.config.mjs`'s `ios-swiftui-theme` platform block. The
UIColor output is untouched — this is purely additive, mirroring how
Android has `Color.kt` alongside `Theme.kt` / `Theme.dark.kt`.

Unlike every other native platform, this set runs on **both** the light
and dark Style Dictionary passes — a `KinetixTheme` needs real values for
each.

## Usage

```swift
import KinetixUI
import SwiftUI

struct ContentView: View {
    var body: some View {
        KinetixTheme {
            VStack(spacing: 12) {
                KinetixButton(action: {}) { Text("Save") }
                KinetixButton(variant: .outline, size: .sm, action: {}) { Text("Cancel") }
                KinetixButton(variant: .destructive, action: {}) { Text("Delete") }
            }
        }
    }
}
```

## Verification

The dev environment has no Swift toolchain. `.github/workflows/native-swiftui.yml`
(`macos-latest`, `swift build`, path-filtered to
`packages/ui-swiftui/**` + `tokens/**` + `style-dictionary/**`) is the
sole compiler feedback.

## Not in this pass

- The rest of the ~70-component surface — added in batches (same as the
  Compose arc). Overlay-class components (dialog, popover, menus) and
  the input primitives are still to come.
- A tagged SPM release — needs repo/signing decisions; consume via
  `.package(path:)` for now.
- A real `.kinetixFont(.labelMd)` type-scale modifier — `KinetixButton`
  uses raw sizes from the Figma type scale for now.
