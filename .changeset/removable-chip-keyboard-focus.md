---
"@kinetixui/ui": patch
---

Removing a `Tag` chip or a `FileUpload` row keeps the keyboard, and a `MultiSelect` chip can be removed by keyboard at all.

A remove button inside a chip or a row unmounts with it, so nothing held focus and the browser dropped it on `<body>`: the next Tab restarted from the top of the page, once per removal. Focus now moves to the next chip's (or row's) remove button, or the previous one when the last goes; `FileUpload` falls back to its Browse button, and `MultiSelect` back to its field. Focus moves only when the removal actually happened and left the keyboard stranded, so a handler that removes nothing, or that restores focus to an input of its own, keeps the focus it chose. Order follows the document, so it is the same in right-to-left layouts.

In `MultiSelect`, Enter or Space on a chip's remove button bubbled to the field, which opened the listbox and never removed the chip, so a chip could not be removed by keyboard at all. The field now acts only on keys pressed on itself; opening with Enter, Space or the arrows is unchanged.

Also: `lib/utils.ts`, which the CLI installs alongside almost every component, is now generated with the rest of the registry rather than kept by hand.

**No API change.** `Tag` and the `FileUpload` rows gain `data-slot` / `data-kx-remove` attributes, which a consumer's selectors can ignore.
