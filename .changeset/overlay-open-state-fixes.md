---
"@kinetixui/ui": patch
---

Fix three overlay defects found by scanning and measuring the surfaces while they were open.

**Popover shipped an unnamed dialog.** Radix gives `PopoverContent` `role="dialog"`, and nothing named it,
so a screen reader announced the single word "dialog" — WCAG 4.1.2, on every Popover in the library. There
is now a fallback accessible name. It is only a fallback: an `aria-label` you pass wins, and
`aria-labelledby` suppresses it entirely so a heading you point at is not shadowed. Naming your own
popover is still better than the fallback, which says what kind of thing opened and nothing about what is
in it.

**Drawer left focus on its trigger.** Measured in Chromium with the drawer open: focus was still on the
button, which by then sits inside a subtree the drawer marks `aria-hidden` — so a screen-reader user was
left on an element their software had just been told does not exist. The panel now takes focus on open.
The panel itself, not the first control inside it: `vaul` suppresses auto-focus deliberately so that a
drawer containing a text field does not summon a mobile keyboard, and a container opens no keyboard while
still giving the screen reader the drawer's heading to announce.

**Popover, the three menus and Tooltip could grow wider than the window.** At 390px with the reader's
default font size doubled the popover measured 576px — `w-72` is `rem`, so it doubles with the text — and
the context menu 416px, pushing the page 186px sideways. Each surface is now capped with
`max-w-[var(--radix-popper-available-width)]`, which is Radix's own measurement of the space it has rather
than a viewport guess, and binds only when the surface would otherwise overflow.

Patch rather than minor: no API is added, removed or renamed, and nothing new is available to adopt. Each
change corrects behaviour that was already wrong — an upgrade names a dialog that had no name, moves focus
somewhere reachable, and keeps a surface inside the window at large text; in a desktop LTR app at the
default font size it changes nothing.

The `ContextMenu` example in the component registry also gets a responsive trigger (`w-full max-w-64`
instead of `w-64`), so copying it into an app does not produce a box wider than a phone at 200% text.
