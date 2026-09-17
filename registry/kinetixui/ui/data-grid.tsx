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
  /** double-click swaps the cell for a text input; commit fires on Enter/blur, Escape cancels */
  editable?: boolean;
  onCellEdit?: (row: TData, rowIndex: number, value: string) => void;
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

  function commitEdit(column: DataGridColumn<TData>, row: TData, rowIndex: number, value: string) {
    column.onCellEdit?.(row, rowIndex, value);
    setEditing(null);
  }

  return (
    <div
      ref={containerRef}
      role="grid"
      className={cn("relative overflow-auto rounded-md border font-sans text-sm", className)}
      style={{ height }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ width: totalWidth, minWidth: "100%" }}>
        <div role="row" className="sticky top-0 z-[2] flex border-b bg-background">
          {renderedColumns.map((column) => {
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
                className={cn(
                  "relative flex h-10 shrink-0 select-none items-center gap-1 px-2 font-medium text-muted-foreground",
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
                  className="absolute right-0 top-0 h-full w-1 touch-none cursor-col-resize hover:bg-primary/50"
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
                className="absolute flex w-full border-b hover:bg-muted/50"
                style={{ top: rowIndex * rowHeight, height: rowHeight }}
              >
                {renderedColumns.map((column) => {
                  const width = widths[column.id] ?? column.width ?? DEFAULT_WIDTH;
                  const pinnedStyle: React.CSSProperties =
                    column.pinned === "left"
                      ? { position: "sticky", left: leftOffsets[column.id], zIndex: 1 }
                      : column.pinned === "right"
                        ? { position: "sticky", right: rightOffsets[column.id], zIndex: 1 }
                        : {};
                  const isEditing = editing?.rowIndex === rowIndex && editing.columnId === column.id;
                  return (
                    <div
                      key={column.id}
                      role="gridcell"
                      onDoubleClick={() => column.editable && setEditing({ rowIndex, columnId: column.id })}
                      className={cn("flex shrink-0 items-center px-2", column.pinned && "bg-background")}
                      style={{ width, ...pinnedStyle }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={column.value ? String(column.value(row)) : ""}
                          className="h-7 w-full rounded-sm border-0 bg-transparent px-1 text-sm outline-none ring-1 ring-inset ring-ring"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(column, row, rowIndex, e.currentTarget.value);
                            else if (e.key === "Escape") setEditing(null);
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
  );
}

export { DataGrid };
