import * as React from "react";
import type { KinetixCommandLifecycleStage } from "../types/command";
import type { KinetixDeviceHealthLevel } from "../types/device-state";

/**
 * Internal shape vocabulary. Not exported from the barrel.
 *
 * Status in this package is never carried by colour alone, so every status word is paired with one of
 * these glyphs, and the glyphs differ in **silhouette** (circle, triangle, octagon, dashed ring, half
 * fill), not only in stroke colour. They are `aria-hidden`: the word beside them is the accessible
 * name, and a glyph that is announced as well is noise.
 *
 * Drawn on a 16-unit grid as inline paths — no icon dependency. Nothing here is directional, with one
 * exception (`retry`, a circular arrow) which mirrors under RTL, because the direction of a rotation
 * is part of what it says.
 */
export type GlyphName =
  | "check"
  | "triangle"
  | "octagon"
  | "clock"
  | "dash"
  | "circle"
  | "circle-dot"
  | "circle-half"
  | "circle-x"
  | "slash"
  | "retry"
  | "info"
  | "record"
  | "eye-off"
  | "bolt"
  | "swap"
  | "bell"
  | "gear"
  | "chip"
  | "dot"
  | "trend-up"
  | "trend-down"
  | "trend-flat"
  | "plus"
  | "x";

const RING = <circle cx="8" cy="8" r="6.25" />;

const SHAPES: Record<GlyphName, React.ReactNode> = {
  check: (
    <>
      {RING}
      <path d="m5.2 8.2 1.9 1.9 3.7-3.9" />
    </>
  ),
  triangle: (
    <>
      <path d="M8 2 14.4 13.4H1.6Z" />
      <path d="M8 6.4v3.1" />
      <path d="M8 11.4h.01" />
    </>
  ),
  octagon: (
    <>
      <path d="M5.2 1.8h5.6l3.4 3.4v5.6l-3.4 3.4H5.2l-3.4-3.4V5.2Z" />
      <path d="M8 5v3.6" />
      <path d="M8 11h.01" />
    </>
  ),
  clock: (
    <>
      {RING}
      <path d="M8 4.6V8l2.3 1.5" />
    </>
  ),
  dash: (
    <>
      <circle cx="8" cy="8" r="6.25" strokeDasharray="2 2" />
      <path d="M5.5 8h5" />
    </>
  ),
  circle: RING,
  "circle-dot": (
    <>
      {RING}
      <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  "circle-half": (
    <>
      {RING}
      <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5Z" fill="currentColor" stroke="none" />
    </>
  ),
  "circle-x": (
    <>
      {RING}
      <path d="m5.8 5.8 4.4 4.4" />
      <path d="m10.2 5.8-4.4 4.4" />
    </>
  ),
  slash: (
    <>
      {RING}
      <path d="m3.6 12.4 8.8-8.8" />
    </>
  ),
  retry: (
    <>
      <path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.7" />
      <path d="M13.4 2.4v2.9h-2.9" />
    </>
  ),
  info: (
    <>
      {RING}
      <path d="M8 7.4v3.6" />
      <path d="M8 5h.01" />
    </>
  ),
  record: <circle cx="8" cy="8" r="4.5" fill="currentColor" />,
  "eye-off": (
    <>
      <path d="M1.8 8s2.2-4 6.2-4 6.2 4 6.2 4-2.2 4-6.2 4-6.2-4-6.2-4Z" />
      <circle cx="8" cy="8" r="1.8" />
      <path d="m2.8 13.2 10.4-10.4" />
    </>
  ),
  bolt: <path d="M9 1.8 3.8 9h3.6L7 14.2 12.2 7H8.6Z" />,
  swap: (
    <>
      <path d="M5 13V3" />
      <path d="m2.6 5.4 2.4-2.4 2.4 2.4" />
      <path d="M11 3v10" />
      <path d="m8.6 10.6 2.4 2.4 2.4-2.4" />
    </>
  ),
  bell: (
    <>
      <path d="M4 11V7.2a4 4 0 0 1 8 0V11l1.2 1.6H2.8Z" />
      <path d="M6.6 14.2h2.8" />
    </>
  ),
  gear: (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.6v2M8 12.4v2M1.6 8h2M12.4 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4" />
    </>
  ),
  chip: (
    <>
      <rect x="4" y="4" width="8" height="8" rx="1.4" />
      <path d="M6.5 1.8v2.2M9.5 1.8v2.2M6.5 12v2.2M9.5 12v2.2M1.8 6.5H4M1.8 9.5H4M12 6.5h2.2M12 9.5h2.2" />
    </>
  ),
  dot: <circle cx="8" cy="8" r="2.5" fill="currentColor" />,
  "trend-up": <path d="M8 13V3M4 7l4-4 4 4" />,
  "trend-down": <path d="M8 3v10M4 9l4 4 4-4" />,
  "trend-flat": <path d="M3 6.2h10M3 9.8h10" />,
  plus: <path d="M8 3v10M3 8h10" />,
  x: <path d="m4 4 8 8M12 4l-8 8" />,
};

export interface GlyphProps extends Omit<React.SVGAttributes<SVGSVGElement>, "children"> {
  name: GlyphName;
  size?: number;
}

/** A decorative status glyph. Always `aria-hidden`; pair it with a word. */
export function Glyph({ name, size = 14, className, ...props }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-glyph={name}
      className={["shrink-0", name === "retry" ? "rtl:-scale-x-100" : "", className ?? ""].filter(Boolean).join(" ")}
      {...props}
    >
      {SHAPES[name] ?? SHAPES.dot}
    </svg>
  );
}

/** The glyph for each lifecycle stage. Acknowledged (half) is deliberately not confirmed (check). */
export const STAGE_GLYPH: Record<KinetixCommandLifecycleStage, GlyphName> = {
  idle: "circle",
  requested: "circle-dot",
  acknowledged: "circle-half",
  confirmed: "check",
  failed: "circle-x",
  "timed-out": "clock",
  unreachable: "dash",
  retrying: "retry",
  cancelled: "slash",
};

export const HEALTH_GLYPH: Record<KinetixDeviceHealthLevel, GlyphName> = {
  healthy: "check",
  degraded: "circle-half",
  warning: "triangle",
  critical: "octagon",
  unknown: "dash",
};

/** `device-offline` → `Device offline`. Open strings from a product are made readable, never dropped. */
export function humanize(id: string): string {
  const words = id.trim().replace(/[-_\s]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
