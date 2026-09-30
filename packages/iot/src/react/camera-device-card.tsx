import * as React from "react";
import type { KinetixDevice } from "../types/device";
import { normalizeDeviceStatus } from "../functions/status";
import { BatteryIndicator } from "./battery-indicator";
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
 * ## The built-in scene
 * With no `poster`, the frame shows an **original abstract SVG scene** — flat shapes in token tints, no
 * photo, no external asset — chosen by `scene` (`room`, `entrance` or `yard`) so a card can suggest
 * *where* the camera is. It is decoration (`aria-hidden`) and is captioned as a sample; it is never
 * presented as what the camera sees.
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
  /** The built-in abstract scene shown when there is no `poster`. Default `room`. */
  scene?: "room" | "entrance" | "yard";
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

/**
 * Flat, abstract, original shapes in token tints. Everything is `aria-hidden` decoration; nothing in it
 * is a photograph, a product likeness or a claim about what a camera sees.
 */
function Scene({ scene }: { scene: "room" | "entrance" | "yard" }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid slice"
      className="block size-full"
    >
      <rect width="160" height="90" className="fill-muted" />
      {scene === "room" ? (
        <>
          <rect x="0" y="62" width="160" height="28" className="fill-foreground/10" />
          <rect x="16" y="14" width="46" height="34" rx="3" className="fill-primary/15" />
          <path d="M39 14v34M16 31h46" className="stroke-background" strokeWidth="2" fill="none" />
          <circle cx="126" cy="30" r="15" className="fill-warning/20" />
          <circle cx="126" cy="30" r="6" className="fill-warning/40" />
          <path d="M126 45v20" className="stroke-foreground/25" strokeWidth="2" fill="none" />
          <rect x="70" y="50" width="52" height="20" rx="6" className="fill-foreground/20" />
          <rect x="66" y="58" width="60" height="14" rx="5" className="fill-foreground/25" />
          <rect x="34" y="72" width="70" height="8" rx="4" className="fill-primary/20" />
        </>
      ) : null}
      {scene === "entrance" ? (
        <>
          <rect x="0" y="66" width="160" height="24" className="fill-foreground/10" />
          <rect x="52" y="12" width="52" height="58" rx="3" className="fill-foreground/10" />
          <rect x="58" y="18" width="40" height="52" rx="2" className="fill-primary/20" />
          <rect x="64" y="24" width="12" height="16" rx="1.5" className="fill-background/60" />
          <rect x="80" y="24" width="12" height="16" rx="1.5" className="fill-background/60" />
          <circle cx="90" cy="46" r="2" className="fill-foreground/40" />
          <rect x="46" y="70" width="64" height="6" rx="2" className="fill-foreground/20" />
          <circle cx="120" cy="30" r="9" className="fill-warning/25" />
          <rect x="118" y="36" width="4" height="6" className="fill-foreground/25" />
          <rect x="16" y="54" width="14" height="16" rx="3" className="fill-foreground/20" />
          <circle cx="23" cy="48" r="9" className="fill-success/25" />
        </>
      ) : null}
      {scene === "yard" ? (
        <>
          <rect x="0" y="54" width="160" height="36" className="fill-success/15" />
          <path d="M60 90 80 54h8l24 36Z" className="fill-foreground/10" />
          <rect x="0" y="40" width="160" height="16" className="fill-foreground/10" />
          {[6, 22, 38, 54, 70, 86, 102, 118, 134, 150].map((x) => (
            <rect key={x} x={x} y="36" width="8" height="24" rx="1.5" className="fill-foreground/15" />
          ))}
          <rect x="26" y="20" width="5" height="22" className="fill-foreground/25" />
          <circle cx="28" cy="16" r="15" className="fill-success/30" />
          <circle cx="132" cy="14" r="8" className="fill-warning/30" />
        </>
      ) : null}
    </svg>
  );
}

/** A plain `<img>` poster is made to fill the frame; any other node is the product's to size. */
function fillFrame(poster: React.ReactNode): React.ReactNode {
  if (React.isValidElement<{ className?: string }>(poster) && poster.type === "img") {
    return React.cloneElement(poster, { className: cn("size-full object-cover", poster.props.className) });
  }
  return poster;
}

const CameraDeviceCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, CameraDeviceCardProps>(
  ({ device, poster, posterLabel, scene = "room", privacy, recording, lastEvent, controls, now, className, ...props }, ref) => {
    const status = normalizeDeviceStatus(device?.status);
    const hidden = privacy === "on";
    const caption = posterLabel?.trim() ? posterLabel : poster || hidden ? undefined : "Sample image — no live feed";

    return (
      <div
        ref={ref}
        data-status={status}
        data-privacy={privacy}
        className={cn("flex min-w-0 flex-col gap-3 rounded-2xl bg-card p-3 font-sans text-card-foreground shadow-sm", className)}
        {...props}
      >
        <figure className="m-0 flex flex-col gap-2">
          <div
            data-poster-frame=""
            className={cn(
              "relative aspect-video min-h-40 w-full overflow-hidden rounded-xl bg-muted",
              status === "offline" && "border border-dashed border-border",
            )}
          >
            {hidden ? (
              <div data-privacy-cover="" className="absolute inset-0 flex flex-col items-center justify-end gap-1.5 bg-muted p-4 pb-5 text-center text-foreground">
                <Glyph name="eye-off" size={24} />
                <span className="text-label-lg">Privacy mode is on — image hidden</span>
              </div>
            ) : poster ? (
              <div className="absolute inset-0">{fillFrame(poster)}</div>
            ) : (
              <div data-poster-placeholder="" data-scene={scene} className="absolute inset-0 text-muted-foreground">
                <Scene scene={scene} />
              </div>
            )}

            {/* Status over the frame, where the eye already is. Words and glyphs, not colour alone. */}
            <div className="absolute inset-x-2 top-2 z-raised flex flex-wrap items-start justify-between gap-2">
              <DeviceStatusBadge status={status} className="shadow-sm" />
              <ul className="m-0 flex list-none flex-wrap justify-end gap-1.5 p-0 text-label-md text-foreground">
                {recording !== undefined ? (
                  <li data-recording={recording === null ? "unknown" : recording ? "on" : "off"} className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 shadow-sm">
                    <Glyph name={recording === null ? "dash" : recording ? "record" : "circle"} size={14} className={recording ? "text-destructive" : undefined} />
                    <span>{recording === null ? "Recording status unknown" : recording ? "Recording" : "Not recording"}</span>
                  </li>
                ) : null}
                {privacy !== undefined ? (
                  <li data-privacy-state={privacy} className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 shadow-sm">
                    <Glyph name={privacy === "on" ? "eye-off" : privacy === "off" ? "circle" : "dash"} size={14} />
                    <span>{privacy === "on" ? "Privacy mode on" : privacy === "off" ? "Privacy mode off" : "Privacy mode unknown"}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
          {caption ? <figcaption className="text-label-md text-muted-foreground">{caption}</figcaption> : null}
        </figure>

        <div className="flex min-w-0 flex-col gap-0.5 px-1">
          <span className="truncate text-title-md text-foreground">{device?.name}</span>
          {device?.locationName ? <span className="truncate text-body-md text-muted-foreground">{device.locationName}</span> : null}
        </div>

        {lastEvent || device?.battery !== undefined || device?.signal !== undefined ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-body-sm text-muted-foreground">
            {lastEvent ? (
              <p data-last-event="" className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 text-body-md text-foreground">
                <span className="break-words">{lastEvent.label}</span>
                {lastEvent.at !== undefined && lastEvent.at !== null ? <LastSync value={lastEvent.at} now={now} className="text-label-md" /> : null}
              </p>
            ) : null}
            <span className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-2">
              {device?.battery !== undefined ? <BatteryIndicator value={device.battery} /> : null}
              {device?.signal !== undefined ? <SignalStrength value={device.signal} /> : null}
            </span>
          </div>
        ) : null}

        {controls ? <div className="flex flex-wrap items-center gap-2 px-1">{controls}</div> : null}
      </div>
    );
  },
), "CameraDeviceCard");

export { CameraDeviceCard };
