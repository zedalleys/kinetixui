---
"@kinetixui/cli": minor
---

Add `theme create <name>` and `theme build <name>` — scaffold a local token override file (`kinetixui-themes/<name>.csv`) and compile it to a drop-in CSS `:root` override block plus a WCAG AA contrast report. Ports the same hex/HSL/contrast math the `/theme-builder` web tool already uses, so the two produce identical output for the same input. CSS output only for now — native (SwiftUI/Compose/Flutter) theme compilation is a separate, larger undertaking and isn't attempted here.
