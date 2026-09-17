"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * VirtualList — a windowed-rendering primitive: only the rows visible in
 * the scroll viewport (plus `overscan`) actually mount, so a list of
 * thousands of items costs the same as rendering a couple dozen. Fixed
 * row height only — variable-height virtualization needs a measurement
 * pass per row (a real library's job, e.g. `@tanstack/react-virtual`),
 * which is out of scope for this primitive. A prerequisite for `DataGrid`
 * and any `Command`/`Combobox`/`Select` with a large option list. Gap-fill
 * addition (not in the original Figma source).
 */
export interface VirtualListProps<T>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  items: T[];
  /** row height in px — every row is this tall */
  itemHeight: number;
  /** viewport height — a number (px) or any CSS height value */
  height: number | string;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** extra rows rendered above/below the viewport, to reduce blank flashes on fast scroll */
  overscan?: number;
  getItemKey?: (item: T, index: number) => React.Key;
}

function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 4,
  getItemKey,
  className,
  style,
  onScroll,
  ...props
}: VirtualListProps<T>) {
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

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + Math.max(visibleCount, 0));
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      role="list"
      className={cn("overflow-y-auto font-sans", className)}
      style={{ height, ...style }}
      onScroll={(e) => {
        onScroll?.(e);
        setScrollTop(e.currentTarget.scrollTop);
      }}
      {...props}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((item, i) => {
          const index = startIndex + i;
          return (
            <div
              key={getItemKey ? getItemKey(item, index) : index}
              role="listitem"
              style={{ position: "absolute", top: index * itemHeight, left: 0, right: 0, height: itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { VirtualList };
