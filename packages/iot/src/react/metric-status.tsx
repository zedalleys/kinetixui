import * as React from "react";
import type { KinetixReadingState } from "../types/telemetry";
import { describeReadingState, readingStateGlyph } from "../functions/telemetry";
import { cn } from "./cn";
import { resolveLabel } from "./label";
import { withDisplayName } from "./display-name";
import { Glyph } from "./glyph";

/**
 * MetricStatus — how far to trust one reading, as a glyph **and** a word.
 *
 * `normal`, `warning`, `critical`, `stale`, `unavailable` and `loading` each get a different silhouette
 * (ringed tick, triangle, octagon, clock, dashed ring, ring with a dot) and a different word, so the
 * state survives greyscale and a screen reader alike. The glyph is `aria-hidden`; the word is the accessible name, and
 * `label` may replace it (translation) but never empties it.
 *
 * The state itself comes from `evaluateReading` — this component only draws it.
 */
export interface MetricStatusProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  state: KinetixReadingState;
  /** Replace the word, e.g. for translation. A blank string falls back to the default. */
  label?: string;
}

const TONE: Record<KinetixReadingState, string> = {
  normal: "text-foreground",
  warning: "text-foreground",
  critical: "text-destructive",
  stale: "text-muted-foreground",
  unavailable: "text-muted-foreground",
  loading: "text-muted-foreground",
};

// `loading` belongs here as much as the other five. Left out, the fallback below would draw a reading
// that has not arrived yet as "Unavailable" — a claim that the device was asked and had nothing, which
// is the conflation the state exists to prevent.
const KNOWN: readonly string[] = ["normal", "warning", "critical", "stale", "unavailable", "loading"];

const MetricStatus = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLSpanElement, MetricStatusProps>(
  ({ state, label, className, ...props }, ref) => {
    // An unrecognised state is drawn as unavailable: not evidence of a healthy reading.
    const resolved: KinetixReadingState = KNOWN.includes(state) ? state : "unavailable";
    return (
      <span
        ref={ref}
        data-reading-state={resolved}
        className={cn("inline-flex items-center gap-1.5 font-sans text-label-md", TONE[resolved], className)}
        {...props}
      >
        <Glyph name={readingStateGlyph(resolved)} size={14} />
        <span>{resolveLabel(label, describeReadingState(resolved))}</span>
      </span>
    );
  },
), "MetricStatus");

export { MetricStatus };
