---
"@kinetixui/iot": patch
---

Let `DeviceModeControl`'s segmented group fit a narrow viewport at large text.

Each segment is a flex item with `flex-1` and a `truncate` label, but a flex item's `min-width`
defaults to `auto` — its min-content width — so the `truncate` was inert and a segment could never be
narrower than its own label. A group of several modes therefore could not fit a narrow viewport at all.
It is visible at the default text size only on a very small screen; it is unmissable once the reader
raises their text size, because the labels grow while the viewport does not. Measured in Chromium at
200% text on a 320px viewport, the climate mode group pushed its page 212px sideways.

The segment now carries `min-w-0`, so the segments share the available width and the label truncates
as it was always meant to. Nothing changes at the default text size on a screen with room for the
group: the segments were already `flex-1` and already sized themselves to the container.

Patch rather than minor: no API is added, removed or renamed, nothing new is available to adopt, and
the change corrects behaviour that was already wrong.
