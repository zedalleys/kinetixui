---
"@kinetixui/ui": patch
---

`Rating` is a radio group of real radios, which is what a rating is.

It declared `role="radiogroup"` and rendered five independent `<button aria-pressed>` stars inside
it: a group claiming one choice, holding five toggles, with nothing ever checked and no position for
a screen reader to announce. It was also five tab stops with no arrow-key movement, where a radio
group is one stop the arrows move within.

The stars are now `<input type="radio">`s in one group per instance, named "1 star" … "5 stars", so
the roving tab stop, arrow movement, RTL mirroring and the "3 of 5" announcement come from the
browser rather than from code. Home and End are implemented here, because the browser does not
provide them. `readOnly` is unchanged in appearance and honest underneath: no control, the stars
hidden behind the group's own "Rated 3 out of 5", no tab stop.

This is `kx-rating`'s contract, which Angular already stated, asserted in its unit tests, and
recorded this component as disagreeing with. The arrow-key behaviour itself is the browser's; the
tests here exercise it through `user-event`'s emulation of radio-group navigation, not a real
engine, which is stated in the docs rather than claimed as browser evidence.

**No API change** — `value`, `defaultValue`, `max`, `readOnly`, `size`, `onChange` and your own
`aria-label` all behave as before, and every star keeps the classes it had, so nothing moves
visually. **What a consumer may notice:** the markup inside the group changed from a `<button>` per
star to a `<label>` with an `sr-only` radio, so a stylesheet or test that targeted
`.rating button` has to target the label or the star instead. That is the reason this could be
argued as a minor; it is released as a patch because it is a defect fix with no API change, which is
how the equivalent Angular keyboard fix was released.
