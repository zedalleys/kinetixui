---
"@kinetixui/ui": minor
---

Field and Form can say that a field is required

`Field` gains `required` and `FormItem` gains `required`. One declaration puts `aria-required` on
the control and a decorative marker beside the label, so the requirement reaches a screen reader
and a sighted reader without the two drifting apart. The ARIA state rather than the native
attribute, because `FieldControl` wraps controls that are not `<input>` — a Radix checkbox is a
`<button>`, where `required` means nothing.

Nothing changes for a field that does not mention it: no attribute, no marker, no new element.

`Checkbox`, `Switch`, `Select` and `RadioGroup` already carried the state through from Radix; that
is now proven by tests rather than assumed. A new `check:required-semantics` gate derives the
catalogue's controls from the sources and fails when one arrives with no path to the required
state and no recorded reason.
