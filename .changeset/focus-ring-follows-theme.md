---
"@kinetixui/tokens": patch
---

The web focus ring now follows the theme's `--focus` role instead of a baked hex.

`--shadow-focus` (the keyboard focus ring of Button, Input, Textarea, Select, MultiSelect, NumberInput,
InputGroup, InputOTP, Fab and interactive Card, in React and Angular) is emitted as
`0 0 0 1px hsl(var(--focus)), 0 0 0 4px hsl(var(--focus) / 0.2)` (dark: `/ 0.32`) in `extras.css` /
`extras.dark.css`. A theme that overrides `--focus` or `--ring` — including every brand theme exported from
Create — now moves the ring; before, it stayed the shipped azure, and on a background close to that blue it
was invisible. The default rendering is unchanged: `check:contrast` asserts the ring source equals the
`focus` role in both themes. The status rings (`--shadow-focus-destructive/-success/-warning`) and the native
shadow outputs are unchanged.
