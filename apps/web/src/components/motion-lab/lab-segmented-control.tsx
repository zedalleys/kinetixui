"use client";

import * as React from "react";
import { SegmentedControl, SegmentedControlItem } from "@kinetixui/ui";
import { useTrackIndicator } from "@/lib/motion-lab/use-track-indicator";
import type { LabTechnique, LabTravel } from "@/lib/motion-lab/variants";

/**
 * A segmented strip whose selection is carried by ONE travelling indicator.
 *
 * ── What this adds, and what it deliberately does not ──────────────────────
 *
 * The shipped `SegmentedControl` marks the chosen segment by filling that segment: `selection-state`
 * (`fast` / `standard`), a change in place. It is correct and it is not a travelling indicator — the motion
 * contract says so in as many words, and `selection-indicator` has exactly one consumer on one platform
 * because of it.
 *
 * This is the laboratory version of the missing interaction. It does not fork the component: it composes the
 * shipped `SegmentedControl` and `SegmentedControlItem` unchanged, adds one `aria-hidden` indicator element,
 * and suppresses the per-segment fill from the lab's own stylesheet once the track has measured itself. No
 * published API grows, no shipped file changes, and the whole motion layer is one hook plus one span — which
 * is the unit that would move into `packages/ui` if this earns integration.
 *
 * ── Accessibility ───────────────────────────────────────────────────────────
 *
 * Radix's ToggleGroup supplies the radiogroup semantics, roving focus, Home/End and arrow handling, and the
 * shipped item supplies the focus ring, the pressed and hover state layers, the disabled behaviour and the
 * forced-colours pair. None of that is re-implemented here, so none of it can drift per variant. The
 * indicator is `aria-hidden` and carries no state: selection is announced by `aria-checked` on the item, set
 * by the interaction and never by an animation finishing.
 *
 * The chosen segment keeps a non-motion cue at rest in every variant — the indicator is a filled surface
 * under the label, and the label's own colour inverts with it — so a reader who sees no motion still sees
 * which segment answered. Under forced colours the indicator is hidden entirely and the shipped
 * `SelectedItem` pair is the cue, which is why the fill suppression is fenced inside
 * `@media (forced-colors: none)`.
 */

export interface LabSegment {
  readonly value: string;
  readonly label: string;
  /** Present so the lab can demonstrate that no variant lets a disabled segment be chosen. */
  readonly disabled?: boolean;
}

export interface LabSegmentedControlProps {
  readonly segments: readonly LabSegment[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly travel: LabTravel;
  readonly technique?: LabTechnique;
  readonly reduceOverride?: boolean;
  readonly onTravel?: (travel: LabTravel) => void;
  readonly label: string;
  readonly id?: string;
}

export function LabSegmentedControl({
  segments,
  value,
  onValueChange,
  travel,
  technique = "inset",
  reduceOverride = false,
  onTravel,
  label,
  id,
}: LabSegmentedControlProps) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const barRef = React.useRef<HTMLSpanElement | null>(null);
  useTrackIndicator(trackRef, barRef, {
    travel,
    technique,
    // Scoped to the track's own children: a nested strip inside a panel must not be measured by this track.
    selectedSelector: ':scope > [data-state="on"]',
    itemSelector: ':scope > [data-state]',
    reduceOverride,
    onTravel,
  });
  return (
    <SegmentedControl
      ref={trackRef}
      id={id}
      aria-label={label}
      className="kx-lab-track kx-lab-seg w-full"
      data-kx-lab-travel={travel}
      value={value}
      onValueChange={onValueChange}
    >
      {segments.map((segment) => (
        <SegmentedControlItem key={segment.value} value={segment.value} disabled={segment.disabled}>
          {segment.label}
        </SegmentedControlItem>
      ))}
      <span ref={barRef} aria-hidden="true" className="kx-lab-bar" data-kx-lab-bar="" />
    </SegmentedControl>
  );
}
