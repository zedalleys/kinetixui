# Create Studio M3-B — resizing a frame, with guides and snapping

What a person can do that they could not before: drag a frame's edge to set its width, see the edge
line up against the viewport, the breakpoints and the other frames on the screen, and have it snap to
one. The same handle does it from the keyboard. When a breakpoint is selected the width is written as
that breakpoint's override, which is what makes this responsive geometry rather than a single number.

## Scope: why only a frame's width

`docs/create/layout-registry.json` declares exactly one resizable dimension — `layout:section.width`,
240–1920. A Grid's `columns` and a Stack's `gap` are enumerated choices, not continuous geometry, and
inventing a second contract for them is not this slice's job. So: one handle, on the inline-end edge
of a selected frame whose `widthMode` is `fixed`.

## How a resize is kept out of the document until it is finished

Resizing is a mode of the same state machine as dragging (`interaction.ts`). It starts engaged —
there is no press-versus-drag ambiguity, the handle does nothing else — and carries the *candidate*
width. The document is written once, on release, through the ordinary `props` or `responsive`
command, so:

- **One drag is one history step**, and one undo restores the previous width.
- **A handle pressed and released without moving is not a change**, so it is not a history entry.
- **Escape abandons it** and the preview width disappears with it.
- The live feedback is a style override on the node being resized, not a document edit.

## Snapping

`snapWidth` is pure, so what snapping chooses can be read off a test rather than off a screen
recording. It clamps to the registry's limits *first*, then pulls to the nearest guide within 8
document pixels. A guide outside the permitted range can never be chosen however near the pointer
gets, and ties go to the earlier guide, so the caller's ranking decides without the function knowing
what a breakpoint is.

The guides, most meaningful first: the current viewport, then each breakpoint from the responsive
contract (not from literals), then every other frame's width on the screen. A snapped edge is drawn
differently from a free one **and announced** — `"390 pixels · snapped to Viewport · 390px"` — so the
information is not carried by a 1px line alone.

## Two defects this slice found by measuring

1. **The handle sat on the wrong edge.** It was anchored to the node's wrapper, which is a full-width
   block, so on a narrow frame it floated far to the right of the frame it resizes — and once the
   camera moved it left the clipped canvas entirely and could not be pressed at all. It is now
   positioned at `min(100%, <width>px)`, following the frame's own `max-width:100%` cap. The gate
   measures the offset between the handle's centre and the frame's rendered right edge: **0px**.
2. **Escape did not cancel a gesture while focus was in a property field.** The keyboard handler
   ignored keys whose target was an input — reasonable for editor shortcuts, wrong for a pointer
   gesture, which is global and does not belong to whatever has focus. Since typing a width and then
   reaching for the handle leaves focus in exactly that field, this was the normal case, not an edge
   case. An in-flight gesture is now checked before the field bail-out, and the gate asserts focus is
   still in the field so the check stays meaningful.

## Evidence

`scripts/create-studio-canvas-browser.mjs` now carries 25 rendered checks, 0 axe violations. The
resize ones measure: slider semantics on the handle (`aria-valuemin/max/now/valuetext`) · the handle
on the frame's own edge · a drag resizing by the pointer's travel, as one undo · a release 8px short
of the viewport guide committing **exactly 390** · a release outside the tolerance keeping the
pointer's own width · the registry minimum holding however far the pointer travels · Escape
abandoning the resize in both document and preview, with focus in a field · the keyboard path
(±1, ±10, Home, End) · a breakpoint resize recorded as `Overridden at Desktop` with the base width
untouched · and **120 screen pixels at 120% zoom recording exactly 100 document pixels**.

Unit: `interaction.test.ts` grew to 19 — the resize transitions (commit on release, no commit when
unmoved, no commit when cancelled, no second gesture, no foreign pointer) and `snapWidth` (free
width, inside and outside the tolerance, clamping before snapping, an out-of-range guide never
chosen, nearest-wins and tie-to-earlier).

Negative controls, run against the shipped page and restored, none committed:

3. The camera divisor removed from the resize travel — the zoom check fails with
   `must record about 100 document pixels (got 120)`.
4. `snapWidth` returning the clamped width always — the snap check fails at
   `a snapped edge must be drawn differently from a free one`.

## What this does not do

- Width only. No height, no corner handles, no multi-node resize.
- Each **keyboard** step is its own history entry, unlike a pointer drag which is one. Matching them
  would mean coalescing adjacent same-property commands in the history, which is a change to the
  history contract and belongs in its own slice.
- The canvas clips: a frame whose edge sits outside the visible canvas puts its handle out of pointer
  reach, and the camera has to be panned or zoomed out first. The keyboard path is unaffected. The
  gate asserts the handle is genuinely under the point it presses, so this fails loudly rather than
  silently doing nothing.
- No guides for alignment between *sibling* edges mid-drag beyond their widths appearing as snap
  candidates; no distance badges between nodes.
- Chromium only; mouse pointer only; no manual assistive-technology certification.
