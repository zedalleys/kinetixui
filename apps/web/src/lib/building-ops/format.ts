/** Display formatting for the demo. Every time is formatted in the building's zone, so server and browser agree. */
import type { BuildingDef } from "./types";

const formatters = new Map<string, Intl.DateTimeFormat>();

export function formatClock(building: BuildingDef, iso: string): string {
  let f = formatters.get(building.timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: building.timeZone });
    formatters.set(building.timeZone, f);
  }
  return f.format(new Date(iso));
}

/** "now", "12 s ago", "4 min ago", "1 h 5 min ago". */
export function formatAgo(iso: string | null | undefined, nowIso: string): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.parse(nowIso) - Date.parse(iso)) / 1000));
  if (s < 3) return "now";
  if (s < 60) return `${s} s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ${m % 60} min ago`;
}

/** Elapsed scenario time as m:ss, signed. */
export function formatElapsed(ms: number): string {
  const sign = ms < 0 ? "−" : "";
  const total = Math.floor(Math.abs(ms) / 1000);
  return `${sign}${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
