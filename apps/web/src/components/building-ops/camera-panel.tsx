"use client";

/**
 * The camera inspector and the camera list. The list is the non-spatial way to every camera on the floor:
 * each row is a button that selects the same camera the plan marker does.
 */
import * as React from "react";
import { CameraOff, X } from "lucide-react";
import { DeviceConnection, TelemetryMetric } from "@kinetixui/iot/react";
import { SegmentedControl, SegmentedControlItem } from "@kinetixui/ui";
import {
  formatAgo,
  formatClock,
  type BuildingDef,
  type CameraDef,
  type CameraFilter,
  type FloorDef,
  type OpsSnapshot,
} from "@/lib/building-ops";
import { cn } from "@/lib/utils";
import { StatusText, TONE_TEXT, cameraState } from "./status";

export function CameraInspector({
  building,
  camera,
  floor,
  snapshot,
  zoneName,
}: {
  building: BuildingDef;
  camera: CameraDef | undefined;
  floor: FloorDef;
  snapshot: OpsSnapshot;
  zoneName: (id: string) => string;
}) {
  if (!camera) {
    return (
      <section aria-label="Camera details" className="rounded-xl border border-border bg-card p-4 text-body-sm text-muted-foreground">
        Select a camera on the plan or in the list.
      </section>
    );
  }
  const status = snapshot.cameras[camera.id];
  const st = cameraState(status);
  const t = status?.telemetry ?? null;
  const freshness = status?.telemetryFreshness === "fresh" ? "fresh" : "stale";
  const metric = (label: string, value: number | undefined, unit: string, precision = 0) => (
    <TelemetryMetric
      label={label}
      value={value ?? null}
      unit={unit}
      precision={precision}
      // Freshness is decided once, by the simulation, and the report time is printed above at second precision.
      // Passing the timestamp too would add the component's minute-rounded age ("0m ago") beside "50 s ago".
      timestamp={null}
      freshness={t ? freshness : undefined}
      now={snapshot.now}
      quietWhenNormal
      className="rounded-lg bg-surface-grouped p-3"
    />
  );
  return (
    <section aria-labelledby="bo-inspector-title" data-inspector={camera.id} className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-xl border border-border bg-card p-3 sm:p-4">
      <header className="grid gap-1">
        <p className="text-label-sm uppercase tracking-wide text-muted-foreground">Selected camera</p>
        <h2 id="bo-inspector-title" className="break-words font-display text-title-lg font-semibold text-foreground">
          {camera.name}
        </h2>
        <p className="text-body-sm text-muted-foreground">
          {camera.mount} · {zoneName(camera.zoneId)} · {floor.code}
        </p>
        <StatusText Icon={st.Icon} word={st.word} spin={status?.connectivity === "connecting"} className={cn("text-label-md font-medium", TONE_TEXT[st.tone])} />
      </header>

      {/* Placeholder only: the demo has no video, no image request and no recording. */}
      <div
        role="img"
        aria-label="Camera placeholder. No video or image in this demo."
        className="grid aspect-video max-h-52 w-full place-items-center rounded-lg border border-dashed border-muted-foreground/60 bg-surface-grouped p-3 text-center"
      >
        <div className="grid justify-items-center gap-1 text-muted-foreground">
          <CameraOff aria-hidden="true" className="size-6" />
          <span className="text-label-md font-medium text-foreground">Camera placeholder</span>
          <span className="text-body-sm">No video, image or recording in this simulated demo.</span>
        </div>
      </div>

      <div className="grid gap-2">
        <h3 className="text-label-lg font-semibold text-foreground">Connection</h3>
        <p className="text-body-sm text-muted-foreground" data-heartbeat="">
          Last heartbeat {status ? `${formatClock(building, status.lastSeenAt)} (${formatAgo(status.lastSeenAt, snapshot.now)})` : "unknown"}
        </p>
        <DeviceConnection
          state={status?.connectivity ?? "unknown"}
          lastSeenAt={status?.lastSeenAt ?? null}
          transportLabel="Ethernet (PoE)"
          lastSeen="never"
          density="detail"
          now={snapshot.now}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="text-label-lg font-semibold text-foreground">Health telemetry</h3>
          <p className="text-body-sm text-muted-foreground" data-telemetry-age="">
            {t ? `Reported ${formatClock(building, t.observedAt)} (${formatAgo(t.observedAt, snapshot.now)})` : "No report received"}
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7.5rem),1fr))] gap-2">
          {metric("Frame rate", t?.frameRate, "fps")}
          {metric("Bitrate", t?.bitrateKbps, "kbps")}
          {metric("Temperature", t?.temperatureC, "°C", 1)}
        </div>
      </div>

      <div className="grid gap-2">
        <h3 className="text-label-lg font-semibold text-foreground">Network</h3>
        <dl className="grid gap-y-1.5 text-body-sm">
          {(
            [
              ["IP address", camera.network.ip],
              ["VLAN", String(camera.network.vlan)],
              ["Subnet mask", camera.network.subnetMask],
              ["Gateway", camera.network.gateway],
              ["MAC", camera.network.mac],
              ["Switch port", camera.network.switchPort],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 break-all font-mono tabular-nums text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-body-sm text-muted-foreground">Fixture values for the demo, not a real network.</p>
      </div>
    </section>
  );
}

export function CameraList({
  floor,
  cameras,
  snapshot,
  selectedId,
  status,
  zoneId,
  zoneName,
  onSelect,
  onStatus,
  onClearZone,
}: {
  floor: FloorDef;
  cameras: readonly CameraDef[];
  snapshot: OpsSnapshot;
  selectedId: string | null;
  status: CameraFilter;
  zoneId: string | null;
  zoneName: (id: string) => string;
  onSelect: (id: string) => void;
  onStatus: (s: CameraFilter) => void;
  onClearZone: () => void;
}) {
  const hiddenSelection = selectedId !== null && floor.cameras.some((c) => c.id === selectedId) && !cameras.some((c) => c.id === selectedId);

  return (
    <section aria-labelledby="bo-camera-list-title" className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="bo-camera-list-title" className="text-title-sm font-semibold text-foreground">
          Cameras on {floor.code} <span className="font-normal text-muted-foreground">({cameras.length} of {floor.cameras.length})</span>
        </h2>
      </div>
      <SegmentedControl
        aria-label="Filter cameras by status"
        value={status}
        onValueChange={(v) => v && onStatus(v as CameraFilter)}
        // Wraps instead of holding one line: at 320px, or at 200% text, "Needs attention" does not fit beside the others.
        className="flex w-full flex-wrap"
      >
        <SegmentedControlItem value="all" className="whitespace-normal">All</SegmentedControlItem>
        <SegmentedControlItem value="attention" className="whitespace-normal">Needs attention</SegmentedControlItem>
        <SegmentedControlItem value="online" className="whitespace-normal">Online</SegmentedControlItem>
      </SegmentedControl>
      {zoneId ? (
        <p className="flex flex-wrap items-center gap-2 text-body-sm text-muted-foreground">
          <span>
            Zone: <span className="font-medium text-foreground">{zoneName(zoneId)}</span>
          </span>
          <button
            type="button"
            onClick={onClearZone}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-label-md text-foreground underline-offset-4 outline-none hover:underline focus-visible:shadow-focus"
          >
            <X aria-hidden="true" className="size-3.5" />
            Clear zone filter
          </button>
        </p>
      ) : null}
      {hiddenSelection ? <p className="text-body-sm text-muted-foreground">The selected camera is hidden by this filter.</p> : null}
      {cameras.length === 0 ? (
        <p className="rounded-lg bg-surface-grouped p-3 text-body-sm text-muted-foreground">No cameras match this filter on {floor.code}.</p>
      ) : (
        <ul className="grid gap-1.5" aria-label={`Cameras on ${floor.code}`}>
          {cameras.map((camera) => {
            const s = snapshot.cameras[camera.id];
            const st = cameraState(s);
            const selected = camera.id === selectedId;
            return (
              <li key={camera.id}>
                <button
                  type="button"
                  data-camera-row={camera.id}
                  aria-pressed={selected}
                  onClick={() => onSelect(camera.id)}
                  className={cn(
                    "grid w-full gap-0.5 rounded-lg border px-3 py-2 text-start outline-none",
                    "transition-colors duration-fast ease-standard motion-reduce:transition-none focus-visible:shadow-focus",
                    selected ? "border-foreground bg-accent" : "border-transparent bg-surface-grouped hover:border-border hover:bg-accent",
                  )}
                >
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                    <span className="font-mono text-label-lg font-medium text-foreground">{camera.name}</span>
                    <StatusText Icon={st.Icon} word={st.word} spin={s?.connectivity === "connecting"} className={cn("text-label-md", TONE_TEXT[st.tone])} />
                  </span>
                  <span className="flex flex-wrap justify-between gap-x-3 text-body-sm text-muted-foreground">
                    <span className="min-w-0 break-words">{zoneName(camera.zoneId)}</span>
                    <span className="tabular-nums">Seen {formatAgo(s?.lastSeenAt, snapshot.now)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
