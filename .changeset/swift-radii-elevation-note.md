---
"@kinetixui/cli": patch
---

`preset swiftui` stops blaming the platform for something the exporter has not done yet.

The generated file said corner radius and elevation "are literals inside each view, with no token to
override" and that "there is nowhere for them to go yet". That was true when it was written. The
SwiftUI package now ships `KinetixRadii` and `KinetixElevations` beside `KinetixColors`, so there is
somewhere for them to go — this exporter simply does not write them.

The header now says that, and tells the reader what to do in the meantime:
`KinetixTheme(light: …, dark: …, radii: …, elevations: …)`. Output is otherwise unchanged; the
exporter still emits colours only.
