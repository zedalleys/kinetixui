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

One limitation, measured rather than assumed: a handler the caller binds on the same element with
`(click)` still runs, because Angular creates an element's template listeners before a directive's host
listeners. `stopImmediatePropagation` does not help for that reason. Closing it needs a `disabled` input
on the directive for callers to bind instead of writing `aria-disabled` by hand, which is a public API
change and is proposed separately. A test records the current behaviour so that proposal has one to flip.

Also, Angular's styles now read `--on-success-container`, `--on-warning-container` and
`--on-destructive-container` for `kx-banner` / `kx-inform` success, warning and error text, which are new
in the accompanying `@kinetixui/tokens` release. See the README's Environment note.
