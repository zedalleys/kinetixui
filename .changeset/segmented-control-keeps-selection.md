---
"@kinetixui/ui": patch
---

Keep SegmentedControl selected when its chosen segment is activated again, in controlled and uncontrolled use. Repeat activation no longer calls onValueChange with an empty string; controlled consumers can still explicitly pass value="". Public props are unchanged. Covers the behavior merged in #555; arrow-key selection work in #559 is separate.
