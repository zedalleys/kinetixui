import { TelemetryCard } from "@kinetixui/iot/react";
import { DEMO_NOW, DEMO_SERIES } from "./demo-fleet";

// kx-iot:start
export function TelemetryBoardExample() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
      <TelemetryCard series={DEMO_SERIES.temperature} metric="Temperature" precision={1} now={DEMO_NOW} />
      <TelemetryCard series={DEMO_SERIES.humidity} metric="Humidity" now={DEMO_NOW} />
      <TelemetryCard series={DEMO_SERIES.load} metric="Load" precision={1} now={DEMO_NOW} />
      {/* This sensor stopped answering four hours ago. The card shows that rather than a last-known
          value dressed up as current, and the plot stops where the readings stopped. */}
      <TelemetryCard series={DEMO_SERIES.airQuality} metric="PM2.5" now={DEMO_NOW} />
    </div>
  );
}
// kx-iot:end
