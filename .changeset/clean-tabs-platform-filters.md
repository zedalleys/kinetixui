---
"@kinetixui/ui": patch
"@kinetixui/iot": patch
---

Make Tabs text-first line navigation with a base rail, active underline and locally scrolling focus. Keep SegmentedControl's enclosed mode treatment, allow reflow and suppress transitions under reduced motion. Add a pill Toggle variant and decorative leadingIcon slot for filter chips.

Preserve client boundaries in the IoT React build so server components can import the mixed root without executing React client modules, while the functions entry stays React-free.
