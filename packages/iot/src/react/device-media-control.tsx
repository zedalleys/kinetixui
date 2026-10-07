"use client";

import * as React from "react";
import type { KinetixCommandLifecycle, KinetixCommandStrategy } from "../types/command";
import type { KinetixCapabilitySupport } from "../types/device-state";
import type { KinetixControlState, KinetixMediaPlaybackRequest, KinetixMediaPlaybackState } from "../types/control";
import {
  MUTE_SENTENCE,
  PLAYBACK_SENTENCE,
  SEEK_SENTENCE,
  describeMediaTime,
  describePlaybackState,
  formatMediaTime,
  nextPlaybackRequest,
  normalizeMediaPlaybackState,
} from "../functions/media";
import { cn } from "./cn";
import { ControlAnnouncer, ControlOutcomeNote, pendingMotion, SupportNote, useControlContract } from "./control-outcome";
import { DeviceLevelControl, LevelFormatContext, type LevelFormat } from "./device-level-control";
import { withDisplayName } from "./display-name";

/**
 * DeviceMediaControl — the interaction and truth of a media endpoint, with no media in it.
 *
 * **The boundary.** KinetixUI owns the controls and what they claim; the application owns playback.
 * There is no `<audio>`, no `<video>`, no stream, codec, player or vendor SDK here, and nothing in this
 * component starts, stops or seeks anything: every transport action is a callback, and the device's
 * answer comes back as a reported value or a command lifecycle. The same control fits a speaker, a TV,
 * a smart display or any playback endpoint, because none of those is named in it.
 *
 * **Requests are not results.** Each asynchronous command has its own lifecycle, all on the shared
 * contract, under one `strategy`:
 *
 * - play/pause — `playbackLifecycle`. Under `confirmed` (default) the headline stays at what the device
 *   reports ("Paused") and the request is marked beside it ("Starting playback, not yet confirmed");
 *   `hybrid` leads with the direction; `optimistic` shows the request and rolls back in words.
 * - seek — `seekLifecycle`. The scrubber is `DeviceLevelControl`, so the reported position and the
 *   requested target are drawn apart exactly as a level's are, and the time is written "1:05" and
 *   spoken "1 minute 5 seconds".
 * - volume — `volumeLifecycle`, through `DeviceLevelControl` itself: the level semantics, not a copy.
 * - mute — `muteLifecycle`. A toggle button whose `aria-pressed` is the reported state while a change is marked.
 *
 * Previous and next are plain callbacks: their result is a new title, which the product reports.
 *
 * **Direction.** The transport cluster and the scrubber are kept left-to-right in an RTL document,
 * following the platform convention that media playback controls and progress are not mirrored; the
 * text around them is.
 */
// `onVolumeChange` is a real DOM media-event handler on HTMLAttributes, so it is omitted rather than shadowed.
export interface DeviceMediaControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onVolumeChange"> {
  /** The endpoint's name, e.g. "Kitchen speaker". Names the group. */
  label: string;
  /** What is playing, as the product knows it. */
  title?: string;
  subtitle?: string;
  /** Artwork or a poster, rendered by the product (an `<img>`, a placeholder). Never a stream. */
  artwork?: React.ReactNode;

  /** Reported playback. Ignored with a `playbackLifecycle`. */
  playback?: KinetixMediaPlaybackState | null;
  /** Requested playback, while unconfirmed. Ignored with a `playbackLifecycle`. */
  requestedPlayback?: KinetixMediaPlaybackRequest | null;
  playbackLifecycle?: KinetixCommandLifecycle<KinetixMediaPlaybackState> | null;
  /** Called with the playback being requested. Nothing plays until the application makes it. */
  onPlaybackRequest?: (next: KinetixMediaPlaybackRequest) => void;
  onPrevious?: () => void;
  onNext?: () => void;

  /** Reported position, in seconds. Ignored with a `seekLifecycle`. */
  position?: number | null;
  /** Requested seek target, in seconds, while unconfirmed. Ignored with a `seekLifecycle`. */
  requestedPosition?: number | null;
  seekLifecycle?: KinetixCommandLifecycle<number> | null;
  /** Length in seconds. Without one (a live source) there is no scrubber. */
  duration?: number | null;
  onSeek?: (seconds: number) => void;

  /** Reported volume, 0–100 unless `volumeMax` says otherwise. Ignored with a `volumeLifecycle`. */
  volume?: number | null;
  requestedVolume?: number | null;
  volumeLifecycle?: KinetixCommandLifecycle<number> | null;
  volumeMax?: number;
  onVolumeChange?: (level: number) => void;

  /** Reported mute. Ignored with a `muteLifecycle`. */
  muted?: boolean | null;
  requestedMuted?: boolean | null;
  muteLifecycle?: KinetixCommandLifecycle<boolean> | null;
  onMuteChange?: (muted: boolean) => void;

  /** One strategy for every command this control tracks. Defaults to `confirmed`. */
  strategy?: KinetixCommandStrategy;
  /** As on the other controls: on by default for each command given a lifecycle. */
  announce?: boolean;
  control?: KinetixControlState;
  /** From `resolveCapabilitySupport`. `read-only` shows what is playing without controls; `unsupported` says so. */
  support?: KinetixCapabilitySupport;
}

const ICON = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", focusable: "false", "aria-hidden": true } as const;
const PlayIcon = () => (
  <svg {...ICON} data-icon="play">
    <path d="M6 4.5v11l9-5.5Z" fill="currentColor" />
  </svg>
);
const PauseIcon = () => (
  <svg {...ICON} data-icon="pause">
    <path d="M7 4.5v11M13 4.5v11" />
  </svg>
);
const PreviousIcon = () => (
  <svg {...ICON}>
    <path d="M5 4.5v11M15 4.5v11l-7.5-5.5Z" />
  </svg>
);
const NextIcon = () => (
  <svg {...ICON}>
    <path d="M15 4.5v11M5 4.5v11l7.5-5.5Z" />
  </svg>
);
const SpeakerIcon = ({ muted }: { muted: boolean }) => (
  <svg {...ICON} data-icon={muted ? "muted" : "unmuted"}>
    <path d="M3.5 7.5h3l4-3.5v12l-4-3.5h-3Z" />
    {muted ? <path d="m13.5 7.5 4 5M17.5 7.5l-4 5" /> : <path d="M13.5 7.5a3.5 3.5 0 0 1 0 5M15.5 5.5a6.5 6.5 0 0 1 0 9" />}
  </svg>
);

const BUTTON = cn(
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full",
  "transition-colors duration-fast ease-enter motion-reduce:transition-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "forced-colors:focus-visible:outline forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-55",
);

const SCRUB_FORMAT: LevelFormat = { value: formatMediaTime, valueText: describeMediaTime, sentence: SEEK_SENTENCE };

const DeviceMediaControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceMediaControlProps>(
  (
    {
      label, title, subtitle, artwork,
      playback, requestedPlayback, playbackLifecycle, onPlaybackRequest, onPrevious, onNext,
      position, requestedPosition, seekLifecycle, duration, onSeek,
      volume, requestedVolume, volumeLifecycle, volumeMax = 100, onVolumeChange,
      muted, requestedMuted, muteLifecycle, onMuteChange,
      strategy, announce, control: controlProp, support = "supported", className, ...props
    },
    ref,
  ) => {
    const play = useControlContract<KinetixMediaPlaybackState>(
      { lifecycle: playbackLifecycle, strategy, announce, control: controlProp, reported: normalizeMediaPlaybackState(playback), requested: requestedPlayback ?? undefined },
      PLAYBACK_SENTENCE,
    );
    const mute = useControlContract<boolean>(
      { lifecycle: muteLifecycle, strategy, announce, control: controlProp, reported: muted ?? undefined, requested: requestedMuted ?? undefined },
      MUTE_SENTENCE,
    );
    // Each command resolves its own interactivity: a pending play does not lock the volume.
    const control = controlProp;
    const operableNow = (resolved: KinetixControlState | undefined) => (resolved ? resolved.interactive : true);
    const interactive = operableNow(controlProp);
    // The levels inside take the same availability, but its sentence is said once, in the header.
    const partControl = controlProp ? { ...controlProp, description: "" } : undefined;

    // Playback, read off the presentation and never off the strategy's name.
    const reported = normalizeMediaPlaybackState(play.presentation.reportedValue);
    const asked = play.presentation.pending ? play.presentation.pendingValue : undefined;
    const wanted: KinetixMediaPlaybackRequest | undefined = asked === "playing" || asked === "paused" ? asked : undefined;
    const pending = wanted !== undefined && wanted !== reported;
    const marked = pending && play.presentation.indicatePending;
    const drawsRequest = pending && play.presentation.valueSource === "requested";
    const shown: KinetixMediaPlaybackState = drawsRequest ? wanted! : reported;
    // A marked request leaves the button where the device is: pressing it asks for the opposite of what
    // the device reports, not of what was asked.
    const action = nextPlaybackRequest(marked ? reported : shown);
    const headline = pending && marked ? describePlaybackState(reported, drawsRequest ? wanted : undefined) : describePlaybackState(shown);

    // Mute, the same way.
    const mutedReported = mute.presentation.reportedValue;
    const muteAsked = mute.presentation.pending ? mute.presentation.pendingValue : undefined;
    const mutePending = typeof muteAsked === "boolean" && muteAsked !== mutedReported;
    const muteMarked = mutePending && mute.presentation.indicatePending;
    const mutedShown = mutePending && mute.presentation.valueSource === "requested" ? muteAsked : mutedReported;
    const pressed = muteMarked ? mutedReported === true : mutedShown === true;

    const labelId = React.useId();
    const descriptionId = React.useId();
    const described = control?.description && control.availability !== "ready";
    const hasDuration = typeof duration === "number" && Number.isFinite(duration) && duration > 0;
    // Without a duration there is no scrubber, only the elapsed time: the lifecycle's when given, as everywhere.
    const elapsed = seekLifecycle ? seekLifecycle.confirmedValue : position;
    const hasVolume = volumeLifecycle != null || volume !== undefined || onVolumeChange !== undefined;
    const hasMute = muteLifecycle != null || muted !== undefined || onMuteChange !== undefined;

    if (support === "unsupported") return <SupportNote nodeRef={ref} label={label} className={className} {...props} />;
    const operable = support === "supported";

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={labelId}
        aria-busy={pending || mutePending || undefined}
        data-strategy={play.presentation.strategy}
        // The device's word only, as on the lock.
        data-playback={reported}
        className={cn("flex min-w-0 flex-col gap-4", className)}
        {...props}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div aria-hidden={artwork ? undefined : true} className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
            {artwork ?? <PlayIcon />}
          </div>
          <div className="flex min-w-0 flex-col">
            <span id={labelId} className="text-label-lg text-muted-foreground">
              {label}
            </span>
            {title ? <span className="break-words text-title-md text-foreground">{title}</span> : null}
            {subtitle ? <span className="break-words text-body-md text-muted-foreground">{subtitle}</span> : null}
            <span data-playback-headline="" data-value-source={drawsRequest ? "requested" : "reported"} className={cn("break-words text-label-lg", marked ? "text-muted-foreground" : "text-foreground")}>
              {headline}
            </span>
            {marked ? (
              <span
                data-requested=""
                className={cn("inline-flex w-fit max-w-full items-center rounded-full border border-dashed border-primary bg-primary/10 px-2.5 py-0.5 text-label-md text-foreground", pendingMotion(play.control?.availability))}
              >
                <span className="min-w-0 break-words">
                  {drawsRequest
                    ? `Waiting for the device. It still reports ${describePlaybackState(reported).toLowerCase()}`
                    : `${describePlaybackState(reported, wanted)}, not yet confirmed`}
                </span>
              </span>
            ) : null}
            {described ? (
              <span id={descriptionId} className="break-words text-label-md text-muted-foreground">
                {control!.description}
              </span>
            ) : null}
            {support === "read-only" ? <span className="text-label-md text-muted-foreground">Read only on this device</span> : null}
          </div>
        </div>

        {operable ? (
          <div dir="ltr" data-media-part="transport" className="flex items-center justify-center gap-2">
            {onPrevious ? (
              <button type="button" aria-label="Previous" disabled={!interactive} onClick={onPrevious} className={cn(BUTTON, "text-foreground hover:bg-muted")}>
                <PreviousIcon />
              </button>
            ) : null}
            <button
              type="button"
              aria-label={action === "playing" ? "Play" : "Pause"}
              aria-describedby={described ? descriptionId : undefined}
              aria-busy={pending || undefined}
              disabled={!operableNow(play.control)}
              data-media-action={action}
              data-shown={shown}
              onClick={() => onPlaybackRequest?.(action)}
              className={cn(
                BUTTON,
                "size-14 bg-primary text-primary-foreground hover:bg-primary/90",
                // Asked for, not confirmed: an outlined, dashed button rather than a filled one.
                marked && "border-2 border-dashed border-primary bg-background text-foreground hover:bg-muted",
              )}
            >
              {action === "playing" ? <PlayIcon /> : <PauseIcon />}
            </button>
            {onNext ? (
              <button type="button" aria-label="Next" disabled={!interactive} onClick={onNext} className={cn(BUTTON, "text-foreground hover:bg-muted")}>
                <NextIcon />
              </button>
            ) : null}
          </div>
        ) : null}
        <ControlOutcomeNote presentation={play.presentation} sentence={PLAYBACK_SENTENCE} />
        <ControlAnnouncer announcement={play.announcement} />

        {hasDuration && operable ? (
          <div dir="ltr" data-media-part="scrubber" className="flex flex-col gap-1">
            <LevelFormatContext.Provider value={SCRUB_FORMAT}>
              <DeviceLevelControl
                label="Position"
                min={0}
                max={Math.floor(duration!)}
                step={1}
                lifecycle={seekLifecycle}
                value={position ?? null}
                target={requestedPosition ?? null}
                strategy={strategy}
                announce={announce}
                control={partControl}
                onCommit={onSeek}
              />
            </LevelFormatContext.Provider>
            <span className="text-label-md tabular-nums text-muted-foreground">Duration {formatMediaTime(duration)}</span>
          </div>
        ) : typeof elapsed === "number" ? (
          <span data-media-part="elapsed" className="text-label-md tabular-nums text-muted-foreground">
            Elapsed {formatMediaTime(elapsed)}
          </span>
        ) : null}

        {(hasVolume || hasMute) && operable ? (
          <div data-media-part="volume" className="flex min-w-0 items-end gap-3">
            {hasMute ? (
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  aria-label="Mute"
                  aria-pressed={pressed}
                  aria-busy={mutePending || undefined}
                  disabled={!operableNow(mute.control)}
                  data-shown={mutedShown === true ? "muted" : mutedShown === false ? "unmuted" : "unknown"}
                  onClick={() => onMuteChange?.(!pressed)}
                  className={cn(
                    BUTTON,
                    "border-2",
                    pressed ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-foreground hover:bg-muted",
                    muteMarked && "border-dashed border-primary",
                  )}
                >
                  <SpeakerIcon muted={mutedShown === true} />
                </button>
                <ControlAnnouncer announcement={mute.announcement} />
              </div>
            ) : null}
            {hasVolume ? (
              <DeviceLevelControl
                className="min-w-0 flex-1"
                label="Volume"
                min={0}
                max={volumeMax}
                lifecycle={volumeLifecycle}
                value={volume ?? null}
                target={requestedVolume ?? null}
                strategy={strategy}
                announce={announce}
                control={partControl}
                onCommit={onVolumeChange}
              />
            ) : null}
          </div>
        ) : null}
        {hasMute ? <ControlOutcomeNote presentation={mute.presentation} sentence={MUTE_SENTENCE} /> : null}
      </div>
    );
  },
), "DeviceMediaControl");

export { DeviceMediaControl };
