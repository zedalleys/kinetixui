"use client";

import * as React from "react";
import { describeLastSeen, formatLastSeen } from "../functions/last-seen";
import { parseTimestamp } from "../functions/time";
import { cn } from "./cn";
import { resolveLabel } from "./label";

/**
 * LastSync — when a device was last heard from.
 *
 * Renders a `<time>` whose `dateTime` is the machine-readable instant, whose visible text is the
 * shorthand (`5m ago`), and whose accessible label is the sentence (`Last seen 5 minutes ago`). The
 * abbreviation is therefore never the only form available, which is the point: `5m` is not something
 * a screen reader can be trusted to expand.
 *
 * `now` is a prop so this renders deterministically in tests and in server-rendered output. Without
 * one it reads the clock, which means a server and client render can disagree by a tick — pass `now`
 * if that matters to your app.
 */
export interface LastSyncProps extends Omit<React.HTMLAttributes<HTMLTimeElement>, "children" | "dateTime"> {
  /** The timestamp. Anything unparseable renders as the never label. */
  value: string | Date | number | null | undefined;
  /** Treat this as the current time. */
  now?: string | Date | number | null;
  /** Shown when there is no usable timestamp. Defaults to `"Never"`. */
  neverLabel?: string;
  /**
   * Replace the accessible label, e.g. for translation. A blank or whitespace-only string falls back
   * to the generated sentence rather than leaving the element without an accessible name.
   */
  label?: string;
}

const LastSync = React.forwardRef<HTMLTimeElement, LastSyncProps>(
  ({ value, now, neverLabel, label, className, ...props }, ref) => {
    const parsed = parseTimestamp(value ?? null);
    const options = { now, neverLabel };
    return (
      <time
        ref={ref}
        // Omitted rather than empty when there is no instant to state: an empty dateTime is invalid.
        dateTime={parsed ? parsed.toISOString() : undefined}
        aria-label={resolveLabel(label, describeLastSeen(value, options))}
        className={cn("text-label-md font-sans text-muted-foreground", className)}
        {...props}
      >
        {formatLastSeen(value, options)}
      </time>
    );
  },
);
LastSync.displayName = "LastSync";

export { LastSync };
