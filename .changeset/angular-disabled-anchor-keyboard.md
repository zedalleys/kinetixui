---
"@kinetixui/angular": patch
---

A disabled `<a kxButton>` is no longer operable from the keyboard.

`aria-disabled` on the anchor form was enforced by the stylesheet alone, with `pointer-events: none`. That
suppressed the pointer and nothing else: the anchor stayed in the tab order and <kbd>Enter</kbd> still
navigated, so the control was inert for a mouse and live for a keyboard. The source comment asked callers
to drop `href` as well, which made the only correct usage a convention rather than part of the API.

`KxButton` now guards activation itself — click, <kbd>Enter</kbd> and <kbd>Space</kbd> are cancelled and
kept from ancestor handlers while `aria-disabled="true"`, read at event time so `[attr.aria-disabled]`
needs no second input. `href` can stay. The control stays focusable on purpose: that is the difference
between `aria-disabled` and `disabled` — it remains discoverable, so a keyboard user reaches it and hears
why it is unavailable instead of finding a gap. `pointer-events: none` is dropped for the same reason,
leaving `cursor: not-allowed`, the shape `.kx-menu__item[aria-disabled]` and `.kx-pagination__link`
already use, so a pointer user can hover it and read the cursor.

The `<button>` form is untouched; the browser disables it and never dispatches these events.

The guards are registered in the directive's constructor rather than declared as `host` listeners, and the
difference is load-bearing: Angular creates an element's own template listeners before a directive's host
listeners, so a host-bound guard runs second and a `(click)` the caller wrote on the same anchor has
already fired — `stopImmediatePropagation` included, since registration order rather than phase decides
it. A constructor listener runs first, so the caller's handler is suppressed too and no `disabled` input
is needed. Both arrangements were measured; the spec asserts the working one, so moving the listeners back
into `host` fails a test instead of quietly reopening the gap.

Also, Angular's styles now read `--on-success-container`, `--on-warning-container` and
`--on-destructive-container` for `kx-banner` / `kx-inform` success, warning and error text, which are new
in the accompanying `@kinetixui/tokens` 0.26.0. Each one carries a CSS fallback to the plain status role,
so on the older tokens this package still supports the notices keep their previous colour rather than
inheriting an arbitrary ancestor colour, and only the peer range's upper bound moves (to `<0.27.0`). See
the README's Environment note.
