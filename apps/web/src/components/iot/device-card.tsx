import {
  BatteryIndicator,
  DeviceStatusBadge,
  LastSync,
  SensorReading,
  SignalStrength,
} from "@kinetixui/iot/react";
import { cn } from "@/lib/utils";

/**
 * The hero composition: one device, read with the five shipped primitives and nothing else.
 *
 * Server-rendered. Every value is a literal prop and `now` is a fixed instant, so there is no client JavaScript
 * behind this, no hydration boundary, and no relative time that disagrees between server and browser.
 *
 * The device is an "Environment Sensor" on purpose. Temperature, humidity, battery and signal are the reading
 * set a thermostat, a warehouse monitor, a shipping tracker and a soil probe all share — naming it after any one
 * of those industries would make the module look like it was built for that industry.
 */

/** The instant the hero's relative times are measured from. Fixed so the markup is deterministic. */
const NOW = "2026-01-01T12:00:00.000Z";
const FIVE_MINUTES_AGO = new Date(Date.parse(NOW) - 5 * 60_000).toISOString();

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function DeviceCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="font-display text-base font-semibold">Environment Sensor</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">env-sensor-04</p>
        </div>
        <DeviceStatusBadge status="online" />
      </div>

      {/* SensorReading carries its own metric label, so these are not wrapped in a Field — doing that would
          print the metric name twice and leave an empty label span in the accessibility tree. */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <SensorReading metric="Temperature" value={23.4} unit="°C" precision={1} />
        <SensorReading metric="Humidity" value={41} unit="%" precision={0} />
      </div>

      {/* Battery, signal and last-sync render the value only — their accessible name is the full sentence
          ("Battery 72%, high"), so the visible label beside them comes from the row. */}
      <div className="mt-4 border-t border-border pt-2">
        <Field label="Battery">
          <BatteryIndicator value={72} />
        </Field>
        <Field label="Signal">
          <SignalStrength value={84} />
        </Field>
        <Field label="Last sync">
          <LastSync value={FIVE_MINUTES_AGO} now={NOW} />
        </Field>
      </div>
    </div>
  );
}
