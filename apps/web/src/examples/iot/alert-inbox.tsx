"use client";

import * as React from "react";
import { AlertCard } from "@kinetixui/iot/react";
import { Button, Checkbox, Label } from "@kinetixui/ui";
import { activeAlerts, highestAlertSeverity } from "@kinetixui/iot/functions";
import { DEMO_ALERTS, DEMO_NOW, deviceById } from "./demo-fleet";

// kx-iot:start
/** One-line rows need room for the message; below 768px the fuller list rows read better. */
function useWide(): boolean {
  const [wide, setWide] = React.useState(false);
  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 768px)");
    const read = () => setWide(media.matches);
    read();
    media.addEventListener?.("change", read);
    return () => media.removeEventListener?.("change", read);
  }, []);
  return wide;
}

export function AlertInboxExample() {
  const wide = useWide();
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
    <section aria-label="Alert inbox" className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="tabular-nums text-headline-md text-foreground">
            {visible.length} alert{visible.length === 1 ? "" : "s"}
          </p>
          {loudest ? <p className="text-body-md text-muted-foreground">Loudest is {loudest}</p> : null}
        </div>
        <Label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-full bg-muted/60 px-4 text-body-md font-normal leading-normal text-foreground md:min-h-9">
          <Checkbox checked={showAcknowledged} onCheckedChange={(checked) => setShowAcknowledged(checked === true)} />
          Show acknowledged
        </Label>
      </header>

      {visible.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-border p-6 text-center text-body-md text-muted-foreground">Nothing unacknowledged.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {visible.map((alert) => (
            <li key={alert.id}>
              <AlertCard
                alert={alert}
                deviceName={deviceById(alert.deviceId).name}
                now={DEMO_NOW}
                variant={wide ? "compact" : "list"}
                onAcknowledge={wide ? undefined : (target) => setAcknowledged((prev) => ({ ...prev, [target.id]: DEMO_NOW }))}
                action={
                  alert.acknowledgedAt || !wide ? null : (
                    <Button
                      type="button"
                      variant="Outline"
                      size="lg"
                      className="max-w-full whitespace-normal"
                      onClick={() => setAcknowledged((prev) => ({ ...prev, [alert.id]: DEMO_NOW }))}
                    >
                      {/* Named, not an icon: "Acknowledge" beside a device name is what a screen
                          reader announces, and a bare tick is not. */}
                      <span className="sr-only">Acknowledge alert: {alert.message}. </span>
                      Acknowledge
                    </Button>
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
