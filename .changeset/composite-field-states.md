---
"@kinetixui/ui": patch
"@kinetixui/angular": minor
---

Composite fields get the text-entry state contract (TOKENS.md, "Composite fields"): InputGroup, NumberInput,
MultiSelect and InputOTP in React, and `kx-number-input` and `kx-password-input` in Angular.

**The edge.** Each wrapper is one field. Its edge was `--input`, measured at 2.21:1 (light) and 2.44:1 (dark) on
a card, below the 3:1 SC 1.4.11 asks of the only thing marking where an empty field is. It is now
`--muted-foreground` at 80%, as on Input: 3.41:1 and 5.40:1. Internal dividers (InputGroupButton, NumberInput's
steppers) stay `--input`, deliberately quieter than the field's edge.

**States.** Hover steps the edge to full `--muted-foreground`, never over focus, invalid, read-only or disabled.
Focusing the input draws the field's focus ring on the wrapper; focusing a button inside the field (InputGroupButton,
a NumberInput stepper, Angular's reveal toggle) draws only that button's inset ring, where before both lit at
once. `aria-invalid="true"` now gives NumberInput, MultiSelect and InputOTP a destructive edge (they had no invalid
state), kept under the pointer and focus. Read-only InputGroup and NumberInput get the inset `--muted` fill, and a
read-only NumberInput's steppers are disabled: they used to change the value.

**Shape.** MultiSelect takes the field radius (`rounded-sm`) and its placeholder the field's `body-md`. NumberInput
is sized by its input's padding instead of a fixed `h-10`, so it matches Input and InputGroup (46px) in a row.
InputOTP's slots drop `shadow-sm`.

**Angular API.** `kx-number-input` and `kx-password-input` gain `aria-invalid` and `aria-describedby` inputs,
forwarded to the inner input. Before, neither could be marked invalid or tied to its error text accessibly.

Verified on rendered pixels by the new `check:composite-visual` (React + Angular, light and dark): 64 contract
failures on main before this change, 0 after. Angular remains Preview.
