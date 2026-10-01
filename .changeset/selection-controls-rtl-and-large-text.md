---
"@kinetixui/ui": patch
---

Fix two defects in the selection controls: the Switch thumb under RTL, and controls that did not grow with the reader's text.

**Switch, under `dir="rtl"`.** The thumb's travel used `translate-x`, which is physical. In an RTL locale the
thumb correctly starts against the right edge — that is the start — and then moved further right: measured in
Chromium, its left edge went from 26px to 50px on a 48px track. A switch turned on rendered as a filled pill
with no thumb visible in it at all. It now mirrors with `rtl:data-[state=checked]:-translate-x-6`, travelling
26px → 2px, the mirror image of the LTR 2px → 26px.

**Checkbox and RadioGroupItem, at large text.** Both were sized `size-[18px]`. A reader who raises their
browser's default font size scales `rem` and not `px`, so at 200% their labels doubled and the controls did
not — 18×18 before and after, halving the control relative to its own text and taking its touch target with
it, below the 24px WCAG 2.5.8 minimum. Both are now `size-[1.125rem]`: identical at the default font size,
and scaling from there. Switch, Toggle and ToggleGroup were already rem-based and are unchanged.

Patch rather than minor: no API is added, removed or renamed, and no consumer has to adopt anything. Both
changes correct behaviour that was already wrong — an upgrade changes what a control does at a text size or
in a direction where it was previously broken, and changes nothing otherwise.
