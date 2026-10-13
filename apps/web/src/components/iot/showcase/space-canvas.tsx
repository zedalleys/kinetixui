"use client";

/**
 * SpaceCanvas: the central "environment" visual of a showcase composition.
 *
 * An original, abstract architectural drawing rendered as inline SVG from plain data (`SpacePlan`), with the
 * devices placed on it as real HTML buttons. Showcase code, not part of `@kinetixui/iot`.
 *
 * Accessibility model
 * - The SVG is decorative (`aria-hidden`). Nothing in it is focusable.
 * - Every interaction is a real `<button>` absolutely positioned over the plan with logical inset
 *   (`insetInlineStart` / `insetBlockStart`), each with a full accessible name and `aria-pressed`.
 * - Rooms are selected through the rail the shell provides. Clicking a room on the plan is a mouse
 *   convenience that mirrors it; it is not the only route and is not keyboard-reachable on purpose.
 * - Room names and ambient readings on the plan are `aria-hidden` and repeated once, in reading order, in a
 *   visually hidden list, so a screen-reader user gets them without the visual duplication.
 *
 * Phone widths
 * - The drawing is the same drawing; it only thins out. Below `sm` a deterministic pass (`phonePlanLayout`)
 *   drops markers that would physically collide at ~390 px, keeping the selected device first, then anything
 *   needing attention, then the rest of the selected room. Every marker it drops is still a real control from
 *   `sm` up, is named in a visually hidden list below `sm`, and is always reachable through the device list the
 *   composition renders beside the plan. Nothing is duplicated at any one width.
 * - Room names move out of the rooms and into one caption in the plan's top-start corner, for the selected room
 *   only; ambient chips and unselected hotspot names were already held back below `sm`. So at 390 the plan
 *   carries exactly one room name, one device name (the selected one) and a handful of markers.
 *
 * Semantic zoom (M5B): the plan has three densities, derived from the selection alone (`planDensity`).
 * - overview (nothing selected): each room's name, up to two readings, its exception count and a device count;
 *   no device names, and healthy markers recede so only exceptions carry a full marker.
 * - zone (a room selected): that room's boundary and tint dominate, its markers are full and its readings stay;
 *   other rooms step back to a muted fill and lose their readings, and their markers recede.
 * - device (a marker selected): the selected marker is filled, larger and named; the detail itself is the
 *   composition's focused panel beside the plan, not a floating card on it.
 * Receded markers are still 44px buttons with full names. A critical marker never recedes.
 *
 * Direction: the SVG mirrors under RTL (`rtl:-scale-x-100`) and every HTML overlay positions with logical
 * inset, so hotspots stay on the same spot of the drawing in both directions.
 */
import * as React from "react";
import { DeviceIcon } from "@kinetixui/iot/react";
import type { KinetixDeviceCategory } from "@kinetixui/iot/functions";
import { cn } from "@/lib/utils";
import { StateGlyph, STATE_TEXT, type ShowcaseState } from "./primitives";
import { severityRank } from "./severity";

/* -------------------------------------------------------------------------------------------------
 * Plan data
 * ----------------------------------------------------------------------------------------------- */

export type PlanShape =
  | { kind: "rect"; x: number; y: number; width: number; height: number; radius?: number }
  | { kind: "path"; d: string };

/**
 * What a decorative feature is drawn as. Each tone maps to token classes only:
 * `wall` a partition, `gap` erases a wall for a doorway, `swing` a door arc, `opening` bridges two rooms,
 * `furniture`/`soft` abstract blocks, `plant`, `water`, `pipe` (a dashed line), `line`, `rows` (crop rows),
 * `metal` (machines), `hatch`/`dots` (patterned zones).
 */
export type PlanTone = "wall" | "gap" | "swing" | "opening" | "furniture" | "soft" | "plant" | "water" | "pipe" | "line" | "rows" | "metal" | "hatch" | "dots";

export type PlanFeature =
  | { kind: "rect"; x: number; y: number; width: number; height: number; radius?: number; tone: PlanTone }
  | { kind: "circle"; cx: number; cy: number; r: number; tone: PlanTone }
  | { kind: "path"; d: string; tone: PlanTone; dashed?: boolean; width?: number };

export type PlanRoom = {
  id: string;
  label: string;
  shape: PlanShape;
  /** Where the room's label and ambient chips start (top-start corner of the block), in viewBox units. */
  labelAt: { x: number; y: number };
  /** A subtle floor pattern drawn inside the room. */
  pattern?: "hatch" | "dots";
};

export type PlanLevel = {
  id: string;
  label: string;
  rooms: readonly PlanRoom[];
  /** Drawn behind the rooms (ground, terrace, lot). */
  ground?: readonly PlanFeature[];
  /** Drawn over the rooms (walls, doorways, furniture, plants, machines). */
  features?: readonly PlanFeature[];
};

export type SpacePlan = {
  id: string;
  /** Names the plan for assistive technology and the level switcher, e.g. "Home plan". */
  label: string;
  viewBox: { width: number; height: number };
  /** One or more levels (floors). A single level hides the level switcher. */
  levels: readonly PlanLevel[];
};

export type HotspotState = Extract<ShowcaseState, "confirmed" | "pending" | "offline" | "warning" | "critical">;

export type PlanHotspot = {
  id: string;
  roomId: string;
  /** Percent of the plan width, measured from the inline-start edge (mirrors in RTL). */
  x: number;
  /** Percent of the plan height, measured from the top. */
  y: number;
  category: KinetixDeviceCategory;
  state: HotspotState;
  /** The device name, shown beside the marker from `md` up and used in the accessible name. */
  label: string;
  /** The confirmed reading, e.g. "20.5 °C". */
  value?: string;
  /** The requested value while pending, e.g. "22 °C". */
  requested?: string;
  /** Overrides the generated accessible name entirely. */
  ariaLabel?: string;
};

export type RoomAmbient = Record<string, readonly string[]>;

/** The accessible name of a hotspot: name, confirmed value, then the honest state in words. */
export function hotspotName(h: Pick<PlanHotspot, "label" | "value" | "requested" | "state" | "ariaLabel">): string {
  if (h.ariaLabel) return h.ariaLabel;
  const parts = [h.label];
  if (h.value) parts.push(h.value);
  if (h.state === "pending") parts.push(h.requested ? `requested ${h.requested}, not yet confirmed` : "not yet confirmed");
  else if (h.state === "offline") parts.push("offline");
  else if (h.state === "warning") parts.push("needs attention");
  else if (h.state === "critical") parts.push("critical");
  return parts.join(", ");
}

/* -------------------------------------------------------------------------------------------------
 * Phone layout: which markers survive at ~390 px
 * ----------------------------------------------------------------------------------------------- */

/**
 * The plan's drawn width at a 390 px viewport, in CSS pixels: 390 less the page gutter, the showcase card, its
 * padding and the `bg-muted/60` inset the plan sits in. Measured at 254 px (home, farm) and 262 px (site) in a
 * production build; 250 is the conservative floor. A constant, not a measurement, so the answer is identical on
 * the server and in the browser and there is no hydration flash.
 */
const PHONE_PLAN_WIDTH = 250;
/** The marker's real touch target, and so the closest two markers may sit before one has to go. */
const MARKER_PX = 44;
/** The name chip under the selected marker (`max-w-40`, up to two lines), reserved so no marker sits on it. */
const SELECTED_LABEL = { width: 160, height: 48, offset: 46 } as const;
/** The room caption pinned to the plan's top-start corner below `sm`: `start-1 top-1`, one line. */
const ROOM_CAPTION = { inset: 4, height: 24, maxWidth: 160 } as const;

/**
 * A generous width for the room caption, from its text: uppercase `text-label-md` runs about 9 px a character
 * and the constant covers the state glyph, its gap and the chip's padding, rounded up so the reservation is
 * never short of what the browser draws (checked against 14 room names at 390 px). Only ever used to keep
 * markers off the caption, so an estimate is right — and it must not measure, or the server and the browser
 * would disagree and the markers would jump on hydration.
 */
export function roomCaptionWidth(label: string): number {
  return Math.min(ROOM_CAPTION.maxWidth, 28 + label.length * 9.5);
}

type Box = { cx: number; cy: number; w: number; h: number };

/**
 * Where the selected marker's name chip hangs. Centred under the marker in the middle of the plan; pinned to
 * the marker's inline-start or inline-end edge near the edges, so a 160 px chip never runs off a 250 px plan.
 */
export function selectedLabelAlign(x: number): "start" | "center" | "end" {
  if (x < 33) return "start";
  if (x > 67) return "end";
  return "center";
}

function hits(a: Box, b: Box): boolean {
  return Math.abs(a.cx - b.cx) * 2 < a.w + b.w && Math.abs(a.cy - b.cy) * 2 < a.h + b.h;
}

/**
 * The selected device, then the showcase severity order (`severity.ts`: critical, needs attention, pending,
 * offline), then the selected room, then everything else. Lower sorts earlier. Offline ranks below a pending
 * request: a device that is not reporting is not a hazard, and a request in flight is what someone is watching.
 */
function rankOf(h: PlanHotspot, selectedRoomId: string | null, selectedHotspotId: string | null): number {
  if (h.id === selectedHotspotId) return 0;
  if (h.state !== "confirmed") return 1 + severityRank(h.state);
  if (h.roomId === selectedRoomId) return 5;
  return 6;
}

export type PhonePlanLayout = {
  /** Hotspot ids drawn on the plan below `sm`. */
  shown: ReadonlySet<string>;
  /** Hotspots held back below `sm`, in reading order, for the visually hidden list. */
  dropped: readonly PlanHotspot[];
  /** Whether the room caption still fits without the selected marker sitting on it. */
  caption: boolean;
};

/**
 * Decide, from the data alone, which markers can share the plan at phone width without touching.
 *
 * Pure and deterministic: same input, same answer, on the server and in the browser. The selected device is
 * never dropped; the room caption gives way only to the selected device itself, and takes precedence over
 * every quiet marker but not over one needing attention.
 */
export function phonePlanLayout(input: {
  hotspots: readonly PlanHotspot[];
  selectedRoomId?: string | null;
  selectedHotspotId?: string | null;
  /** Width of the room caption in the plan's top-start corner, or null when no room is selected. */
  captionWidth?: number | null;
  /** Plan aspect, used to turn a percent of the height into pixels. */
  viewBox: { width: number; height: number };
  planWidth?: number;
  /**
   * Root font size over 16. The marker (`size-11`), the name chip and the caption are sized in `rem`, so at 200%
   * text they are twice as big on a plan that is not; collisions are judged at the size actually drawn.
   */
  textScale?: number;
}): PhonePlanLayout {
  const { hotspots, selectedRoomId = null, selectedHotspotId = null, captionWidth = null, viewBox } = input;
  const width = input.planWidth ?? PHONE_PLAN_WIDTH;
  const k = input.textScale ?? 1;
  const MARKER = MARKER_PX * k;
  const LABEL = { width: SELECTED_LABEL.width * k, height: SELECTED_LABEL.height * k, offset: SELECTED_LABEL.offset * k };
  const height = (width * viewBox.height) / viewBox.width;
  const marker = (h: PlanHotspot): Box => ({ cx: (h.x / 100) * width, cy: (h.y / 100) * height, w: MARKER, h: MARKER });

  const order = hotspots
    .map((h, index) => ({ h, index, rank: rankOf(h, selectedRoomId, selectedHotspotId) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  const taken: Box[] = [];
  const shown = new Set<string>();
  const free = (box: Box) => !taken.some((t) => hits(t, box));

  // The selected device goes down first and is never dropped: at 390 it is the thing that must read.
  const chosen = order.find((o) => o.rank === 0);
  if (chosen) {
    shown.add(chosen.h.id);
    const box = marker(chosen.h);
    taken.push(box);
    const align = selectedLabelAlign(chosen.h.x);
    const shift = align === "start" ? (LABEL.width - MARKER) / 2 : align === "end" ? -(LABEL.width - MARKER) / 2 : 0;
    taken.push({ cx: box.cx + shift, cy: box.cy + LABEL.offset, w: LABEL.width, h: LABEL.height });
  }

  // Anything needing attention, and a request in flight, goes down next: it outranks the room's name, which is
  // also in the hidden list and in the composition's heading beside the plan. Offline (rank 4) waits its turn.
  for (const { h, rank } of order) {
    if (rank === 0 || rank > 3) continue;
    const box = marker(h);
    if (!free(box)) continue;
    shown.add(h.id);
    taken.push(box);
  }

  let caption = true;
  if (captionWidth !== null) {
    const box: Box = {
      cx: ROOM_CAPTION.inset + (captionWidth * k) / 2,
      cy: ROOM_CAPTION.inset + (ROOM_CAPTION.height * k) / 2,
      w: captionWidth * k,
      h: ROOM_CAPTION.height * k,
    };
    caption = free(box);
    if (caption) taken.push(box);
  }

  for (const { h } of order) {
    if (shown.has(h.id)) continue;
    const box = marker(h);
    if (!free(box)) continue;
    shown.add(h.id);
    taken.push(box);
  }

  return { shown, dropped: hotspots.filter((h) => !shown.has(h.id)), caption };
}

/* -------------------------------------------------------------------------------------------------
 * Drawing
 * ----------------------------------------------------------------------------------------------- */

const TONE_CLASS: Record<PlanTone, string> = {
  wall: "fill-none stroke-muted-foreground/40",
  gap: "fill-none stroke-card",
  swing: "fill-none stroke-muted-foreground/40",
  opening: "fill-card stroke-none",
  furniture: "fill-muted stroke-border",
  soft: "fill-primary/10 stroke-primary/25",
  plant: "fill-success/15 stroke-success/40",
  water: "fill-info/10 stroke-info/40",
  pipe: "fill-none stroke-info/50",
  line: "fill-none stroke-border",
  rows: "fill-none stroke-success/35",
  metal: "fill-muted-foreground/15 stroke-muted-foreground/40",
  hatch: "stroke-border",
  dots: "stroke-border",
};

const TONE_WIDTH: Partial<Record<PlanTone, number>> = { wall: 3, gap: 6, swing: 1.5, furniture: 1.25, soft: 1.25, plant: 1.25, water: 1.25, pipe: 2, line: 1.5, rows: 2, metal: 1.25 };

function FeatureShape({ feature, hatchId, dotsId }: { feature: PlanFeature; hatchId: string; dotsId: string }) {
  const tone = feature.tone;
  const fill = tone === "hatch" ? `url(#${hatchId})` : tone === "dots" ? `url(#${dotsId})` : undefined;
  const common = {
    className: TONE_CLASS[tone],
    fill,
    strokeWidth: (feature.kind === "path" && feature.width) || TONE_WIDTH[tone],
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (feature.kind === "rect") return <rect x={feature.x} y={feature.y} width={feature.width} height={feature.height} rx={feature.radius} {...common} />;
  if (feature.kind === "circle") return <circle cx={feature.cx} cy={feature.cy} r={feature.r} {...common} />;
  return <path d={feature.d} strokeDasharray={feature.dashed || tone === "pipe" ? "5 5" : undefined} {...common} />;
}

function RoomShape({ room, selected, receded = false, onClick, hatchId, dotsId }: { room: PlanRoom; selected: boolean; receded?: boolean; onClick?: () => void; hatchId: string; dotsId: string }) {
  // A selected zone dominates: a full primary boundary and tint. Its neighbours step back to a muted fill and a
  // fainter wall, so the boundary reads at a glance without a second highlight.
  const cls = cn(
    "transition-colors duration-fast motion-reduce:transition-none",
    selected ? "fill-primary/10 stroke-primary" : receded ? "fill-muted/50 stroke-border/70" : "fill-card stroke-border",
    onClick && !selected && "hover:fill-muted",
    onClick && "cursor-pointer",
  );
  const props = { className: cls, strokeWidth: selected ? 3 : 1.5, onClick, "data-room": room.id, "data-selected": selected ? "true" : undefined } as const;
  const overlayFill = room.pattern === "dots" ? `url(#${dotsId})` : room.pattern === "hatch" ? `url(#${hatchId})` : undefined;
  return (
    <g>
      {room.shape.kind === "rect" ? (
        <rect x={room.shape.x} y={room.shape.y} width={room.shape.width} height={room.shape.height} rx={room.shape.radius} {...props} />
      ) : (
        <path d={room.shape.d} {...props} />
      )}
      {overlayFill ? (
        room.shape.kind === "rect" ? (
          <rect x={room.shape.x} y={room.shape.y} width={room.shape.width} height={room.shape.height} rx={room.shape.radius} fill={overlayFill} className="pointer-events-none stroke-none" />
        ) : (
          <path d={room.shape.d} fill={overlayFill} className="pointer-events-none stroke-none" />
        )
      ) : null}
    </g>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Hotspots
 * ----------------------------------------------------------------------------------------------- */

// Centres the zero-size anchor on the point. Under RTL the inline-start edge is on the right, so the
// horizontal correction flips.
const CENTRE = "-translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2";

const HOTSPOT_STATE_WORD: Partial<Record<HotspotState, string>> = { pending: "Requested", offline: "Offline", warning: "Needs attention", critical: "Critical" };

/**
 * How loud a marker is at the plan's current density.
 * `focus`  the selected device: filled, larger, named.
 * `normal` a device in the selected zone, or an exception that belongs at the glance level.
 * `recede` context: smaller and untinted (muted glyph on the card, a hairline ring — no opacity, so it keeps
 *         its contrast), no badge unless it is an exception. Still a real 44px button.
 */
export type MarkerEmphasis = "focus" | "normal" | "recede";

/** The plan's semantic zoom: the whole site, one zone, or one device. Derived from the selection alone. */
export type PlanDensity = "overview" | "zone" | "device";

export function planDensity(selectedRoomId: string | null | undefined, selectedHotspotId: string | null | undefined): PlanDensity {
  if (selectedHotspotId) return "device";
  if (selectedRoomId) return "zone";
  return "overview";
}

/**
 * Pure, so the hierarchy is tested without a browser. A critical device is never receded; otherwise anything
 * outside the selected zone recedes, and in the overview only exceptions keep their full marker.
 */
export function markerEmphasis(h: Pick<PlanHotspot, "id" | "roomId" | "state">, density: PlanDensity, selectedRoomId: string | null, selectedHotspotId: string | null): MarkerEmphasis {
  if (h.id === selectedHotspotId) return "focus";
  if (h.state === "critical") return "normal";
  if (density === "overview") return h.state === "confirmed" ? "recede" : "normal";
  return h.roomId === selectedRoomId ? "normal" : "recede";
}

function Hotspot({
  hotspot,
  selected,
  labelled,
  emphasis,
  phone,
  culled = false,
  onSelect,
}: {
  hotspot: PlanHotspot;
  selected: boolean;
  labelled: boolean;
  emphasis: MarkerEmphasis;
  /** Drawn below `sm` too. When false the marker only appears from `sm` up. */
  phone: boolean;
  /** Held back at every width, not only below `sm`: the measured plan has no room for it (see `SpaceCanvas`). */
  culled?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { state } = hotspot;
  const word = HOTSPOT_STATE_WORD[state];
  const align = selectedLabelAlign(hotspot.x);
  const recede = emphasis === "recede";
  // Healthy is quiet: no badge. Every other state keeps its glyph (shape, not colour alone) at every emphasis.
  const badge = state !== "confirmed";
  return (
    <div
      className={cn("absolute", CENTRE, selected ? "z-focus" : "z-raised", culled ? "hidden" : !phone && "hidden sm:block")}
      data-phone-hotspot={phone ? "" : undefined}
      style={{ insetInlineStart: `${hotspot.x}%`, insetBlockStart: `${hotspot.y}%` }}
    >
      <button
        type="button"
        aria-label={hotspotName(hotspot)}
        aria-pressed={selected}
        data-hotspot={hotspot.id}
        data-state={state}
        data-emphasis={emphasis}
        onClick={() => onSelect?.(hotspot.id)}
        // size-11 at every width: the visible bubble is smaller, the padding is the touch target. The group is
        // NAMED: an unnamed `group` matched any ancestor `.group` (the page's <details>), so hovering anywhere
        // over the environment revealed every marker's name at once.
        className="group/marker relative flex size-11 items-center justify-center rounded-full focus-visible:outline-none"
      >
        {/* pending: a dashed ring, static — the dash is the meaning, not the motion */}
        {state === "pending" ? (
          <span aria-hidden="true" className={cn("absolute rounded-full border-2 border-dashed border-primary", recede ? "inset-1" : "-inset-1")} />
        ) : null}
        <span
          aria-hidden="true"
          className={cn(
            "relative flex items-center justify-center rounded-full transition-colors duration-fast motion-reduce:transition-none",
            emphasis === "focus" ? "size-10 shadow-sm ring-4" : recede ? "size-7 ring-2" : "size-9 shadow-sm ring-4",
            "group-focus-visible/marker:ring-ring",
            state === "confirmed" &&
              (emphasis === "focus"
                ? "bg-primary text-primary-foreground ring-primary/30"
                : recede
                  ? "bg-card text-muted-foreground ring-border group-hover/marker:text-primary"
                  : "bg-primary/15 text-primary ring-card/80 group-hover/marker:bg-primary/25"),
            state === "pending" && "bg-card text-primary ring-primary/15",
            state === "offline" && "border-2 border-dashed border-muted-foreground/70 bg-muted text-muted-foreground ring-card/80",
            state === "warning" && "bg-warning/20 text-foreground ring-warning/20",
            state === "critical" && "bg-destructive/15 text-foreground ring-destructive/30",
            selected && state !== "confirmed" && "ring-primary/40",
          )}
        >
          <DeviceIcon category={hotspot.category} size={recede ? 14 : 18} />
          {state === "offline" ? (
            <svg viewBox="0 0 32 32" className="absolute inset-0 size-full text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" focusable="false" aria-hidden="true">
              <path d="M8 24 24 8" />
            </svg>
          ) : null}
          {badge ? (
            <span className="absolute -bottom-1 -end-1 flex size-4 items-center justify-center rounded-full bg-card shadow-sm">
              <StateGlyph state={state} size={12} className={STATE_TEXT[state]} />
            </span>
          ) : null}
        </span>
        {/* the name beside the marker: only where the density calls for it (see `labelMode`), otherwise on
            this marker's own hover or focus; the aria-label always carries it */}
        <span
          aria-hidden="true"
          data-marker-label=""
          className={cn(
            "pointer-events-none absolute top-full mt-0.5",
            // near an edge the chip hangs off the marker's edge instead of straddling it, so it stays on the plan
            selected && align !== "center" ? (align === "start" ? "start-0" : "end-0") : "start-1/2 -translate-x-1/2 rtl:translate-x-1/2",
            // capped only at phone width, where the plan is ~250 px wide; unchanged from `sm` up
            selected ? "flex max-w-40 sm:max-w-none" : "hidden md:flex",
            "flex-col items-center overflow-hidden whitespace-nowrap rounded-lg bg-card px-2 py-0.5 text-center shadow-sm transition-opacity duration-fast motion-reduce:transition-none",
            labelled ? "opacity-100" : "opacity-0 group-hover/marker:opacity-100 group-focus-visible/marker:opacity-100",
          )}
        >
          <span className={cn("max-w-full truncate text-label-md text-foreground", selected && "font-semibold")}>{hotspot.label}</span>
          {hotspot.value || word ? (
            <span className="max-w-full truncate text-label-md tabular-nums text-muted-foreground">
              {hotspot.value ? <bdi>{hotspot.value}</bdi> : null}
              {hotspot.value && word ? " · " : null}
              {state === "pending" && hotspot.requested ? <>Changing to <bdi>{hotspot.requested}</bdi></> : word}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * SpaceCanvas
 * ----------------------------------------------------------------------------------------------- */

export type SpaceCanvasProps = {
  plan: SpacePlan;
  /** The selected room's id. The plan shows the level that contains it. */
  selectedRoomId?: string | null;
  /** Mirrors the shell's room rail when someone clicks a room on the plan (a mouse convenience). */
  onSelectRoom?: (roomId: string) => void;
  hotspots?: readonly PlanHotspot[];
  selectedHotspotId?: string | null;
  onSelectHotspot?: (hotspotId: string) => void;
  /** Short worded readings per room id, drawn as chips on the plan: `{ "room-living": ["21.4 °C", "48 %"] }`. */
  ambient?: RoomAmbient;
  /**
   * Which hotspot names are drawn beside their markers (from `md` up; every name is always in the accessible name and
   * appears on hover or focus). `selected`: only the selected hotspot. `room`: every hotspot in the selected room.
   * `all`: everything. Default `auto` follows the plan's density (`planDensity`): no names in the overview, `room`
   * for a selected zone of three hotspots or fewer, otherwise `selected`, so a dense room does not turn into
   * overlapping text.
   */
  hotspotLabels?: "auto" | "selected" | "room" | "all";
  /**
   * How many markers the plan carries below `sm` (~390 px), where the drawing is about 320 px wide and a 44 px
   * touch target is a seventh of it.
   *
   * `auto` (default) keeps the selected device, then anything needing attention, then the rest of the selected
   * room, dropping only markers that would physically overlap one already placed. Dropped markers come back
   * from `sm` up, are named in a visually hidden list below `sm`, and are always in the composition's device
   * list. `all` draws every marker at every width (the pre-`auto` behaviour).
   */
  markerDensity?: "auto" | "all";
  /** Show a quiet key of the four hotspot states under the plan. Default true. */
  legend?: boolean;
  /** Controlled level; when omitted the plan follows the selected room and the switcher. */
  levelId?: string;
  onLevelChange?: (levelId: string) => void;
  className?: string;
};

/** In severity order. Healthy carries no mark on the plan, so its key entry is a plain marker and the word. */
const LEGEND: { state: HotspotState; word: string }[] = [
  { state: "critical", word: "Critical" },
  { state: "warning", word: "Needs attention" },
  { state: "pending", word: "Requested, not confirmed" },
  { state: "offline", word: "Offline" },
  { state: "confirmed", word: "No mark: confirmed" },
];

const roomSentence = (c: { devices: number; attention: number }) =>
  `${c.devices} ${c.devices === 1 ? "device" : "devices"}${c.attention ? `, ${c.attention} ${c.attention === 1 ? "needs" : "need"} attention` : ""}`;

export function SpaceCanvas({
  plan,
  selectedRoomId = null,
  onSelectRoom,
  hotspots = [],
  selectedHotspotId = null,
  onSelectHotspot,
  ambient,
  hotspotLabels = "auto",
  markerDensity = "auto",
  legend = true,
  levelId,
  onLevelChange,
  className,
}: SpaceCanvasProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const hatchId = `${uid}-hatch`;
  const dotsId = `${uid}-dots`;
  const { width: vw, height: vh } = plan.viewBox;

  const levelOfRoom = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const level of plan.levels) for (const room of level.rooms) map.set(room.id, level.id);
    return map;
  }, [plan]);

  // A level picked by hand holds only while the selected room stays the same; choosing another room follows it.
  const [manual, setManual] = React.useState<{ forRoom: string | null; level: string } | null>(null);
  const followed = (selectedRoomId && levelOfRoom.get(selectedRoomId)) || plan.levels[0]!.id;
  const activeId = levelId ?? (manual && manual.forRoom === selectedRoomId ? manual.level : followed);
  const level = plan.levels.find((l) => l.id === activeId) ?? plan.levels[0]!;
  const roomIds = new Set(level.rooms.map((r) => r.id));
  const visibleHotspots = hotspots.filter((h) => roomIds.has(h.roomId));

  const inSelectedRoom = visibleHotspots.filter((h) => h.roomId === selectedRoomId).length;
  const density = planDensity(selectedRoomId, selectedHotspotId);
  // The overview names no device on the plan: it is rooms, their aggregates and their exceptions. A zone names
  // its own few devices; a device names itself. Names are always in each marker's accessible name and on its hover.
  const labelMode =
    hotspotLabels === "auto" ? (density === "overview" ? "none" : density === "zone" && inSelectedRoom <= 3 ? "room" : "selected") : hotspotLabels;
  // Per-room aggregates for the overview, counted from the markers themselves so nothing is hand-typed.
  const roomCounts = new Map<string, { devices: number; attention: number }>();
  for (const h of visibleHotspots) {
    const c = roomCounts.get(h.roomId) ?? { devices: 0, attention: 0 };
    c.devices++;
    if (h.state === "warning" || h.state === "critical") c.attention++;
    roomCounts.set(h.roomId, c);
  }

  const selectedRoom = level.rooms.find((r) => r.id === selectedRoomId) ?? null;
  // The first render (server and hydration) judges collisions on the constant phone plan, below `sm` only, so
  // nothing jumps on hydration. Once mounted, the plan is MEASURED: the same pass runs on the width the plan
  // really has and at the text size really in use, at every width. Before, the markers were sized in `rem` and
  // the plan in pixels, so at 200% text from `sm` up nothing thinned them out and 44px targets sat on top of
  // each other (measured in Chromium at 1280 px / 200%: 16 overlapping pairs on the operations plan). A marker
  // held back this way is still named in the hidden list and still in the composition's device list.
  const planRef = React.useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = React.useState<{ width: number; textScale: number; wide: boolean } | null>(null);
  React.useEffect(() => {
    const el = planRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => {
      const width = el.getBoundingClientRect().width;
      if (!width) return;
      const textScale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
      const wide = window.matchMedia("(min-width: 640px)").matches;
      setMeasured((prev) => (prev && prev.width === width && prev.textScale === textScale && prev.wide === wide ? prev : { width, textScale, wide }));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cheap (at most a couple of dozen markers) and pure, so it is recomputed rather than memoised.
  const phone: { shown: ReadonlySet<string> | null; dropped: readonly PlanHotspot[]; caption: boolean } =
    markerDensity === "all"
      ? { shown: null, dropped: [], caption: true }
      : phonePlanLayout({
          hotspots: visibleHotspots,
          selectedRoomId,
          selectedHotspotId,
          // the room caption is only pinned into the plan below `sm`
          captionWidth: selectedRoom && !measured?.wide ? roomCaptionWidth(selectedRoom.label) : null,
          viewBox: plan.viewBox,
          planWidth: measured?.width,
          textScale: measured?.textScale,
        });
  /** Whether a held-back marker is held back at every width (measured) or only below `sm` (first render). */
  const everywhere = measured !== null && markerDensity !== "all";

  const chooseLevel = (id: string) => {
    setManual({ forRoom: selectedRoomId, level: id });
    onLevelChange?.(id);
  };

  const pct = (value: number, of: number) => `${(value / of) * 100}%`;

  return (
    <div role="group" aria-label={plan.label} data-plan-density={density} className={cn("flex min-w-0 flex-col gap-3", className)}>
      {plan.levels.length > 1 ? (
        <div role="group" aria-label={`${plan.label} levels`} className="flex flex-wrap gap-1 self-start rounded-full bg-muted/60 p-1">
          {plan.levels.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={l.id === level.id}
              onClick={() => chooseLevel(l.id)}
              className={cn(
                "min-h-11 rounded-full px-4 text-body-md transition-colors duration-fast motion-reduce:transition-none md:min-h-9",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                l.id === level.id ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* the ground: a tonal step below the card, so the drawing reads as lifted */}
      <div className="rounded-xl bg-muted/60 p-2 sm:p-3">
        <div ref={planRef} className="relative w-full" style={{ aspectRatio: `${vw} / ${vh}` }}>
          <svg
            viewBox={`0 0 ${vw} ${vh}`}
            aria-hidden="true"
            focusable="false"
            className="absolute inset-0 size-full rtl:-scale-x-100"
            data-plan-level={level.id}
          >
            <defs>
              <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" className="stroke-border" strokeWidth="1" />
              </pattern>
              <pattern id={dotsId} width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="2.5" cy="2.5" r="1.1" className="fill-border" />
              </pattern>
            </defs>
            <g className="pointer-events-none">
              {level.ground?.map((f, i) => <FeatureShape key={i} feature={f} hatchId={hatchId} dotsId={dotsId} />)}
            </g>
            {level.rooms.map((room) => (
              <RoomShape
                key={room.id}
                room={room}
                selected={room.id === selectedRoomId}
                receded={selectedRoom !== null && room.id !== selectedRoomId}
                onClick={onSelectRoom ? () => onSelectRoom(room.id) : undefined}
                hatchId={hatchId}
                dotsId={dotsId}
              />
            ))}
            <g className="pointer-events-none">
              {level.features?.map((f, i) => <FeatureShape key={i} feature={f} hatchId={hatchId} dotsId={dotsId} />)}
            </g>
          </svg>

          {/* Below `sm` the room's name cannot sit in the room: at ~250 px the rooms are smaller than the
              markers standing in them. It becomes a caption in the plan's top-start corner instead, where
              nothing else is placed, and the markers are kept off it. Visual only, like the in-place names. */}
          {selectedRoom && phone.caption ? (
            <span
              aria-hidden="true"
              data-room-caption=""
              className="pointer-events-none absolute start-1 top-1 z-base inline-flex max-w-40 items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-label-md font-semibold uppercase tracking-wide text-primary shadow-sm sm:hidden"
            >
              <StateGlyph state="confirmed" size={12} className="shrink-0 text-primary" />
              <span className="truncate">{selectedRoom.label}</span>
            </span>
          ) : null}

          {/* room names and aggregates: visual only, repeated once in the hidden list below. The overview gives
              every room its name, up to two readings and its exceptions; once a zone is chosen only that zone
              keeps its readings and the others are names, one step quieter. */}
          {level.rooms.map((room) => {
            const selected = room.id === selectedRoomId;
            const showReadings = density === "overview" || selected;
            const chips = showReadings ? (ambient?.[room.id] ?? []).slice(0, 2) : [];
            const counts = roomCounts.get(room.id);
            return (
              <div
                key={room.id}
                aria-hidden="true"
                data-room-label={room.id}
                className={cn("pointer-events-none absolute z-base hidden max-w-40 flex-col items-start gap-1 sm:flex")}
                style={{ insetInlineStart: pct(room.labelAt.x, vw), insetBlockStart: pct(room.labelAt.y, vh) }}
              >
                <span className={cn("flex min-w-0 max-w-full flex-col items-start", selected ? "font-semibold text-primary" : selectedRoom ? "text-muted-foreground/80" : "text-muted-foreground")}>
                  <span className="flex min-w-0 max-w-full items-center gap-1 text-label-md uppercase tracking-wide">
                    {selected ? <StateGlyph state="confirmed" size={12} className="text-primary" /> : null}
                    <span className="truncate">{room.label}</span>
                  </span>
                  {selected ? <span className="hidden text-label-md font-medium sm:inline">Selected</span> : null}
                </span>
                {chips.length || (density === "overview" && counts) ? (
                  <span className="flex flex-wrap gap-1">
                    {chips.map((chip) => (
                      <span key={chip} data-ambient-chip="" className="hidden items-center rounded-full bg-card/90 px-2 text-label-md tabular-nums text-foreground shadow-sm sm:inline-flex">
                        <bdi>{chip}</bdi>
                      </span>
                    ))}
                    {density === "overview" && counts ? (
                      <span data-room-summary="" className="hidden items-center gap-1 rounded-full bg-card/90 px-2 text-label-md tabular-nums text-muted-foreground shadow-sm sm:inline-flex">
                        {counts.attention ? (
                          <>
                            <StateGlyph state="warning" size={12} className={STATE_TEXT.warning} />
                            <span className="text-foreground">{counts.attention}</span>
                            <span>·</span>
                          </>
                        ) : null}
                        <span>
                          {counts.devices} {counts.devices === 1 ? "device" : "devices"}
                        </span>
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
            );
          })}

          {visibleHotspots.map((h) => (
            <Hotspot
              key={h.id}
              hotspot={h}
              selected={h.id === selectedHotspotId}
              labelled={labelMode === "all" || h.id === selectedHotspotId || (labelMode === "room" && h.roomId === selectedRoomId)}
              emphasis={markerEmphasis(h, density, selectedRoomId, selectedHotspotId)}
              phone={phone.shown === null || phone.shown.has(h.id)}
              culled={everywhere && phone.shown !== null && !phone.shown.has(h.id)}
              onSelect={onSelectHotspot}
            />
          ))}
        </div>
      </div>

      <ul className="sr-only" aria-label={`${level.label} rooms and readings`}>
        {level.rooms.map((room) => (
          <li key={room.id}>
            {room.label}
            {room.id === selectedRoomId ? " (selected)" : ""}
            {ambient?.[room.id]?.length ? `: ${ambient[room.id]!.join(", ")}` : ""}
            {roomCounts.get(room.id) ? `; ${roomSentence(roomCounts.get(room.id)!)}` : ""}
          </li>
        ))}
      </ul>

      {/* Below `sm` the markers above are thinned out; the ones held back are named here instead, so the
          reading-order equivalent of the plan stays complete. From `sm` up they are buttons again and this
          list is gone, so nothing is said twice at any one width. */}
      {phone.dropped.length ? (
        <ul className={cn("sr-only", !everywhere && "sm:hidden")} aria-label={`${level.label} devices not shown on the plan at this width`}>
          {phone.dropped.map((h) => (
            <li key={h.id}>{hotspotName(h)}</li>
          ))}
        </ul>
      ) : null}

      {legend ? (
        <ul aria-label="Marker key" className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
          {LEGEND.map(({ state, word }) => (
            <li key={state} className="inline-flex items-center gap-1.5">
              {state === "confirmed" ? (
                <span aria-hidden="true" className="inline-block size-3.5 rounded-full bg-primary/15 ring-2 ring-card" />
              ) : (
                <StateGlyph state={state} size={14} className={STATE_TEXT[state]} />
              )}
              <span>{word}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

