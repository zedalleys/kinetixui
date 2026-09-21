---
"@kinetixui/tokens": minor
"@kinetixui/ui": minor
---

Radius **role aliases**: `radius.field` (→ `sm`, 4), `radius.control` (→ `md`, 8), `radius.container` (→ `lg`, 12) and `radius.surface` (→ `xl`, 16). Sizes say how round; roles say what is round, so a theme can reshape every field or every card by overriding one token without disturbing the size steps. On the web each is a live reference (`--radius-control: var(--radius-md)`), the Tailwind preset gains `rounded-field`, `rounded-control`, `rounded-container` and `rounded-surface`, and the SwiftUI, Compose and Flutter `KinetixRadius` gain `field`, `control`, `container` and `surface`. The mapping is measured from how the components use radius today. Additive: no existing token, utility or component changed, and components move to the roles incrementally. See `/docs/foundations`.
