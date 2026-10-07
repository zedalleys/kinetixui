"use client";

import * as React from "react";
import type { KinetixControlState } from "../types/control";
import { snapToStep, type DescribeControlOutcomeOptions } from "../functions/control";
import { cn } from "./cn";
import { ControlAnnouncer, ControlOutcomeNote, pendingMotion, useControlContract, type ControlContractProps } from "./control-outcome";
import { withDisplayName } from "./display-name";

/**
 * DeviceSetpointControl — a target the device is working towards.
 *
 * Generalised rather than climate-specific, because the shape is identical for a thermostat holding
 * 21°C, a chiller holding 4°C, a humidifier holding 55%RH and a pressure regulator holding 2.4 bar.
 * Naming it `Thermostat` would have bought nothing but a word that stops being true on the second
 * product.
 *
 * **Two numbers, and the difference between them is the point.** The target is the large figure
 * because it is the thing the user sets; the current measurement sits beneath it, quieter, because
 * it is the thing the device reports. Products that show only one leave the user unable to tell
 * "it's cold" from "it's heading there" — which is the single most common complaint about
 * thermostat UIs.
 *
 * **Three numbers, never confused.** The current measurement, the target the device reports and a
 * requested target are each drawn and worded as what they are. The `strategy` decides only which
 * target the large numeral leads with while a change is open: the reported one under `confirmed`
 * (default), the requested one under `hybrid` (with a chip naming the device's target) and
 * `optimistic` (with no chip, rolled back in words if the change does not happen).
 *
 * Stepping is by button, not a slider: setpoints are adjusted in small deliberate increments and a
 * drag across a 10-degree range is a fat-finger hazard on a device that costs money to run. The
 * buttons are real buttons with real labels, so keyboard and screen reader work without anything
 * extra, and holding one does not auto-repeat — a deliberate omission, since an unnoticed repeat on
 * a setpoint is expensive.
 */
export interface DeviceSetpointControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">, ControlContractProps<number> {
  /** What the device is measuring now. `null` renders as unknown rather than as the target. */
  current?: number | null;
  /** The confirmed target. Ignored when a `lifecycle` is passed. */
  target?: number | null;
  /** A requested target that the device has not confirmed. Ignored with a `lifecycle`. */
  requestedTarget?: number | null;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Accessible name, e.g. "Living room temperature". */
  label: string;
  control?: KinetixControlState;
  onCommit?: (next: number) => void;
  /** What the device is doing to reach the target — "Heating", "Cooling", "Idle". Product's words. */
  activity?: string;
  /**
   * `numeral` (default) is the big number between round ± buttons. `ring` draws an `aria-hidden` progress
   * arc around the numeral: the confirmed target as the solid arc and marker, and a dashed segment out to a
   * hollow marker for a requested change. It is decoration only — the ± buttons stay the interaction; there
   * is no dragging.
   */
  presentation?: "numeral" | "ring";
  /** An inline secondary reading under the numeral — a humidity chip, a mode word. */
  secondary?: React.ReactNode;
}

const ARC_START = 135;
const ARC_SWEEP = 270;
const RING = 100;
const ARC_RADIUS = 84;
const MARKER_RADIUS = 9;
const MARKER_STROKE = 4;

/** Point on the ring at a 0–1 fraction of the arc, in a 200×200 box. */
function ringPoint(f: number, r: number): [number, number] {
  const a = ((ARC_START + ARC_SWEEP * f) * Math.PI) / 180;
  return [RING + r * Math.cos(a), RING + r * Math.sin(a)];
}

/**
 * The lowest point anything on the ring reaches: the arc's ends (start and end of the sweep sit at the same
 * height) plus a marker drawn there at the range's limits. Below it the 200×200 box is empty edge to edge.
 */
const RING_FLOOR = ringPoint(0, ARC_RADIUS)[1] + MARKER_RADIUS + MARKER_STROKE / 2;
/** That empty band, as a percentage of the ring's width (the box is square). */
const RING_OPEN_BAND = ((2 * RING - RING_FLOOR) / (2 * RING)) * 100;

/** An SVG arc path between two fractions. */
function ringArc(from: number, to: number, r: number): string {
  const [x1, y1] = ringPoint(from, r);
  const [x2, y2] = ringPoint(to, r);
  const large = (to - from) * ARC_SWEEP > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

const DeviceSetpointControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceSetpointControlProps>(
  (
    {
      current,
      target,
      requestedTarget,
      min,
      max,
      step = 0.5,
      unit = "°",
      label,
      control: controlProp,
      lifecycle,
      strategy,
      announce,
      onCommit,
      activity,
      presentation = "numeral",
      secondary,
      className,
      ...props
    },
    ref,
  ) => {
    const sentence: DescribeControlOutcomeOptions = {
      formatValue: (v) => `${String(v)}${unit}`,
      pendingPhrase: (v) => `Changing the target to ${String(v)}${unit}`,
      failedPhrase: (v) => `Could not change the target to ${String(v)}${unit}`,
    };
    const contract = useControlContract<number>({ lifecycle, strategy, announce, control: controlProp, reported: target, requested: requestedTarget }, sentence);
    const { control } = contract;
    const view = contract.presentation;
    const reportedTarget = view.reportedValue;
    const confirmed = typeof reportedTarget === "number" && Number.isFinite(reportedTarget) ? reportedTarget : null;
    const requested = view.pending && typeof view.pendingValue === "number" ? view.pendingValue : null;
    const pending = requested !== null && requested !== confirmed;
    const marked = pending && view.indicatePending;
    // Read off the presentation, never off the strategy's name. The large numeral leads with the request
    // when the presentation draws it; the arc's solid part follows it only when it is also unmarked.
    const lead = pending && view.valueSource === "requested" ? requested : confirmed;
    const arc = pending && !marked ? requested : confirmed;
    // Stepping starts from the latest intent, whatever is drawn: a second press after asking for 21
    // asks for 21.5, not for the reported 20 plus one step.
    const shown = pending ? requested! : confirmed;

    const interactive = control ? control.interactive : true;
    const descriptionId = React.useId();

    const nudge = (delta: number) => {
      if (shown === null) return;
      const next = snapToStep(shown + delta, min, max, step);
      if (next !== shown) onCommit?.(next);
    };

    const atMin = shown !== null && shown <= min;
    const atMax = shown !== null && shown >= max;

    const STEP_BUTTON = cn(
      "grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground",
      "transition-colors duration-fast hover:bg-muted/60 active:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
      "disabled:cursor-not-allowed disabled:opacity-45",
    );

    const ring = presentation === "ring";
    const span = max - min || 1;
    const frac = (n: number) => Math.min(1, Math.max(0, (n - min) / span));
    const numeralBlock = (
      <div className={cn("flex min-w-0 flex-col items-center gap-1.5", ring ? "px-4" : "flex-1")}>
            <span
          // Deliberately NOT a live region. The sr-only sentence below announces the same change
          // with its context ("target 21, currently 19"); making this one live as well had a
          // screen reader read the bare number first and the sentence straight after.
          // The big number is the CONFIRMED target; a request never replaces it.
          data-confirmed={lead === confirmed ? "" : undefined}
          data-value-source={lead === confirmed ? "reported" : "requested"}
          className={cn("tabular-nums leading-none text-display-sm", lead === null ? "text-muted-foreground" : "text-foreground")}
            >
          {lead === null ? "—" : lead}
          {lead === null ? null : <span className="ms-0.5 align-top text-title-md text-muted-foreground">{unit}</span>}
            </span>
            {marked ? (
          <span
            data-requested=""
            className={cn("inline-flex max-w-full items-center rounded-full border border-dashed border-primary bg-primary/10 px-2.5 py-0.5 text-label-md tabular-nums text-foreground", pendingMotion(control?.availability))}
          >
            {lead === confirmed
              ? `Requested ${requested}${unit}, not yet confirmed`
              : `Requested, not yet confirmed. Device target ${confirmed === null ? "unknown" : `${confirmed}${unit}`}`}
          </span>
            ) : null}
            {secondary ? <span className="text-body-sm text-muted-foreground">{secondary}</span> : null}
            <span className="max-w-full text-center text-body-sm text-muted-foreground [overflow-wrap:anywhere]">
          {current === null || current === undefined
            ? "Current unknown"
            : `Now ${current}${unit}`}
          {activity ? ` · ${activity}` : ""}
            </span>
      </div>
    );

    return (
      // `aria-busy` on the container, as the other three controls set it on their widget: under
      // `optimistic` the chip is withheld and nothing is announced while it waits, so this is the only
      // programmatic sign that the numeral is a request. The steppers carry it too, because that is
      // where a keyboard or screen-reader user actually is.
      <div ref={ref} aria-busy={pending || undefined} className={cn("flex flex-col gap-3", className)} data-pending={pending ? "" : undefined} data-strategy={view.strategy} {...props}>
        {ring ? (
          // The ring is a container so its layout can follow the room it actually has. When the ring is at
          // least 12rem wide the numeral sits inside the gauge and the steppers tuck into the band under the
          // arc's open ends. Narrower than that (a phone at 200% text, browser zoom) the numeral cannot fit
          // inside the arc, so the decoration steps aside: the numeral and the steppers stack in normal flow
          // and every word and control stays. `rem` in the query scales with text, `%` with the ring.
          <div data-presentation="ring" className="mx-auto w-full max-w-64 [container-type:inline-size]">
            <div data-ring-face="" className="relative [@container(min-width:12rem)]:aspect-square">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 200 200" className="absolute inset-0 hidden size-full rtl:-scale-x-100 [@container(min-width:12rem)]:block">
                <path d={ringArc(0, 1, ARC_RADIUS)} fill="none" strokeWidth={14} strokeLinecap="round" className="stroke-muted" />
                {arc !== null ? (
                  // An arc's `d` is not a property a browser can interpolate, so a confirmed target used to
                  // jump to its new length: measured in Chromium, `transition-duration` was `0s` and nothing
                  // was running 45ms after the device agreed. Drawing the WHOLE arc once and revealing a
                  // fraction of it with `stroke-dashoffset` moves the same pixels over a property that does
                  // interpolate. `pathLength={1}` normalises the geometry so the offset is the fraction
                  // itself, with no arc-length arithmetic to keep in step with `ringArc`.
                  <path
                    data-ring-confirmed=""
                    data-value-source={arc === confirmed ? "reported" : "requested"}
                    d={ringArc(0, 1, ARC_RADIUS)}
                    pathLength={1}
                    strokeDasharray="1 1"
                    strokeDashoffset={1 - frac(arc)}
                    fill="none"
                    strokeWidth={14}
                    // Butt at the bottom of the range: a round cap on a zero-length dash draws a dot, which
                    // reads as a value where there is none.
                    strokeLinecap={frac(arc) > 0.005 ? "round" : "butt"}
                    className="stroke-primary transition-[stroke-dashoffset] duration-base ease-enter motion-reduce:transition-none"
                  />
                ) : null}
                {marked && confirmed !== null ? (
                  <path
                    data-ring-requested=""
                    d={ringArc(Math.min(frac(confirmed), frac(requested!)), Math.max(frac(confirmed), frac(requested!)), ARC_RADIUS)}
                    fill="none"
                    strokeWidth={14}
                    strokeDasharray="3 7"
                    className="stroke-primary"
                  />
                ) : null}
                {arc !== null ? (
                  // Same reason, different property: `cx`/`cy` are recomputed per value, so the marker
                  // teleported while the arc under it travelled. Every point on the ring is the same point
                  // rotated, so the marker is drawn once at the arc's start and rotated into place — and
                  // `transform` is a property the browser interpolates.
                  <g
                    data-ring-marker=""
                    className="transition-transform duration-base ease-enter motion-reduce:transition-none"
                    style={{ transform: `rotate(${ARC_SWEEP * frac(arc)}deg)`, transformOrigin: `${RING}px ${RING}px` }}
                  >
                    <circle cx={ringPoint(0, ARC_RADIUS)[0]} cy={ringPoint(0, ARC_RADIUS)[1]} r={MARKER_RADIUS} strokeWidth={MARKER_STROKE} className="fill-background stroke-primary" />
                  </g>
                ) : null}
                {marked ? (
                  <circle cx={ringPoint(frac(requested!), ARC_RADIUS)[0]} cy={ringPoint(frac(requested!), ARC_RADIUS)[1]} r={MARKER_RADIUS} strokeWidth={3} strokeDasharray="3 3" className="fill-background stroke-primary" />
                ) : null}
              </svg>
              <div className="flex items-center justify-center [@container(min-width:12rem)]:absolute [@container(min-width:12rem)]:inset-0 [@container(min-width:12rem)]:px-8 [@container(min-width:12rem)]:pb-4">
                {numeralBlock}
              </div>
              {/* Stacked only: gives back the band the stepper row is pulled up by, so there it sits one step below. */}
              <div aria-hidden="true" className="[@container(min-width:12rem)]:hidden" style={{ paddingBlockEnd: `${RING_OPEN_BAND.toFixed(2)}%` }} />
            </div>
            {/*
              CONTROL CLEARANCE, derived rather than guessed. The steppers used to be pinned to the ring's
              bottom corners with fixed insets — exactly under the arc's two ends — so at every width the
              buttons sat on the arc (measured in Chromium: 7–17px into the end markers). The arc's ends are
              its lowest points, so everything below RING_FLOOR is empty from edge to edge. The row is pulled
              up into that band by its height as a percentage of the ring's width (a percentage margin
              resolves against width; it is geometry, so it is computed here rather than a token), and then
              pushed back down by one spacing step (`--spacing-2`), which is the room a
              2px focus ring with a 2px offset needs. So the buttons never meet the arc at any size, and they
              read as part of the gauge rather than a row bolted under it. The row is `relative` so it paints
              above the face it tucks into: the face is positioned, and without this its numeral layer took
              the clicks aimed at the top half of each button.
            */}
            <div
              data-ring-steppers=""
              className="relative flex items-center justify-center gap-4"
              style={{ marginBlockStart: `calc(-${RING_OPEN_BAND.toFixed(2)}% + var(--spacing-2, 0.5rem))` }}
            >
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            aria-busy={pending || undefined}
            disabled={!interactive || atMin || shown === null}
            onClick={() => nudge(-step)}
            className={STEP_BUTTON}
          >
            {/* Minus and plus are direction-neutral, so nothing here needs to flip under RTL. */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`Increase ${label}`}
            aria-busy={pending || undefined}
            disabled={!interactive || atMax || shown === null}
            onClick={() => nudge(step)}
            className={STEP_BUTTON}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            aria-busy={pending || undefined}
            disabled={!interactive || atMin || shown === null}
            onClick={() => nudge(-step)}
            className={STEP_BUTTON}
          >
            {/* Minus and plus are direction-neutral, so nothing here needs to flip under RTL. */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </button>
          {numeralBlock}
          <button
            type="button"
            aria-label={`Increase ${label}`}
            aria-busy={pending || undefined}
            disabled={!interactive || atMax || shown === null}
            onClick={() => nudge(step)}
            className={STEP_BUTTON}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
          </div>
        )}

        {/*
          The live region carries the whole story in one sentence, because a screen-reader user
          stepping the target hears this and nothing else. "Target 21, currently 19" is usable;
          "21" is not.
        */}
        {contract.announcement === null ? (
          <span className="sr-only" aria-live="polite">
            {label}: target {shown === null ? "unknown" : `${shown}${unit}`}
            {pending ? ", requested, not yet confirmed" : ""}
            {current === null || current === undefined ? "" : `, currently ${current}${unit}`}
          </span>
        ) : (
          // With a lifecycle the control announces the change itself, once per stage, in place of the
          // sentence above: two polite regions would read the same change twice.
          <ControlAnnouncer announcement={contract.announcement ? `${label}: ${contract.announcement}` : ""} />
        )}

        {control?.description && control.availability !== "ready" ? (
          <span id={descriptionId} className="text-center text-label-md text-muted-foreground">
            {control.description}
          </span>
        ) : null}
        <ControlOutcomeNote presentation={view} sentence={sentence} className="text-center" />
      </div>
    );
  },
), "DeviceSetpointControl");

export { DeviceSetpointControl };
