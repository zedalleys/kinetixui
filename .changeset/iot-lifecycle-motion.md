---
"@kinetixui/iot": patch
---

Animate the command lifecycle's stage changes.

`CommandLifecycle` is the component whose entire job is communicating a command moving through
requested → pending → acknowledged → confirmed, or failing. Every one of those transitions snapped:
the step row's text colour, the marker's fill, ring and border, and the dimming of a glyph for a
stage still ahead all changed with no transition on any of them. Measured in a real browser, the
lifecycle had **zero** elements with a transition.

The four stage-bearing nodes now carry `transition-colors` / `transition-opacity` at `duration-fast`
with the usual `motion-reduce:transition-none`. Driving a stage change in a browser now catches the
colour mid-interpolation — `rgb(110,110,110)` → `rgb(63,66,68)` at 40 ms → `rgb(5,11,16)` — where
before it jumped. Under `prefers-reduced-motion: reduce` the stage still advances and the colour
arrives immediately, with no animation running.

No new token, no new value: this uses the existing semantic motion scale the rest of the module
already uses. Nothing else about the component changed.
