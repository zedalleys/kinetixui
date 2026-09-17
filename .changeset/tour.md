---
"@kinetixui/ui": minor
---

Add `Tour` — sequenced spotlight popovers over real elements (onboarding walkthroughs), with dismiss/skip/next. First pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog. `target` is a CSS selector resolved against the live DOM on every step change (and on resize/scroll, so the spotlight tracks a target that moves or resizes) rather than a ref, since steps are authored as plain data ahead of the elements existing. The spotlight itself is a single positioned `div` with a `box-shadow: 0 0 0 9999px` — a well-known CSS-only cutout technique, no SVG mask or second overlay layer needed. No focus trap: a tour narrates the page rather than blocking interaction with it.

This is a sixth standing non-port (documented at `/docs/contributing`, alongside `Combobox`/`NativeSelect`): targeting an arbitrary already-rendered element by CSS selector has no native-platform equivalent — every native platform only offers opt-in position *reporting* (a target must wrap itself in a registry ahead of time via `Modifier.onGloballyPositioned`, a `PreferenceKey`, or a `GlobalKey`), a materially different API shape than "point a selector at any element." Reach for a sequence of `KinetixPopover`/`KinetixDropdownMenu` steps on native platforms instead, each anchored to the element it explains.
