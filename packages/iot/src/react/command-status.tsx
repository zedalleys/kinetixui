"use client";

import * as React from "react";
import type { KinetixCommandStatus, KinetixDeviceCommand } from "../types/command";
import { describeCommandStatus, isCommandInFlight, isCommandUnsuccessful } from "../functions/commands";
import { LastSync } from "./last-sync";
import { cn } from "./cn";
import { resolveLabel } from "./label";
import { withDisplayName } from "./display-name";

/**
 * CommandStatus — where a command sent to a device has got to.
 *
 * The whole reason this is not a boolean is in `KinetixCommandStatus`: a command is queued, then
 * sent, then acknowledged, and acknowledged is not done. A UI that shows a spinner until "completed"
 * and a tick afterwards cannot say "the device has it, and is working on it", which is the state a
 * user actually wants during the ten seconds a reboot takes.
 *
 * In-flight statuses get a quiet animated marker; it is decorative, `aria-hidden`, and the state is
 * already in the text beside it. Under `prefers-reduced-motion` the page-level rule stops the
 * animation and the marker remains as a static dot — the status never depended on the movement.
 *
 * An error message is rendered as text, like an alert message, and for the same reason.
 */
export interface CommandStatusProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  command: KinetixDeviceCommand;
  /** Show the command's `name` above the status. */
  showName?: boolean;
  /** Replace the status text, e.g. for translation. Falls back rather than blanking. */
  label?: string;
  /** Reference instant for the relative time. */
  now?: string | Date | number;
}

const STATUS_CLASS: Record<KinetixCommandStatus, string> = {
  queued: "text-muted-foreground",
  sent: "text-muted-foreground",
  acknowledged: "text-foreground",
  completed: "text-foreground",
  failed: "text-destructive",
  cancelled: "text-muted-foreground",
  expired: "text-muted-foreground",
};

const CommandStatus = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, CommandStatusProps>(
  ({ command, showName = false, label, now, className, ...props }, ref) => {
    const status = command?.status;
    const known = typeof status === "string" && status in STATUS_CLASS;
    const resolved = (known ? status : "queued") as KinetixCommandStatus;
    const inFlight = isCommandInFlight(resolved);

    return (
      <div
        ref={ref}
        data-command-status={resolved}
        className={cn("flex flex-col gap-0.5 font-sans", className)}
        {...props}
      >
        {showName && command?.name ? <span className="text-label-sm text-muted-foreground">{command.name}</span> : null}
        <span className={cn("flex items-center gap-1.5 text-label-md", STATUS_CLASS[resolved])}>
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full bg-current", inFlight ? "animate-pulse motion-reduce:animate-none" : "")}
          />
          {resolveLabel(label, describeCommandStatus(resolved))}
        </span>
        {isCommandUnsuccessful(resolved) && command?.errorMessage ? (
          <span className="text-label-sm text-muted-foreground">{command.errorMessage}</span>
        ) : null}
        {command?.updatedAt ?? command?.createdAt ? (
          <LastSync value={command.updatedAt ?? command.createdAt} now={now} className="text-label-sm" />
        ) : null}
      </div>
    );
  },
), "CommandStatus");

export { CommandStatus };
