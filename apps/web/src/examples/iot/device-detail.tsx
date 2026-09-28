import { CommandStatus, ConnectionHealth, FirmwareStatus, TelemetryCard } from "@kinetixui/iot/react";
import { DEMO_COMMANDS, DEMO_NOW, DEMO_SERIES, deviceById } from "./demo-fleet";

// kx-iot:start
export function DeviceDetailExample() {
  const device = deviceById("probe-a");
  const commands = DEMO_COMMANDS.filter((command) => command.deviceId === device.id);

  return (
    <article className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-4">
        <TelemetryCard series={DEMO_SERIES.temperature} metric="Temperature" precision={1} trendHeight={96} now={DEMO_NOW} />
        <TelemetryCard series={DEMO_SERIES.humidity} metric="Humidity" now={DEMO_NOW} />
      </div>

      <aside className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4">
        <section className="flex flex-col gap-2">
          <h4 className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">Connection</h4>
          {/* A ten-minute freshness threshold is this device's reporting cadence, not a default the
              library picked: a probe that reports twice a day is not unhealthy at hour three. */}
          <ConnectionHealth device={device} freshnessMs={10 * 60_000} now={DEMO_NOW} />
        </section>

        <section className="flex flex-col gap-2">
          <h4 className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">Firmware</h4>
          <FirmwareStatus firmware={{ status: "up-to-date", currentVersion: device.firmwareVersion }} />
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">Recent commands</h4>
          {commands.length === 0 ? (
            <p className="text-label-sm text-muted-foreground">Nothing sent to this device.</p>
          ) : (
            commands.map((command) => <CommandStatus key={command.id} command={command} showName now={DEMO_NOW} />)
          )}
        </section>
      </aside>
    </article>
  );
}
// kx-iot:end
