---
"@kinetixui/ui": patch
---

Slider draws one thumb per value. A range such as `defaultValue={[20, 80]}` used to render a single thumb, so every value after the first had no handle to drag, focus or read. With more than one value, `aria-label`/`aria-labelledby` now name the root as a `role="group"` and each thumb keeps its position's name ("Minimum"/"Maximum", or "Value 1 of 3"); `aria-valuetext` applies to a single-thumb Slider only. Single-value Sliders are unchanged.
