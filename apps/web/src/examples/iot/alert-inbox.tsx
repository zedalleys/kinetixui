"use client";

import * as React from "react";
import { AlertCard } from "@kinetixui/iot/react";
import { activeAlerts, highestAlertSeverity } from "@kinetixui/iot/functions";
import { DEMO_ALERTS, DEMO_NOW, deviceById } from "./demo-fleet";

// kx-iot:start
export function AlertInboxExample() {
  // Local demo state. Acknowledging here changes this component and nothing else — there is no
  // request, no device, and no server. See the note on the page.
  const [acknowledged, setAcknowledged] = React.useState<Record<string, string>>({});
  const [showAcknowledged, setShowAcknowledged] = React.useState(false);

  const alerts = DEMO_ALERTS.map((alert) =>
    acknowledged[alert.id] ? { ...alert, acknowledgedAt: acknowledged[alert.id] } : alert,
  );

  // `activeAlerts` sorts newest first and, by default, leaves acknowledged ones out — so "show
  // acknowledged" is a flag it already takes rather than a second code path here.
  const visible = activeAlerts(alerts, { includeAcknowledged: showAcknowledged });
  const loudest = highestAlertSeverity(alerts);

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label-md text-foreground">
          {visible.length} alert{visible.length === 1 ? "" : "s"}
          {loudest ? <span className="text-muted-foreground"> · loudest is {loudest}</span> : null}
        </p>
        <label className="flex items-center gap-2 text-label-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={(event) => setShowAcknowledged(event.target.checked)}
            className="size-4 rounded border-input"
          />
          Show acknowledged
        </label>
      </header>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-label-md text-muted-foreground">
          Nothing unacknowledged.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((alert) => (
            <li key={alert.id}>
              <AlertCard
                alert={alert}
                deviceName={deviceById(alert.deviceId).name}
                now={DEMO_NOW}
                action={
                  alert.acknowledgedAt ? null : (
                    <button
                      type="button"
                      onClick={() => setAcknowledged((prev) => ({ ...prev, [alert.id]: DEMO_NOW }))}
                      className="rounded-md border border-input px-2 py-1 text-label-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* Named, not an icon: "Acknowledge" beside a device name is what a screen
                          reader announces, and a bare tick is not. */}
                      <span className="sr-only">Acknowledge alert: {alert.message}. </span>
                      Acknowledge
                    </button>
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
// kx-iot:end
