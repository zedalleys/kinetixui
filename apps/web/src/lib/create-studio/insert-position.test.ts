// `insert` gained a position in M3-A so that a drop can land where the pointer is rather than always
// at the end. These cover the new argument only; the rest of `insert` is covered in model.test.ts.
import { describe, expect, it } from "vitest";
import { createDocument, findNode } from "./model";
import { execute, newHistory } from "./commands";

const seed = () => {
  // A frame holding three Buttons, so a position can be read off the order.
  let history = newHistory(createDocument("proj_insertposition", "Positions", "2026-11-13T00:00:00Z"));
  const frameId = history.doc.pages[0].root.children![0].id;
  for (const text of ["a", "b", "c"]) {
    history = execute(history, { type: "insert", parentId: frameId, ref: "component:Button" });
    history = execute(history, { type: "props", ids: history.selection, patch: { text } });
  }
  return { history, frameId };
};
const texts = (history: ReturnType<typeof newHistory>, frameId: string) =>
  findNode(history.doc, frameId)!.children!.map(child => String(child.props?.text ?? ""));

describe("inserting at a position", () => {
  it("appends when no position is given, as every pre-M3 call site expects", () => {
    const { history, frameId } = seed();
    const next = execute(history, { type: "insert", parentId: frameId, ref: "component:Badge" });
    expect(texts(next, frameId)).toEqual(["a", "b", "c", "New"]);
  });

  it("places the new node at the given position", () => {
    const { history, frameId } = seed();
    expect(texts(execute(history, { type: "insert", parentId: frameId, ref: "component:Badge", index: 0 }), frameId)).toEqual(["New", "a", "b", "c"]);
    expect(texts(execute(history, { type: "insert", parentId: frameId, ref: "component:Badge", index: 2 }), frameId)).toEqual(["a", "b", "New", "c"]);
    expect(texts(execute(history, { type: "insert", parentId: frameId, ref: "component:Badge", index: 3 }), frameId)).toEqual(["a", "b", "c", "New"]);
  });

  it("refuses a position outside the destination, and changes nothing", () => {
    const { history, frameId } = seed();
    const before = structuredClone(history.doc);
    for (const index of [-1, 4, 1.5, Number.NaN]) {
      expect(() => execute(history, { type: "insert", parentId: frameId, ref: "component:Badge", index })).toThrow("Invalid destination index");
    }
    expect(history.doc).toEqual(before);
  });

  it("still refuses a destination that is not a container, position or not", () => {
    const { history, frameId } = seed();
    const buttonId = findNode(history.doc, frameId)!.children![0].id;
    expect(() => execute(history, { type: "insert", parentId: buttonId, ref: "component:Badge", index: 0 })).toThrow("legal container");
  });

  it("selects the newly placed node, so it can be edited straight away", () => {
    const { history, frameId } = seed();
    const next = execute(history, { type: "insert", parentId: frameId, ref: "component:Badge", index: 1 });
    expect(findNode(next.doc, next.selection[0])!.ref).toBe("component:Badge");
    expect(texts(next, frameId)[1]).toBe("New");
  });
});
