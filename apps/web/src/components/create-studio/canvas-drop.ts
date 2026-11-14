// Turning a pointer position on the canvas into a legal place in the document.
//
// The canvas is zoomed and panned by a CSS transform, so screen coordinates do not map to document
// coordinates by arithmetic. `elementFromPoint` and `getBoundingClientRect` are read after that
// transform, which is why resolution is done against the real DOM rather than against a model of it.
// The geometry decision itself lives in `insertionIndex`, which is pure and tested on its own.
import { ADAPTERS } from "@/lib/create-studio/registry";
import { findNode, walk, type Document, type Node } from "@/lib/create-studio/model";
import { insertionIndex, type DropTarget, type Rect } from "@/lib/create-studio/interaction";

export const containerAccepts = (node: Node | undefined): node is Node =>
  !!node && (node.kind === "slot" || (!!node.ref && !!ADAPTERS[node.ref]?.container));

/** The ids of everything inside `ids`, so a layer can never be dropped into its own subtree. */
export function subtreeIds(doc: Document, ids: string[]): Set<string> {
  const all = new Set<string>();
  for (const id of ids) {
    const node = findNode(doc, id);
    if (node) walk(node, child => all.add(child.id));
  }
  return all;
}

export type Resolution = { target: DropTarget | null; rejected: string | null; rect: Rect | null; indicator: Rect | null };

const NOT_A_CONTAINER = "Drop into a frame, stack, grid or card.";
const INSIDE_ITSELF = "A layer cannot be dropped inside itself.";

/**
 * Resolve the point (`x`, `y`, in client coordinates) to a drop target, or to the reason there is
 * none. `rect` is the container to highlight; `indicator` is where the insertion line belongs.
 * Both are client rectangles, left to the caller to place in its own coordinate space.
 */
export function resolveDrop(
  root: HTMLElement,
  doc: Document,
  x: number,
  y: number,
  options: { excluded?: Set<string>; dir?: "ltr" | "rtl" } = {},
): Resolution {
  const element = root.ownerDocument.elementFromPoint(x, y);
  const empty: Resolution = { target: null, rejected: NOT_A_CONTAINER, rect: null, indicator: null };
  if (!(element instanceof HTMLElement) || !root.contains(element)) return { ...empty, rejected: null };
  const excluded = options.excluded ?? new Set<string>();
  // Walk outwards until a container that would accept the drop is found, so a pointer over a Button
  // inside a Stack resolves to the Stack rather than being refused.
  let host: HTMLElement | null = element.closest("[data-studio-drop]");
  while (host) {
    const id = host.getAttribute("data-studio-drop")!;
    const node = findNode(doc, id);
    if (containerAccepts(node) && !excluded.has(id)) {
      const children = childElements(host);
      const rects = children.map(child => child.getBoundingClientRect());
      const axis = layoutAxis(node);
      const index = insertionIndex(rects, { x, y }, axis, options.dir ?? "ltr");
      return { target: { parentId: id, index }, rejected: null, rect: host.getBoundingClientRect(), indicator: indicatorRect(host.getBoundingClientRect(), rects, index, axis) };
    }
    if (excluded.has(id)) return { target: null, rejected: INSIDE_ITSELF, rect: null, indicator: null };
    host = host.parentElement?.closest("[data-studio-drop]") ?? null;
  }
  return empty;
}

/** The elements of a container's own children — not its grandchildren, which nest inside them. */
function childElements(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>("[data-studio-node]")].filter(
    child => child.parentElement?.closest("[data-studio-drop]") === host,
  );
}

const layoutAxis = (node: Node): "row" | "column" =>
  node.ref === "layout:stack" && node.props?.axis === "row" ? "row" : node.ref === "layout:grid" ? "row" : "column";

/** A thin rectangle on the edge where the new node would appear. */
function indicatorRect(host: Rect, rects: Rect[], index: number, axis: "row" | "column"): Rect {
  const sorted = [...rects].sort((a, b) => (axis === "column" ? a.top - b.top : a.left - b.left));
  const before = sorted[index - 1];
  const after = sorted[index];
  if (axis === "column") {
    const edge = after ? after.top : before ? before.bottom : host.top + 4;
    return { top: edge - 1, bottom: edge + 1, left: host.left, right: host.right };
  }
  const edge = after ? after.left : before ? before.right : host.left + 4;
  return { top: host.top, bottom: host.bottom, left: edge - 1, right: edge + 1 };
}
