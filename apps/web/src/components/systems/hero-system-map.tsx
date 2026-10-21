"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { PlatformMark } from "./platform-marks";
import { useDocumentDirection } from "@/lib/use-document-direction";
import { usePersistedPause } from "@/lib/use-persisted-pause";
import type { Platform } from "@/lib/platform-parity";
import { cn } from "@/lib/utils";
import { breakable } from "./breakable";

/**
 * The hero's Token → Native system map.
 *
 * It follows one real semantic token (`color.action`) from its DTCG source, through the four files Style
 * Dictionary generates, across the token boundary, into the hand-written `Switch` on each platform. Every
 * string in it arrives as a prop from `lib/systems-in-motion.ts`, which reads the repository at build time;
 * this file holds no platform name, path, value or count of its own.
 *
 * Layout: one structure at every width (no second tree hidden with CSS). The outputs and the platforms share a
 * grid (`.kx-map-grid`, subgrid): side by side in rows on a phone — each output beside the platforms that read
 * it, the token boundary a dashed rule between the two columns — and in columns from 34rem, where the CSS
 * output spans the two web platforms it feeds. Either way the generated layer, the boundary and the written
 * layer are all on screen, and four outputs visibly feed five platforms.
 *
 * Semantics: the platforms are a tablist and the detail overlay is its tabpanel, so a keyboard or screen-reader
 * user gets exactly what a pointer user gets — selecting a platform is the interaction, hovering only
 * emphasises a branch. The list follows the page's direction (`<html dir>`, live), and its orientation follows
 * the layout: vertical rows take Up/Down, a horizontal row takes Left/Right in reading order. The traces and the
 * output chips are a drawing of what the panel says in words, so they are hidden from assistive technology.
 *
 * Theme: the map shows the token's value for the site theme the reader is in, and follows the header's theme
 * toggle; it has no switch of its own.
 *
 * Motion: a first-load sequence, then a tour: every few seconds the map selects the next platform on its own,
 * looping through all of them, so a reader who never touches it still sees each implementation. Selecting a
 * platform, or changing the site theme, sends one pulse along the affected branches.
 *
 * The tour changes content on its own, so WCAG 2.2.2 applies: a keyboard-operable button pauses it (the choice
 * is remembered, as the ticker's is), and it holds while the pointer or focus is on the map, while the map is
 * off screen and while the tab is hidden. Choosing a platform stops it for the page view; the button resumes it.
 * Under `prefers-reduced-motion` there is no tour and no button: the map renders complete and static, and a
 * selection is shown only by the highlighted branch.
 */

/** How long each platform stays selected during the tour. */
const TOUR_STEP_MS = 4500;

export type MapPlatform = {
  platform: Platform;
  label: string;
  short: string;
  maturity: string;
  entries: number;
  total: number;
  distribution: string;
  output: string;
  reads: { file: string; line: number; code: string };
  href: string;
};
export type MapOutput = {
  id: string;
  language: string;
  files: { light: string; dark: string };
  reference: string;
  declaration: { light: string; dark: string };
  platforms: Platform[];
};
export type MapToken = {
  path: string;
  files: { light: string; dark: string };
  chain: { light: string[]; dark: string[] };
  resolved: { light: string; dark: string };
};

type Theme = "light" | "dark";
type Point = { x: number; y: number };
type Box = { top: Point; bottom: Point; start: Point; end: Point; mid: number; width: number };
type Geometry = {
  width: number;
  height: number;
  generated: { output: string; d: string }[];
  written: { platform: Platform; d: string }[];
};

/** A vertical S-curve (columns layout). */
const vcurve = (a: Point, b: Point) => {
  const my = (a.y + b.y) / 2;
  return `M${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
};
/** A horizontal S-curve (rows layout). */
const hcurve = (a: Point, b: Point) => {
  const mx = (a.x + b.x) / 2;
  return `M${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
};

/** The container width (in rem) at which outputs and platforms turn from rows into columns: `.kx-map-grid`. */
const COLUMNS_AT_REM = 34;

export function HeroSystemMap({
  token,
  outputs,
  platforms,
}: {
  token: MapToken;
  outputs: MapOutput[];
  platforms: MapPlatform[];
}) {
  const dir = useDocumentDirection();
  const [selected, setSelected] = React.useState<Platform>(platforms[0]!.platform);
  const [hovered, setHovered] = React.useState<Platform | null>(null);
  const [theme, setTheme] = React.useState<Theme>("light");
  const [columns, setColumns] = React.useState(true);
  // Bumped on every reader action; keys the pulse paths so a change replays one pulse, and only then.
  const [pulse, setPulse] = React.useState(0);
  const [pulseScope, setPulseScope] = React.useState<"one" | "all">("one");
  // The traces own their geometry (`MapTraces`): a measurement redraws the drawing, not the whole map.
  const drawTraces = React.useRef<(g: Geometry) => void>(() => {});
  // Follow the site theme (the header's toggle puts `.dark` on <html>); a change after load pulses every branch.
  React.useEffect(() => {
    const root = document.documentElement;
    const read = (): Theme => (root.classList.contains("dark") ? "dark" : "light");
    let last = read();
    setTheme(last);
    const mo = new MutationObserver(() => {
      const next = read();
      if (next === last) return;
      last = next;
      setTheme(next);
      setPulseScope("all");
      setPulse((n) => n + 1);
    });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const root = React.useRef<HTMLElement>(null);
  const source = React.useRef<HTMLDivElement>(null);
  const chips = React.useRef(new Map<string, HTMLElement>());
  const nodes = React.useRef(new Map<Platform, HTMLElement>());

  const active = hovered ?? selected;
  const activeOutput = platforms.find((p) => p.platform === active)!.output;
  const current = platforms.find((p) => p.platform === selected)!;

  /* Geometry is measured, not assumed: it follows the real layout at any width, text size and direction. */
  const measure = React.useCallback(() => {
    const el = root.current;
    const src = source.current;
    if (!el || !src) return;
    const r = el.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    const box = (n: Element): Box => {
      const b = n.getBoundingClientRect();
      const x = b.left - r.left + b.width / 2;
      const mid = b.top - r.top + b.height / 2;
      const left = b.left - r.left;
      const right = b.right - r.left;
      return {
        top: { x, y: b.top - r.top },
        bottom: { x, y: b.bottom - r.top },
        start: { x: rtl ? right : left, y: mid },
        end: { x: rtl ? left : right, y: mid },
        mid,
        width: b.width,
      };
    };
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const wide = r.width >= COLUMNS_AT_REM * rem;
    setColumns(wide);
    const s = box(src);
    const generated: Geometry["generated"] = [];
    const written: Geometry["written"] = [];

    for (const o of outputs) {
      const n = chips.current.get(o.id);
      if (!n) continue;
      const c = box(n);
      if (wide) {
        generated.push({ output: o.id, d: vcurve(s.bottom, c.top) });
      } else {
        // one spine down the outputs column's inline-start edge, a branch into each output
        const spineX = c.start.x + (rtl ? 10 : -10);
        generated.push({
          output: o.id,
          d: `M${spineX} ${s.bottom.y} L${spineX} ${c.mid - 8} Q ${spineX} ${c.mid}, ${c.start.x} ${c.mid}`,
        });
      }
      for (const p of platforms.filter((q) => q.output === o.id)) {
        const t = nodes.current.get(p.platform);
        if (!t) continue;
        const b = box(t);
        written.push({ platform: p.platform, d: wide ? vcurve(c.bottom, b.top) : hcurve(c.end, b.start) });
      }
    }
    drawTraces.current({ width: r.width, height: r.height, generated, written });
  }, [outputs, platforms]);

  // Measured from the ResizeObserver's first callback, which runs after layout, rather than synchronously during
  // hydration: reading geometry in a layout effect forced a whole-page layout inside the hydration task.
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    // a direction flip moves the anchors without resizing anything, so watch the document's direction too
    const mo = new MutationObserver(() => measure());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["dir", "lang"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [measure]);

  // `dir` reaches the grid through Radix, a render after `<html dir>` changes, so measure again once it has
  React.useEffect(() => {
    measure();
  }, [dir, measure]);

  const show = (value: Platform) => {
    setSelected(value);
    setPulseScope("one");
    setPulse((n) => n + 1);
  };
  // a reader's choice ends the tour for this page view; the tour's own steps come through `show`
  const select = (value: string) => {
    setStopped(true);
    show(value as Platform);
  };

  /* ── the tour ── */
  const [paused, togglePaused] = usePersistedPause("kx-hero-tour");
  const [stopped, setStopped] = React.useState(false);
  const [reduced, setReduced] = React.useState(true); // no tour until the client has read the preference
  const [held, setHeld] = React.useState({ pointer: false, focus: false, offscreen: false, hidden: false });
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener("change", read);
    const el = root.current;
    const io =
      el && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([e]) => setHeld((h) => ({ ...h, offscreen: !e!.isIntersecting })))
        : null;
    if (el) io?.observe(el);
    const vis = () => setHeld((h) => ({ ...h, hidden: document.hidden }));
    document.addEventListener("visibilitychange", vis);
    return () => {
      mq.removeEventListener("change", read);
      io?.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
  const touring = !reduced && !paused && !stopped;
  const running = touring && !held.pointer && !held.focus && !held.offscreen && !held.hidden;
  React.useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => {
      const i = platforms.findIndex((p) => p.platform === selected);
      show(platforms[(i + 1) % platforms.length]!.platform);
    }, TOUR_STEP_MS);
    return () => window.clearTimeout(t);
  }, [running, selected, platforms]);
  const toggleTour = () => {
    if (stopped || paused) {
      setStopped(false);
      if (paused) togglePaused();
    } else togglePaused();
  };

  // The map's static text is built once per theme and reused across renders: a hover, a selection, a measured
  // layout or the phone layout's orientation change re-renders the map without rebuilding the source card, the
  // output chips, the platform labels or the panels' evidence (only the selected platform's panel is mounted).
  const sourceCard = React.useMemo(
    () => (
        <div
          ref={source}
          className="kx-glass kx-map-stage relative mx-auto w-full max-w-md rounded-xl p-4 sm:p-5"
          style={{ ["--stage" as string]: 0 }}
        >
          <p className="font-mono text-label-md text-muted-foreground [overflow-wrap:anywhere]" dir="ltr">
            <span className="sr-only">Source: </span>
            {breakable(token.files[theme])}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span
              key={theme}
              aria-hidden="true"
              className="kx-swap size-9 shrink-0 rounded-md border border-border"
              style={{ backgroundColor: token.resolved[theme] }}
            />
            <div className="min-w-0">
              <p className="font-mono text-lg font-semibold leading-tight text-foreground sm:text-xl" dir="ltr">
                {token.path}
              </p>
              <p key={theme} className="kx-swap mt-1 font-mono text-body-sm text-muted-foreground [overflow-wrap:anywhere]" dir="ltr">
                {token.chain[theme].slice(1).map((step) => `→ ${step} `)}→ {token.resolved[theme]}
              </p>
            </div>
          </div>
        </div>
    ),
    [token, theme],
  );
  const chipLayer = React.useMemo(
    () => (
      <div aria-hidden="true" className="kx-map-outputs">
        {outputs.map((o, i) => (
          <div
            key={o.id}
            ref={(n) => {
              if (n) chips.current.set(o.id, n);
              else chips.current.delete(o.id);
            }}
            data-output={o.id}
            className={cn(
              "kx-map-chip kx-map-stage min-w-0 rounded-lg border bg-background px-2.5 py-2 transition-colors duration-fast",
              o.id === activeOutput ? "border-primary/70" : "border-border",
            )}
            style={{ ["--span" as string]: o.platforms.length, ["--stage" as string]: i, ["--stage-base" as string]: "650ms" }}
          >
            <div className="flex items-center gap-1.5">
              <span
                key={theme}
                className="kx-swap size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: token.resolved[theme] }}
              />
              <span className="font-mono text-label-md text-foreground">{o.language}</span>
            </div>
            <p className="mt-1 font-mono text-label-md text-muted-foreground [overflow-wrap:anywhere]" dir="ltr">
              {breakable(o.reference)}
            </p>
          </div>
        ))}
      </div>
    ),
    [outputs, token, theme, activeOutput],
  );
  const triggers = React.useMemo(
    () =>
      platforms.map((p, i) => (
        <Tabs.Trigger
          key={p.platform}
          value={p.platform}
          ref={(n) => {
            if (n) nodes.current.set(p.platform, n);
            else nodes.current.delete(p.platform);
          }}
          onPointerEnter={() => setHovered(p.platform)}
          onPointerLeave={() => setHovered(null)}
          data-platform={p.platform}
          className={cn(
            "kx-map-tab kx-map-stage group flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg border border-dashed px-2.5 py-2 text-start transition-colors duration-fast",
            "border-foreground/25 bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "data-[state=active]:border-solid data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-foreground",
          )}
          style={{ ["--stage" as string]: i, ["--stage-base" as string]: "1000ms" }}
        >
          <PlatformMark platform={p.platform} className="size-5 shrink-0" />
          <span className="kx-map-tab-text flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
            <span className="font-display text-sm font-semibold">{p.short}</span>
            {p.maturity !== "stable" ? <span className="font-mono text-label-md text-primary">{p.maturity}</span> : null}
            <span className="font-mono text-label-md text-muted-foreground">
              {p.entries}/{p.total}
              <span className="sr-only"> catalogue entries</span>
            </span>
          </span>
        </Tabs.Trigger>
      )),
    [platforms],
  );
  const panelBodies = React.useMemo(
    () =>
      new Map(
        platforms.map((p) => {
          const out = outputs.find((o) => o.id === p.output)!;
          return [
            p.platform,
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-display text-base font-semibold text-foreground">
                  {p.label}
                  {p.maturity !== "stable" ? <span className="ms-2 font-mono text-label-md font-normal text-primary">{p.maturity}</span> : null}
                </p>
                <p className="font-mono text-label-md text-muted-foreground">{p.distribution}</p>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-3">
                <div className="min-w-0">
                  <dt className="font-mono text-label-md text-muted-foreground [overflow-wrap:anywhere]">
                    Generated · <span dir="ltr">{breakable(out.files[theme])}</span>
                  </dt>
                  <dd key={theme} className="kx-swap mt-1 text-foreground" dir="ltr">
                    <code className="kx-source text-body-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{out.declaration[theme]}</code>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-mono text-label-md text-muted-foreground [overflow-wrap:anywhere]">
                    Written by hand · <span dir="ltr">{breakable(`${p.reads.file}:${p.reads.line}`)}</span>
                  </dt>
                  <dd className="mt-1 text-foreground" dir="ltr">
                    <code className="kx-source text-body-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{p.reads.code}</code>
                  </dd>
                </div>
              </dl>
              <Link
                href={p.href}
                className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
              >
                {p.label} setup and coverage <ArrowUpRight aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
              </Link>
            </>,
          ] as const;
        }),
      ),
    [platforms, outputs, theme],
  );

  return (
    <figure
      ref={root}
      data-hero-system-map=""
      data-map-intro=""
      data-map-layout={columns ? "columns" : "rows"}
      {...(active ? { "data-map-active": "" } : {})}
      className="relative m-0 [container-type:inline-size]"
      onPointerEnter={() => setHeld((h) => ({ ...h, pointer: true }))}
      onPointerLeave={() => setHeld((h) => ({ ...h, pointer: false }))}
      // focus on a tab or panel holds the tour while it is read; focus on the tour's own button does not
      onFocus={(e) => setHeld((h) => ({ ...h, focus: !(e.target as HTMLElement).closest("[data-hero-tour]") }))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld((h) => ({ ...h, focus: false }));
      }}
    >
      {/* the traces: a drawing of what the text says, so assistive technology skips it */}
      <MapTraces
        connect={drawTraces}
        activeOutput={activeOutput}
        active={active}
        selected={selected}
        selectedOutput={current.output}
        pulse={pulse}
        pulseScope={pulseScope}
      />

      {sourceCard}

      <Tabs.Root
        value={selected}
        onValueChange={select}
        activationMode="automatic"
        dir={dir}
        orientation={columns ? "horizontal" : "vertical"}
        className="kx-map-grid mt-8"
        style={{ ["--kx-impl" as string]: platforms.length }}
      >
        {/* ── the token boundary ── */}
        <p className="kx-map-boundary flex items-center gap-3">
          <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-border" />
          <span className="min-w-0 bg-background px-1 text-center font-mono text-label-md text-muted-foreground">
            <span className="text-foreground">Tokens generated</span> · components written per platform
          </span>
          <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-border" />
        </p>
        <span aria-hidden="true" className="kx-map-rule" />

        {/* ── generated outputs (a drawing; the panel says the same in words) ── */}
{chipLayer}

        {/* ── the implementations ── */}
        <Tabs.List aria-label="Platform implementations" className="kx-map-tabs">
          {triggers}
        </Tabs.List>

        {platforms.map((p) => {
          return (
            <Tabs.Content
              key={p.platform}
              value={p.platform}
              // the entrance belongs to first load only; a later selection cross-fades without the intro's delay
              className={cn(
                "kx-map-panel kx-glass rounded-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5",
                pulse === 0 ? "kx-map-stage" : "kx-swap",
              )}
              style={pulse === 0 ? { ["--stage" as string]: 0, ["--stage-base" as string]: "1350ms" } : undefined}
            >
              {panelBodies.get(p.platform)}
            </Tabs.Content>
          );
        })}
      </Tabs.Root>
      {/* the tour's pause control (WCAG 2.2.2); nothing tours under reduced motion, so nothing to pause */}
      {!reduced && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            data-hero-tour=""
            aria-pressed={!touring}
            onClick={toggleTour}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 font-mono text-label-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {touring ? <Pause aria-hidden="true" className="size-3.5" /> : <Play aria-hidden="true" className="size-3.5" />}
            {touring ? "Pause the platform tour" : "Play the platform tour"}
          </button>
        </div>
      )}
      <figcaption className="sr-only">
        The {token.path} token, defined once in {token.files.light}, is generated into {outputs.length} platform token
        files ({outputs.map((o) => `${o.language}, read by ${o.platforms.join(" and ")}`).join("; ")}). Each of the{" "}
        {platforms.length} platforms reads it from a Switch written by hand.
      </figcaption>
    </figure>
  );
}

/**
 * The trace drawing, with its own geometry state. The map measures; this draws. A new measurement (load, resize,
 * direction flip) re-renders this SVG only, and an identical one renders nothing, so the map's text, tabs and
 * panel are not rebuilt every time the layout is read.
 */
function MapTraces({
  connect,
  activeOutput,
  active,
  selected,
  selectedOutput,
  pulse,
  pulseScope,
}: {
  connect: React.MutableRefObject<(g: Geometry) => void>;
  activeOutput: string;
  active: Platform;
  selected: Platform;
  selectedOutput: string;
  pulse: number;
  pulseScope: "one" | "all";
}) {
  const [geometry, setGeometry] = React.useState<Geometry | null>(null);
  React.useEffect(() => {
    let last = "";
    connect.current = (g) => {
      const key = JSON.stringify(g);
      if (key === last) return;
      last = key;
      setGeometry(g);
    };
    return () => {
      connect.current = () => {};
    };
  }, [connect]);
  if (!geometry) return null;

  const pulsing = (output: string, platform?: Platform) =>
    pulse > 0 && (pulseScope === "all" || (platform ? platform === selected : output === selectedOutput));

  return (
    <svg
      data-map-traces=""
      aria-hidden="true"
      focusable="false"
      className="overflow-visible"
      // Sized by its own `inset`, out of flow and untouchable inline: see the note in `trace-layer.tsx`.
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
    >
      {geometry.generated.map((g) => (
        <path
          key={g.output}
          d={g.d}
          pathLength={1}
          className="kx-trace"
          data-kind="generated"
          {...(g.output === activeOutput ? { "data-active": "" } : {})}
        />
      ))}
      {geometry.written.map((w) => (
        <path key={w.platform} d={w.d} className="kx-trace" data-kind="written" {...(w.platform === active ? { "data-active": "" } : {})} />
      ))}
      {pulse > 0
        ? [
            ...geometry.generated.filter((g) => pulsing(g.output)).map((g) => (
              <path key={`g-${g.output}-${pulse}`} d={g.d} pathLength={1} className="kx-trace-pulse" />
            )),
            ...geometry.written.filter((w) => pulsing("", w.platform)).map((w) => (
              <path key={`w-${w.platform}-${pulse}`} d={w.d} pathLength={1} className="kx-trace-pulse" style={{ animationDelay: "420ms" }} />
            )),
          ]
        : null}
    </svg>
  );
}
