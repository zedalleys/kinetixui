---
"@kinetixui/angular": minor
---

Selection-control motion parity with React (MX1b-2), measured in a real browser.

Before: the Angular Switch moved its thumb and track over 300ms, Checkbox and Radio ran every property at
100ms so a selection change was as quick as a hover, Toggle answered the pointer with a `--muted` background
step and had no press layer, and under forced colours the Switch thumb and the Radio dot were repainted the
same white as the surface behind them, leaving a switch with no thumb and a chosen radio that looked
unchosen. Activating a mixed Checkbox left it announcing `mixed` for ever.

After: the Switch thumb, track and halo run on `instant` (100ms, `standard`), so Angular holds the same
`selection-control` contract as React and the recorded deviation is gone. Checkbox and Radio put fill, edge
and glyph colour on `fast` (200ms) and keep their halo on `instant`; the Checkbox glyph and the Radio dot
fade in on `fast` from elements of their own and leave at once. Toggle and ToggleGroup keep selection on
`fast` and gain an inset 8% / 14% press layer on `instant`. The Switch thumb and the Radio dot are drawn in
`CanvasText`, or `GrayText` when disabled, so forced colours keep them visible. A mixed Checkbox resolves to
checked when it is activated, and returns to mixed if the caller writes `indeterminate` again.

Fixed along the way: a disabled Radio's label kept full opacity once the input was wrapped, a disabled
single-select ToggleGroup item answered the pointer with the new press layer because the element it paints is
a `<label>` and a label never matches `:disabled`, the Radio dot sat outside its control on a right-to-left
page, and a mixed Checkbox that was already checked resolved without reporting touched to Angular forms.

Public inputs, outputs and ARIA are unchanged. Minor rather than patch because the Toggle's hover fill and
the Radio dot's markup are visual defaults an application may have styled around.
