import { DeviceListItem, DeviceStateSummary, TelemetryTrend } from "@kinetixui/iot/react";
import { DEMO_DEVICES, DEMO_NOW, DEMO_SERIES } from "@/examples/iot/demo-fleet";
import { Reveal } from "@/components/reveal";

/**
 * The hero visual: real components, in the states a fleet is actually in.
 *
 * **What this deliberately is not.** No connection lines between devices, no radar sweep, no nodes
 * pulsing at a hub. Those read as "KinetixUI found your devices and is talking to them", and it does
 * not — there is no transport in this package. An illustration that implies one is a claim, and the
 * whole page is built on not making claims the package cannot honour.
 *
 * What it is instead: four rows and a plot, rendered by the same `DeviceListItem`, `TelemetryTrend`
 * and `DeviceStateSummary` a consumer installs, showing online, stale, mid-update and offline at
 * once. The interesting thing about a device fleet is that it is never uniformly healthy, and that is
 * a more honest hero than a row of green ticks.
 *
 * **Motion.** A staggered entrance via `<Reveal>`, which the site's own `prefers-reduced-motion` rule
 * already disables, and nothing that loops. Deterministic delays, no randomness, and every timestamp
 * derived from one fixed instant so the server and client renders agree. This is a server component:
 * the hero ships no JavaScript.
 */
export function HeroDevices() {
  const devices = [
    DEMO_DEVICES.find((d) => d.id === "probe-a")!,
    DEMO_DEVICES.find((d) => d.id === "probe-b")!,
    DEMO_DEVICES.find((d) => d.id === "meter-1")!,
    DEMO_DEVICES.find((d) => d.id === "probe-c")!,
  ];
  const readings: Record<string, number | null> = { "probe-a": 3.8, "probe-b": 6.4, "meter-1": 4.2, "probe-c": null };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">Cold chain · Site 4</span>
        <DeviceStateSummary devices={devices} />
      </div>

      <ul className="overflow-hidden rounded-xl border border-border">
        {devices.map((device, index) => (
          <Reveal key={device.id} as="li" delay={index * 90} className="block">
            <DeviceListItem
              as="div"
              device={device}
              reading={{ value: readings[device.id] ?? null, unit: "°C", precision: 1 }}
              now={DEMO_NOW}
            />
          </Reveal>
        ))}
      </ul>

      <Reveal delay={4 * 90}>
        <figure className="flex flex-col gap-1.5">
          <figcaption className="text-label-sm text-muted-foreground">Cold store probe · last 3 hours</figcaption>
          {/* The load series carries two dropouts. They stay as breaks in the line — the one thing a
              stock sparkline would have quietly drawn straight through. */}
          <TelemetryTrend series={DEMO_SERIES.load} precision={1} height={56} label="Cold store probe, last three hours" />
        </figure>
      </Reveal>
    </div>
  );
}
