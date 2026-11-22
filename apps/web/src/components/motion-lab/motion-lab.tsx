"use client";

import * as React from "react";
import { Button, KinetixDirectionProvider, Label, SegmentedControl, SegmentedControlItem, Switch } from "@kinetixui/ui";
import { LabSegmentedControl } from "./lab-segmented-control";
import { LAB_TABS_SHAPES, LabTabs, type LabTabsShape } from "./lab-tabs";
import { LabSlider } from "./lab-slider";
import {
  LAB_SLIDER_LAYERS,
  LAB_TECHNIQUES,
  LAB_TRAVELS,
  LAB_TRAVEL_CONTRACTS,
  LAB_VARIANT_INVARIANTS,
  labTravelContract,
  type LabSliderLayer,
  type LabTechnique,
  type LabTravel,
} from "@/lib/motion-lab/variants";

/**
 * The Motion Lab shell: real components, driven by real interactions, under conditions the reader chooses.
 *
 * Every specimen on this page is the shipped `@kinetixui/ui` component with a lab motion layer composed over
 * it. Nothing here is a screenshot, a recorded clip or a mock. Every control below changes the live
 * specimens, and the scripted actions (`Interrupt`, `Alternate`) exist because the behaviours they expose —
 * retargeting and rapid alternation — are the ones a human cannot reliably trigger by hand and are exactly
 * where travelling indicators go wrong.
 *
 * ── The reduced-motion toggle is one-way, on purpose ───────────────────────
 *
 * It can only ADD reduction. A reader whose operating system asks for less motion keeps that whatever this
 * switch says, and the switch reports so. A lab control that could re-enable motion against a stated
 * preference would be an accessibility defect shipped as a convenience, and the engine enforces the same
 * rule independently (`system OR override`), so neither side alone can get it wrong.
 *
 * ── Appearance and direction are scoped to the stage ───────────────────────
 *
 * `dark` and `dir="rtl"` are applied to the stage element, not to the document. The token stylesheets
 * declare their dark values under a `.dark` class selector and the components position with logical
 * properties, so both work on any ancestor. Scoping them means this page cannot disturb the site's own theme
 * control or its direction, which a document-level toggle on one route demonstrably can.
 *
 * The `dir` attribute alone is NOT enough, and the lab found that out by measuring rather than by reading.
 * Every Radix primitive reads its direction from Radix's own context and writes `dir="ltr"` onto its own root
 * when that context is absent — so a `dir="rtl"` ancestor is overridden on the element the indicator measures,
 * and the strip stays in LTR order while the page around it mirrors. `RTL.md` documents this and the library
 * exports `KinetixDirectionProvider` for it; the stage is wrapped in both, because the attribute drives CSS
 * logical properties and the provider drives Radix's geometry and arrow-key direction, and neither covers the
 * other. The first gate run reported "a later segment is reached by moving physically leftwards: Day at 186.0,
 * Quarter at 731.0" — the LTR layout exactly — which is what an RTL check looks like when the direction never
 * arrived.
 */

interface LabState {
  readonly travel: LabTravel;
  readonly technique: LabTechnique;
  readonly shape: LabTabsShape;
  readonly reduce: boolean;
  readonly rtl: boolean;
  readonly dark: boolean;
}

const SEGMENTS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year", disabled: true },
] as const;

const TABS = [
  { value: "overview", label: "Overview", body: "Four tabs of unequal width, which is why the transform technique falls back here." },
  { value: "telemetry", label: "Telemetry", body: "Telemetry panel." },
  { value: "automation", label: "Automation and schedules", body: "The widest label in the list, so travel distance varies by direction." },
  { value: "audit", label: "Audit", body: "Audit panel." },
] as const;

/** How long after a first selection the scripted interrupt fires. Inside `--duration-base` (300ms) on purpose: the point is to interrupt a run, not to follow one. */
const INTERRUPT_AT_MS = 120;
/** The gap in the scripted alternation. Shorter than one frame budget at 60Hz would be untestable; this is deliberately shorter than the travel. */
const ALTERNATE_EVERY_MS = 70;

export function MotionLab() {
  const [state, setState] = React.useState<LabState>({
    travel: "glide",
    technique: "inset",
    shape: "underline",
    reduce: false,
    rtl: false,
    dark: false,
  });
  const set = <K extends keyof LabState>(key: K, value: LabState[K]) =>
    setState((previous) => ({ ...previous, [key]: value }));

  const [segment, setSegment] = React.useState<string>("day");
  const [tab, setTab] = React.useState<string>("overview");
  const [volume, setVolume] = React.useState(40);
  const [sliderLayers, setSliderLayers] = React.useState<readonly LabSliderLayer[]>(["press", "bubble"]);

  const [runs, setRuns] = React.useState(0);
  const countTravel = React.useCallback(() => setRuns((n) => n + 1), []);

  /** Scripted actions schedule selections, so every timer is owned and cleared: a pending selection after unmount is a leak and a state change on a dead tree. */
  const timers = React.useRef<number[]>([]);
  React.useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    },
    [],
  );
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /**
   * The system preference, read through a subscription with an explicit server snapshot.
   *
   * It was originally read inline during render with a `typeof window` branch. That is two defects in one
   * line, both found by Codex on PR #662. The server renders `false` and the first client render reads
   * `true` for a reader who has reduced motion on, so the switch's props and the presence of the explanatory
   * sentence differ between the two trees — a hydration mismatch, on the page whose subject is honouring
   * that preference. And a value read during render has no subscription, so changing the preference in the
   * OS left this switch and the stage's `data-kx-lab-reduce` attribute stale until some other interaction
   * happened to re-render.
   *
   * `useSyncExternalStore` is the fix for both at once: `getServerSnapshot` makes the two trees agree, and
   * `subscribe` makes the preference live. The engine keeps its own listener for the geometry; this one is
   * for what the reader is told.
   */
  const systemReduce = React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const contract = labTravelContract(state.travel);

  /**
   * Send the indicator somewhere it is not, then retarget it while that travel is still in flight.
   *
   * The first version named `SEGMENTS[0]` outright, which on a freshly loaded page is already the selection —
   * so the first call changed nothing, the engine's no-change early return fired, and the delayed call started
   * an ORDINARY travel from a resting indicator. The button's own demonstration did not demonstrate anything,
   * in exactly the default state a reader meets it in. Codex found this on PR #662; the browser gate missed it
   * because the gate drives its own clicks rather than this button, so the continuity measurement was never
   * affected — only the thing a human can press.
   *
   * Picking the destinations relative to the CURRENT selection makes the first leg real whatever is selected.
   */
  const interrupt = () => {
    const away = (items: readonly { value: string; disabled?: boolean }[], current: string) =>
      items.filter((entry) => !entry.disabled && entry.value !== current).map((entry) => entry.value);
    const segs = away(SEGMENTS, segment);
    const tabs = away(TABS, tab);
    if (segs.length < 2 || tabs.length < 2) return;
    setSegment(segs[0]);
    setTab(tabs[0]);
    later(() => {
      setSegment(segs[segs.length - 1]);
      setTab(tabs[tabs.length - 1]);
    }, INTERRUPT_AT_MS);
  };

  /** Six changes of mind inside two travel durations. */
  const alternate = () => {
    const order = ["day", "quarter", "week", "month", "day", "quarter"];
    order.forEach((value, index) => later(() => setSegment(value), index * ALTERNATE_EVERY_MS));
    const tabOrder = ["overview", "audit", "telemetry", "automation", "overview", "audit"];
    tabOrder.forEach((value, index) => later(() => setTab(value), index * ALTERNATE_EVERY_MS));
  };

  const reverse = () => {
    setSegment(SEGMENTS[3].value);
    setTab(TABS[3].value);
    later(() => {
      setSegment(SEGMENTS[0].value);
      setTab(TABS[0].value);
    }, 700);
  };

  return (
    <div className="flex flex-col gap-10" data-kx-lab-root="">
      <section aria-labelledby="lab-controls" className="rounded-xl border border-border/60 bg-surface-grouped p-4 sm:p-5">
        <h2 id="lab-controls" className="text-label-lg font-semibold text-foreground">
          Conditions
        </h2>
        <p className="mt-1 max-w-prose text-body-sm text-muted-foreground">
          Every control changes the live specimens below. The variant decides how a selection moves; the
          technique decides what geometry moves, which is a performance trade-off rather than a look.
        </p>

        {/* `min-w-0` on the grid and each column, and `flex-wrap` on the switch rows. An `auto`-sized grid
            track cannot shrink below its items' min-content, so at 320px with 200% text the track grew to
            256px inside a 190px box and the page scrolled sideways by 37px — a WCAG 1.4.4 failure that axe
            caught at exactly one of the twenty page views. The fix is the layout contract, not smaller text. */}
        <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="lab-travel" className="text-label-sm text-muted-foreground">
              Variant
            </Label>
            <SegmentedControl
              id="lab-travel"
              aria-label="Motion variant"
              value={state.travel}
              onValueChange={(value) => set("travel", value as LabTravel)}
            >
              {LAB_TRAVELS.map((travel) => (
                <SegmentedControlItem key={travel} value={travel}>
                  {labTravelContract(travel).label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="lab-technique" className="text-label-sm text-muted-foreground">
              Technique
            </Label>
            <SegmentedControl
              id="lab-technique"
              aria-label="Animated geometry"
              value={state.technique}
              onValueChange={(value) => set("technique", value as LabTechnique)}
            >
              {LAB_TECHNIQUES.map((technique) => (
                <SegmentedControlItem key={technique} value={technique}>
                  {technique === "inset" ? "Insets" : "Transform"}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="lab-shape" className="text-label-sm text-muted-foreground">
              Tab indicator shape
            </Label>
            <SegmentedControl
              id="lab-shape"
              aria-label="Tab indicator shape"
              value={state.shape}
              onValueChange={(value) => set("shape", value as LabTabsShape)}
            >
              {LAB_TABS_SHAPES.map((shape) => (
                <SegmentedControlItem key={shape} value={shape}>
                  {shape === "underline" ? "Rail" : "Pill"}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>

          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="mb-1 text-label-sm text-muted-foreground">Environment</legend>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Switch
                id="lab-reduce"
                checked={state.reduce || systemReduce}
                disabled={systemReduce}
                onCheckedChange={(next) => set("reduce", next)}
              />
              <Label htmlFor="lab-reduce" className="text-body-sm">
                Reduce motion
                {systemReduce ? (
                  <span className="ms-2 text-label-sm text-muted-foreground">
                    set by your system — this switch cannot turn it off
                  </span>
                ) : null}
              </Label>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Switch id="lab-rtl" checked={state.rtl} onCheckedChange={(next) => set("rtl", next)} />
              <Label htmlFor="lab-rtl" className="text-body-sm">
                Right to left
              </Label>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Switch id="lab-dark" checked={state.dark} onCheckedChange={(next) => set("dark", next)} />
              <Label htmlFor="lab-dark" className="text-body-sm">
                Dark appearance
              </Label>
            </div>
          </fieldset>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button type="button" variant="Secondary" size="sm" data-kx-lab-action="forward" onClick={() => setSegment(SEGMENTS[3].value)}>
            Forward
          </Button>
          <Button type="button" variant="Secondary" size="sm" data-kx-lab-action="reverse" onClick={reverse}>
            Reverse
          </Button>
          <Button type="button" variant="Secondary" size="sm" data-kx-lab-action="interrupt" onClick={interrupt}>
            Interrupt
          </Button>
          <Button type="button" variant="Secondary" size="sm" data-kx-lab-action="alternate" onClick={alternate}>
            Alternate
          </Button>
          <span className="ms-auto text-label-sm text-muted-foreground" data-kx-lab-runs={runs}>
            {runs} travel {runs === 1 ? "run" : "runs"} started
          </span>
        </div>
      </section>

      <section
        aria-labelledby="lab-stage"
        className={state.dark ? "dark" : undefined}
        dir={state.rtl ? "rtl" : "ltr"}
        data-kx-lab-stage=""
        data-kx-lab-reduce={state.reduce || systemReduce ? "true" : "false"}
      >
        <KinetixDirectionProvider dir={state.rtl ? "rtl" : "ltr"}>
        <div className="rounded-xl border border-border/60 bg-background p-4 text-foreground sm:p-5">
          <h2 id="lab-stage" className="text-label-lg font-semibold">
            Specimens
          </h2>
          <p className="mt-1 max-w-prose text-body-sm text-muted-foreground">{contract.effect}</p>

          <div className="mt-6 flex flex-col gap-8">
            <div className="flex min-w-0 flex-col gap-2">
              <h3 className="text-label-md font-medium">Segmented control</h3>
              <p className="text-body-sm text-muted-foreground">
                Equal-width segments, so the transform technique applies here. The last segment is disabled.
              </p>
              <LabSegmentedControl
                label="Reporting period"
                segments={SEGMENTS}
                value={segment}
                onValueChange={setSegment}
                travel={state.travel}
                technique={state.technique}
                reduceOverride={state.reduce}
                onTravel={countTravel}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <h3 className="text-label-md font-medium">Tabs</h3>
              <p className="text-body-sm text-muted-foreground">
                Unequal labels, so the transform technique cannot apply and the engine says so on the track.
              </p>
              <LabTabs
                label="Device sections"
                tabs={TABS}
                value={tab}
                onValueChange={setTab}
                travel={state.travel}
                technique={state.technique}
                shape={state.shape}
                reduceOverride={state.reduce}
                onTravel={countTravel}
              />
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-label-md font-medium">Slider</h3>
              <p className="text-body-sm text-muted-foreground">
                Three additive layers. The bubble is aria-hidden in every state: the thumb already announces
                the value.
              </p>
              <SegmentedControl
                aria-label="Slider motion layers"
                value={sliderLayers.join("+")}
                onValueChange={(value) => setSliderLayers(value.split("+") as LabSliderLayer[])}
              >
                <SegmentedControlItem value="press">Halo</SegmentedControlItem>
                <SegmentedControlItem value="press+bubble">Bubble</SegmentedControlItem>
                <SegmentedControlItem value="press+bubble+ticks">Ticks</SegmentedControlItem>
              </SegmentedControl>
              <LabSlider
                label="Volume"
                value={volume}
                onValueChange={setVolume}
                min={0}
                max={100}
                step={10}
                layers={sliderLayers}
                format={(v) => `${v}%`}
              />
            </div>
          </div>
        </div>
        </KinetixDirectionProvider>
      </section>

      <section aria-labelledby="lab-contract" className="rounded-xl border border-border/60 p-4 sm:p-5">
        <h2 id="lab-contract" className="text-label-lg font-semibold text-foreground">
          What the chosen variant promises
        </h2>
        <dl className="mt-4 grid gap-4 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-label-sm text-muted-foreground">Tokens</dt>
            <dd className="mt-1 font-mono text-label-sm text-foreground">
              {[...contract.duration, ...contract.easing].join(" · ") || "none — nothing is interpolated"}
            </dd>
          </div>
          <div>
            <dt className="text-label-sm text-muted-foreground">Borrowed role</dt>
            <dd className="mt-1 text-foreground">{contract.role ?? "none"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-label-sm text-muted-foreground">Interruption and retargeting</dt>
            <dd className="mt-1 text-muted-foreground">{contract.retarget}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-label-sm text-muted-foreground">Under a reduced-motion preference</dt>
            <dd className="mt-1 text-muted-foreground">{contract.reduced}</dd>
          </div>
        </dl>

        <h3 className="mt-6 text-label-md font-medium text-foreground">
          What no variant is allowed to change
        </h3>
        <ul className="mt-2 list-disc space-y-1 ps-5 text-body-sm text-muted-foreground">
          {LAB_VARIANT_INVARIANTS.map((invariant) => (
            <li key={invariant}>{invariant}</li>
          ))}
        </ul>

        <h3 className="mt-6 text-label-md font-medium text-foreground">Slider layers</h3>
        <dl className="mt-2 grid gap-3 text-body-sm sm:grid-cols-2">
          {LAB_SLIDER_LAYERS.map((layer) => (
            <div key={layer.layer}>
              <dt className="text-label-sm text-foreground">{layer.label}</dt>
              <dd className="text-muted-foreground">{layer.effect}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 max-w-prose text-body-sm text-muted-foreground">
          This page verifies React only. It makes no claim about Angular, SwiftUI, Jetpack Compose or Flutter;
          the contracts each would have to satisfy are written down separately, and none of them is
          implemented by anything on this page.
        </p>
      </section>
    </div>
  );
}

export { LAB_TRAVEL_CONTRACTS };
