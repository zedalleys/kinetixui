---
"@kinetixui/ui": patch
---

`Carousel`'s Previous and Next no longer drop the reader's focus at either end of the track.

Both controls carried a native `disabled` attribute at a non-looping end, so the press that exhausted the track disabled the very button under the reader's focus. A natively disabled element cannot hold focus: Chromium moved it to `BODY`, and the following Tab started from the document's position rather than the reader's — stepping to the last slide cost a keyboard reader their place in the page. Measured in Chromium at both endpoints, in LTR, RTL and reduced motion; jsdom reproduces neither form, which is why the guard is `scripts/react-carousel-focus.mjs` and not a unit test.

At an end the control is now `aria-disabled` and refuses its own activation, the shape `@kinetixui/angular`'s carousel already documented and `NumberInput`'s step buttons already use. Focus stays on the button, Tab continues past the carousel, and the forbidden navigation is still refused. A consumer's own `onClick` now runs before the guard instead of replacing it.

**No API change.** One behaviour change a consumer can see: at each end the control stays in the tab order, reachable and announced as unavailable, instead of leaving it.
