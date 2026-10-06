import type { KinetixDeviceColor } from "../types/control";
import { isSameDeviceValue } from "./commands";

/**
 * Device colour helpers.
 *
 * A colour here is a value a device reports, so it is handled like every other device value: compared
 * structurally (`isSameDeviceValue`), never by reference, and never assumed when it is missing. None of
 * this is a design-tool picker; a product supplies the colours its devices offer.
 */

const clampChannel = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Coerce a device's colour into a {@link KinetixDeviceColor}, or `null` when it is not one.
 *
 * Accepts the two object shapes (channels rounded and clamped to 0–255, kelvin rounded) and `#rgb` /
 * `#rrggbb` strings. Normalise at the boundary, before a value enters a lifecycle: `"#FF0000"` and
 * `{ mode: "rgb", r: 255, g: 0, b: 0 }` are the same colour, but `isSameDeviceValue` compares data,
 * and a request and a report in different shapes would never match.
 */
export function normalizeDeviceColor(input: unknown): KinetixDeviceColor | null {
  if (typeof input === "string") {
    const match = HEX.exec(input.trim());
    if (!match) return null;
    const hex = match[1]!.length === 3 ? [...match[1]!].map((c) => c + c).join("") : match[1]!;
    return { mode: "rgb", r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  }
  if (typeof input !== "object" || input === null) return null;
  const value = input as Record<string, unknown>;
  if (value.mode === "rgb") {
    const { r, g, b } = value;
    if (![r, g, b].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    return { mode: "rgb", r: clampChannel(r as number), g: clampChannel(g as number), b: clampChannel(b as number) };
  }
  if (value.mode === "temperature") {
    const { kelvin } = value;
    if (typeof kelvin !== "number" || !Number.isFinite(kelvin) || kelvin <= 0) return null;
    return { mode: "temperature", kelvin: Math.round(kelvin) };
  }
  return null;
}

/** `#RRGGBB` for an RGB colour; `null` for a white point, which has no single hex value. */
export function formatDeviceColorHex(color: KinetixDeviceColor | null | undefined): string | null {
  if (!color || color.mode !== "rgb") return null;
  return `#${[color.r, color.g, color.b].map((n) => clampChannel(n).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/**
 * The colour's value in words: `#2563EB`, `2700 K`, or `unknown`. A product's own name for the colour
 * ("Ocean") leads wherever it has one; this is the value beside it, so nothing relies on seeing a swatch.
 */
export function describeDeviceColor(color: KinetixDeviceColor | null | undefined): string {
  if (!color) return "unknown";
  return color.mode === "rgb" ? formatDeviceColorHex(color)! : `${color.kelvin} K`;
}

/**
 * A CSS colour to *preview* a device colour with. RGB is exact; a white point is approximated from its
 * kelvin with the common black-body fit (Tanner Helland), which is close enough to tell warm from cool
 * and is not a colourimetric claim. Rendered as data, never as a Kinetix token.
 */
export function previewDeviceColor(color: KinetixDeviceColor | null | undefined): string | null {
  if (!color) return null;
  if (color.mode === "rgb") return `rgb(${clampChannel(color.r)} ${clampChannel(color.g)} ${clampChannel(color.b)})`;
  const t = Math.min(40000, Math.max(1000, color.kelvin)) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return `rgb(${clampChannel(r)} ${clampChannel(g)} ${clampChannel(b)})`;
}

/** The option whose value is this colour, compared structurally. `undefined` when none matches. */
export function findDeviceColorOption<O extends { value: KinetixDeviceColor }>(options: readonly O[], color: KinetixDeviceColor | null | undefined): O | undefined {
  if (!color) return undefined;
  return options.find((option) => isSameDeviceValue(option.value, color));
}
