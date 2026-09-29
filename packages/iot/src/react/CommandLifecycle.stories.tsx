import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommandLifecycle } from "./command-lifecycle";
import { advanceCommandLifecycle, startCommandLifecycle } from "../functions/commands";
import type { KinetixCommandLifecycle, KinetixCommandLifecycleEvent } from "../types/command";

/**
 * The command lifecycle, as the column of stages a lock or a valve actually passes through.
 *
 * The rows to compare are **Acknowledged** and **Confirmed**: one is a half-filled ring with the words
 * "not yet confirmed", the other a ringed tick. The interactive story drives a real lifecycle with
 * buttons standing in for the device, so the announcement (one polite `role="status"`) and the Retry
 * appearing after a timeout can be tried with a screen reader.
 */
const NOW = "2026-01-01T12:00:00.000Z";
const fmt = (v: unknown) => (v === "locked" ? "Locked" : "Unlocked");

const run = (...events: KinetixCommandLifecycleEvent[]): KinetixCommandLifecycle<string> =>
  events.reduce((state, event) => advanceCommandLifecycle(state, event, NOW), startCommandLifecycle<string>({ confirmed: "unlocked", requested: "locked" }));

const meta = {
  title: "IoT/Command lifecycle",
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

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">{children}</p>
);

export const Stages: Story = {
  render: () => (
    <>
      <Label>Requested</Label>
      <CommandLifecycle lifecycle={run({ type: "sent" })} formatValue={fmt} onCancel={() => {}} />
      <Label>Acknowledged — the device has it, and has not done it</Label>
      <CommandLifecycle lifecycle={run({ type: "sent" }, { type: "acknowledge" })} formatValue={fmt} onCancel={() => {}} />
      <Label>Confirmed</Label>
      <CommandLifecycle lifecycle={run({ type: "sent" }, { type: "acknowledge" }, { type: "confirm" })} formatValue={fmt} />
      <Label>Timed out</Label>
      <CommandLifecycle lifecycle={run({ type: "sent" }, { type: "timeout" })} formatValue={fmt} onRetry={() => {}} onCancel={() => {}} />
      <Label>Unreachable</Label>
      <CommandLifecycle lifecycle={run({ type: "sent" }, { type: "deviceUnreachable" })} formatValue={fmt} onRetry={() => {}} onCancel={() => {}} />
      <Label>Retrying</Label>
      <CommandLifecycle lifecycle={run({ type: "sent" }, { type: "timeout" }, { type: "retry" })} formatValue={fmt} onCancel={() => {}} />
    </>
  ),
};

/** Buttons play the device. Retry appears only while the machine would accept one. */
export const Interactive: Story = {
  render: function InteractiveStory() {
    const [life, setLife] = React.useState(() => startCommandLifecycle<string>({ confirmed: "unlocked", requested: "locked" }));
    const send = (event: KinetixCommandLifecycleEvent) => setLife((l) => advanceCommandLifecycle(l, event));
    const btn = "min-h-9 rounded-lg border border-input bg-background px-3 text-label-md text-foreground";
    return (
      <>
        <CommandLifecycle lifecycle={life} formatValue={fmt} onRetry={() => send({ type: "retry" })} onCancel={() => send({ type: "cancel" })} />
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={() => send({ type: "sent" })}>Send</button>
          <button className={btn} onClick={() => send({ type: "acknowledge" })}>Device acknowledges</button>
          <button className={btn} onClick={() => send({ type: "confirm" })}>Device confirms</button>
          <button className={btn} onClick={() => send({ type: "timeout" })}>Timeout</button>
          <button className={btn} onClick={() => send({ type: "deviceUnreachable" })}>Unreachable</button>
          <button className={btn} onClick={() => setLife(startCommandLifecycle<string>({ confirmed: "unlocked", requested: "locked" }))}>Reset</button>
        </div>
      </>
    );
  },
};

export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <CommandLifecycle lifecycle={run({ type: "sent" }, { type: "timeout" })} formatValue={fmt} onRetry={() => {}} onCancel={() => {}} />
    </div>
  ),
};
