---
"@kinetixui/angular": minor
---

Wave C1: the overlay layer and the dialog family. The Angular catalogue goes from 56 to 64 of 98.

**New components** (32 exported symbols):

- `kx-dialog` with `button[kxDialogTrigger]`, `dialog[kxDialogContent]` (a real `<dialog>` opened modally, with
  a built-in close button you can turn off with `closeButton="false"`), `[kxDialogTitle]`,
  `[kxDialogDescription]`, `kx-dialog-header`, `kx-dialog-footer` and `button[kxDialogClose]`. Two-way
  `[(open)]`, and a `returnFocus` input for when the trigger is not where focus should go back to.
- `kx-alert-dialog` with `dialog[kxAlertDialogContent]` (`role="alertdialog"`, no close button, never closed by
  a press outside), `kxAlertDialogCancel` (focused first, and what Escape does) and `kxAlertDialogAction`.
- `kx-modal`: a structured dialog (title and close, body, footer) whose `type` (`Info`, `Confirmation`,
  `Warning`, `Destructive`) chooses its actions.
- `kx-sheet` with `dialog[kxSheetContent]` and a logical `side` (`start`, `end`, `top`, `bottom`), so `end` is
  the right edge in a left-to-right page and the left edge in a right-to-left one.
- `kx-drawer` with `dialog[kxDrawerContent]`: a bottom panel with a grab handle; focus goes to the panel.
- `kx-popover` with `kxPopoverTrigger`, `kxPopoverAnchor`, `kx-popover-content` (a non-modal, named dialog
  with `side`, `align` and `offset`) and `kxPopoverClose`.
- `kx-tooltip` with `kxTooltipTrigger` and `kx-tooltip-content`: a description (`aria-describedby`), opened by
  hover after `openDelay` and at once by keyboard focus, never by touch.
- `kx-hover-card` with `kxHoverCardTrigger` and `kx-hover-card-content`: a preview on hover intent or keyboard
  focus whose own links stay reachable.

Every surface, title and description takes an `id` input, static or bound; `aria-controls`, `aria-labelledby`
and `aria-describedby` follow it, and a generated id is used when there is none.

**One overlay layer underneath them all.** Surfaces render in the browser's top layer (`showModal()` and
`popover="manual"`) instead of being moved to a portal, so they keep their injector, styles and direction and
need no z-index. One stack decides what Escape and an outside press close (only the topmost surface; a press
in a popover nested in a dialog is inside both), closes nested surfaces with their parent, locks page scroll
while any modal surface is open, holds Tab inside a modal surface and returns focus on close, to the trigger or,
if it was removed, to the surface that contained it. Floating surfaces are placed by one function: logical
sides, flip, shift, a size cap that turns into scrolling at 200% text, and re-placement on scroll, resize and
layout change.

**Evidence.** `check:angular-overlays` drives all eight in Chromium (keyboard, nesting, outside presses,
scroll lock, focus restoration, axe on every open state in light and dark, forced colours, four direction
cases, 200% text at desktop and phone width, and motion with and without reduced motion), and
`check:overlay-visual` measures their rendered pixels in light and dark. Both run in CI.

Angular stays Preview.
