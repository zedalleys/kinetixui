"use client";

import * as React from "react";
import type { KinetixFirmwareInfo, KinetixFirmwareStatus } from "../types/firmware";
import { describeFirmwareStatus, resolveFirmwareStatus } from "../functions/firmware";
import { cn } from "./cn";
import { resolveLabel } from "./label";
import { withDisplayName } from "./display-name";

/**
 * FirmwareStatus — which version a device is on, and whether that is the current one.
 *
 * `unknown` is not an error and is not hidden. A fleet always contains devices that have not
 * reported a version yet, and "we do not know whether this needs an update" is a true and useful
 * thing to render — more useful than an optimistic "up to date", which is what a component that
 * treats absence as a default would show.
 *
 * The status is resolved by `resolveFirmwareStatus` from the versions rather than trusted from the
 * `status` field alone, so an info object whose status says `up-to-date` while its versions disagree
 * renders what the versions say.
 */
export interface FirmwareStatusProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  firmware: KinetixFirmwareInfo;
  /** Show the version strings under the status. */
  showVersions?: boolean;
  /** The update control, if the product has one. */
  action?: React.ReactNode;
  /** Replace the status text, e.g. for translation. Falls back rather than blanking. */
  label?: string;
}

const STATUS_CLASS: Record<KinetixFirmwareStatus, string> = {
  "up-to-date": "text-muted-foreground",
  "update-available": "text-foreground",
  updating: "text-foreground",
  failed: "text-destructive",
  unknown: "text-muted-foreground",
};

/**
 * A version string, rendered safely.
 *
 * Firmware versions arrive from devices, so they are untrusted input of unbounded length. They are
 * rendered as text — never markup — and truncated with CSS rather than sliced, so a pathological
 * value cannot break the layout and the full string is still available to a reader who selects it or
 * to assistive technology.
 */
function Version({ children }: { children: React.ReactNode }) {
  return <span className="inline-block max-w-[16ch] truncate align-bottom font-mono">{children}</span>;
}

const FirmwareStatus = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, FirmwareStatusProps>(
  ({ firmware, showVersions = true, action, label, className, ...props }, ref) => {
    const status = resolveFirmwareStatus(firmware ?? { status: "unknown" });
    const current = firmware?.currentVersion;
    const available = firmware?.availableVersion;

    return (
      <div
        ref={ref}
        data-firmware-status={status}
        className={cn("flex items-start gap-3 font-sans", className)}
        {...props}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("text-label-md", STATUS_CLASS[status])}>
            {resolveLabel(label, describeFirmwareStatus(status))}
          </span>
          {showVersions ? (
            <span className="text-label-sm text-muted-foreground">
              {current ? (
                <>
                  <Version>{current}</Version>
                  {available && available !== current ? (
                    <>
                      {" → "}
                      <Version>{available}</Version>
                    </>
                  ) : null}
                </>
              ) : (
                "Version not reported"
              )}
            </span>
          ) : null}
        </span>
        {action ? <span className="ms-auto shrink-0">{action}</span> : null}
      </div>
    );
  },
), "FirmwareStatus");

export { FirmwareStatus };
