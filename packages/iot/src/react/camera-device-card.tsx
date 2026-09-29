import * as React from "react";
import type { KinetixDevice } from "../types/device";
import { normalizeDeviceStatus } from "../functions/status";
import { BatteryIndicator } from "./battery-indicator";
import { DeviceIcon } from "./device-icon";
import { DeviceStatusBadge } from "./device-status-badge";
import { LastSync } from "./last-sync";
import { SignalStrength } from "./signal-strength";
import { Glyph } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * CameraDeviceCard — a camera as a device: its poster, its state, and what it last noticed.
 *
 * ## What this is not
 * **It never shows, decodes or implies a live feed.** There is no `<video>`, no stream, no player and
 * no transport in this package, and this card will not render one. The picture area is a **poster
 * slot**: the product passes an `<img>` (a snapshot it already has) or any node, and this card frames
 * it. With no poster it draws a labelled placeholder that says, in words, "Sample image — no live
 * feed". Wording is `posterLabel`; the default is deliberate — a grey box that looks like a camera
 * that failed to load is a worse lie than one that says what it is.
 *
 * ## What it does say — only what the application tells it
 * - `device.status` → online/offline through `DeviceStatusBadge`.
 * - `recording` → "Recording" / "Not recording" / "Recording status unknown", as a glyph and words.
 *   Omit it to say nothing; a card that guesses at recording is a privacy hazard.
 * - `privacy` → `"on"` **removes the poster entirely** and covers the frame with "Privacy mode is on —
 *   image hidden"; `"off"` and `"unknown"` are stated in words. The poster node is not merely covered,
 *   it is not rendered, so it cannot be read by assistive technology or a screenshot of the DOM.
 * - `lastEvent` → one line, with a `LastSync` if it has a time.
 * - Battery and signal from the device, and a `controls` slot for whatever the product operates.
 */
export interface CameraDeviceCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  device: KinetixDevice;
  /** A still image the product already has — an `<img>` or any node. Never a stream. */
  poster?: React.ReactNode;
  /** Caption for the frame. Defaults to "Sample image — no live feed" when there is no poster. */
  posterLabel?: string;
  /** `on` hides the poster. Omit to state nothing about privacy. */
  privacy?: "on" | "off" | "unknown";
  /** Application-supplied. `true` = recording, `false` = not, `null` = unknown. Omit to say nothing. */
  recording?: boolean | null;
  /** The last thing the camera reported, e.g. "Motion detected". */
  lastEvent?: { label: string; at?: string | Date | number | null };
  /** Buttons or switches the product operates. */
  controls?: React.ReactNode;
  now?: string | Date | number | null;
}

/** A plain `<img>` poster is made to fill the frame; any other node is the product's to size. */
function fillFrame(poster: React.ReactNode): React.ReactNode {
  if (React.isValidElement<{ className?: string }>(poster) && poster.type === "img") {
    return React.cloneElement(poster, { className: cn("size-full object-cover", poster.props.className) });
  }
  return poster;
}

const CameraDeviceCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, CameraDeviceCardProps>(
  ({ device, poster, posterLabel, privacy, recording, lastEvent, controls, now, className, ...props }, ref) => {
    const status = normalizeDeviceStatus(device?.status);
    const hidden = privacy === "on";
    const caption = posterLabel?.trim() ? posterLabel : poster ? undefined : "Sample image — no live feed";

    return (
      <div
        ref={ref}
        data-status={status}
        data-privacy={privacy}
        className={cn("flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 font-sans text-card-foreground", className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-title-sm text-foreground">{device?.name}</span>
            {device?.locationName ? <span className="truncate text-label-sm text-muted-foreground">{device.locationName}</span> : null}
          </div>
          <div className="ms-auto shrink-0">
            <DeviceStatusBadge status={status} />
          </div>
        </div>

        <figure className="m-0 flex flex-col gap-1.5">
          <div
            data-poster-frame=""
            className={cn(
              "relative aspect-video w-full overflow-hidden rounded-lg border bg-muted",
              status === "offline" ? "border-dashed border-border" : "border-border",
            )}
          >
            {hidden ? (
              <div data-privacy-cover="" className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background p-3 text-center text-foreground">
                <Glyph name="eye-off" size={22} />
                <span className="text-label-md">Privacy mode is on — image hidden</span>
              </div>
            ) : poster ? (
              <div className="absolute inset-0">{fillFrame(poster)}</div>
            ) : (
              <div data-poster-placeholder="" className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <DeviceIcon category="camera" size={36} />
              </div>
            )}
          </div>
          {caption ? <figcaption className="text-label-sm text-muted-foreground">{caption}</figcaption> : null}
        </figure>

        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-label-md text-foreground">
          {recording !== undefined ? (
            <li data-recording={recording === null ? "unknown" : recording ? "on" : "off"} className="flex items-center gap-1.5">
              <Glyph name={recording === null ? "dash" : recording ? "record" : "circle"} size={14} />
              <span>{recording === null ? "Recording status unknown" : recording ? "Recording" : "Not recording"}</span>
            </li>
          ) : null}
          {privacy !== undefined ? (
            <li data-privacy-state={privacy} className="flex items-center gap-1.5">
              <Glyph name={privacy === "on" ? "eye-off" : privacy === "off" ? "circle" : "dash"} size={14} />
              <span>{privacy === "on" ? "Privacy mode on" : privacy === "off" ? "Privacy mode off" : "Privacy mode unknown"}</span>
            </li>
          ) : null}
          {lastEvent ? (
            <li data-last-event="" className="flex flex-wrap items-center gap-x-2">
              <span className="break-words">{lastEvent.label}</span>
              {lastEvent.at !== undefined && lastEvent.at !== null ? <LastSync value={lastEvent.at} now={now} className="text-label-sm" /> : null}
            </li>
          ) : null}
        </ul>

        {device?.battery !== undefined || device?.signal !== undefined ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {device?.battery !== undefined ? <BatteryIndicator value={device.battery} /> : null}
            {device?.signal !== undefined ? <SignalStrength value={device.signal} /> : null}
          </div>
        ) : null}

        {controls ? <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">{controls}</div> : null}
      </div>
    );
  },
), "CameraDeviceCard");

export { CameraDeviceCard };
