import { describe, expect, it } from "vitest";
import { DRAG_THRESHOLD, IDLE, insertionIndex, reduce, type DragIntent, type Interaction } from "./interaction";

const insert = { kind: "insert", ref: "component:Button" } as const;
const move: DragIntent = { kind: "move", ids: ["node_2"] };
const run = (events: Parameters<typeof reduce>[1][], from: Interaction = IDLE) =>
  events.reduce<{ state: Interaction; commits: unknown[] }>((acc, event) => {
    const { state, commit } = reduce(acc.state, event);
    return { state, commits: commit ? [...acc.commits, commit] : acc.commits };
  }, { state: from, commits: [] });

const press = { type: "drag-start", pointerId: 1, x: 100, y: 100, intent: insert } as const;
const far = (extra = 0) => ({ type: "pointer-move", pointerId: 1, x: 100 + DRAG_THRESHOLD + 10 + extra, y: 100, target: { parentId: "node_1", index: 2 } } as const);

describe("the canvas interaction machine", () => {
  it("treats a press that never travels as a press, not a drag", () => {
    const { state, commits } = run([press, { type: "pointer-move", pointerId: 1, x: 101, y: 102 }, { type: "pointer-up", pointerId: 1 }]);
    expect(state).toEqual(IDLE);
    expect(commits).toEqual([{ kind: "press", intent: insert }]);
  });

  it("stays a press right up to the threshold and becomes a drag past it", () => {
    expect(run([press, { type: "pointer-move", pointerId: 1, x: 100 + DRAG_THRESHOLD - 0.1, y: 100 }]).state.mode).toBe("pending");
    expect(run([press, { type: "pointer-move", pointerId: 1, x: 100 + DRAG_THRESHOLD, y: 100 }]).state.mode).toBe("drag");
  });

  it("commits an insertion at the resolved container and index", () => {
    const { commits } = run([press, far(), { type: "pointer-up", pointerId: 1 }]);
    expect(commits).toEqual([{ kind: "insert", ref: "component:Button", parentId: "node_1", index: 2 }]);
  });

  it("commits a move of every dragged layer", () => {
    const { commits } = run([
      { type: "drag-start", pointerId: 1, x: 100, y: 100, intent: { kind: "move", ids: ["node_2", "node_3"] } },
      far(), { type: "pointer-up", pointerId: 1 },
    ]);
    expect(commits).toEqual([{ kind: "move", ids: ["node_2", "node_3"], parentId: "node_1", index: 2 }]);
  });

  it("releasing over an illegal target commits nothing", () => {
    const { state, commits } = run([
      press,
      { type: "pointer-move", pointerId: 1, x: 200, y: 100, target: null, rejected: "Drop into a frame." },
      { type: "pointer-up", pointerId: 1 },
    ]);
    expect(state).toEqual(IDLE);
    expect(commits).toEqual([]);
  });

  it("cancelling mid-drag commits nothing and returns to idle", () => {
    const { state, commits } = run([press, far(), { type: "cancel" }, { type: "pointer-up", pointerId: 1 }]);
    expect(state).toEqual(IDLE);
    expect(commits).toEqual([]);
  });

  it("ignores a second pointer trying to steer or end someone else's drag", () => {
    const started = run([press, far()]);
    expect(reduce(started.state, { type: "pointer-move", pointerId: 9, x: 500, y: 500, target: { parentId: "node_9", index: 0 } }).state).toEqual(started.state);
    const intruder = reduce(started.state, { type: "pointer-up", pointerId: 9 });
    expect(intruder.commit).toBeUndefined();
    expect(intruder.state).toEqual(started.state);
  });

  it("refuses to start a second gesture while one is running", () => {
    const panning = run([{ type: "pan-start", pointerId: 1, x: 0, y: 0, offsetX: 10, offsetY: 10 }]);
    expect(reduce(panning.state, { type: "drag-start", pointerId: 2, x: 5, y: 5, intent: move }).state).toEqual(panning.state);
  });

  it("pans by the pointer's travel from where the press started", () => {
    const { commits } = run([
      { type: "pan-start", pointerId: 1, x: 100, y: 100, offsetX: 24, offsetY: 24 },
      { type: "pointer-move", pointerId: 1, x: 140, y: 70 },
    ]);
    expect(commits).toEqual([{ kind: "pan", x: 64, y: -6 }]);
  });
});

describe("insertionIndex", () => {
  const column = [
    { top: 0, bottom: 20, left: 0, right: 100 },
    { top: 20, bottom: 40, left: 0, right: 100 },
  ];
  it("counts the children a point has passed down a column", () => {
    expect(insertionIndex(column, { x: 50, y: 5 }, "column")).toBe(0);
    expect(insertionIndex(column, { x: 50, y: 15 }, "column")).toBe(1);
    expect(insertionIndex(column, { x: 50, y: 39 }, "column")).toBe(2);
  });
  const row = [
    { top: 0, bottom: 20, left: 0, right: 100 },
    { top: 0, bottom: 20, left: 100, right: 200 },
  ];
  it("reads a row in the document's direction, not the screen's", () => {
    expect(insertionIndex(row, { x: 10, y: 10 }, "row")).toBe(0);
    expect(insertionIndex(row, { x: 190, y: 10 }, "row")).toBe(2);
    // The same point in a right-to-left document is near the END of the row's first child.
    expect(insertionIndex(row, { x: 10, y: 10 }, "row", "rtl")).toBe(2);
    expect(insertionIndex(row, { x: 190, y: 10 }, "row", "rtl")).toBe(0);
  });
});
