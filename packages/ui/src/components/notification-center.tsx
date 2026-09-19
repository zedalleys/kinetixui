"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { Button } from "./button";
import { cn } from "../lib/utils";

/**
 * NotificationCenter — a bell trigger opening a popover list of
 * read/unread items with a "mark all read" action. Composed directly
 * from `Popover` (re-exported as the root — no new open-state logic)
 * and `Button`; `NotificationItem` follows `ListItem`'s interactive-row
 * convention. `unreadCount`/`unread`/`onMarkAllRead` are plain props —
 * the read-state itself stays the caller's, same as every other
 * controlled/stateless component in this library. Gap-fill addition
 * (not in the original Figma source).
 */
const NotificationCenter = Popover;

export interface NotificationCenterTriggerProps extends React.ComponentPropsWithoutRef<typeof Button> {
  unreadCount?: number;
}

const NotificationCenterTrigger = React.forwardRef<HTMLButtonElement, NotificationCenterTriggerProps>(
  ({ className, unreadCount = 0, children, ...props }, ref) => (
    <PopoverTrigger asChild>
      <Button
        ref={ref}
        variant="Ghost"
        size="icon"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className={cn("relative", className)}
        {...props}
      >
        {children ?? <Bell className="size-5" />}
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive ring-2 ring-background" />
        )}
      </Button>
    </PopoverTrigger>
  ),
);
NotificationCenterTrigger.displayName = "NotificationCenterTrigger";

export interface NotificationCenterContentProps extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
  onMarkAllRead?: () => void;
}

const NotificationCenterContent = React.forwardRef<HTMLDivElement, NotificationCenterContentProps>(
  ({ className, onMarkAllRead, children, align = "end", ...props }, ref) => (
    <PopoverContent ref={ref} align={align} className={cn("w-80 p-0", className)} {...props}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-title-sm font-medium text-foreground">Notifications</p>
        {onMarkAllRead && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-label-md font-medium text-link outline-none hover:underline focus-visible:underline"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto">{children}</div>
    </PopoverContent>
  ),
);
NotificationCenterContent.displayName = "NotificationCenterContent";

export interface NotificationItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  time?: React.ReactNode;
  unread?: boolean;
  onSelect?: () => void;
}

const NotificationItem = React.forwardRef<HTMLDivElement, NotificationItemProps>(
  ({ className, title, description, time, unread, onSelect, ...props }, ref) => {
    const interactive = !!onSelect;
    return (
      <div
        ref={ref}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={onSelect}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.();
                }
              }
            : undefined
        }
        className={cn(
          "flex items-start gap-3 px-4 py-3 font-sans outline-none",
          interactive && "cursor-pointer hover:bg-accent focus-visible:bg-accent",
          className,
        )}
        {...props}
      >
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", unread ? "bg-action" : "bg-transparent")} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-body-sm", unread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {title}
          </p>
          {description && <p className="truncate text-body-sm text-muted-foreground">{description}</p>}
          {time && <p className="mt-0.5 text-label-sm text-muted-foreground">{time}</p>}
        </div>
      </div>
    );
  },
);
NotificationItem.displayName = "NotificationItem";

export { NotificationCenter, NotificationCenterTrigger, NotificationCenterContent, NotificationItem };
