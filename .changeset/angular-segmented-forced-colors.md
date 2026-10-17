---
"@kinetixui/angular": patch
---

`KxSegmentedControl`: the chosen segment stays marked in forced-colours mode (Windows contrast themes). Its raised surface and shadow were flattened to the same Canvas as the other segments, so chosen and unchosen looked identical (1.00:1). It now keeps the system's `SelectedItem` / `SelectedItemText` pair, 5.37:1 against its neighbours in a light palette and 3.91:1 in a dark one. Nothing changes outside forced colours, and the API, semantics and focus outline are unchanged.
