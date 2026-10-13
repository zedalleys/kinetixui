/**
 * Status vocabulary for the Building Operations demo: every state is a glyph AND a word, never colour alone.
 */
import * as React from "react";
import { AlertOctagon, Camera, CameraOff, Clock, Loader, Unplug, Users } from "lucide-react";
import type { CameraStatus, ZoneOccupancy } from "@/lib/building-ops";
import { cn } from "@/lib/utils";

export type CameraTone = "ok" | "attention" | "down";

export function cameraState(status: CameraStatus | undefined): { word: string; tone: CameraTone; Icon: typeof Camera } {
  if (!status) return { word: "Unknown", tone: "down", Icon: CameraOff };
  switch (status.connectivity) {
    case "online":
      return status.telemetryFreshness === "fresh"
        ? { word: "Online", tone: "ok", Icon: Camera }
        : { word: "Online, telemetry stale", tone: "attention", Icon: Clock };
    case "offline":
      return { word: "Offline", tone: "down", Icon: CameraOff };
    case "unreachable":
      return { word: "Unreachable", tone: "down", Icon: Unplug };
    case "connecting":
      return { word: "Reconnecting", tone: "attention", Icon: Loader };
    default:
      return { word: "Unknown", tone: "down", Icon: CameraOff };
  }
}

export const TONE_TEXT: Record<CameraTone, string> = {
  ok: "text-foreground",
  attention: "text-warning",
  // Offline and unreachable are connection exceptions: muted, never the destructive tone of a hazard.
  down: "text-muted-foreground",
};

export function zoneState(z: ZoneOccupancy | undefined): { word: string; Icon: typeof Users; tone: "ok" | "busy" | "over" | "muted" } {
  if (!z || z.freshness === "none") return { word: "No reading", Icon: Clock, tone: "muted" };
  if (z.freshness === "stale") return { word: "Not reporting", Icon: Clock, tone: "muted" };
  if (z.load === "over") return { word: "Over capacity", Icon: AlertOctagon, tone: "over" };
  if (z.load === "busy") return { word: "Near capacity", Icon: Users, tone: "busy" };
  return { word: "Within capacity", Icon: Users, tone: "ok" };
}

export const ZONE_TONE_TEXT = {
  ok: "text-muted-foreground",
  busy: "text-warning",
  over: "text-destructive",
  muted: "text-muted-foreground",
} as const;

/** A status glyph and word on one line. */
export function StatusText({
  Icon,
  word,
  className,
  spin = false,
}: {
  Icon: typeof Camera;
  word: string;
  className?: string;
  spin?: boolean;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Icon aria-hidden="true" className={cn("size-4 shrink-0", spin && "motion-safe:animate-spin motion-safe:[animation-duration:2s]")} />
      <span className="min-w-0 break-words">{word}</span>
    </span>
  );
}
