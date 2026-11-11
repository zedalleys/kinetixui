---
"@kinetixui/ui": patch
---

`Carousel` no longer takes an arrow key that something inside a slide owns.

The carousel listened for ArrowLeft and ArrowRight in the capture phase and cancelled them unconditionally, before the focused element saw the key. A text field, textarea or select inside a slide lost caret and option movement, a nested control (a slider, a radio group) that had already handled the arrow was overridden, and Alt+ArrowLeft, the browser's Back shortcut, was cancelled. The carousel now handles the key in the bubble phase, only when nothing inside has claimed it, the target is not an editing control, and no Alt, Ctrl, Meta or Shift modifier is held. A plain arrow from a button or a slide still scrolls, and a consumer's own `onKeyDown` still runs first.

**No API change.**
