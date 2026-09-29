"use client";

import * as React from "react";
import type { KinetixDeviceCategory } from "../types/identity";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceIcon — the glyph for a device category.
 *
 * Inline paths rather than an icon dependency: this package has no runtime dependencies and adding
 * one for twelve glyphs would be a poor trade for every consumer. They are drawn on a 24-unit grid
 * with a 1.6 stroke so they sit correctly beside KinetixUI's own Lucide-based icons at the same
 * optical weight, without claiming to be them.
 *
 * Each glyph is chosen for what the device *does*, because that is what a user scanning a room list
 * is matching against. A valve is a body with a handle, a pump is a body with flow — a reader does
 * not need to identify the exact hardware, only to tell one row from the next without reading.
 *
 * `aria-hidden` by default. The icon repeats information the accessible name already carries, and an
 * announced "light icon" before every row is noise. Pass a `title` only when the glyph is the sole
 * carrier of meaning, which in this package it never is.
 */
export interface DeviceIconProps extends Omit<React.SVGAttributes<SVGSVGElement>, "children"> {
  category: KinetixDeviceCategory;
  /** Named so it reads as a size, not a font-size. Maps to width and height. */
  size?: number;
  /** Supply only when the glyph carries meaning nothing else does; it makes the icon announceable. */
  title?: string;
}

/** Paths per category, on a 24-unit grid. `unknown` is a neutral device outline, never a guess. */
const PATHS: Record<KinetixDeviceCategory, React.ReactNode> = {
  light: (
    <>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.6l.1.6h5.2l.1-.6c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3Z" />
    </>
  ),
  thermostat: (
    <>
      <path d="M12 14.8V6a2 2 0 1 1 4 0v8.8a4 4 0 1 1-4 0Z" />
      <path d="M8 8H4" />
      <path d="M8 12H6" />
    </>
  ),
  sensor: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9" />
      <path d="M16.5 16.5a6.4 6.4 0 0 0 0-9" />
      <path d="M4.8 4.8a10 10 0 0 0 0 14.4" />
      <path d="M19.2 19.2a10 10 0 0 0 0-14.4" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h7A2.5 2.5 0 0 1 15 8.5v7A2.5 2.5 0 0 1 12.5 18h-7A2.5 2.5 0 0 1 3 15.5Z" />
      <path d="m15 11 5-3v8l-5-3Z" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v5" />
      <path d="M15 3v5" />
      <path d="M6.5 8h11v3.2a5.5 5.5 0 0 1-11 0Z" />
      <path d="M12 16.7V21" />
    </>
  ),
  fan: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 10c0-3.3.9-5 2.6-5S18 6.4 18 8.3 15.9 10.9 12 10Z" />
      <path d="M14 12c3.3 0 5 .9 5 2.6S17.6 18 15.7 18 13.1 15.9 14 12Z" />
      <path d="M10 14c0 3.3-.9 5-2.6 5S6 17.6 6 15.7 8.1 13.1 10 14Z" />
    </>
  ),
  pump: (
    <>
      <circle cx="12" cy="13" r="5.5" />
      <path d="M12 7.5V13l3.5 2" />
      <path d="M3.5 13H6" />
      <path d="M18 13h2.5" />
      <path d="M8 4h8" />
    </>
  ),
  valve: (
    <>
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M7 8.5v7l5-3.5-5-3.5Z" />
      <path d="M17 8.5v7l-5-3.5 5-3.5Z" />
      <path d="M12 12V5" />
      <path d="M9.5 5h5" />
    </>
  ),
  meter: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 12l4-3" />
      <path d="M12 3.5v1.8" />
      <path d="M3.5 12h1.8" />
      <path d="M18.7 12h1.8" />
    </>
  ),
  gateway: (
    <>
      <rect x="3.5" y="13" width="17" height="7" rx="2" />
      <path d="M7.5 16.5h.01" />
      <path d="M11 16.5h4" />
      <path d="M8 9.5a5.5 5.5 0 0 1 8 0" />
      <path d="M10.4 6.6a9 9 0 0 1 3.2 0" />
    </>
  ),
  unknown: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2.5" />
      <path d="M8.5 19v1.5" />
      <path d="M15.5 19v1.5" />
      <path d="M9 10h6" />
    </>
  ),
};

const DeviceIcon = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<SVGSVGElement, DeviceIconProps>(
  ({ category, size = 20, title, className, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[category] ?? PATHS.unknown}
    </svg>
  ),
), "DeviceIcon");

export { DeviceIcon };
