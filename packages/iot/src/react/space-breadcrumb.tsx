"use client";

import * as React from "react";
import type { KinetixSpacePathItem } from "../types/hierarchy";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * SpaceBreadcrumb — where in the hierarchy this is: Farm › Field 3 › Irrigation zone B.
 *
 * `path` is `spacePath(tree, id)`. The vocabulary belongs to the product (`kind` is never shown as a
 * fixed word), and the last item is the current place: plain text with `aria-current="page"`, not a
 * link to where you already are.
 *
 * Earlier items navigate through whichever the caller provides: `hrefFor` renders real anchors (right
 * for routers and for opening in a new tab), `onNavigate` renders buttons. With neither, they are text.
 *
 * **The separator flips under RTL.** The chevron is drawn as an `<svg>` mirrored with `rtl:-scale-x-100`,
 * so it points from parent toward child in either reading direction. It is `aria-hidden`; the list
 * structure already says "item 2 of 3".
 */
export interface SpaceBreadcrumbProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  path: readonly KinetixSpacePathItem[] | null | undefined;
  /** Accessible name of the `<nav>`. Defaults to "Location". */
  label?: string;
  /** Anchor target for an ancestor. Takes precedence over `onNavigate`. */
  hrefFor?: (item: KinetixSpacePathItem) => string;
  onNavigate?: (item: KinetixSpacePathItem) => void;
}

const LINK =
  "inline-flex min-h-11 items-center rounded-md px-1.5 text-body-sm text-muted-foreground underline-offset-2 transition-colors duration-fast hover:text-foreground hover:underline motion-reduce:transition-none md:min-h-9 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background";

const SpaceBreadcrumb = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLElement, SpaceBreadcrumbProps>(
  ({ path, label = "Location", hrefFor, onNavigate, className, ...props }, ref) => {
    const items = Array.isArray(path) ? path : [];
    return (
      <nav ref={ref} aria-label={label} className={cn("min-w-0 font-sans", className)} {...props}>
        <ol className="m-0 flex list-none flex-wrap items-center gap-x-0.5 gap-y-0 p-0">
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <li key={item.id} data-kind={item.kind} className="inline-flex min-w-0 items-center gap-0.5">
                {last ? (
                  <span aria-current="page" className="break-words px-1.5 text-title-sm text-foreground">
                    {item.name}
                  </span>
                ) : hrefFor ? (
                  <a href={hrefFor(item)} className={LINK}>
                    {item.name}
                  </a>
                ) : onNavigate ? (
                  <button type="button" onClick={() => onNavigate(item)} className={LINK}>
                    {item.name}
                  </button>
                ) : (
                  <span className="break-words px-1.5 text-body-sm text-muted-foreground">{item.name}</span>
                )}
                {last ? null : (
                  <svg aria-hidden="true" focusable="false" width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground rtl:-scale-x-100">
                    <path d="m6 3 5 5-5 5" />
                  </svg>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  },
), "SpaceBreadcrumb");

export { SpaceBreadcrumb };
