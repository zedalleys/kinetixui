---
"@kinetixui/ui": patch
---

Slider: a disabled Slider is now announced and drawn as disabled. The thumb (the element with `role="slider"`) carries `aria-disabled`, which Radix put only on the role-less root, and the disabled look keys on `data-disabled` (dimmed root, not-allowed cursor) instead of `disabled:` utilities that never matched a span. `aria-valuetext` passed to the Slider now reaches the thumb, so a caller can give a value its spoken form.
