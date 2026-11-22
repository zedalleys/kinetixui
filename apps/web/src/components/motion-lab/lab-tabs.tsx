"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kinetixui/ui";
import { useTrackIndicator } from "@/lib/motion-lab/use-track-indicator";
import type { LabTechnique, LabTravel } from "@/lib/motion-lab/variants";

/**
 * A tab list whose indicator takes the lab's variants, and whose indicator can be a rail or a pill.
 *
 * ── Relationship to the shipped Tabs ───────────────────────────────────────
 *
 * `@kinetixui/ui`'s `TabsList` already travels, and it already does the hard parts right: logical insets, a
 * leading edge and a trailing edge on separate phases, a snap on resize and direction change, and a
 * pre-hydration fallback. Its `motion` prop offers `classic`, `fluid` and `none`. This lab does not replace
 * any of that and changes none of its files.
 *
 * What it adds is the two dimensions the shipped prop does not have, and which a lab is the right place to
 * try: a variant that keeps VELOCITY across a retarget (`spring`), and a SHAPE for the indicator (a pill
 * surface rather than a 2px rail). Both are drawn by the same hook the segmented strip uses, which is the
 * point — one primitive, two consumers, and a measured answer about whether it is worth integrating.
 *
 * The list is given `motion="none"` and its own bar is hidden from the lab stylesheet, so there is exactly
 * one indicator on screen and the shipped hook does no travel work it would then have to undo. Radix keeps
 * the tab semantics, the roving tabindex, the arrow and Home/End handling, the focus ring and the local
 * scroll-into-view on focus. Under forced colours the lab bar is hidden and the shipped per-trigger edge
 * comes back, which is why the border suppression is fenced inside `@media (forced-colors: none)`.
 *
 * Tabs are NOT equal width — the shipped trigger is `shrink-0` around its label — so the `transform`
 * technique's equal-width precondition is false here and the engine falls back to `inset` and says so on the
 * track. That fallback is one of the things the lab exists to show, rather than a limitation to hide.
 */

export interface LabTab {
  readonly value: string;
  readonly label: string;
  readonly body: React.ReactNode;
  readonly disabled?: boolean;
}

export type LabTabsShape = "underline" | "pill";

export const LAB_TABS_SHAPES: readonly LabTabsShape[] = ["underline", "pill"];

export interface LabTabsProps {
  readonly tabs: readonly LabTab[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly travel: LabTravel;
  readonly technique?: LabTechnique;
  readonly shape?: LabTabsShape;
  readonly reduceOverride?: boolean;
  readonly onTravel?: (travel: LabTravel) => void;
  readonly label: string;
}

export function LabTabs({
  tabs,
  value,
  onValueChange,
  travel,
  technique = "inset",
  shape = "underline",
  reduceOverride = false,
  onTravel,
  label,
}: LabTabsProps) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const barRef = React.useRef<HTMLSpanElement | null>(null);
  useTrackIndicator(trackRef, barRef, {
    travel,
    technique,
    selectedSelector: ':scope > [role="tab"][data-state="active"]',
    itemSelector: ':scope > [role="tab"]',
    reduceOverride,
    onTravel,
  });
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList
        ref={trackRef}
        motion="none"
        aria-label={label}
        className="kx-lab-track kx-lab-tabs"
        data-kx-lab-shape={shape}
        data-kx-lab-travel={travel}
      >
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled}>
            {tab.label}
          </TabsTrigger>
        ))}
        <span ref={barRef} aria-hidden="true" className="kx-lab-bar" data-kx-lab-bar="" />
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="text-body-sm text-muted-foreground">
          {tab.body}
        </TabsContent>
      ))}
    </Tabs>
  );
}
