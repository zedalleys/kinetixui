"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const DEFAULT_WIDTH = 160;
const DEFAULT_MIN_WIDTH = 60;
const DEFAULT_ROW_HEIGHT = 40;

export interface DataGridColumn<TData> {
  id: string;
  header: React.ReactNode;
  /** rendered cell content */
  cell: (row: TData, rowIndex: number) => React.ReactNode;
  /** raw comparable value — required for `sortable` and used to seed inline edits */
  value?: (row: TData) => string | number;
  width?: number;
  minWidth?: number;
  /** fixed to this side, not draggable, and excluded from the reorder sequence */
  pinned?: "left" | "right";
  sortable?: boolean;
  /** double-click — or Enter / F2 on the focused cell — swaps it for a text input; commit fires on Enter/blur, Escape cancels */
  editable?: boolean;
  onCellEdit?: (row: TData, rowIndex: number, value: string) => void;
}

/** A rectangular range of cells, in display order (after sorting and column reordering). */
export interface DataGridRange {
  /** first and last selected row index, inclusive, into the *displayed* (sorted) rows */
  rows: [number, number];
  /** ids of the selected columns, in display order */
  columns: string[];
}

/** The selection: the range being edited (`rows` / `columns`, the last one) plus every range in `ranges`. */
export interface DataGridSelection extends DataGridRange {
  /** every selected range, in the order they were added — more than one after Ctrl/Cmd+click or Ctrl+Space */
  ranges: DataGridRange[];
}

export interface DataGridProps<TData> {
  columns: DataGridColumn<TData>[];
  data: TData[];
  /** viewport height — a number (px) or any CSS height value; enables row virtualization */
  height: number | string;
  rowHeight?: number;
  overscan?: number;
  getRowId?: (row: TData, index: number) => React.Key;
  className?: string;
  /**
   * Opt in to range selection: drag, or Shift+arrows / Shift+click, to extend a rectangle from the
   * anchor cell; Ctrl/Cmd+click or Ctrl+Space starts an additional, separate range; Ctrl/Cmd+A selects
   * everything; Ctrl/Cmd+C copies the ranges as tab-separated text (each column's `value()`; empty where
   * a column has none; ranges separated by a blank line); Esc clears; dragging past the grid's edge scrolls it. Sets aria-multiselectable.
   */
  selectable?: boolean;
  /** fires when the selected range changes; `null` when it is cleared */
  onSelectionChange?: (selection: DataGridSelection | null) => void;
}

type SortState = { columnId: string; direction: "asc" | "desc" } | null;

/**
 * DataGrid — the "product on its own" the `COMPONENT-ADDITIONS.md` Tier 3
 * entry calls for: row-virtualized (same fixed-row-height windowing as
 * `VirtualList`), with column resize, drag-to-reorder, left/right pin, single-
 * column sort, and double-click-to-edit cells. `DataTable` stays the
 * TanStack-Table-light option for a plain sortable/paginated table; reach for
 * `DataGrid` once the row count or column-manipulation needs outgrow it.
 *
 * Deliberately out of scope: column *virtualization* (only rows are
 * windowed — a grid with enough columns to need it is rare enough that this
 * isn't worth the added complexity) and multi-column sort. Rendered as ARIA
 * `grid`/`row`/`columnheader`/`gridcell` divs rather than a real `<table>` —
 * sticky-positioned pinned columns and a sticky header row need that
 * flexibility, at the cost of the native table-navigation semantics
 * `DataTable` still gets for free.
 */
function DataGrid<TData>({
  columns,
  data,
  height,
  rowHeight = DEFAULT_ROW_HEIGHT,
  overscan = 6,
  getRowId,
  className,
  selectable = false,
  onSelectionChange,
}: DataGridProps<TData>) {
  const columnById = React.useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const [order, setOrder] = React.useState(() => columns.map((c) => c.id));
  const [widths, setWidths] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c.id, c.width ?? DEFAULT_WIDTH])),
  );
  const [sort, setSort] = React.useState<SortState>(null);
  const [editing, setEditing] = React.useState<{ rowIndex: number; columnId: string } | null>(null);
  const dragIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const knownIds = columns.map((c) => c.id);
    const known = new Set(knownIds);
    setOrder((prev) => {
      const kept = prev.filter((id) => known.has(id));
      const added = knownIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
    setWidths((prev) => {
      const next = { ...prev };
      for (const c of columns) if (!(c.id in next)) next[c.id] = c.width ?? DEFAULT_WIDTH;
      return next;
    });
  }, [columns]);

  const leftPinned = columns.filter((c) => c.pinned === "left");
  const rightPinned = columns.filter((c) => c.pinned === "right");
  const unpinnedOrdered = order
    .filter((id) => columnById.get(id) && !columnById.get(id)!.pinned)
    .map((id) => columnById.get(id)!);
  const renderedColumns = [...leftPinned, ...unpinnedOrdered, ...rightPinned];

  const leftOffsets = React.useMemo(() => {
    const offsets: Record<string, number> = {};
    let acc = 0;
    for (const c of leftPinned) {
      offsets[c.id] = acc;
      acc += widths[c.id] ?? c.width ?? DEFAULT_WIDTH;
    }
    return offsets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, widths]);

  const rightOffsets = React.useMemo(() => {
    const offsets: Record<string, number> = {};
    let acc = 0;
    for (const c of [...rightPinned].reverse()) {
      offsets[c.id] = acc;
      acc += widths[c.id] ?? c.width ?? DEFAULT_WIDTH;
    }
    return offsets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, widths]);

  const totalWidth = renderedColumns.reduce((sum, c) => sum + (widths[c.id] ?? c.width ?? DEFAULT_WIDTH), 0);

  const sortedData = React.useMemo(() => {
    if (!sort) return data;
    const col = columnById.get(sort.columnId);
    if (!col?.value) return data;
    const indexed = data.map((row, index) => ({ row, index }));
    indexed.sort((a, b) => {
      const av = col.value!(a.row);
      const bv = col.value!(b.row);
      if (av === bv) return a.index - b.index;
      const cmp = av < bv ? -1 : 1;
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return indexed.map((entry) => entry.row);
  }, [data, sort, columnById]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(typeof height === "number" ? height : 0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setViewportHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const totalHeight = sortedData.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(sortedData.length, startIndex + Math.max(visibleCount, 0));
  const visibleRows = sortedData.slice(startIndex, endIndex);

  function toggleSort(columnId: string) {
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) return { columnId, direction: "asc" };
      if (prev.direction === "asc") return { columnId, direction: "desc" };
      return null;
    });
  }

  function beginResize(columnId: string, minWidth: number, startX: number, startWidth: number) {
    const handleMove = (ev: PointerEvent) => {
      setWidths((prev) => ({ ...prev, [columnId]: Math.max(minWidth, startWidth + (ev.clientX - startX)) }));
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  // After a keyboard commit/cancel, hand focus back to the cell that was being edited (a blur
  // commit — the user clicked or tabbed elsewhere — must not pull focus back).
  const restoreFocusRef = React.useRef<{ rowIndex: number; columnId: string } | null>(null);
  React.useEffect(() => {
    const target = restoreFocusRef.current;
    if (editing || !target) return;
    restoreFocusRef.current = null;
    containerRef.current?.querySelector<HTMLElement>(`[data-cell="${target.rowIndex}:${target.columnId}"]`)?.focus();
  }, [editing]);

  function endEdit(restoreFocus: boolean) {
    if (restoreFocus && editing) restoreFocusRef.current = { rowIndex: editing.rowIndex, columnId: editing.columnId };
    setEditing(null);
  }

  function commitEdit(column: DataGridColumn<TData>, row: TData, rowIndex: number, value: string, restoreFocus = false) {
    column.onCellEdit?.(row, rowIndex, value);
    endEdit(restoreFocus);
  }

  // ── keyboard model (ARIA grid pattern) ─────────────────────────────────────────────────────
  // The grid is ONE tab stop (roving tabindex). Arrows, Home/End (Ctrl = grid corners) and
  // PageUp/PageDown move the active cell; the header row is row -1. Rows are virtualized, so a move
  // first scrolls the target row into the rendered window and focus lands after the next render.
  const HEADER_HEIGHT = 40; // h-10
  type Pos = { row: number; columnId: string };
  const [active, setActive] = React.useState<Pos>({ row: -1, columnId: columns[0]?.id ?? "" });
  const pendingFocusRef = React.useRef<Pos | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  // ── range selection (opt-in) ──────────────────────────────────────────────────────────────
  type Anchor = { row: number; columnId: string };
  type Sel = { anchor: Anchor; end: Anchor };
  const [sel, setSel] = React.useState<Sel | null>(null);
  /** ranges committed before the current one (Ctrl/Cmd+click, Ctrl+Space) */
  const [extra, setExtra] = React.useState<Sel[]>([]);
  const dragRef = React.useRef<Anchor | null>(null);
  // Auto-scroll while drag-selecting: the pointer position is tracked on the window (it leaves the
  // grid, so cell mouseenter events stop), and a frame loop scrolls the grid and extends the range
  // to the cell under the pointer while the pointer is at or past an edge.
  const pointerRef = React.useRef<{ x: number; y: number } | null>(null);
  const frameRef = React.useRef(0);
  const autoScrollStepRef = React.useRef<() => boolean>(() => false);
  const dragEndedRef = React.useRef<() => void>(() => {});
  React.useEffect(() => {
    const tick = () => {
      frameRef.current = 0;
      if (dragRef.current && autoScrollStepRef.current()) frameRef.current = requestAnimationFrame(tick);
    };
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return;
      if (e.buttons !== 1) {
        dragRef.current = null; // the button was released outside the window
        dragEndedRef.current();
        return;
      }
      pointerRef.current = { x: e.clientX, y: e.clientY };
      if (!frameRef.current) frameRef.current = requestAnimationFrame(tick);
    };
    const end = () => {
      const wasDragging = dragRef.current !== null;
      dragRef.current = null;
      pointerRef.current = null;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      if (wasDragging) dragEndedRef.current();
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);
  const lastAutoCellRef = React.useRef<Pos | null>(null);
  const clearSel = () => {
    setSel(null);
    setExtra([]);
  };
  const onSelectionChangeRef = React.useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const lastEmittedRef = React.useRef("null");

  const rowCount = sortedData.length;
  const colIds = renderedColumns.map((c) => c.id);
  const activeCol = colIds.includes(active.columnId) ? active.columnId : (colIds[0] ?? "");
  const activeRow = Math.min(active.row, rowCount - 1);
  // if the active row has scrolled out of the rendered window, the header takes the tab stop so
  // the grid stays reachable by Tab
  const activeRendered = activeRow < 0 || (activeRow >= startIndex && activeRow < endIndex);
  const tabStop: Pos = { row: activeRendered ? activeRow : -1, columnId: activeCol };
  const colKey = colIds.join("|");
  const rects = React.useMemo(() => {
    if (!selectable) return [];
    const out: { r0: number; r1: number; c0: number; c1: number }[] = [];
    for (const s of sel ? [...extra, sel] : extra) {
      const a = colIds.indexOf(s.anchor.columnId);
      const b = colIds.indexOf(s.end.columnId);
      if (a < 0 || b < 0) continue;
      out.push({ r0: Math.min(s.anchor.row, s.end.row), r1: Math.max(s.anchor.row, s.end.row), c0: Math.min(a, b), c1: Math.max(a, b) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectable, sel, extra, colKey]);
  const hasSelection = rects.length > 0;
  const cellCount = rects.reduce((n, r) => n + (r.r1 - r.r0 + 1) * (r.c1 - r.c0 + 1), 0);
  const isSelectedCell = (row: number, colIdx: number) => rects.some((r) => row >= r.r0 && row <= r.r1 && colIdx >= r.c0 && colIdx <= r.c1);

  // Selection refers to displayed rows, so a re-sort or a different row count invalidates it.
  React.useEffect(() => {
    setSel(null);
    setExtra([]);
  }, [sort, rowCount]);

  React.useEffect(() => {
    if (!selectable) return;
    const ranges: DataGridRange[] = rects.map((r) => ({ rows: [r.r0, r.r1] as [number, number], columns: colIds.slice(r.c0, r.c1 + 1) }));
    const value: DataGridSelection | null = ranges.length ? { ...ranges[ranges.length - 1]!, ranges } : null;
    const key = JSON.stringify(value);
    if (key === lastEmittedRef.current) return;
    lastEmittedRef.current = key;
    onSelectionChangeRef.current?.(value);
    setAnnouncement(value ? `${cellCount} cells selected` : "Selection cleared");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectable, rects]);

  function extendSelection(fromRow: number, fromCol: string, toRow: number, toCol: string) {
    const anchor = sel?.anchor ?? { row: fromRow, columnId: fromCol };
    const end = { row: Math.max(0, Math.min(toRow, rowCount - 1)), columnId: toCol };
    setSel({ anchor, end });
    moveTo(end.row, end.columnId);
  }

  /** Start a new range at a cell, keeping the current one (the active cell counts when nothing is selected yet). */
  function addRange(row: number, columnId: string, prev?: Anchor) {
    const previous = sel ?? (prev ? { anchor: prev, end: prev } : null);
    if (previous) setExtra((x) => [...x, previous]);
    setSel({ anchor: { row, columnId }, end: { row, columnId } });
  }

  function selectAll() {
    if (rowCount === 0 || colIds.length === 0) return;
    setExtra([]);
    setSel({ anchor: { row: 0, columnId: colIds[0]! }, end: { row: rowCount - 1, columnId: colIds[colIds.length - 1]! } });
  }

  function copySelection() {
    if (!hasSelection) return;
    const text = rects
      .map((r) => {
        const ids = colIds.slice(r.c0, r.c1 + 1);
        return sortedData
          .slice(r.r0, r.r1 + 1)
          .map((row) => ids.map((id) => { const c = columnById.get(id); return c?.value ? String(c.value(row)) : ""; }).join("\t"))
          .join("\n");
      })
      .join("\n\n");
    try {
      void navigator.clipboard?.writeText(text);
      setAnnouncement(`Copied ${cellCount} cells`);
    } catch {
      /* clipboard unavailable (insecure context / permission) — nothing to announce */
    }
  }

  const pageRows = Math.max(1, Math.floor((viewportHeight - HEADER_HEIGHT) / rowHeight) - 1);
  const labelOf = (c: DataGridColumn<TData>) => (typeof c.header === "string" ? c.header : c.id);

  function ensureRowVisible(row: number) {
    const el = containerRef.current;
    if (!el) return;
    if (row < 0) {
      // the header is sticky and always visible, but moving to it means "back to the top"
      if (scrollTop !== 0) {
        el.scrollTop = 0;
        setScrollTop(0);
      }
      return;
    }
    const top = HEADER_HEIGHT + row * rowHeight;
    const bottom = top + rowHeight;
    let next = scrollTop;
    if (top < scrollTop + HEADER_HEIGHT) next = row * rowHeight; // under the sticky header
    else if (bottom > scrollTop + viewportHeight) next = bottom - viewportHeight;
    if (next !== scrollTop) {
      el.scrollTop = next;
      setScrollTop(next);
    }
  }

  function moveTo(row: number, columnId: string) {
    const r = Math.max(-1, Math.min(row, rowCount - 1));
    ensureRowVisible(r);
    pendingFocusRef.current = { row: r, columnId };
    setActive({ row: r, columnId });
  }

  const AUTOSCROLL_EDGE = 12; // px inside the edge where scrolling starts
  const AUTOSCROLL_MAX = 40; // px per frame
  /** One frame of drag auto-scroll: scroll toward the pointer and extend the range to the cell it points at. */
  autoScrollStepRef.current = () => {
    const el = containerRef.current;
    const p = pointerRef.current;
    const start = dragRef.current;
    if (!el || !p || !start || rowCount === 0) return false;
    const rect = el.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    const widthOf = (c: DataGridColumn<TData>) => widths[c.id] ?? c.width ?? DEFAULT_WIDTH;
    const leftPinnedWidth = renderedColumns.filter((c) => c.pinned === "left").reduce((n, c) => n + widthOf(c), 0);
    const rightPinnedWidth = renderedColumns.filter((c) => c.pinned === "right").reduce((n, c) => n + widthOf(c), 0);
    // the area the range can grow into: under the sticky header, between the pinned columns
    const top = rect.top + HEADER_HEIGHT;
    const bottom = rect.top + el.clientHeight;
    const left = rect.left + leftPinnedWidth;
    const right = rect.left + el.clientWidth - rightPinnedWidth;
    const push = (over: number) => Math.min(AUTOSCROLL_MAX, 2 + Math.abs(over) / 2) * Math.sign(over);
    const dy = p.y < top + AUTOSCROLL_EDGE ? push(p.y - (top + AUTOSCROLL_EDGE)) : p.y > bottom - AUTOSCROLL_EDGE ? push(p.y - (bottom - AUTOSCROLL_EDGE)) : 0;
    const dx = rtl ? 0 : p.x < left + AUTOSCROLL_EDGE ? push(p.x - (left + AUTOSCROLL_EDGE)) : p.x > right - AUTOSCROLL_EDGE ? push(p.x - (right - AUTOSCROLL_EDGE)) : 0;
    if (dx === 0 && dy === 0) return false;
    el.scrollTop += dy;
    el.scrollLeft += dx;

    // the cell under the pointer, clamped into the growable area — from geometry, not the DOM, since the
    // virtualized row under the pointer may not have rendered yet
    const cy = Math.max(top + 1, Math.min(p.y, bottom - 1));
    const row = Math.max(0, Math.min(rowCount - 1, Math.floor((cy - top + el.scrollTop) / rowHeight)));
    let columnId: string | undefined;
    if (!rtl) {
      const cx = Math.max(left + 1, Math.min(p.x, right - 1)) - rect.left + el.scrollLeft;
      let acc = 0;
      for (const c of renderedColumns) {
        acc += widthOf(c);
        if (cx < acc) {
          columnId = c.id;
          break;
        }
      }
      columnId ??= renderedColumns[renderedColumns.length - 1]?.id;
    }
    setSel((prev) => {
      const col = columnId ?? prev?.end.columnId ?? start.columnId;
      if (prev && prev.end.row === row && prev.end.columnId === col) return prev;
      return { anchor: start, end: { row, columnId: col } };
    });
    lastAutoCellRef.current = { row, columnId: columnId ?? lastAutoCellRef.current?.columnId ?? start.columnId };
    return true;
  };
  // After an auto-scrolled drag, the last cell reached becomes the active one so Shift+arrows continue from it.
  dragEndedRef.current = () => {
    const cell = lastAutoCellRef.current;
    lastAutoCellRef.current = null;
    if (cell) moveTo(cell.row, cell.columnId);
  };

  // Runs after every render until the pending target exists in the DOM (it may need a scroll first).
  React.useEffect(() => {
    const p = pendingFocusRef.current;
    if (!p) return;
    const selector = p.row < 0 ? `[data-header="${p.columnId}"]` : `[data-cell="${p.row}:${p.columnId}"]`;
    const el = containerRef.current?.querySelector<HTMLElement>(selector);
    if (el) {
      pendingFocusRef.current = null;
      el.focus();
    }
  });

  function moveColumn(column: DataGridColumn<TData>, dir: 1 | -1) {
    if (column.pinned) return;
    const ids = unpinnedOrdered.map((c) => c.id);
    const from = ids.indexOf(column.id);
    const to = from + dir;
    if (to < 0 || to >= ids.length) {
      setAnnouncement(`${labelOf(column)} is already the ${dir < 0 ? "first" : "last"} movable column`);
      return;
    }
    const targetId = ids[to]!;
    setOrder((prev) => {
      const next = prev.filter((id) => id !== column.id);
      next.splice(next.indexOf(targetId) + (dir > 0 ? 1 : 0), 0, column.id);
      return next;
    });
    pendingFocusRef.current = { row: -1, columnId: column.id }; // a reordered node loses focus; give it back
    setAnnouncement(`${labelOf(column)} moved to position ${leftPinned.length + to + 1} of ${colIds.length}`);
  }

  function resizeColumn(column: DataGridColumn<TData>, delta: number) {
    const current = widths[column.id] ?? column.width ?? DEFAULT_WIDTH;
    const next = Math.max(column.minWidth ?? DEFAULT_MIN_WIDTH, current + delta);
    setWidths((prev) => ({ ...prev, [column.id]: next }));
    setAnnouncement(`${labelOf(column)} column width ${next} pixels`);
  }

  function onNavKeyDown(e: React.KeyboardEvent<HTMLElement>, row: number, column: DataGridColumn<TData>) {
    if (e.target !== e.currentTarget) return; // keys inside an editing input are the input's own
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const idx = colIds.indexOf(column.id);
    const horizontal = e.key === "ArrowRight" ? (rtl ? -1 : 1) : e.key === "ArrowLeft" ? (rtl ? 1 : -1) : 0;

    // header chords: Alt+Left/Right reorders the column, Shift+Left/Right resizes it (10px)
    if (row < 0 && horizontal !== 0 && (e.altKey || e.shiftKey)) {
      e.preventDefault();
      if (e.altKey) moveColumn(column, horizontal as 1 | -1);
      else resizeColumn(column, horizontal * 10);
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (selectable && row >= 0) {
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        return selectAll();
      }
      if (mod && e.key.toLowerCase() === "c" && hasSelection) {
        e.preventDefault();
        return copySelection();
      }
      if (mod && e.key === " ") {
        // keyboard equivalent of Ctrl/Cmd+click: keep what is selected and start another range here
        e.preventDefault();
        return addRange(row, column.id, { row, columnId: column.id });
      }
      if (e.key === "Escape" && hasSelection) {
        e.preventDefault();
        return clearSel();
      }
    }
    const extend = selectable && e.shiftKey && row >= 0;
    const go = (r: number, i: number) => {
      e.preventDefault();
      const target = colIds[Math.max(0, Math.min(i, colIds.length - 1))]!;
      if (extend) return extendSelection(row, column.id, r, target);
      if (hasSelection) clearSel(); // a plain move collapses the selection
      moveTo(r, target);
    };
    switch (e.key) {
      case "ArrowRight":
      case "ArrowLeft":
        return go(row, idx + horizontal);
      case "ArrowDown":
        return go(row + 1, idx);
      case "ArrowUp":
        return go(row - 1, idx);
      case "Home":
        return go(e.ctrlKey ? -1 : row, 0);
      case "End":
        return go(e.ctrlKey ? rowCount - 1 : row, colIds.length - 1);
      case "PageDown":
        return go(row + pageRows, idx);
      case "PageUp":
        return go(Math.max(row - pageRows, row >= 0 ? 0 : -1), idx);
      case "Enter":
      case " ":
        if (row < 0 && column.sortable) {
          e.preventDefault();
          toggleSort(column.id);
        } else if (row >= 0 && column.editable && e.key === "Enter") {
          e.preventDefault();
          setEditing({ rowIndex: row, columnId: column.id });
        }
        return;
      case "F2":
        if (row >= 0 && column.editable) {
          e.preventDefault();
          setEditing({ rowIndex: row, columnId: column.id });
        }
        return;
    }
  }

  return (
    <>
    <div
      ref={containerRef}
      role="grid"
      aria-rowcount={rowCount + 1}
      aria-colcount={colIds.length}
      aria-multiselectable={selectable || undefined}
      className={cn("relative overflow-auto rounded-md border font-sans text-sm", className)}
      style={{ height }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ width: totalWidth, minWidth: "100%" }}>
        <div role="row" aria-rowindex={1} className="sticky top-0 z-[2] flex border-b bg-background">
          {renderedColumns.map((column, colIdx) => {
            const width = widths[column.id] ?? column.width ?? DEFAULT_WIDTH;
            const pinnedStyle: React.CSSProperties =
              column.pinned === "left"
                ? { position: "sticky", left: leftOffsets[column.id], zIndex: 3 }
                : column.pinned === "right"
                  ? { position: "sticky", right: rightOffsets[column.id], zIndex: 3 }
                  : {};
            const isSorted = sort?.columnId === column.id;
            return (
              <div
                key={column.id}
                role="columnheader"
                data-header={column.id}
                aria-colindex={colIdx + 1}
                aria-keyshortcuts={`Shift+ArrowLeft Shift+ArrowRight${column.pinned ? "" : " Alt+ArrowLeft Alt+ArrowRight"}`}
                {...(column.sortable
                  ? { "aria-sort": isSorted ? (sort!.direction === "asc" ? "ascending" : "descending") : "none" }
                  : {})}
                draggable={!column.pinned}
                onDragStart={() => {
                  dragIdRef.current = column.id;
                }}
                onDragOver={(e) => {
                  if (!column.pinned) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = dragIdRef.current;
                  dragIdRef.current = null;
                  if (!draggedId || draggedId === column.id) return;
                  setOrder((prev) => {
                    const next = prev.filter((id) => id !== draggedId);
                    const targetIndex = next.indexOf(column.id);
                    next.splice(targetIndex, 0, draggedId);
                    return next;
                  });
                }}
                onClick={() => column.sortable && toggleSort(column.id)}
                // roving tabindex: the grid is one tab stop; arrows move between cells (see onNavKeyDown)
                tabIndex={tabStop.row === -1 && tabStop.columnId === column.id ? 0 : -1}
                onFocus={() => setActive({ row: -1, columnId: column.id })}
                onKeyDown={(e) => onNavKeyDown(e, -1, column)}
                className={cn(
                  "relative flex h-10 shrink-0 select-none items-center gap-1 px-2 font-medium text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
                  column.sortable && "cursor-pointer hover:text-foreground",
                  column.pinned && "bg-background",
                )}
                style={{ width, ...pinnedStyle }}
              >
                <span className="truncate">{column.header}</span>
                {column.sortable && isSorted && (
                  <span aria-hidden="true" className="text-xs">
                    {sort!.direction === "asc" ? "▲" : "▼"}
                  </span>
                )}
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    beginResize(column.id, column.minWidth ?? DEFAULT_MIN_WIDTH, e.clientX, width);
                  }}
                  className="absolute right-0 top-0 h-full w-1 touch-none cursor-col-resize hover:bg-action/50"
                />
              </div>
            );
          })}
        </div>
        <div style={{ height: totalHeight, position: "relative" }}>
          {visibleRows.map((row, i) => {
            const rowIndex = startIndex + i;
            return (
              <div
                key={getRowId ? getRowId(row, rowIndex) : rowIndex}
                role="row"
                aria-rowindex={rowIndex + 2}
                className="absolute flex w-full border-b hover:bg-muted/50"
                style={{ top: rowIndex * rowHeight, height: rowHeight }}
              >
                {renderedColumns.map((column, colIdx) => {
                  const width = widths[column.id] ?? column.width ?? DEFAULT_WIDTH;
                  const pinnedStyle: React.CSSProperties =
                    column.pinned === "left"
                      ? { position: "sticky", left: leftOffsets[column.id], zIndex: 1 }
                      : column.pinned === "right"
                        ? { position: "sticky", right: rightOffsets[column.id], zIndex: 1 }
                        : {};
                  const isEditing = editing?.rowIndex === rowIndex && editing.columnId === column.id;
                  const selected = selectable && isSelectedCell(rowIndex, colIdx);
                  return (
                    <div
                      key={column.id}
                      role="gridcell"
                      aria-colindex={colIdx + 1}
                      aria-selected={selectable ? selected : undefined}
                      data-cell={`${rowIndex}:${column.id}`}
                      onMouseDown={(e) => {
                        if (!selectable || e.button !== 0 || isEditing) return;
                        const here = { row: rowIndex, columnId: column.id };
                        if (e.shiftKey) {
                          // extend from the previously active cell (focus has not moved yet on mousedown) — even when it has
                          // since scrolled out of the rendered window
                          e.preventDefault();
                          extendSelection(activeRow >= 0 ? activeRow : rowIndex, activeCol, rowIndex, column.id);
                        } else if (e.ctrlKey || e.metaKey) {
                          addRange(rowIndex, column.id, activeRow >= 0 ? { row: activeRow, columnId: activeCol } : undefined);
                          dragRef.current = here; // Ctrl+drag sizes the new range
                        } else {
                          if (hasSelection) clearSel();
                          dragRef.current = here; // a plain click selects nothing until the pointer reaches another cell
                        }
                      }}
                      onMouseEnter={(e) => {
                        const start = dragRef.current;
                        if (!selectable || !start) return;
                        if (e.buttons !== 1) {
                          dragRef.current = null; // the button was released outside the grid
                          return;
                        }
                        if (start.row === rowIndex && start.columnId === column.id) return;
                        setSel({ anchor: start, end: { row: rowIndex, columnId: column.id } });
                        moveTo(rowIndex, column.id); // the dragged-to cell becomes the active one, so Shift+arrows continue from it
                      }}
                      onDoubleClick={() => column.editable && setEditing({ rowIndex, columnId: column.id })}
                      // roving tabindex; Enter or F2 edits an editable cell (the spreadsheet convention)
                      tabIndex={tabStop.row === rowIndex && tabStop.columnId === column.id ? 0 : -1}
                      onFocus={() => setActive({ row: rowIndex, columnId: column.id })}
                      onKeyDown={(e) => onNavKeyDown(e, rowIndex, column)}
                      className={cn(
                        "flex shrink-0 items-center px-2 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
                        column.pinned && "bg-background",
                        selectable && "select-none",
                        selected && "bg-accent",
                      )}
                      style={{ width, ...pinnedStyle }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={column.value ? String(column.value(row)) : ""}
                          className="h-7 w-full rounded-sm border-0 bg-transparent px-1 text-sm outline-none ring-1 ring-inset ring-ring"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(column, row, rowIndex, e.currentTarget.value, true);
                            else if (e.key === "Escape") endEdit(true);
                          }}
                          onBlur={(e) => commitEdit(column, row, rowIndex, e.currentTarget.value)}
                        />
                      ) : (
                        <span className="truncate">{column.cell(row, rowIndex)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    {/* reorder / resize results, spoken politely; outside the grid because a grid's children must be rows */}
    <div role="status" aria-live="polite" className="sr-only">
      {announcement}
    </div>
    </>
  );
}

export { DataGrid };
