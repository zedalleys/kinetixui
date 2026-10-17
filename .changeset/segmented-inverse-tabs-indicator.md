---
"@kinetixui/ui": minor
---

Restyle SegmentedControl and give Tabs a travelling indicator. The segmented track is now a soft grey well with a subtle edge, and the chosen segment is filled with `foreground` (near-black in light, near-white in dark) with `background` text; under forced colours it uses the system `SelectedItem` pair, so it stays marked. Tabs draw one 2px indicator per list that travels to the chosen tab: its leading edge moves first and its trailing edge follows, so it stretches across and settles. It follows the list's direction and orientation, snaps on resize or text-size changes, and jumps straight to the new tab under reduced motion; before hydration and under forced colours each chosen tab draws its own edge as before. No API changes.
