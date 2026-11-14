// The canvas interaction state machine.
//
// Every direct-manipulation gesture in the editor — panning the camera, dragging a component out of
// the library, dragging an existing layer to a new home — passes through this reducer. It is pure so
// that cancellation, pointer identity and the press-versus-drag distinction can be tested without a
// browser, and so that two gestures can never run at once: there is exactly one state.
//
// It deliberately owns no document state. A gesture that should change the document ends by
// returning a `commit`, which the editor turns into an ordinary command through the existing
// history. Nothing here writes to the document, so an interrupted gesture cannot leave a partial one.

/** Where a dragged thing would land: a container node and a position among its children. */
export type DropTarget = { parentId: string; index: number };

export type Interaction =
  | { mode: "idle" }
  | { mode: "pan"; pointerId: number; originX: number; originY: number; startX: number; startY: number }
  // A press that has not yet travelled far enough to be a drag. It may still become a click.
  | { mode: "pending"; pointerId: number; originX: number; originY: number; intent: DragIntent }
  | { mode: "drag"; pointerId: number; x: number; y: number; intent: DragIntent; target: DropTarget | null; rejected: string | null }
  // Resizing has no press-versus-drag ambiguity — the handle does nothing but resize — so it starts
  // engaged. `width` is the candidate the document would take; nothing is written until release.
  | { mode: "resize"; pointerId: number; originX: number; nodeId: string; startWidth: number; width: number; guide: string | null };

/** What a drag would do if it were dropped: insert a new node, or move the selected ones. */
export type DragIntent = { kind: "insert"; ref: string } | { kind: "move"; ids: string[] };

export type InteractionEvent =
  | { type: "pan-start"; pointerId: number; x: number; y: number; offsetX: number; offsetY: number }
  | { type: "drag-start"; pointerId: number; x: number; y: number; intent: DragIntent }
  | { type: "resize-start"; pointerId: number; x: number; nodeId: string; width: number }
  | { type: "pointer-move"; pointerId: number; x: number; y: number; target?: DropTarget | null; rejected?: string | null; width?: number; guide?: string | null }
  | { type: "pointer-up"; pointerId: number }
  | { type: "cancel" };

export type Commit =
  | { kind: "pan"; x: number; y: number }
  | { kind: "press"; intent: DragIntent }
  | { kind: "insert"; ref: string; parentId: string; index: number }
  | { kind: "move"; ids: string[]; parentId: string; index: number }
  | { kind: "resize"; nodeId: string; width: number };

export const IDLE: Interaction = { mode: "idle" };

/**
 * How far a pointer must travel before a press becomes a drag. Below it the gesture is a press, so a
 * plain click on a library item still inserts at the default position and a click on the canvas still
 * selects — pointer-based dragging does not cost the editor its click behaviour.
 */
export const DRAG_THRESHOLD = 4;

const owns = (state: Interaction, pointerId: number): state is Exclude<Interaction, { mode: "idle" }> =>
  state.mode !== "idle" && state.pointerId === pointerId;

/**
 * Advance the machine. Returns the next state and, when a gesture reached a conclusion that the
 * editor should act on, a `commit`. Any event from a pointer that does not own the current gesture
 * is ignored, so a second finger or a stray pointer cannot steer someone else's drag.
 */
export function reduce(state: Interaction, event: InteractionEvent): { state: Interaction; commit?: Commit } {
  if (event.type === "cancel") return { state: IDLE };
  if (event.type === "pan-start" || event.type === "drag-start" || event.type === "resize-start") {
    // One gesture at a time. A press that arrives mid-gesture is dropped rather than interleaved.
    if (state.mode !== "idle") return { state };
    if (event.type === "pan-start") return { state: { mode: "pan", pointerId: event.pointerId, originX: event.x, originY: event.y, startX: event.offsetX, startY: event.offsetY } };
    if (event.type === "resize-start") return { state: { mode: "resize", pointerId: event.pointerId, originX: event.x, nodeId: event.nodeId, startWidth: event.width, width: event.width, guide: null } };
    return { state: { mode: "pending", pointerId: event.pointerId, originX: event.x, originY: event.y, intent: event.intent } };
  }
  if (!owns(state, event.pointerId)) return { state };
  if (event.type === "pointer-move") {
    if (state.mode === "pan") {
      return { state, commit: { kind: "pan", x: state.startX + event.x - state.originX, y: state.startY + event.y - state.originY } };
    }
    if (state.mode === "resize") {
      return { state: { ...state, width: event.width ?? state.width, guide: event.guide ?? null } };
    }
    if (state.mode === "pending") {
      const travelled = Math.hypot(event.x - state.originX, event.y - state.originY);
      if (travelled < DRAG_THRESHOLD) return { state };
      return { state: { mode: "drag", pointerId: state.pointerId, x: event.x, y: event.y, intent: state.intent, target: event.target ?? null, rejected: event.rejected ?? null } };
    }
    return { state: { ...state, x: event.x, y: event.y, target: event.target ?? null, rejected: event.rejected ?? null } };
  }
  // pointer-up
  if (state.mode === "pan") return { state: IDLE };
  // A handle pressed and released without moving is not a change, so it is not a history step.
  if (state.mode === "resize") return state.width === state.startWidth
    ? { state: IDLE }
    : { state: IDLE, commit: { kind: "resize", nodeId: state.nodeId, width: state.width } };
  if (state.mode === "pending") return { state: IDLE, commit: { kind: "press", intent: state.intent } };
  // A drag released over nothing legal is a cancellation, not a silent insertion somewhere else.
  if (!state.target) return { state: IDLE };
  const { parentId, index } = state.target;
  return {
    state: IDLE,
    commit: state.intent.kind === "insert"
      ? { kind: "insert", ref: state.intent.ref, parentId, index }
      : { kind: "move", ids: state.intent.ids, parentId, index },
  };
}

export type Rect = { top: number; bottom: number; left: number; right: number };

/**
 * Which position among `rects` a point falls at, counting every child whose midpoint along the
 * layout axis precedes the point. `dir` reverses the comparison on a row in a right-to-left
 * document, where the first child sits at the right edge: the index is a position in the document,
 * not a position on the screen.
 */
export function insertionIndex(rects: Rect[], point: { x: number; y: number }, axis: "row" | "column", dir: "ltr" | "rtl" = "ltr"): number {
  let index = 0;
  for (const rect of rects) {
    const before = axis === "column"
      ? point.y >= (rect.top + rect.bottom) / 2
      : dir === "rtl"
        ? point.x <= (rect.left + rect.right) / 2
        : point.x >= (rect.left + rect.right) / 2;
    if (before) index += 1;
  }
  return index;
}

export type Guide = { value: number; label: string };

/**
 * The width a resize should take: the pointer's own value, clamped to what the layout registry
 * permits, then pulled to the nearest guide within `tolerance`. Pure, so what snapping chooses can
 * be read off a test rather than off a screen recording.
 *
 * Guides are offered in the order the caller considers meaningful and ties go to the earlier one, so
 * a caller can rank a breakpoint above an 8px step without the function knowing what either means.
 */
export function snapWidth(
  target: number,
  guides: readonly Guide[],
  { min, max, tolerance }: { min: number; max: number; tolerance: number },
): { width: number; guide: Guide | null } {
  const clamped = Math.round(Math.min(max, Math.max(min, target)));
  let best: Guide | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const guide of guides) {
    if (guide.value < min || guide.value > max) continue;
    const distance = Math.abs(guide.value - clamped);
    if (distance <= tolerance && distance < bestDistance) { best = guide; bestDistance = distance; }
  }
  return best ? { width: best.value, guide: best } : { width: clamped, guide: null };
}
