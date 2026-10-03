"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/**
 * The id `Table` offers its own `<caption>`, so the scroll container can be named by it.
 *
 * `useId` rather than a counter: it is stable across server and client render, so the `aria-labelledby`
 * the wrapper emits cannot disagree with the `id` the caption emits, and two tables on one page cannot
 * collide. A caption that was given an explicit `id` by the caller keeps it.
 */
const TableCaptionIdContext = React.createContext<string | undefined>(undefined);

/**
 * True only while the scroll container can actually scroll horizontally.
 *
 * Deliberately conditional. `overflow-auto` makes this wrapper a scrollable region, and a scrollable
 * region no keyboard can reach is unreachable without a pointer — WCAG 2.1.1, which axe reports as
 * `scrollable-region-focusable`. But most tables fit, and an unconditional `tabIndex` would add a focus
 * stop to every table in every consumer's app that lands on nothing to scroll. So the tab stop exists
 * exactly when there is something to scroll.
 *
 * This mirrors the `useScrollable` hook the docs site already uses for its preview frames, down to the
 * 1px tolerance; it is re-stated here rather than imported because `packages/ui` cannot depend on the
 * site, and it is kept module-private rather than exported so this fix adds no public API.
 *
 * The 1px tolerance is not superstition: sub-pixel layout rounding makes `scrollWidth` exceed
 * `clientWidth` by a fraction on tables that are not actually scrollable, and that fraction would
 * otherwise mint a useless focus stop.
 */
function useHorizontalScrollState(ref: React.RefObject<HTMLElement | null>) {
  const [state, setState] = React.useState<{ scrollable: boolean; captionId?: string }>({ scrollable: false });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const table = el.firstElementChild;
      // The caption is read rather than tracked through context presence: a `<caption>` is always a direct
      // child of its `<table>`, so this is exact, and it avoids making `TableCaption` register itself.
      const caption =
        table instanceof HTMLTableElement
          ? Array.from(table.children).find((c): c is HTMLTableCaptionElement => c.tagName === "CAPTION")
          : undefined;
      setState({ scrollable: el.scrollWidth > el.clientWidth + 1, captionId: caption?.id || undefined });
    };

    measure();
    // ResizeObserver, not polling: the wrapper changes size when the viewport does, and the table changes
    // size when its content or the reader's text size does. Observing both covers a responsive layout, new
    // rows arriving, and a font-size change, none of which fire a resize event on the window.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [ref]);

  return state;
}

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const wrapper = React.useRef<HTMLDivElement>(null);
    const captionId = React.useId();
    const { scrollable, captionId: labelledBy } = useHorizontalScrollState(wrapper);

    return (
      <div
        ref={wrapper}
        // The focus ring is the existing one — `ring-ring` resolves to the same token every other control
        // in this library focuses with. Left on unconditionally: a div with no `tabIndex` never matches
        // `:focus-visible`, so this costs nothing while keeping the class string stable across a resize.
        className="relative w-full overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...(scrollable
          ? {
              tabIndex: 0,
              // Named only when the table actually has a caption to be named by. `role="group"` rather than
              // `region`, which is a landmark and would put one entry per table into the landmark list; and
              // no fabricated fallback name, because "Scrollable table" on every table in the catalogue
              // tells a screen-reader user nothing they could not already hear from the table itself.
              ...(labelledBy ? { role: "group", "aria-labelledby": labelledBy } : {}),
            }
          : {})}
      >
        <TableCaptionIdContext.Provider value={captionId}>
          <table ref={ref} className={cn("w-full caption-bottom text-sm font-sans", className)} {...props} />
        </TableCaptionIdContext.Provider>
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, id, ...props }, ref) => {
    // Falls back to the id `Table` generated, so the scroll container has something real to point
    // `aria-labelledby` at. A caller-supplied `id` always wins, so nothing that already sets one changes.
    const fallbackId = React.useContext(TableCaptionIdContext);
    return (
      <caption
        ref={ref}
        id={id ?? fallbackId}
        className={cn("mt-4 text-sm text-muted-foreground", className)}
        {...props}
      />
    );
  },
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
