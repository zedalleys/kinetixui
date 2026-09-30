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
 * Direction: the SVG mirrors under RTL (`rtl:-scale-x-100`) and every HTML overlay positions with logical
 * inset, so hotspots stay on the same spot of the drawing in both directions.
 */
import * as React from "react";
import { DeviceIcon } from "@kinetixui/iot/react";
import type { KinetixDeviceCategory } from "@kinetixui/iot/functions";
import { cn } from "@/lib/utils";
import { StateGlyph, STATE_TEXT, type ShowcaseState } from "./primitives";

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

function RoomShape({ room, selected, onClick, hatchId, dotsId }: { room: PlanRoom; selected: boolean; onClick?: () => void; hatchId: string; dotsId: string }) {
  const cls = cn(
    "transition-colors duration-fast motion-reduce:transition-none",
    selected ? "fill-primary/10 stroke-primary" : "fill-card stroke-border",
    onClick && !selected && "hover:fill-muted",
    onClick && "cursor-pointer",
  );
  const props = { className: cls, strokeWidth: selected ? 2.5 : 1.5, onClick, "data-room": room.id, "data-selected": selected ? "true" : undefined } as const;
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

function Hotspot({ hotspot, selected, labelled, onSelect }: { hotspot: PlanHotspot; selected: boolean; labelled: boolean; onSelect?: (id: string) => void }) {
  const { state } = hotspot;
  const word = HOTSPOT_STATE_WORD[state];
  return (
    <div
      className={cn("absolute", CENTRE, selected ? "z-focus" : "z-raised")}
      style={{ insetInlineStart: `${hotspot.x}%`, insetBlockStart: `${hotspot.y}%` }}
    >
      <button
        type="button"
        aria-label={hotspotName(hotspot)}
        aria-pressed={selected}
        data-hotspot={hotspot.id}
        data-state={state}
        onClick={() => onSelect?.(hotspot.id)}
        className="group relative flex size-11 items-center justify-center rounded-full focus-visible:outline-none md:size-10"
      >
        {/* pending: a dashed ring that breathes, only when motion is welcome */}
        {state === "pending" ? (
          <span aria-hidden="true" className="absolute -inset-1 rounded-full border-2 border-dashed border-primary motion-safe:animate-pulse motion-reduce:animate-none" />
        ) : null}
        {/* a circular tinted bubble: a soft halo ring, the device glyph, and a small state badge */}
        <span
          aria-hidden="true"
          className={cn(
            "relative flex size-9 items-center justify-center rounded-full ring-4 shadow-sm transition-colors duration-fast motion-reduce:transition-none md:size-10",
            "group-focus-visible:ring-ring",
            state === "confirmed" && (selected ? "bg-primary text-primary-foreground ring-primary/30" : "bg-primary/15 text-primary ring-card/80 group-hover:bg-primary/25"),
            state === "pending" && "bg-card text-primary ring-primary/15",
            state === "offline" && "border-2 border-dashed border-muted-foreground bg-muted text-muted-foreground ring-card/80",
            state === "warning" && "bg-warning/20 text-foreground ring-warning/20",
            state === "critical" && "bg-destructive/15 text-foreground ring-destructive/20",
            selected && state !== "confirmed" && "ring-primary/40",
          )}
        >
          <DeviceIcon category={hotspot.category} size={18} />
          {state === "offline" ? (
            <svg viewBox="0 0 32 32" className="absolute inset-0 size-full text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" focusable="false" aria-hidden="true">
              <path d="M8 24 24 8" />
            </svg>
          ) : null}
          <span className="absolute -bottom-1 -end-1 flex size-4 items-center justify-center rounded-full bg-card shadow-sm">
            <StateGlyph state={state} size={12} className={STATE_TEXT[state]} />
          </span>
        </span>
        {/* the name beside the marker: hidden below md, where the aria-label carries it */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute start-1/2 top-full mt-0.5 hidden -translate-x-1/2 rtl:translate-x-1/2 md:flex",
            "flex-col items-center whitespace-nowrap rounded-lg bg-card px-2 py-0.5 text-center shadow-sm transition-opacity duration-fast motion-reduce:transition-none",
            labelled ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
        >
          <span className={cn("text-label-md text-foreground", selected && "font-semibold")}>{hotspot.label}</span>
          {hotspot.value || word ? (
            <span className="text-label-md tabular-nums text-muted-foreground">
              {hotspot.value ? <bdi>{hotspot.value}</bdi> : null}
              {hotspot.value && word ? " · " : null}
              {state === "pending" && hotspot.requested ? <>Requested <bdi>{hotspot.requested}</bdi></> : word}
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
   * `all`: everything. Default `auto`: `room` while the selected room holds three hotspots or fewer, otherwise
   * `selected`, so a dense room does not turn into overlapping text.
   */
  hotspotLabels?: "auto" | "selected" | "room" | "all";
  /** Show a quiet key of the four hotspot states under the plan. Default true. */
  legend?: boolean;
  /** Controlled level; when omitted the plan follows the selected room and the switcher. */
  levelId?: string;
  onLevelChange?: (levelId: string) => void;
  className?: string;
};

const LEGEND: { state: HotspotState; word: string }[] = [
  { state: "confirmed", word: "Confirmed" },
  { state: "pending", word: "Requested, not confirmed" },
  { state: "warning", word: "Needs attention" },
  { state: "offline", word: "Offline" },
];

export function SpaceCanvas({
  plan,
  selectedRoomId = null,
  onSelectRoom,
  hotspots = [],
  selectedHotspotId = null,
  onSelectHotspot,
  ambient,
  hotspotLabels = "auto",
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
  const labelMode = hotspotLabels === "auto" ? (inSelectedRoom <= 3 ? "room" : "selected") : hotspotLabels;

  const chooseLevel = (id: string) => {
    setManual({ forRoom: selectedRoomId, level: id });
    onLevelChange?.(id);
  };

  const pct = (value: number, of: number) => `${(value / of) * 100}%`;

  return (
    <div role="group" aria-label={plan.label} className={cn("flex min-w-0 flex-col gap-3", className)}>
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
        <div className="relative w-full" style={{ aspectRatio: `${vw} / ${vh}` }}>
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
                onClick={onSelectRoom ? () => onSelectRoom(room.id) : undefined}
                hatchId={hatchId}
                dotsId={dotsId}
              />
            ))}
            <g className="pointer-events-none">
              {level.features?.map((f, i) => <FeatureShape key={i} feature={f} hatchId={hatchId} dotsId={dotsId} />)}
            </g>
          </svg>

          {/* room names and ambient readings: visual only, repeated once in the hidden list below */}
          {level.rooms.map((room) => {
            const selected = room.id === selectedRoomId;
            const chips = ambient?.[room.id] ?? [];
            return (
              <div
                key={room.id}
                aria-hidden="true"
                className={cn("pointer-events-none absolute z-base max-w-40 flex-col items-start gap-1", selected ? "flex" : "hidden sm:flex")}
                style={{ insetInlineStart: pct(room.labelAt.x, vw), insetBlockStart: pct(room.labelAt.y, vh) }}
              >
                <span className={cn("flex min-w-0 max-w-full flex-col items-start", selected ? "font-semibold text-primary" : "text-muted-foreground")}>
                  <span className="flex min-w-0 max-w-full items-center gap-1 text-label-md uppercase tracking-wide">
                    {selected ? <StateGlyph state="confirmed" size={12} className="text-primary" /> : null}
                    <span className="truncate">{room.label}</span>
                  </span>
                  {selected ? <span className="hidden text-label-md font-medium sm:inline">Selected</span> : null}
                </span>
                {chips.length ? (
                  <span className="flex flex-wrap gap-1">
                    {chips.map((chip, i) => (
                      <span
                        key={chip}
                        className={cn(
                          "items-center rounded-full bg-card/90 px-2 text-label-md tabular-nums text-foreground shadow-sm",
                          "hidden sm:inline-flex",
                        )}
                      >
                        <bdi>{chip}</bdi>
                      </span>
                    ))}
                  </span>
                ) : null}
              </div>
            );
          })}

          {visibleHotspots.map((h) => (
            <Hotspot key={h.id} hotspot={h} selected={h.id === selectedHotspotId} labelled={labelMode === "all" || h.id === selectedHotspotId || (labelMode === "room" && h.roomId === selectedRoomId)} onSelect={onSelectHotspot} />
          ))}
        </div>
      </div>

      <ul className="sr-only" aria-label={`${level.label} rooms and readings`}>
        {level.rooms.map((room) => (
          <li key={room.id}>
            {room.label}
            {room.id === selectedRoomId ? " (selected)" : ""}
            {ambient?.[room.id]?.length ? `: ${ambient[room.id]!.join(", ")}` : ""}
          </li>
        ))}
      </ul>

      {legend ? (
        <ul aria-label="Marker key" className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
          {LEGEND.map(({ state, word }) => (
            <li key={state} className="inline-flex items-center gap-1.5">
              <StateGlyph state={state} size={14} className={STATE_TEXT[state]} />
              <span>{word}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

