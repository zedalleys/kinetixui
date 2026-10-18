---
"@kinetixui/ui": patch
---

`Checkbox` and `RadioGroup`: an uncontrolled `<Checkbox defaultChecked="indeterminate" />` now draws the dash. It used to draw a tick while announcing "mixed", because the glyph was chosen from the `checked` prop, which is undefined when uncontrolled; it now follows Radix's own state. Selection also runs on the motion tokens: checking, unchecking and mixed move the box's fill and border (a radio's border) over `--duration-fast` (200ms), and the tick, dash or dot fades in over the same 200ms. The hover and press halo moves on `--duration-instant` (100ms), where all of it used to run on 100ms. A checkbox's glyph leaves at once, so a box going from mixed to unchecked never shows a tick on the way out; a radio's dot fades out as the next one fades in. Semantics change at once, reduced motion lands on the same end state without moving, and the API is unchanged.
