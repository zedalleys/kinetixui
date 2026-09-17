"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface KanbanCard {
  id: string;
  content: React.ReactNode;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface KanbanBoardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  columns: KanbanColumn[];
  onColumnsChange: (columns: KanbanColumn[]) => void;
}

/**
 * KanbanBoard — draggable cards across columns, with keyboard DnD. No DnD
 * primitive existed in this package at all, and hand-rolling accessible
 * drag-and-drop (pointer + touch + keyboard, collision detection, live
 * screen-reader announcements) from scratch would both take far longer
 * than this component's own logic and likely be worse than a battle-tested
 * library — unlike `DiffViewer`'s hand-rolled LCS diff, there's no
 * cross-platform-identical-algorithm argument here, since each native
 * platform reaches for its own idiomatic drag primitive anyway (Compose's
 * drag gestures, SwiftUI's `.draggable`/`.dropDestination`, Flutter's
 * `Draggable`/`DragTarget`). `@dnd-kit` is the dependency: no runtime CSS,
 * accessible by default, and this is exactly its documented "multiple
 * containers" sortable pattern — `onDragOver` re-parents a card into the
 * hovered column live (the standard approach; a little re-render churn
 * mid-drag is expected/upstream-documented), `onDragEnd` commits the
 * final within-column reorder. Column order itself isn't draggable — the
 * `COMPONENT-ADDITIONS.md` entry only asked for card dragging.
 *
 * `collisionDetectionStrategy` below is dnd-kit's own documented fix for a
 * specific multi-container gotcha: each column is both a `useDroppable`
 * (so an empty column, or the space below its last card, is still a valid
 * drop target) and wraps a `SortableContext` of its cards. A column's rect
 * is a strict superset of its cards' rects, so plain `closestCorners` (or
 * `closestCenter`/`rectIntersection` alone) almost always reports the
 * column itself as the collision, never a specific card underneath — over
 * gets stuck on the column id and item-level reordering never fires. The
 * fix (lifted from dnd-kit's own multiple-containers example): try
 * `pointerWithin` first, fall back to `rectIntersection`, and if the
 * winning id is a column, re-run `closestCenter` scoped to just that
 * column's cards to find the specific one under the pointer.
 */
const KanbanBoard = React.forwardRef<HTMLDivElement, KanbanBoardProps>(
  ({ columns, onColumnsChange, className, ...props }, ref) => {
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const [activeCard, setActiveCard] = React.useState<KanbanCard | null>(null);
    const lastOverId = React.useRef<string | null>(null);

    const findColumn = React.useCallback(
      (id: string) => columns.find((col) => col.id === id || col.cards.some((c) => c.id === id)),
      [columns],
    );

    const collisionDetectionStrategy: CollisionDetection = React.useCallback(
      (args) => {
        const pointerIntersections = pointerWithin(args);
        const intersections = pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);
        let overId = getFirstCollision(intersections, "id");

        if (overId != null) {
          const overColumn = columns.find((col) => col.id === overId);
          if (overColumn && overColumn.cards.length > 0) {
            const cardIds = new Set(overColumn.cards.map((c) => c.id));
            const cardCollision = getFirstCollision(
              closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter((c) => cardIds.has(String(c.id))),
              }),
              "id",
            );
            if (cardCollision != null) overId = cardCollision;
          }
          lastOverId.current = String(overId);
          return [{ id: overId }];
        }

        return lastOverId.current ? [{ id: lastOverId.current }] : [];
      },
      [columns],
    );

    function handleDragStart(event: DragStartEvent) {
      lastOverId.current = String(event.active.id);
      const column = findColumn(String(event.active.id));
      const card = column?.cards.find((c) => c.id === event.active.id);
      setActiveCard(card ?? null);
    }

    function handleDragOver(event: DragOverEvent) {
      const { active, over } = event;
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      const activeColumn = findColumn(activeId);
      const overColumn = findColumn(overId);
      if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

      onColumnsChange(
        columns.map((col) => {
          if (col.id === activeColumn.id) {
            return { ...col, cards: col.cards.filter((c) => c.id !== activeId) };
          }
          if (col.id === overColumn.id) {
            const movedCard = activeColumn.cards.find((c) => c.id === activeId);
            if (!movedCard) return col;
            const overIndex = col.cards.findIndex((c) => c.id === overId);
            const insertAt = overIndex >= 0 ? overIndex : col.cards.length;
            const nextCards = [...col.cards];
            nextCards.splice(insertAt, 0, movedCard);
            return { ...col, cards: nextCards };
          }
          return col;
        }),
      );
    }

    function handleDragEnd(event: DragEndEvent) {
      setActiveCard(null);
      lastOverId.current = null;
      const { active, over } = event;
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      const activeColumn = findColumn(activeId);
      // overId may be the column itself (dropped in empty space / an empty column)
      const overColumn = columns.find((col) => col.id === overId) ?? findColumn(overId);
      if (!activeColumn || !overColumn || activeColumn.id !== overColumn.id) return;

      const activeIndex = activeColumn.cards.findIndex((c) => c.id === activeId);
      const rawOverIndex = overColumn.cards.findIndex((c) => c.id === overId);
      const overIndex = rawOverIndex >= 0 ? rawOverIndex : overColumn.cards.length - 1;
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;

      onColumnsChange(
        columns.map((col) =>
          col.id === activeColumn.id ? { ...col, cards: arrayMove(col.cards, activeIndex, overIndex) } : col,
        ),
      );
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveCard(null);
          lastOverId.current = null;
        }}
      >
        <div ref={ref} role="group" className={cn("flex items-start gap-4 overflow-x-auto font-sans", className)} {...props}>
          {columns.map((column) => (
            <KanbanColumnView key={column.id} column={column} />
          ))}
        </div>
        <DragOverlay>{activeCard ? <KanbanCardView card={activeCard} /> : null}</DragOverlay>
      </DndContext>
    );
  },
);
KanbanBoard.displayName = "KanbanBoard";

function KanbanColumnView({ column }: { column: KanbanColumn }) {
  const { setNodeRef } = useDroppable({ id: column.id });
  return (
    <div className="flex w-64 shrink-0 flex-col gap-2 rounded-md border bg-muted/30 p-2">
      <div className="flex items-center justify-between px-1 py-1">
        <span className="text-sm font-medium text-foreground">{column.title}</span>
        <span className="text-xs text-muted-foreground">{column.cards.length}</span>
      </div>
      <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-10 flex-col gap-2">
          {column.cards.map((card) => (
            <SortableKanbanCard key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableKanbanCard({ card }: { card: KanbanCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCardView card={card} />
    </div>
  );
}

function KanbanCardView({ card }: { card: KanbanCard }) {
  return (
    <div className="cursor-grab touch-none rounded-md border bg-background p-3 text-sm text-foreground shadow-sm outline-none active:cursor-grabbing focus-visible:ring-1 focus-visible:ring-ring">
      {card.content}
    </div>
  );
}

export { KanbanBoard };
