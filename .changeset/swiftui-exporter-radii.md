---
"@kinetixui/cli": patch
---

`preset swiftui` now exports the whole design, not just its colours.

The generated file gains `KinetixRadii` and `KinetixElevations` beside the existing `KinetixColors`
pair, so a Create design's corner radii and shadow ladder reach SwiftUI instead of applying on the
web alone. Apply them together:

```swift
KinetixTheme(light: AcmeTheme.light, dark: AcmeTheme.dark,
             radii: AcmeTheme.radii, elevations: AcmeTheme.elevations) { … }
```

A ladder the design did not touch is written as `KinetixRadii.default` rather than a copy of today's
numbers, so it keeps following the library — the same rule the colours already followed.

One thing does not travel: CSS shadows carry `spread` and SwiftUI's `.shadow` has no equivalent, so
it is dropped and the larger steps render slightly wider than on the web. The generated header says
so. `preset compose` and `preset flutter` are unchanged.
