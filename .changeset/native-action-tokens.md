---
"@kinetixui/ui": patch
---

The SwiftUI, Compose and Flutter components now read the role tokens: `KinetixColors` gains `action`, `actionForeground`, `actionHover`, `actionPressed`, `link`, `focus`, `brand` and `brandForeground` (alongside `primary` / `ring`, which stay as the source), and the components use them instead of `primary` (the Button's Link variant reads `link`; focus rings read `focus`). No visual change with the default theme. The native libraries are not versioned with the npm packages, so this changeset only records the change.
