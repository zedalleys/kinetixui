import { TelemetryCard, TelemetryTrend } from "@kinetixui/iot/react";
import { DEMO_NOW, DEMO_SERIES } from "./demo-fleet";

// kx-iot:start
export function TelemetryBoardExample() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
        <TelemetryCard series={DEMO_SERIES.temperature} metric="Temperature" precision={1} now={DEMO_NOW} />
        <TelemetryCard series={DEMO_SERIES.humidity} metric="Humidity" now={DEMO_NOW} />
        <TelemetryCard series={DEMO_SERIES.load} metric="Load" precision={1} now={DEMO_NOW} />
        {/* This sensor stopped answering four hours ago. The card shows that rather than a last-known
            value dressed up as current, and its plot stops where the readings stopped. */}
        <TelemetryCard series={DEMO_SERIES.airQuality} metric="PM2.5" now={DEMO_NOW} />
      </div>

      {/* The trend on its own, at the size a detail view would give it. The two dropouts in the load
          series are breaks in the line and a count in the footer — never interpolated across. */}
      <figure className="m-0 flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm sm:p-6">
        <figcaption className="text-title-md text-foreground">
          Load · last 3 hours
        </figcaption>
        <TelemetryTrend series={DEMO_SERIES.load} precision={1} height={160} />
      </figure>
    </div>
  );
}
// kx-iot:end
