import { DeviceCard, DeviceStateSummary } from "@kinetixui/iot/react";
import { compareDeviceAttention } from "@kinetixui/iot/functions";
import { DEMO_DEVICES, DEMO_NOW, DEMO_READINGS } from "./demo-fleet";

// kx-iot:start
export function DeviceFleetExample() {
  // Worst first. The ordering comes from KINETIX_DEVICE_STATUSES via compareDeviceAttention, so the
  // list and the badges agree about which state is worse instead of holding two opinions.
  const devices = [...DEMO_DEVICES].sort(compareDeviceAttention);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-title-sm text-foreground">Cold chain · Site 4</h3>
        <DeviceStateSummary devices={devices} />
      </header>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3">
        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            reading={DEMO_READINGS[device.id]}
            now={DEMO_NOW}
          />
        ))}
      </div>
    </section>
  );
}
// kx-iot:end
