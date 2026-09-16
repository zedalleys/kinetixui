---
"@kinetixui/ui": minor
---

Add `Banner` — a full-bleed, page-level notice (info/promo/maintenance), optionally dismissible with an optional action. Fourth pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog. Distinct from `Alert` (in-flow, static) and `Sonner` (transient toast): persistent and edge-to-edge. Distinct from `Inform` (contained, rounded inline card): `Banner` has no rounded corners or own width — it spans whatever it's placed in, typically the full viewport. Reuses `Inform`'s intent taxonomy and icon set for a consistent look.

Ships on all four platforms per the four-platform rule: `KinetixBanner` on Jetpack Compose, SwiftUI, and Flutter too. The web version's `sticky` prop has no component-level native equivalent — the native ports document pinning by placement instead (a `Scaffold`'s top bar, `.safeAreaInset(edge: .top)`, or the first child of a non-scrolling container), the same convention already established for `AppBar`.
