"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Timeline — ordered events down a rail (dot, connector, time, content).
 * `alternating` lays content left/right of a centered rail (desktop);
 * the default is a single left-aligned rail. Same rail/dot/connector
 * technique as `Stepper`, but for a history/activity log rather than a
 * progress indicator — no complete/current/upcoming states, an array of
 * arbitrary events instead. Gap-fill addition (not in the original Figma
 * source).
 */
export interface TimelineItem {
  time?: React.ReactNode;
  title: React.ReactNode;
  content?: React.ReactNode;
  /** custom dot content — defaults to a filled circle */
  icon?: React.ReactNode;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLOListElement> {
  items: TimelineItem[];
  alternating?: boolean;
}

const Body = ({ item, align }: { item: TimelineItem; align: "left" | "right" }) => (
  <div className={cn("pb-6", align === "right" && "text-right")}>
    {item.time && <p className="text-label-sm text-muted-foreground">{item.time}</p>}
    <p className="text-label-md font-medium text-foreground">{item.title}</p>
    {item.content && <div className="text-body-sm text-muted-foreground">{item.content}</div>}
  </div>
);

const Rail = ({ item, isLast }: { item: TimelineItem; isLast: boolean }) => (
  <div className="flex flex-col items-center">
    <span className="flex size-2.5 shrink-0 items-center justify-center rounded-full bg-action">{item.icon}</span>
    {!isLast && <span aria-hidden className="my-1 w-px flex-1 bg-border" />}
  </div>
);

const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(
  ({ className, items, alternating = false, ...props }, ref) => (
    <ol ref={ref} className={cn("flex flex-col font-sans", className)} {...props}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        if (!alternating) {
          return (
            <li key={i} className="grid grid-cols-[auto_1fr] gap-x-3">
              <Rail item={item} isLast={isLast} />
              <Body item={item} align="left" />
            </li>
          );
        }
        const onRight = i % 2 === 0;
        return (
          <li key={i} className="grid grid-cols-[1fr_auto_1fr] gap-x-4">
            {onRight ? <div /> : <Body item={item} align="right" />}
            <Rail item={item} isLast={isLast} />
            {onRight ? <Body item={item} align="left" /> : <div />}
          </li>
        );
      })}
    </ol>
  ),
);
Timeline.displayName = "Timeline";

export { Timeline };
