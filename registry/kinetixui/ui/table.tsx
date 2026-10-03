"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * How `TableCaption` and `Table` agree on the id that names the scroll container.
 *
 * `fallbackId` is a `useId` rather than a counter: stable across server and client render, and unique
 * when several tables share a page. A caption given an explicit `id` by the caller keeps it.
 *
 * `register` is what keeps the two in step. The caption tells `Table` the id it actually ended up with,
 * on mount, whenever that id changes, and again with `undefined` when it unmounts. The alternative —
 * reading the caption's id out of the DOM while measuring — was wrong in a way review caught: a caller
 * can change an `id` without changing any dimension (one derived from state, with the caption's text
 * unchanged), no `ResizeObserver` callback fires, and the wrapper is left pointing `aria-labelledby` at
 * an element that no longer exists. A dangling reference names nothing, so the focus stop goes
 * unannounced. Registration follows the render that changed it, which is the thing that actually
 * happened.
 */
type TableCaptionRegistration = {
  fallbackId: string;
  register: (id: string | undefined) => void;
};

const TableCaptionContext = React.createContext<TableCaptionRegistration | undefined>(undefined);

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
  const [scrollable, setScrollable] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);

    measure();
    // ResizeObserver, not polling: the wrapper changes size when the viewport does, and the table changes
    // size when its content or the reader's text size does. Observing both covers a responsive layout, new
    // rows arriving, and a font-size change, none of which fire a resize event on the window.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [ref]);

  return scrollable;
}

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const wrapper = React.useRef<HTMLDivElement>(null);
    const fallbackId = React.useId();
    const [labelledBy, setLabelledBy] = React.useState<string>();
    const scrollable = useHorizontalScrollState(wrapper);
    // `setLabelledBy` is stable, so this is created once per table and never re-provides needlessly.
    const caption = React.useMemo<TableCaptionRegistration>(
      () => ({ fallbackId, register: setLabelledBy }),
      [fallbackId],
    );

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
        <TableCaptionContext.Provider value={caption}>
          <table ref={ref} className={cn("w-full caption-bottom text-sm font-sans", className)} {...props} />
        </TableCaptionContext.Provider>
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
    const context = React.useContext(TableCaptionContext);
    const effectiveId = id ?? context?.fallbackId;
    const register = context?.register;

    // Report the id upward after every render that changes it, and withdraw it on unmount so a table
    // whose caption is removed stops claiming a name instead of pointing at a missing element. A
    // `TableCaption` rendered outside a `Table` has nothing to register with and simply renders.
    React.useEffect(() => {
      if (!register) return;
      register(effectiveId);
      return () => register(undefined);
    }, [register, effectiveId]);

    return (
      <caption
        ref={ref}
        id={effectiveId}
        className={cn("mt-4 text-sm text-muted-foreground", className)}
        {...props}
      />
    );
  },
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
