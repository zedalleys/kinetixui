"use client";

import * as React from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Timeline — ordered events down a rail (marker, connector, time, content).
 * `alternating` places content on both sides of a centred rail (desktop);
 * the default is a single rail on the inline start. Same rail/dot/connector
 * technique as `Stepper`, but for a history or activity log rather than a
 * progress indicator: an array of arbitrary events. Gap-fill addition (not
 * in the original Figma source).
 *
 * ── Status (optional) ──────────────────────────────────────────────────────
 *
 * An item may carry a `status` — the StatusTimeline behaviour an order,
 * booking, shipment, refund or application history needs:
 *
 *   complete   a check on a filled marker
 *   current    a ring, plus `aria-current="step"` on the list item
 *   pending    a hollow marker
 *   warning    a triangle on a warning marker
 *   error      a cross on a destructive marker
 *   neutral    a muted dot
 *
 * Status is never colour alone (WCAG 1.4.1): each one has its own marker
 * SHAPE, and every status but `neutral` writes a visually hidden word before
 * the title ("Completed", "Current", …), so a screen reader hears "Completed,
 * Shipped". The words default to English; replace them per item
 * (`statusLabel`) or for the whole list (`statusLabels`). A timeline with no
 * statuses renders exactly as before.
 *
 * ── Direction ──────────────────────────────────────────────────────────────
 *
 * Everything is logical: the single rail is on the inline start, and an
 * alternating item on the start side aligns its text to the inline end, so
 * the layout mirrors under `dir="rtl"` without a direction prop.
 */
export type TimelineStatus = "complete" | "current" | "pending" | "warning" | "error" | "neutral";

export interface TimelineItem {
  time?: React.ReactNode;
  title: React.ReactNode;
  content?: React.ReactNode;
  /** Custom marker content. With a status, it replaces the status glyph; the status shape and word remain. */
  icon?: React.ReactNode;
  /** The item's state. Optional; omit it for a plain history. */
  status?: TimelineStatus;
  /** The spoken word for this item's status, overriding `statusLabels`. */
  statusLabel?: string;
  /** An action for this event — "Track parcel", "Retry payment". */
  action?: React.ReactNode;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLOListElement> {
  items: TimelineItem[];
  alternating?: boolean;
  /** Spoken words per status, for localisation. Unset entries keep their English default. */
  statusLabels?: Partial<Record<TimelineStatus, string>>;
}

const DEFAULT_STATUS_LABELS: Record<TimelineStatus, string> = {
  complete: "Completed",
  current: "Current",
  pending: "Pending",
  warning: "Needs attention",
  error: "Failed",
  neutral: "",
};

/** Marker treatment per status: a distinct shape first, colour second. */
const MARKER: Record<TimelineStatus, string> = {
  complete: "bg-action text-action-foreground",
  current: "border-2 border-action bg-background",
  pending: "border-2 border-muted-foreground bg-background",
  warning: "bg-warning text-warning-foreground",
  error: "bg-destructive text-destructive-foreground",
  neutral: "bg-background",
};

const GLYPH: Partial<Record<TimelineStatus, React.ReactNode>> = {
  complete: <Check className="size-3" strokeWidth={3} />,
  warning: <AlertTriangle className="size-3" strokeWidth={2.5} />,
  error: <X className="size-3" strokeWidth={3} />,
  current: <span className="size-2 rounded-full bg-action" />,
  neutral: <span className="size-2 rounded-full bg-muted-foreground" />,
};

const Body = ({
  item,
  align,
  spokenStatus,
}: {
  item: TimelineItem;
  align: "start" | "end";
  spokenStatus: string;
}) => (
  <div className={cn("min-w-0 pb-6", align === "end" && "text-end")}>
    {item.time && <p className="text-label-sm text-muted-foreground">{item.time}</p>}
    <p className="text-label-md font-medium text-foreground">
      {spokenStatus && <span className="sr-only">{spokenStatus}, </span>}
      {item.title}
    </p>
    {item.content && <div className="text-body-sm text-muted-foreground">{item.content}</div>}
    {item.action && (
      <div className={cn("mt-2 flex flex-wrap gap-2", align === "end" && "justify-end")}>{item.action}</div>
    )}
  </div>
);

const Rail = ({ item, isLast, statusMode }: { item: TimelineItem; isLast: boolean; statusMode: boolean }) => (
  <div className="flex flex-col items-center">
    {statusMode ? (
      <span
        aria-hidden
        data-status={item.status ?? "neutral"}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full [&_svg]:shrink-0",
          MARKER[item.status ?? "neutral"],
        )}
      >
        {item.icon ?? GLYPH[item.status ?? "neutral"]}
      </span>
    ) : (
      <span className="flex size-2.5 shrink-0 items-center justify-center rounded-full bg-action">{item.icon}</span>
    )}
    {!isLast && (
      <span
        aria-hidden
        className={cn("my-1 w-px flex-1", item.status === "complete" ? "bg-action" : "bg-border")}
      />
    )}
  </div>
);

const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(
  ({ className, items, alternating = false, statusLabels, ...props }, ref) => {
    // One marker size for the whole rail: if any item has a status, every marker gets the status box, so
    // the rail stays a straight line.
    const statusMode = items.some((item) => item.status != null);
    const spoken = (item: TimelineItem) =>
      item.status ? (item.statusLabel ?? statusLabels?.[item.status] ?? DEFAULT_STATUS_LABELS[item.status]) : "";

    return (
      <ol ref={ref} className={cn("flex flex-col font-sans", className)} {...props}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const itemProps = {
            "data-status": item.status,
            "aria-current": item.status === "current" ? ("step" as const) : undefined,
          };
          if (!alternating) {
            return (
              <li key={i} className="grid grid-cols-[auto_1fr] gap-x-3" {...itemProps}>
                <Rail item={item} isLast={isLast} statusMode={statusMode} />
                <Body item={item} align="start" spokenStatus={spoken(item)} />
              </li>
            );
          }
          const onEndSide = i % 2 === 0;
          return (
            <li key={i} className="grid grid-cols-[1fr_auto_1fr] gap-x-4" {...itemProps}>
              {onEndSide ? <div /> : <Body item={item} align="end" spokenStatus={spoken(item)} />}
              <Rail item={item} isLast={isLast} statusMode={statusMode} />
              {onEndSide ? <Body item={item} align="start" spokenStatus={spoken(item)} /> : <div />}
            </li>
          );
        })}
      </ol>
    );
  },
);
Timeline.displayName = "Timeline";

export { Timeline };
