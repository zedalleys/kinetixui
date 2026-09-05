# @kinetixui/tokens

## 0.4.0

### Minor Changes

- a2e5706: Token engine now emits additive **SwiftUI-`Color`**
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

## 0.3.1

## 0.1.0

### Minor Changes

- 1a727a7: First public release.
  
  - **@kinetixui/tokens** — the KinetixUI token contract: `--*` CSS variables
    (light + dark), `--shadow-*` / `--text-*` composites, a typed `tokens` object,
    and native text styles (`KinetixType.swift`, `KinetixType.kt`, `app_text.dart`).
  - **@kinetixui/ui** — 56 React components on the token contract (CVA + Radix +
    Tailwind), plus the `tailwind.config` preset. Also installable via the shadcn
    registry at `kinetixui.com/r/*.json`.
