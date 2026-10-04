---
"@kinetixui/angular": minor
---

Wave A: the rest of the input family, interactive cards, and browser evidence for everything the package
ships. The Angular catalogue goes from 43 to 46 of 98.

**New components.** `KxInputGroup` (with `KxInputGroupInput`, `KxInputGroupAddon`, `KxInputGroupText` and
`KxInputGroupButton`), `KxInputOtp` and `KxRating` — seven exported symbols.

- `kx-input-group` is one bordered field around a real `<input kxInputGroupInput>`, so forms, labels,
  `readonly` and `aria-invalid` work on the input and the shell follows the composite-field contract.
- `kx-input-otp` is one real input with `autocomplete="one-time-code"` under `aria-hidden` cells: SMS
  autofill, whole-code paste and a single labelled field for assistive technology. `[groups]="[3, 3]"`
  splits the cells, `allow` picks digits or alphanumeric, and `completed` fires when the code is full.
- `kx-rating` is a `radiogroup` of real radios named "1 star" … "5 stars": one tab stop, arrows (mirrored in
  RTL), Home and End, hover preview, and a `readonly` form that is a single image named "Rated 4 out of 5".
  This deliberately differs from React's Rating, which uses `aria-pressed` buttons without arrow keys.

**Additions to existing components.** `kxCard` on a real `<a href>` or `<button>` gives a card the interactive
states (hover, pressed, focus, and selected through `aria-current` or `aria-pressed`). `kx-card` stays static.
`kx-number-input` gains `readonly`.

**Fixes found by the new browser evidence.**

- Single-select `kx-toggle-group` radios had no accessible name: projected content only reached one of the
  two branches. Toggle-group items were also 20px tall with no size class; they now use the `md` toggle size.
- Tab panels had no `id`, so each tab's `aria-controls` pointed at nothing.
- Under `forced-colors: active` no control had a visible focus indicator, because box-shadow rings are
  removed in that mode. Focusable controls now draw an outline there.
- Selection controls, toggles and the slider were sized in px and did not grow at 200% text. They are now
  rem, with identical geometry at the default size.
- The stylesheet assumed `border-box` without setting it, so in an app without a CSS reset a 44px input
  rendered 62px tall. KinetixUI's own classes now set `box-sizing: border-box` at zero specificity.
- The slider's fill was a `to right` gradient, so in RTL it grew from the wrong end. It is now an element
  placed with logical properties.
- The circular progress spun faster than the 3s reduced-motion floor.

Angular remains **Preview**: 50 components are still planned. Nothing here claims React parity beyond the
behaviours the browser passes assert, and it is not an accessibility certification.
