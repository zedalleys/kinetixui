---
"@kinetixui/cli": minor
---

`kinetixui preset swiftui <code|url>` — export a Kinetix Create preset as a SwiftUI theme file.

Writes a `public enum` holding a light and a dark `KinetixColors`, resolved through the same theme engine
`preset css` uses, so both targets render one design rather than two derivations that agree by hand.
`--name <Symbol>` picks the Swift type (default `CreateTheme`) and `--output <file>` writes it instead of
printing it.

Apply it with the new `KinetixTheme(light:dark:)` initializer in `packages/ui-swiftui`, which still
switches on `colorScheme`:

```swift
KinetixTheme(light: AcmeTheme.light, dark: AcmeTheme.dark) { … }
```

**Colours only, and SwiftUI only.** KinetixUI for SwiftUI is themeable through `KinetixColors`; corner
radius and elevation are literals inside each view, with no token an exported file could set, so a
design's radius and surface treatment apply on the web and not there — the generated file states that in
its own header. There is no Compose, Flutter or Android XML exporter.

`preset decode`, `preset url`, `preset css`, `theme create` and `theme build` are unchanged.
