"use client";

import * as React from "react";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MessageBubble — a sent/received chat bubble with grouping, timestamp,
 * and a status tick. `grouped` is a lightweight consecutive-run cue
 * (reduces the outer top corner's radius, the side that would otherwise
 * repeat the previous bubble's rounding) rather than full first/middle/
 * last position tracking — the caller already knows which messages are
 * consecutive, so it stays a single boolean rather than the component
 * inferring group position itself. Gap-fill addition (not in the
 * original Figma source), the last pick from the `COMPONENT-ADDITIONS.md`
 * Tier 2 backlog.
 */
export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "sent" | "received";
  timestamp?: React.ReactNode;
  status?: "sent" | "delivered" | "read";
  /** part of a consecutive run of bubbles from the same sender */
  grouped?: boolean;
  avatar?: React.ReactNode;
}

const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ className, variant = "received", timestamp, status, grouped = false, avatar, children, ...props }, ref) => {
    const sent = variant === "sent";
    return (
      <div ref={ref} className={cn("flex items-end gap-2 font-sans", sent && "flex-row-reverse", className)} {...props}>
        {avatar && !sent && <div className="shrink-0 self-end">{avatar}</div>}
        <div className={cn("flex max-w-[75%] flex-col gap-1", sent ? "items-end" : "items-start")}>
          <div
            className={cn(
              "min-w-0 rounded-2xl px-3.5 py-2 text-body-sm",
              sent ? "bg-action text-action-foreground" : "bg-muted text-foreground",
              sent && grouped && "rounded-tr-md",
              !sent && grouped && "rounded-tl-md",
            )}
          >
            {children}
          </div>
          {(timestamp || (sent && status)) && (
            <div className="flex items-center gap-1 px-1 text-label-sm text-muted-foreground">
              {timestamp}
              {sent && status && (
                <span className={cn(status === "read" && "text-action")}>
                  {status === "sent" ? <Check className="size-3.5" /> : <CheckCheck className="size-3.5" />}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);
MessageBubble.displayName = "MessageBubble";

const TypingIndicator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-label="Typing"
      className={cn("flex w-fit items-center gap-1 rounded-2xl bg-muted px-3.5 py-2.5", className)}
      {...props}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="size-1.5 animate-typing-dot rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  ),
);
TypingIndicator.displayName = "TypingIndicator";

export { MessageBubble, TypingIndicator };
