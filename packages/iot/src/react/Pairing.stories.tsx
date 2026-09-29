import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairingFailure } from "./pairing-failure";
import { PairingMethodPicker } from "./pairing-method-picker";
import { PairingStepper } from "./pairing-stepper";
import type { KinetixPairingMethod } from "../types/pairing";
import { advancePairing, startPairingFlow } from "../functions/pairing";

/**
 * The pieces of adding a device. UI state only: nothing here scans, connects or authenticates. The
 * flow buttons drive the headless state machine so the stepper and failure can be seen moving.
 */
const meta = {
  title: "IoT/Pairing",
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="flex w-[30rem] max-w-full flex-col gap-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const MethodPicker: Story = {
  render: function MethodPickerStory() {
    const [method, setMethod] = React.useState<KinetixPairingMethod | null>("qr");
    return (
      <PairingMethodPicker
        value={method}
        onChange={setMethod}
        options={{
          bluetooth: { unavailable: true, unavailableReason: "Bluetooth is turned off on this phone" },
          network: { description: "The phone and the hub are on the same Wi-Fi" },
          "manual-code": { label: "Type the setup code", description: "Printed under the device" },
        }}
      />
    );
  },
};

export const Progress: Story = {
  render: function ProgressStory() {
    const [flow, setFlow] = React.useState(() => advancePairing(startPairingFlow(), { type: "start", method: "qr" }));
    const btn = "min-h-9 rounded-lg border border-input bg-background px-3 text-label-md text-foreground";
    return (
      <>
        <PairingStepper flow={flow} />
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={() => setFlow((f) => advancePairing(f, { type: "next" }))}>Next</button>
          <button className={btn} onClick={() => setFlow((f) => advancePairing(f, { type: "fail", code: "wrong-network" }))}>Fail</button>
          <button className={btn} onClick={() => setFlow((f) => advancePairing(f, { type: "retry" }))}>Retry</button>
          <button className={btn} onClick={() => setFlow(advancePairing(startPairingFlow(), { type: "start", method: "qr" }))}>Reset</button>
        </div>
      </>
    );
  },
};

export const Failures: Story = {
  render: () => (
    <>
      <PairingFailure code="device-not-found" onAction={() => {}} />
      <PairingFailure code="partial-provisioning" onAction={() => {}} />
      <PairingFailure code="permission-denied" onAction={() => {}} />
    </>
  ),
};

export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl" className="flex flex-col gap-5">
      <PairingMethodPicker value="network" />
      <PairingStepper flow={advancePairing(startPairingFlow(), { type: "start", method: "qr" })} />
    </div>
  ),
};
