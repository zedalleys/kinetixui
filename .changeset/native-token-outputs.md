---
"@kinetixui/tokens": minor
---

Token engine now emits additive **SwiftUI-`Color`**
(`KinetixColorsSwiftUI` / `KinetixColorsSwiftUIDark`) and
**Flutter-`Color`** (`KinetixColorScheme` / `KinetixColorSchemeDark`)
semantic colour sets, on **both** the light and dark passes — the real
dark values the `packages/ui-swiftui` and `packages/ui-flutter`
`KinetixTheme`s need. The `--chart-1…5` palette is included.

Purely additive: the existing `KinetixColors.swift` / `Theme.swift`
(UIColor) and `app_theme.dart` / `app_colors.dart` outputs are
byte-identical and untouched — a rename would collide with the native
libraries' own `KinetixTheme` / `KinetixColors` types.

`@kinetixui/cli` and `@kinetixui/ui` version alongside (fixed group);
there is no change to the CLI or the React components.
