# Create Studio M3-A — direct manipulation on the canvas

What a person can do that they could not before: take a real KinetixUI component out of the library
and drop it at a chosen place inside a chosen container, and drag an existing layer to a new place.
Both land as ordinary canonical document nodes through the existing command history, so both undo.

## The interaction state machine

`apps/web/src/lib/create-studio/interaction.ts` holds one reducer for every canvas gesture: panning
the camera, dragging out of the library, dragging an existing layer. It is pure, so what it
guarantees is testable without a browser:

- **One gesture at a time.** A press that arrives while a gesture is running is dropped, not
  interleaved. Panning therefore cannot resolve drop targets, and a drag cannot move the camera.
- **Pointer identity.** Only the pointer that began a gesture can advance or end it, so a second
  finger or a stray pointer cannot steer someone else's drag.
- **A press is not a drag.** Below `DRAG_THRESHOLD` (4px of travel) the gesture ends as a press. The
  editor does not act on a press: the element's own `click` remains the authority, which is why a
  plain click on a library item still inserts exactly once and keyboard operation is unchanged.
- **Cancellation commits nothing.** `Escape`, a cancelled pointer and a window that loses focus all
  return the machine to idle. No partial document state is ever written, because the machine holds no
  document state — a concluded gesture returns a *commit* and the editor turns that into one command.
- **A release over nothing legal is a cancellation**, not a silent insertion somewhere else.

## Resolving a point to a place in the document

`apps/web/src/components/create-studio/canvas-drop.ts` turns a pointer position into
`{ parentId, index }`. The canvas is zoomed and panned by a CSS transform, so this is read from the
real DOM (`elementFromPoint`, `getBoundingClientRect`) rather than computed from a model of it.

- Resolution walks **outwards** from the element under the pointer to the nearest container that the
  registry says accepts children, so a pointer over a Button inside a Stack resolves to the Stack.
- A container's children are the `[data-studio-node]` elements whose nearest enclosing
  `[data-studio-drop]` is that container — grandchildren nest inside their own parents.
- The position is decided by `insertionIndex`, which is pure and tested: it counts the children whose
  midpoint along the layout axis the pointer has passed. On a **row in a right-to-left document the
  comparison reverses**, because the document's first child sits at the right edge; the index is a
  position in the document, not a position on the screen.
- A layer cannot be dropped inside its own subtree, and the reason is both shown and announced.

## Feedback

The receiving container is outlined, a thin indicator marks the edge where the node will appear, and
a label follows the pointer, turning to the destructive token when the target is refused. The whole
overlay is `aria-hidden` and takes no pointer events; what it conveys is announced in the canvas's
status line instead, so the information is not carried by colour or cursor alone. Forced-colors
rules are explicit.

## Evidence

`scripts/create-studio-canvas-browser.mjs` (loopback only) — 16 rendered checks, 0 axe violations,
and no document overflow, including an axe pass taken **while a drag is in progress**. It measures
the position a drop produces, that a cancelled or refused drag changes nothing *anywhere on the
screen*, one-undo-per-drop, drag-to-reorder with undo/redo, that selection follows the dragged layer,
that panning drops nothing, that resolution survives a 120% canvas transform, and the right-to-left
row.

Unit: `interaction.test.ts` (11) covers the machine's transitions and `insertionIndex` in both
directions; `insert-position.test.ts` (5) covers the new `index` argument, including that an invalid
position is refused and changes nothing.

Negative controls run against the shipped page and were restored afterwards; neither was committed.

1. The direction term removed from the drop call — the right-to-left check fails with
   `'Continue' !== 'Email address'`: the left-edge drop prepends instead of appending.
2. A released drag falling back to a default target instead of cancelling — the refused-drop check
   fails on the **screen** count (5 ≠ 4): the node lands in the wrong container, which a check that
   only looked at the expected container would have missed. That hole was found by this control and
   the gate was widened before the control was accepted.

## What this does not do

- **No keyboard equivalent of choosing a drop position.** The library is operable from the keyboard
  (Enter inserts at the default position) and layers still move with Move up/down and Move into
  container, so nothing is keyboard-unreachable — but a keyboard user cannot yet pick an index. That
  is the next bounded slice, not a claim made here.
- No auto-scroll while dragging near a canvas edge.
- Touch and trackpad go through the same pointer events but are not driven by the gate; only a mouse
  pointer is measured.
- Chromium only; no manual assistive-technology certification.
