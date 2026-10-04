---
"@kinetixui/ui": patch
"@kinetixui/angular": patch
---

Selection controls get one state contract (TOKENS.md, "Selection controls"), in React and Angular.

- **Checkbox and RadioGroup:** the unchecked edge is now `--muted-foreground`, so the control itself clears SC 1.4.11's 3:1 (it was `--input`, 2.2:1). The invalid state now renders in React: `aria-invalid:` is not a Tailwind 3 variant, so `aria-invalid="true"` used to change nothing on screen; it is now a `--destructive` edge (and fill when checked) that hover does not erase.
- **Checkbox, RadioGroup, Switch:** hover draws a `--foreground` state layer (8%) around the control and press deepens it (14%); the focus ring can no longer be covered by either; disabled controls do not respond.
- **SegmentedControl:** the track is `--surface-grouped` and the chosen segment is a small raised surface (`--card`, half-strength `--border` edge, `sm` depth). In dark mode the chosen segment used to sit below its track. An unchosen segment now answers hover and press.
- **Angular:** the same contract in `styles.css` for `kx-checkbox`, `kx-radio`, `kx-switch` and `kx-segmented-control`, and the checkbox and switch transitions (including the thumb) now stop under `prefers-reduced-motion`. The README's component count, list and symbol count are corrected (43 components, 94 symbols).

No props, exports or tokens were added or removed.
