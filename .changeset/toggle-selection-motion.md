---
"@kinetixui/ui": patch
---

`Toggle` and `ToggleGroup`: selection and pointer feedback now run on the motion tokens. Choosing or releasing an item moves its background, text and border colour over `--duration-fast` (200ms), where it used to run on Tailwind's untokenised 150ms. Hover and press are a separate state layer (the same 8% and 14% `foreground` as Checkbox, Radio and Switch) on `--duration-instant` (100ms), so hover no longer changes the background colour. Hover only applies on devices that can hover, so a tap on a touch screen no longer leaves it stuck. Under forced colours (Windows contrast themes) the chosen item now uses the system's `Highlight` / `HighlightText`; before, on and off looked the same in every variant. `ToggleGroup` wraps its items instead of overflowing a narrow screen. Semantics change at once, reduced motion lands on the same colours without moving, and the API is unchanged.
