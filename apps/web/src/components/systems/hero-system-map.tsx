"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PlatformLogo } from "@/components/platform-logo";
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
 * Semantics: the platforms are a tablist and the detail overlay is its tabpanel, so a keyboard or screen-reader
 * user gets exactly what a pointer user gets — selecting a platform is the interaction, hovering only
 * emphasises a branch. The traces and the output chips are a drawing of what the panel says in words, so
 * they are hidden from assistive technology rather than read twice.
 *
 * Motion: a first-load sequence, then nothing moves until the reader acts. Selecting a platform or switching
 * the token's theme value sends one pulse along the affected branches. Under `prefers-reduced-motion` the map
 * renders complete and static, and a selection is shown only by the highlighted branch.
 */

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
type Box = { top: Point; bottom: Point; start: Point; width: number };
type Geometry = {
  width: number;
  height: number;
  stacked: boolean;
  generated: { output: string; d: string }[];
  written: { platform: Platform; d: string }[];
};

const curve = (a: Point, b: Point) => {
  const my = (a.y + b.y) / 2;
  return `M${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
};

export function HeroSystemMap({
  token,
  outputs,
  platforms,
}: {
  token: MapToken;
  outputs: MapOutput[];
  platforms: MapPlatform[];
}) {
  const [selected, setSelected] = React.useState<Platform>(platforms[0]!.platform);
  const [hovered, setHovered] = React.useState<Platform | null>(null);
  const [theme, setTheme] = React.useState<Theme>("light");
  // Bumped on every reader action; keys the pulse paths so a change replays one pulse, and only then.
  const [pulse, setPulse] = React.useState(0);
  const [pulseScope, setPulseScope] = React.useState<"one" | "all">("one");
  const [geometry, setGeometry] = React.useState<Geometry | null>(null);

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
    const box = (n: Element): Box => {
      const b = n.getBoundingClientRect();
      const rtl = getComputedStyle(n).direction === "rtl";
      const x = b.left - r.left + b.width / 2;
      return {
        top: { x, y: b.top - r.top },
        bottom: { x, y: b.bottom - r.top },
        start: { x: rtl ? b.right - r.left : b.left - r.left, y: b.top - r.top + b.height / 2 },
        width: b.width,
      };
    };
    const s = box(src);
    const chipBoxes = new Map([...chips.current].map(([id, n]) => [id, box(n)]));
    const stacked = [...chipBoxes.values()].every((b) => b.width === 0);
    const generated: Geometry["generated"] = [];
    const written: Geometry["written"] = [];

    if (!stacked) {
      for (const o of outputs) {
        const c = chipBoxes.get(o.id);
        if (c) generated.push({ output: o.id, d: curve(s.bottom, c.top) });
      }
      for (const p of platforms) {
        const c = chipBoxes.get(p.output);
        const n = nodes.current.get(p.platform);
        if (c && n) written.push({ platform: p.platform, d: curve(c.bottom, box(n).top) });
      }
    } else {
      // One spine along the inline-start edge of the platform list, a branch into each row.
      const rtl = getComputedStyle(el).direction === "rtl";
      const rows = platforms.map((p) => ({ p, b: nodes.current.get(p.platform) })).filter((x) => x.b);
      if (rows.length) {
        const first = box(rows[0]!.b!);
        const spineX = first.start.x + (rtl ? 14 : -14);
        const startY = s.bottom.y;
        for (const { p, b } of rows) {
          const n = box(b!);
          const d = `M${spineX} ${startY} L${spineX} ${n.start.y - 8} Q ${spineX} ${n.start.y}, ${n.start.x} ${n.start.y}`;
          written.push({ platform: p.platform, d });
        }
      }
    }
    setGeometry({ width: r.width, height: r.height, stacked, generated, written });
  }, [outputs, platforms]);

  React.useLayoutEffect(() => {
    measure();
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
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

  const select = (value: string) => {
    setSelected(value as Platform);
    setPulseScope("one");
    setPulse((n) => n + 1);
  };
  const switchTheme = (next: Theme) => {
    if (next === theme) return;
    setTheme(next);
    setPulseScope("all");
    setPulse((n) => n + 1);
  };

  const pulsing = (output: string, platform?: Platform) =>
    pulse > 0 && (pulseScope === "all" || (platform ? platform === selected : output === current.output));

  return (
    <figure
      ref={root}
      data-hero-system-map=""
      data-map-intro=""
      {...(active ? { "data-map-active": "" } : {})}
      className="relative m-0 [container-type:inline-size]"
    >
      {/* the traces: a drawing of what the text says, so assistive technology skips it */}
      {geometry ? (
        <svg
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute inset-0 overflow-visible"
          width={geometry.width}
          height={geometry.height}
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
            <path
              key={w.platform}
              d={w.d}
              className="kx-trace"
              data-kind={geometry.stacked ? "generated" : "written"}
              {...(geometry.stacked ? { pathLength: 1 } : {})}
              {...(w.platform === active ? { "data-active": "" } : {})}
            />
          ))}
          {pulse > 0
            ? [
                ...geometry.generated.filter((g) => pulsing(g.output)).map((g) => (
                  <path key={`g-${g.output}-${pulse}`} d={g.d} pathLength={1} className="kx-trace-pulse" />
                )),
                ...geometry.written.filter((w) => pulsing("", w.platform)).map((w) => (
                  <path
                    key={`w-${w.platform}-${pulse}`}
                    d={w.d}
                    pathLength={1}
                    className="kx-trace-pulse"
                    style={{ animationDelay: geometry.stacked ? "0ms" : "420ms" }}
                  />
                )),
              ]
            : null}
        </svg>
      ) : null}

      {/* ── the canonical source ── */}
      <div
        ref={source}
        className="kx-glass kx-map-stage relative mx-auto w-full max-w-md rounded-xl p-4 sm:p-5"
        style={{ ["--stage" as string]: 0 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="font-mono text-xs text-muted-foreground">
            <span className="sr-only">Source: </span>
            {token.files[theme]}
          </p>
          <div role="group" aria-label="Token value to show" className="flex rounded-md border border-border p-0.5">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={theme === t}
                onClick={() => switchTheme(t)}
                className={cn(
                  "min-h-9 rounded-[5px] px-3 font-mono text-xs capitalize text-muted-foreground transition-colors duration-fast",
                  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "aria-pressed:bg-muted aria-pressed:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
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
            <p key={theme} className="kx-swap mt-1 font-mono text-xs text-muted-foreground" dir="ltr">
              {token.chain[theme].slice(1).map((step) => `→ ${step} `)}→ {token.resolved[theme]}
            </p>
          </div>
        </div>
      </div>

      {/* ── generated outputs (a drawing; the panel below says the same in words) ── */}
      <div aria-hidden="true" className="kx-map-outputs mt-14 hidden grid-cols-2 gap-2 [@container(min-width:50rem)]:grid-cols-4 [@container(min-width:34rem)]:grid">
        {outputs.map((o, i) => (
          <div
            key={o.id}
            ref={(n) => {
              if (n) chips.current.set(o.id, n);
              else chips.current.delete(o.id);
            }}
            data-output={o.id}
            className={cn(
              "kx-map-stage rounded-lg border bg-background/70 px-2.5 py-2 transition-colors duration-fast",
              o.id === activeOutput ? "border-primary/70" : "border-border",
            )}
            style={{ ["--stage" as string]: i, ["--stage-base" as string]: "650ms" }}
          >
            <div className="flex items-center gap-1.5">
              <span
                key={theme}
                className="kx-swap size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: token.resolved[theme] }}
              />
              <span className="font-mono text-xs text-foreground">{o.language}</span>
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]" dir="ltr">
              {breakable(o.reference)}
            </p>
          </div>
        ))}
      </div>

      {/* ── the token boundary ── */}
      <div className="relative mt-6 flex items-center gap-3 [@container(min-width:34rem)]:mt-5">
        <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-border" />
        <p className="min-w-0 text-center font-mono text-xs text-muted-foreground">
          <span className="text-foreground">Tokens generated</span> · components written per platform
        </p>
        <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-border" />
      </div>

      {/* ── the implementations ── */}
      <Tabs.Root value={selected} onValueChange={select} activationMode="automatic" className="mt-5 [@container(min-width:34rem)]:mt-14">
        <Tabs.List
          aria-label="Platform implementations"
          className="grid grid-cols-1 gap-2 ps-7 [@container(min-width:34rem)]:grid-cols-5 [@container(min-width:34rem)]:ps-0"
        >
          {platforms.map((p, i) => (
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
                "kx-map-stage group flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-start transition-colors duration-fast",
                "[@container(min-width:34rem)]:flex-col [@container(min-width:34rem)]:items-center [@container(min-width:34rem)]:gap-1.5 [@container(min-width:34rem)]:px-1.5 [@container(min-width:34rem)]:py-3 [@container(min-width:34rem)]:text-center",
                "border-border bg-background/70 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-foreground",
              )}
              style={{ ["--stage" as string]: i, ["--stage-base" as string]: "1000ms" }}
            >
              <PlatformLogo platform={p.platform} className="size-5 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 [@container(min-width:34rem)]:flex-col [@container(min-width:34rem)]:items-center">
                <span className="font-display text-sm font-semibold">{p.short}</span>
                {p.maturity !== "stable" ? (
                  <span className="font-mono text-xs text-primary">{p.maturity}</span>
                ) : null}
                <span className="font-mono text-xs text-muted-foreground">
                  {p.entries}/{p.total}
                  <span className="sr-only"> catalogue entries</span>
                </span>
              </span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {platforms.map((p) => {
          const out = outputs.find((o) => o.id === p.output)!;
          return (
            <Tabs.Content
              key={p.platform}
              value={p.platform}
              // the entrance belongs to first load only; a later selection cross-fades without the intro's delay
              className={cn(
                "kx-glass mt-3 rounded-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5",
                pulse === 0 ? "kx-map-stage" : "kx-swap",
              )}
              style={pulse === 0 ? { ["--stage" as string]: 0, ["--stage-base" as string]: "1350ms" } : undefined}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-display text-base font-semibold text-foreground">
                  {p.label}
                  {p.maturity !== "stable" ? <span className="ms-2 font-mono text-xs font-normal text-primary">{p.maturity}</span> : null}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{p.distribution}</p>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-sm">
                <div className="min-w-0">
                  <dt className="font-mono text-xs text-muted-foreground">
                    Generated · <span dir="ltr">{out.files[theme]}</span>
                  </dt>
                  <dd key={theme} className="kx-swap mt-1 overflow-x-auto font-mono text-xs text-foreground" dir="ltr">
                    <code className="whitespace-pre-wrap [overflow-wrap:anywhere]">{out.declaration[theme]}</code>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-mono text-xs text-muted-foreground">
                    Written by hand · <span dir="ltr">{p.reads.file}:{p.reads.line}</span>
                  </dt>
                  <dd className="mt-1 overflow-x-auto font-mono text-xs text-foreground" dir="ltr">
                    <code className="whitespace-pre-wrap [overflow-wrap:anywhere]">{p.reads.code}</code>
                  </dd>
                </div>
              </dl>
              <Link
                href={p.href}
                className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
              >
                {p.label} setup and coverage <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Tabs.Content>
          );
        })}
      </Tabs.Root>
      <figcaption className="sr-only">
        The {token.path} token, defined once in {token.files.light}, generated into {outputs.length} platform files, and read
        by a separately written Switch on each of {platforms.length} platforms.
      </figcaption>
    </figure>
  );
}

