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

---

# M3-C: the effective width, and where the guide is drawn

An independent exact-head review of the restacked M3 branch (PR #658) found two defects in the work
above, and measuring them found two more. All four are the same kind of mistake: **the affordance
read one thing while the frame rendered another**, and every one of the 25 checks above passes with
them in place.

## 1. The handle read base props, not the effective ones

`presentation.ts` resolves a node's rendered style through `responsiveProps(node, editWidth)`, so at
a 960 viewport a frame with a desktop width override **renders the override**. But `node-view.tsx`
built its props from base `node.props` and read `width` and `widthMode` from that. Consequences,
all measured:

- `aria-valuenow` and `aria-valuetext` announced the base width while the frame showed the override.
- Every keyboard press at a breakpoint wrote `base + step`, so the **second** press wrote the same
  width again: from a base of 320 with an override of 420, three Shift+ArrowRight presses gave
  `330, 330, 330` instead of `430, 440, 450`. The original check pressed exactly once, which is why
  it could not see this.
- A pointer drag was handed the handle's own width, so it restarted from the base: 40px of travel
  from an override of 450 committed about 360 instead of about 490.
- `resizable` tested the base `widthMode`, so a frame overridden to **fill** still offered a
  fixed-width handle — a control writing a width the frame does not use.

The repair is one resolved props object, used for exactly the two reads that concern the frame's
geometry.

## 2. The guide was drawn on the wrapper's edge

`ResizeOverlay` measured `[data-studio-node]`, the full-width `.studio-node` wrapper, rather than
the frame's own `<section>`. M3-A had already moved the **handle** onto the frame's rendered edge
and measured a 0px offset there; that repair never reached this overlay. So on a 320px frame in a
960px artboard the guide and its width label sat a measured **560px** from the edge they claimed to
align, while the handle tracked the frame. The checks above assert the guide's presence and its
snapped class, never its position, which is why they pass.

## 3. The guide trailed the frame by one gesture step

Found by measuring the repair for 2. Reading the rect in the render body reads the DOM **as it still
is**, before the commit that applies the candidate width — a consistent 2px at a twelve-step drag,
and proportionally more the faster the pointer moves. The measurement now happens in a layout
effect, after the style lands and before paint.

## 4. In a right-to-left document the guide was mirrored twice

Also found by measuring. `edge` is a physical distance from the canvas's left, read off a rect, but
it was applied with `inset-inline-start`, which resolves to `right` in an RTL document. Measured
**127px** on the far side of the edge it was meant to mark. The line is now placed with `left`; the
label, which genuinely belongs on the inline side, is mirrored explicitly.

## Rendered verification

`scripts/create-studio-canvas-browser.mjs` is now **35 checks, 0 axe violations** (from 25). The ten
new ones measure:

| check | measured |
|---|---|
| repeated keyboard resizing at a breakpoint | base 320, override 420 → `430, 440, 450` |
| the announcement at a breakpoint | `aria-valuenow` and `aria-valuetext` both the override |
| base width versus breakpoint width | 390 viewport announces 320, 960 announces 450, and the frame renders 450 |
| pointer resize from an override | 450 + 40px travel → about 490, and not about 360 |
| fixed versus fill mode | a frame overridden to fill offers **no** handle and renders at the artboard's content width |
| a narrow frame in a wider container | wrapper 608px wider than the frame, so the two edges cannot be confused |
| the guide on the rendered edge | guide centre within **2px** of the frame's own edge, 560px from the wrapper's |
| a snapped guide | drawn at the rendered edge it announces, within 2px, label `768px · Tablet · 768px` |
| the guide under the camera | within 2px at 120% zoom |
| a camera pan during a resize | the frame moved 24px with the candidate width unchanged, and the guide stayed **1px** from its edge |
| an editing-viewport change during a resize | 960 → 390 from the keyboard, the frame shrank from 600px, the candidate width unchanged, the guide still on the edge |
| the measurement settles | the guide's style rewritten **0** times in 600ms with the pointer perfectly still |
| the canvas resizing with no render at all | the canvas changed width by more than 50px and the RTL label stayed beside the guide |
| the guide in RTL | on the frame's own **left** edge within 2px, with the right edge 370px away, and the label on the leading side |
| keyboard reachability | the handle focusable with slider semantics, one press advancing the effective width by one |
| 200% text in reduced motion | root font size 32px, `prefers-reduced-motion` actually matching, the handle still on the frame's edge, 0 axe violations, no runtime error |

### 5. A pan during a resize left the guide behind

Reported by an independent exact-head review of the repair branch. The canvas's own arrow-key
handler pans by 24px and fires only while the canvas *itself* holds focus — which a pointer resize
never takes away, because the handle's pointer-down calls `preventDefault()` and so the default
focus change never happens. An arrow press mid-drag therefore moves `.studio-world`, and the frame
with it, while the candidate width and the snap guide are both unchanged: a measurement keyed only
on those stayed at coordinates the frame had already left. Zoom moves the frame the same way.

The camera transform is now a dependency of the measurement. Its check measures both preconditions
before asserting anything — that focus really is still on the canvas, and that the pan really did
move the rendered frame — because a check that silently failed to do either would pass against the
very defect it exists for.

### 6. The viewport changing mid-resize, and the class behind defects 3, 5 and 6

A second exact-head review found the same mistake again: the viewport select keeps focus exactly as
the canvas does, so switching it mid-drag changes the **artboard's** width and the frame moves
through its own `max-width: 100%` — while the candidate width, the guide and the camera are all
unchanged.

Two findings of one shape is the signal. **A dependency list that enumerates the causes which can
invalidate a measurement is a fail-open**, and the right repair is not a third cause but to stop
naming any: the layout effect now runs after **every** commit, with no dependency list. Every state
that can move the frame lives in this component's parent, so every such change arrives here as a
commit, and the 0.5px identity guard is what makes running each time safe — an unchanged reading
returns the previous object and React bails out of the re-render.

That still leaves geometry that moves with **no render at all**, so the canvas and the frame's
section are observed directly with a `ResizeObserver`. The gated case is the window resizing: the
canvas's height is pinned by the workspace's own `min-height`, and `edge` is invariant under a pure
translation, so the quantity that actually goes stale is the canvas's **width** — which in RTL is
what places the width label. The check measures that precondition rather than assuming it.

Three measurement rules this slice earned, each of which first produced a false positive:

- **Read the guide and the frame in one evaluation**, after the overlay has rendered the candidate
  width the handle announces. Two separate reads straddle a render, and the few pixels of lag are
  indistinguishable from a placement defect.
- **A 390 viewport hides defect 2 entirely**, because there the frame fills the artboard and the two
  edges coincide. Every earlier check runs at 390.
- **Wait on the perturbation, never on the quantity asserted.** The pan check waits for
  `.studio-world`'s transform to change and then two animation frames, so the overlay's own
  re-measurement has been painted — but it never waits for the guide to reach the edge, which is
  exactly what it is there to measure.

### What naming no causes costs, and the one assertion that is ungated

A measurement that runs on every commit and writes state has to reach a fixed point, so that is
measured: the churn on the guide's own `style` while a held drag is perfectly still. **0 rewrites in
600ms.** The identity guard is what makes it terminate — it returns the *previous* object when every
field is within 0.5px, which is what lets React bail out of the re-render.

That assertion is **ungated, and the gate says so in its own output.** Removing the guard does not
make the measurement merely churn: it makes the editor stop responding, and the control dies on the
inspector's own Width field 22 checks before the settle assertion is reached. So that control is
recorded as **evidence rather than proof**, with a weaker bar it can actually meet — the gate must
fail, and the failure must not be one another control owes, or it would be credited for someone
else's cause. A limitation printed is worth more than an assertion whose own control cannot reach it.

## Negative controls

`scripts/create-studio-m3-resize-negative-controls.mjs` reintroduces each defect as a source
mutation — these live in React's own reading of the document, so there is no seam to inject through
— in a **disposable git worktree** at the exact HEAD, served by its own dev server, and runs the
real gate against it. The checkout is never modified, so an interrupted run cannot leave a mutation
behind. A control counts only if the gate exits **nonzero** and the **terminal** failure, after the
last `PASS` line, names the behaviour the repair protects: a grep over the whole output would match
the gate's own diagnostics, which quote these very messages.
