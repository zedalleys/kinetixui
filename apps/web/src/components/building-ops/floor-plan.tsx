"use client";

/**
 * The interactive floor plan: an original SVG drawing generated from the fixture geometry, with zone labels and
 * camera markers laid over it as HTML.
 *
 * Accessibility model
 * - The SVG is decorative (`aria-hidden`); nothing inside it is focusable. Clicking a zone is a pointer
 *   shortcut for the zone filter, which keyboard and screen-reader users reach through the zone table.
 * - Camera markers are real buttons in one roving group (one Tab stop; arrow keys, Home and End move between
 *   them and select). Each is named with the camera name, its zone and its status, and reports `aria-pressed`.
 * - Status is a glyph on the marker and a word in its name, not colour alone.
 * - The plan is a drawing, so positions are physical (`left`/`top`): it does not mirror with text direction.
 */
import * as React from "react";
import type { CameraDef, FloorDef, OpsSnapshot, ZoneDef } from "@/lib/building-ops";
import { PLAN_HEIGHT, PLAN_SHELL, PLAN_WIDTH } from "@/lib/building-ops";
import { cn } from "@/lib/utils";
import { cameraState, zoneState } from "./status";

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/* ------------------------------------------------------------------ drawing */

function Furniture({ zone }: { zone: ZoneDef }) {
  const { x, y, width: w, height: h } = zone.rect;
  const pad = 46;
  const inner = { x: x + pad, y: y + pad + 18, w: w - pad * 2, h: h - pad * 2 - 18 };
  const items: React.ReactNode[] = [];
  const key = (n: number) => `${zone.id}-${n}`;
  let n = 0;
  switch (zone.kind) {
    case "workspace": {
      // Bench desks in pairs, with a chair dot either side.
      const cols = Math.max(1, Math.floor(inner.w / 110));
      const rows = Math.max(1, Math.floor(inner.h / 70));
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) {
          const dx = inner.x + c * (inner.w / cols) + 10;
          const dy = inner.y + r * (inner.h / rows) + 10;
          items.push(<rect key={key(n++)} x={dx} y={dy} width={70} height={26} rx={3} className="fill-muted-foreground/25" />);
          for (const cx of [dx + 18, dx + 52]) {
            items.push(<circle key={key(n++)} cx={cx} cy={dy - 7} r={5} className="fill-muted-foreground/30" />);
            items.push(<circle key={key(n++)} cx={cx} cy={dy + 33} r={5} className="fill-muted-foreground/30" />);
          }
        }
      break;
    }
    case "meeting": {
      // Glazed meeting rooms: partitions plus a table each.
      const rooms = Math.max(1, Math.floor(w / 110));
      for (let i = 0; i < rooms; i++) {
        const rx = x + (i * w) / rooms;
        if (i > 0) items.push(<line key={key(n++)} x1={rx} y1={y + 70} x2={rx} y2={y + h} className="stroke-foreground/30" strokeWidth={3} />);
        const cx = rx + w / rooms / 2;
        items.push(<rect key={key(n++)} x={cx - 22} y={y + h / 2 - 10} width={44} height={70} rx={10} className="fill-muted-foreground/25" />);
      }
      items.push(<line key={key(n++)} x1={x} y1={y + 70} x2={x + w} y2={y + 70} className="stroke-foreground/20" strokeWidth={2} strokeDasharray="10 6" />);
      break;
    }
    case "social": {
      const cols = Math.max(1, Math.floor(inner.w / 90));
      const rows = Math.max(1, Math.floor(inner.h / 80));
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) {
          const cx = inner.x + (c + 0.5) * (inner.w / cols);
          const cy = inner.y + (r + 0.5) * (inner.h / rows);
          items.push(<circle key={key(n++)} cx={cx} cy={cy} r={17} className="fill-muted-foreground/25" />);
          for (let a = 0; a < 4; a++) {
            const t = (a * Math.PI) / 2 + Math.PI / 4;
            items.push(<circle key={key(n++)} cx={cx + Math.cos(t) * 27} cy={cy + Math.sin(t) * 27} r={5} className="fill-muted-foreground/30" />);
          }
        }
      break;
    }
    case "event": {
      // Seating rows facing a stage line.
      items.push(<rect key={key(n++)} x={inner.x} y={inner.y - 8} width={inner.w} height={10} rx={2} className="fill-muted-foreground/35" />);
      for (let r = 0; r < Math.floor((inner.h - 20) / 22); r++)
        for (let c = 0; c < Math.floor(inner.w / 20); c++)
          items.push(<rect key={key(n++)} x={inner.x + c * 20 + 3} y={inner.y + 22 + r * 22} width={12} height={10} rx={2} className="fill-muted-foreground/25" />);
      break;
    }
    case "lobby": {
      items.push(
        <path
          key={key(n++)}
          d={`M ${inner.x} ${inner.y + inner.h * 0.35} q ${inner.w / 2} ${inner.h * 0.5} ${inner.w} 0`}
          className="fill-none stroke-muted-foreground/40"
          strokeWidth={14}
          strokeLinecap="round"
        />,
      );
      for (let i = 0; i < 3; i++)
        items.push(<rect key={key(n++)} x={inner.x + i * (inner.w / 3) + 12} y={inner.y + inner.h - 26} width={inner.w / 3 - 24} height={22} rx={8} className="fill-muted-foreground/25" />);
      break;
    }
    case "service": {
      for (let r = 0; r < Math.max(1, Math.floor(inner.h / 34)); r++)
        items.push(<rect key={key(n++)} x={inner.x} y={inner.y + r * 34} width={inner.w} height={12} className="fill-muted-foreground/25" />);
      break;
    }
  }
  return <g>{items}</g>;
}

function Core() {
  const { x, y, width: w, height: h } = PLAN_SHELL.core;
  const lifts = [0, 1, 2];
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className="fill-muted stroke-foreground/50" strokeWidth={4} />
      {lifts.map((i) => {
        const lx = x + 14 + i * 46;
        return (
          <g key={i}>
            <rect x={lx} y={y + 16} width={38} height={38} className="fill-none stroke-foreground/40" strokeWidth={2} />
            <path d={`M ${lx} ${y + 16} L ${lx + 38} ${y + 54} M ${lx + 38} ${y + 16} L ${lx} ${y + 54}`} className="stroke-foreground/25" strokeWidth={2} />
          </g>
        );
      })}
      {/* stair */}
      <rect x={x + 14} y={y + 76} width={60} height={110} className="fill-none stroke-foreground/40" strokeWidth={2} />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={x + 14} y1={y + 86 + i * 10} x2={x + 74} y2={y + 86 + i * 10} className="stroke-foreground/25" strokeWidth={1.5} />
      ))}
      {/* washrooms */}
      <rect x={x + 86} y={y + 76} width={60} height={110} className="fill-muted-foreground/15 stroke-foreground/40" strokeWidth={2} />
      <line x1={x + 116} y1={y + 76} x2={x + 116} y2={y + 186} className="stroke-foreground/30" strokeWidth={2} />
      <text x={x + w / 2} y={y + h - 30} textAnchor="middle" className="fill-muted-foreground text-[22px] font-medium">
        Core
      </text>
      <text x={x + w / 2} y={y + h - 10} textAnchor="middle" className="fill-muted-foreground text-[15px]">
        lifts · stair · WC
      </text>
    </g>
  );
}

function Shell({ floor }: { floor: FloorDef }) {
  const o = PLAN_SHELL.outline;
  const c = PLAN_SHELL.corridor;
  return (
    <g>
      {/* glazing: a thin second line just inside the envelope */}
      <rect x={o.x} y={o.y} width={o.width} height={o.height} rx={6} className="fill-background stroke-foreground/70" strokeWidth={8} />
      <rect x={o.x + 9} y={o.y + 9} width={o.width - 18} height={o.height - 18} rx={3} className="fill-none stroke-foreground/15" strokeWidth={2} />
      <rect x={c.x} y={c.y} width={c.width} height={c.height} className="fill-muted/60" />
      <line x1={c.x + 20} y1={c.y + c.height / 2} x2={c.x + c.width - 20} y2={c.y + c.height / 2} className="stroke-foreground/15" strokeWidth={2} strokeDasharray="14 10" />
      <text x={c.x + 24} y={c.y + c.height / 2 + 6} className="fill-muted-foreground text-[16px] tracking-widest">
        CORRIDOR
      </text>
      {floor.layout === "lobby" ? (
        <g>
          <rect x={250} y={594} width={120} height={14} className="fill-background" />
          <path d="M 250 600 a 60 60 0 0 1 60 -60 M 370 600 a 60 60 0 0 0 -60 -60" className="fill-none stroke-foreground/35" strokeWidth={2} />
          <text x={310} y={630} textAnchor="middle" className="fill-muted-foreground text-[16px]">
            Main entrance
          </text>
        </g>
      ) : null}
      {floor.layout === "conference" ? (
        <text x={830} y={630} textAnchor="middle" className="fill-muted-foreground text-[16px]">
          Terrace ↓
        </text>
      ) : null}
      {floor.layout === "services" ? (
        <text x={230} y={30} textAnchor="middle" className="fill-muted-foreground text-[16px]">
          Service yard ↑
        </text>
      ) : null}
    </g>
  );
}

function ZoneShape({
  zone,
  tone,
  selected,
  onSelect,
}: {
  zone: ZoneDef;
  tone: "ok" | "busy" | "over" | "muted" | "plain";
  selected: boolean;
  onSelect: () => void;
}) {
  const { x, y, width, height } = zone.rect;
  const touchesCorridor = y + height === PLAN_SHELL.corridor.y || y === PLAN_SHELL.corridor.y + PLAN_SHELL.corridor.height;
  const doorY = y + height === PLAN_SHELL.corridor.y ? y + height : y;
  const doorX = x + Math.min(width - 60, 40);
  return (
    <g data-zone={zone.id} onClick={onSelect} className="cursor-pointer">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        className={cn(
          "stroke-foreground/50",
          tone === "plain" && "fill-transparent",
          tone === "ok" && "fill-primary/[0.07]",
          tone === "busy" && "fill-warning/20",
          tone === "over" && "fill-destructive/25",
          tone === "muted" && "fill-muted-foreground/10",
        )}
        strokeWidth={4}
      />
      {tone === "over" ? <rect x={x} y={y} width={width} height={height} fill="url(#bo-hatch)" /> : null}
      {tone === "muted" ? <rect x={x} y={y} width={width} height={height} fill="url(#bo-dots)" /> : null}
      <Furniture zone={zone} />
      {touchesCorridor ? (
        <g>
          <rect x={doorX} y={doorY - 4} width={44} height={8} className="fill-muted" />
          <path
            d={doorY === y ? `M ${doorX} ${doorY} a 44 44 0 0 0 44 44` : `M ${doorX} ${doorY} a 44 44 0 0 1 44 -44`}
            className="fill-none stroke-foreground/30"
            strokeWidth={1.5}
          />
        </g>
      ) : null}
      {selected ? <rect x={x + 6} y={y + 6} width={width - 12} height={height - 12} className="fill-none stroke-foreground" strokeWidth={4} strokeDasharray="16 8" /> : null}
    </g>
  );
}

/* ------------------------------------------------------------------ component */

export type FloorPlanProps = {
  floor: FloorDef;
  snapshot: OpsSnapshot;
  selectedCameraId: string | null;
  zoneId: string | null;
  showCameras: boolean;
  showOccupancy: boolean;
  onSelectCamera: (id: string) => void;
  onSelectZone: (id: string | null) => void;
  zoneName: (id: string) => string;
};

export function FloorPlan({ floor, snapshot, selectedCameraId, zoneId, showCameras, showOccupancy, onSelectCamera, onSelectZone, zoneName }: FloorPlanProps) {
  const markerRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const cameras = floor.cameras;
  const activeId = cameras.some((c) => c.id === selectedCameraId) ? selectedCameraId : (cameras[0]?.id ?? null);

  const onMarkerKey = (event: React.KeyboardEvent, index: number) => {
    const last = cameras.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    const target = cameras[next]!;
    onSelectCamera(target.id);
    markerRefs.current.get(target.id)?.focus();
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: `${PLAN_WIDTH} / ${PLAN_HEIGHT}` }} data-floor-plan={floor.id}>
      <svg viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`} className="absolute inset-0 size-full" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="bo-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="14" className="stroke-destructive/50" strokeWidth="4" />
          </pattern>
          <pattern id="bo-dots" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2" className="fill-muted-foreground/40" />
          </pattern>
        </defs>
        <Shell floor={floor} />
        {floor.zones.map((zone) => {
          const s = zoneState(snapshot.zones[zone.id]);
          return (
            <ZoneShape
              key={zone.id}
              zone={zone}
              tone={showOccupancy ? s.tone : "plain"}
              selected={zoneId === zone.id}
              onSelect={() => onSelectZone(zoneId === zone.id ? null : zone.id)}
            />
          );
        })}
        <Core />
      </svg>

      {/* Zone labels: visual only. The zone table carries the same facts for assistive technology. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {floor.zones.map((zone) => {
          const z = snapshot.zones[zone.id];
          const s = zoneState(z);
          const current = z?.freshness === "fresh" && z.value !== null;
          return (
            <div
              key={zone.id}
              className="absolute flex flex-col items-start gap-1 p-[1.2%]"
              style={{ left: pct(zone.rect.x, PLAN_WIDTH), top: pct(zone.rect.y, PLAN_HEIGHT), width: pct(zone.rect.width, PLAN_WIDTH) }}
            >
              <span className="hidden max-w-full break-words rounded bg-background/85 px-1.5 py-0.5 text-label-sm font-medium text-foreground md:inline">{zone.name}</span>
              {showOccupancy ? (
                <span
                  data-zone-chip={zone.id}
                  className={cn(
                    // Phones get the zone table instead: at ~250px of plan a count chip no longer fits its room.
                    "hidden max-w-full flex-wrap items-center gap-1 rounded px-1.5 py-0.5 text-label-sm tabular-nums sm:inline-flex",
                    s.tone === "over" && "bg-destructive text-destructive-foreground",
                    s.tone === "busy" && "bg-warning text-warning-foreground",
                    s.tone === "ok" && "bg-background/85 text-foreground",
                    s.tone === "muted" && "border border-dashed border-muted-foreground bg-background/85 text-muted-foreground",
                  )}
                >
                  <s.Icon className="size-3 shrink-0" />
                  {current ? `${z!.value}/${zone.capacity}` : z?.value !== null && z?.value !== undefined ? `last ${z.value}` : "—"}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {showCameras ? (
        <div role="group" aria-label={`Cameras on the ${floor.code} plan`} className="absolute inset-0">
          {cameras.map((camera: CameraDef, index) => {
            const status = snapshot.cameras[camera.id];
            const st = cameraState(status);
            const selected = camera.id === selectedCameraId;
            const dimmed = zoneId !== null && camera.zoneId !== zoneId;
            return (
              <React.Fragment key={camera.id}>
                <button
                  ref={(el) => {
                    if (el) markerRefs.current.set(camera.id, el);
                    else markerRefs.current.delete(camera.id);
                  }}
                  type="button"
                  data-camera-marker={camera.id}
                  tabIndex={camera.id === activeId ? 0 : -1}
                  aria-pressed={selected}
                  aria-label={`${camera.name}, ${zoneName(camera.zoneId)}, ${st.word}`}
                  onClick={() => onSelectCamera(camera.id)}
                  onKeyDown={(e) => onMarkerKey(e, index)}
                  className={cn(
                    // Pixels, not rem: a marker is a point on a drawing, and an icon-only one has no text to enlarge. At 200%
                    // text a rem-sized marker doubled and pushed the edge markers off a phone-width plan.
                    "absolute grid size-[36px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 outline-none",
                    "transition-[transform,box-shadow] duration-fast ease-standard motion-reduce:transition-none",
                    "focus-visible:shadow-focus",
                    st.tone === "ok" && "border-foreground/70 bg-card text-foreground",
                    st.tone === "attention" && "border-warning bg-warning text-warning-foreground",
                    st.tone === "down" && "border-destructive bg-destructive text-destructive-foreground",
                    selected && "z-10 scale-110 ring-[3px] ring-foreground ring-offset-2 ring-offset-background",
                    dimmed && !selected && "opacity-50",
                  )}
                  style={{ left: pct(camera.x, PLAN_WIDTH), top: pct(camera.y, PLAN_HEIGHT) }}
                >
                  <st.Icon aria-hidden="true" className="size-[16px]" />
                </button>
                {selected ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute z-10 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-label-sm font-medium text-background",
                      // Anchor the tag inwards near an edge so it never pushes past the plan.
                      camera.x > PLAN_WIDTH * 0.8 ? "-translate-x-full" : camera.x < PLAN_WIDTH * 0.2 ? "translate-x-0" : "-translate-x-1/2",
                      camera.y > PLAN_HEIGHT * 0.8 ? "-translate-y-12" : "translate-y-6",
                    )}
                    style={{ left: pct(camera.x, PLAN_WIDTH), top: pct(camera.y, PLAN_HEIGHT) }}
                  >
                    {camera.name}
                  </span>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
