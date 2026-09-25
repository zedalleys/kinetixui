---
"@kinetixui/cli": minor
---

`kinetixui preset compose <code|url>` — export a Kinetix Create preset as a Jetpack Compose theme file.

Writes a Kotlin `object` holding a light and a dark `KinetixColors`, resolved through the same theme
engine `preset css` and `preset swiftui` use, so all three render one design rather than deriving it
three times. `--name <Symbol>` picks the object (default `CreateTheme`) and `--output <file>` writes it
instead of printing it.

Apply it with the `KinetixTheme(light = …, dark = …)` parameters added to `packages/ui-compose`, which
still switch on `isSystemInDarkTheme()`:

```kotlin
KinetixTheme(light = AcmeTheme.light, dark = AcmeTheme.dark) { App() }
```

**Colours only, and Compose only.** Radius and elevation are generated constants Compose components read
directly, with no runtime theme to override, so a design's radius and surface treatment apply on the web
and not there — the generated file states that in its own header, along with the two colours
(`input`, `ring`) that `KinetixColors` has no field for. There is no Flutter or Android XML exporter.

Compose writes `Color(0xffRRGGBB)`, the resolved colour exactly, so it needs no representation of its own
in the shared contrast guarantee — unlike SwiftUI's three-decimal channels. The guarantee is unchanged.

`preset decode`, `preset url`, `preset css`, `preset swiftui`, `theme create` and `theme build` are
unchanged.
