---
"@kinetixui/ui": patch
---

Arrow keys in a `SegmentedControl` now move the chosen segment with focus.

The strip is a `radiogroup` of `radio`s, and in a radiogroup the ARIA practices have an arrow key move focus **and** check what it lands on. Radix's roving focus moves focus alone, so arrowing left the reader on a segment that was not the answer until they pressed Enter as well. Home and End behave the same way, the arrows follow the reading direction, and a disabled segment is stepped over rather than chosen.

**Behaviour change for consumers:** `onValueChange` now fires on an arrow press, once per movement. A handler that does expensive work per change — refetching, re-rendering a preview — will be called while the reader arrows through the strip rather than only when they commit. Nothing else changes: pointer presses, the single tab stop, the chosen segment holding that stop, and the guarantee that the control cannot be left with nothing chosen all behave as before.

The keyboard model is now documented on the component's page, generated from the tests that prove it.
