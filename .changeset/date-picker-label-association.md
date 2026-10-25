---
"@kinetixui/ui": patch
---

`DatePicker`'s visible label now names the field.

`label` was rendered as a bare `<label>` with no `htmlFor`, beside a trigger that carried no naming
attribute, so the label was associated with nothing: the field's accessible name was "Select date",
or the formatted date, and a screen reader never said which field it was. `helperText` had the same
shape — visible, referenced by nothing — so a hint and an error message were sighted-only.

The trigger's accessible name is now the label followed by the shown date, and `helperText` is its
accessible description. `DateRangeInput` and `GuestPicker` already state this contract; this is their
pattern rather than a new one. The open calendar is named by the same label.

The label renders as a `<span>` the trigger references rather than as a `<label for>`: a `<button>`
is labelable, so a `<label>` would work, but the name computation prefers a label element over the
contents, which would drop the chosen date out of the name, and clicking the label would open the
calendar. Nothing is added for a field with no label and no helper text — no attribute, and no
reference to an element that does not exist.

No API change: the same props, read correctly. `check:label-association` is a new gate — no
component may render a `<label>` that labels nothing, and every component rendering a visible
`label` prop must be proven by a test to put it in its control's accessible name.
