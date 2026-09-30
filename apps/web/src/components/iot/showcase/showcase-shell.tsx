/**
 * ShowcaseShell: the responsive composition shell for the IoT showcase compositions.
 *
 * Named slots, one outer surface, zones separated by whitespace and tonal steps rather than borders:
 *
 * - `header`  identity, overall status, environment chips, attention button (a full-width bar)
 * - `rail`    the space / device selector (a real list; a wrapped tile selector below `lg`)
 * - `canvas`  the primary visual (usually `SpaceCanvas`)
 * - `focus`   the primary control / telemetry area (gets the most room on a phone)
 * - `aside`   what needs attention: alerts, activity, energy (progressive disclosure on a phone)
 *
 * Layout: below `md` one designed column; at `md` the rail is a tile row above one main column with the aside as
 * two columns beneath it; at `lg` rail + main with the aside beneath; from `xl` true zones: rail | main | aside.
 *
 * DOM order is the tab order (header, rail, canvas, focus, aside). Landmarks are named `section`s inside one
 * named outer `section`; the shell never renders a `main`, because the page owns it.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type ShowcaseShellProps = {
  /** Names the whole composition for assistive technology, e.g. "Demo home". */
  label: string;
  header: React.ReactNode;
  rail: React.ReactNode;
  canvas: React.ReactNode;
  focus: React.ReactNode;
  aside: React.ReactNode;
  railLabel?: string;
  canvasLabel?: string;
  focusLabel?: string;
  asideLabel?: string;
  className?: string;
};

export function ShowcaseShell({
  label,
  header,
  rail,
  canvas,
  focus,
  aside,
  railLabel = "Spaces",
  canvasLabel = "Space plan",
  focusLabel = "Selected space",
  asideLabel = "Needs attention",
  className,
}: ShowcaseShellProps) {
  return (
    <section aria-label={label} className={cn("flex min-w-0 flex-col gap-6 rounded-container bg-muted/40 p-4 sm:p-6 lg:gap-8 lg:p-8", className)}>
      <div data-slot="header">{header}</div>

      <div className="grid min-w-0 grid-cols-1 gap-6 md:gap-8 lg:grid-cols-12">
        <section aria-label={railLabel} data-slot="rail" className="min-w-0 lg:col-span-3 lg:row-span-2 xl:row-span-1">
          {rail}
        </section>

        <div className="flex min-w-0 flex-col gap-6 md:gap-8 lg:col-span-9 xl:col-span-6">
          <section aria-label={canvasLabel} data-slot="canvas" className="min-w-0 rounded-2xl bg-card p-3 shadow-sm sm:p-4">
            {canvas}
          </section>
          <section aria-label={focusLabel} data-slot="focus" className="flex min-w-0 flex-col gap-4">
            {focus}
          </section>
        </div>

        <section
          aria-label={asideLabel}
          data-slot="aside"
          className="grid min-w-0 grid-cols-1 content-start items-start gap-4 md:grid-cols-2 lg:col-span-9 lg:col-start-4 xl:col-span-3 xl:col-start-10 xl:row-start-1 xl:grid-cols-1"
        >
          {aside}
        </section>
      </div>
    </section>
  );
}
