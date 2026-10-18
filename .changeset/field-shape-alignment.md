---
"@kinetixui/ui": patch
"@kinetixui/angular": patch
---

Every text-entry field now has one shape. GuestPicker, CountrySelect, DateRangeInput, NumberInput, PhoneInput and InputOTP's end slots were rounded at `--radius-md` (8px) while Input, Textarea and Select were at 4px; they all take `--radius-field` now, and Input, Textarea, Select, NativeSelect, InputGroup and MultiSelect read the role token too, so a theme that overrides `--radius-field` reshapes every field. The picker triggers (GuestPicker, CountrySelect, DateRangeInput) are 46px like Input instead of 44px. DatePicker's trigger is a field rather than an Outline button: a 3:1 `muted-foreground` edge where the button's was 2.2:1, the `action` focus edge, and `aria-invalid` when `error` is set. MarkdownEditor's shell takes the field edge and draws the focus ring while its textarea has focus; before, it had no focus indicator. Angular: `kx-input` focuses with the `action` edge its contract names (it used `ring`), is 46px like the other fields, and `kx-input-otp`'s end slots take `--radius-field`.
