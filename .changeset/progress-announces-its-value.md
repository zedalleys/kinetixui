---
"@kinetixui/ui": patch
---

Progress announces the value it paints. The component destructured `value` out of its props and never passed it to the underlying primitive, so every determinate bar painted a fill while the primitive stayed indeterminate and emitted no `aria-valuenow`: a sighted reader saw progress, a screen-reader user was told there was none. The value and the maximum now reach the primitive, the painted fraction is computed from `value / max` rather than from `value` alone, and a non-finite maximum is withheld so it cannot be announced as an infinite range.
