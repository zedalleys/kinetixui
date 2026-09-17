---
"@kinetixui/ui": minor
---

Add `ColorPicker` — a saturation/value square, hue and (optional) alpha sliders, a hex field, swatches, and an eyedropper (where `window.EyeDropper` exists). The 2D square is hand-rolled (no Radix primitive for a 2D gesture); the hue and alpha rails reuse `@radix-ui/react-slider` directly, not the package's own `Slider` wrapper, whose track styling is fixed, for their keyboard and ARIA handling.

Internal HSV state, not derived from the hex `value` prop on every render: saturation 0 or value 0 erase hue information (every hue produces the same RGB there), so re-deriving HSV from the emitted hex on every change would make the hue thumb jump to red the moment a drag crosses either edge. `value` only resyncs the internal state when it changes from something other than the component's own last emission — the standard fix for this class of controlled color-picker bug.

Ships on all four platforms with the same feature set except the eyedropper, which is web-only: no native platform exposes a public "sample a pixel anywhere on screen" API. The HSV math is hand-rolled identically (formula-for-formula) across React/Compose/SwiftUI/Flutter, same rationale as `DiffViewer`'s LCS diff.
