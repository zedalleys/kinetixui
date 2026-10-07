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
 *
 * It is a command record, not a device: it takes no connectivity on purpose. A command can stay `queued` while
 * its device is offline (many backends hold commands until the device reconnects), so the pulse says "this record
 * is still open", which stays true. Show the link beside it with `DeviceConnection`, and move the record to
 * `expired` or `failed` when your transport gives up. A control showing its own request reads the link through
 * `resolveControlState` instead.
 *
 * Every line wraps rather than widening the row: a command name, a translated status word and a
 * device's error message are all arbitrary length, and on a phone a row that refuses to wrap is a row
 * whose end is off the screen.
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
        className={cn("flex min-w-0 flex-col gap-0.5 font-sans", className)}
        {...props}
      >
        {showName && command?.name ? <span className="min-w-0 break-words text-label-md text-muted-foreground">{command.name}</span> : null}
        {/* `items-start` with the marker nudged onto the first line: a command name or a translated
            status that wraps keeps the dot beside its first line rather than centred on a block. */}
        <span className={cn("flex min-w-0 items-start gap-2 text-label-lg", STATUS_CLASS[resolved])}>
          <span
            aria-hidden="true"
            className={cn("mt-1.5 size-2 shrink-0 rounded-full bg-current", inFlight ? "animate-pulse motion-reduce:animate-none" : "")}
          />
          <span className="min-w-0 break-words">{resolveLabel(label, describeCommandStatus(resolved))}</span>
        </span>
        {isCommandUnsuccessful(resolved) && command?.errorMessage ? (
          <span className="min-w-0 break-words text-label-md text-muted-foreground">{command.errorMessage}</span>
        ) : null}
        {command?.updatedAt ?? command?.createdAt ? (
          <LastSync value={command.updatedAt ?? command.createdAt} now={now} className="text-label-md" />
        ) : null}
      </div>
    );
  },
), "CommandStatus");

export { CommandStatus };
