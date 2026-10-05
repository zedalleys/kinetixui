import * as React from "react";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceColorControl, DeviceControlCard, DeviceLockControl, DeviceMediaControl, DevicePowerControl } from "./index";
import {
  resolveControlState,
  startCommandLifecycle,
  supersedeCommandLifecycle,
  transitionCommandLifecycle,
  type KinetixCommandLifecycle,
  type KinetixCommandLifecycleEvent,
  type KinetixDeviceColor,
} from "../functions";

/**
 * M2B rendered: G12 in the components, and the colour, lock and media controls on the M1/M2A
 * contract. What is checked is what a person gets — what it says, its accessible state and what its
 * status region announces. jsdom does no layout; the browser half is `pnpm check:iot-strategies`.
 */

afterEach(cleanup);

async function axeViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(" | ")}`);
}

function run<T>(state: KinetixCommandLifecycle<T>, ...events: KinetixCommandLifecycleEvent[]): KinetixCommandLifecycle<T> {
  let s = state;
  let at = 0;
  for (const event of events) {
    const result = transitionCommandLifecycle(s, event, (at += 100));
    if (!result.ok) throw new Error(`${event.type} refused from ${s.stage}: ${result.rejection.code}`);
    s = result.state;
  }
  return s;
}

const announcers = (container: HTMLElement) => [...container.querySelectorAll("[data-control-announcer]")].map((n) => n.textContent);
const READY = resolveControlState({ deviceStatus: "online" });

describe("G12 in the components", () => {
  it("a control card with no device status says 'Status unknown', never 'Offline'", () => {
    const { container } = render(
      <DeviceControlCard device={{ id: "d1", name: "Pump", type: "pump", status: "online" }} control={resolveControlState()} value={40} unit="%" />,
    );
    const chip = container.querySelector("[data-state-chip]");
    expect(chip).toHaveTextContent("Status unknown");
    expect(chip).not.toHaveTextContent(/offline|last known/i);
    expect(container.querySelector("[data-availability]")).toHaveAttribute("data-availability", "unknown");
  });

  it("a power control with no device status describes it as unknown", () => {
    render(<DevicePowerControl state="off" control={resolveControlState()} label="Lamp" />);
    expect(screen.getByText("Device status unknown")).toBeInTheDocument();
    expect(screen.queryByText(/offline/i)).toBeNull();
    expect(screen.getByRole("switch", { name: "Lamp" })).toBeDisabled();
  });

  it("an unreachable link keeps its own word", () => {
    render(<DeviceControlCard device={{ id: "d1", name: "Pump", type: "pump", status: "online" }} control={resolveControlState({ connectivity: "unreachable" })} value={40} />);
    expect(screen.getByText(/Unreachable/)).toHaveTextContent("Unreachable — last known value");
  });
});

const WARM: KinetixDeviceColor = { mode: "temperature", kelvin: 2700 };
const OCEAN: KinetixDeviceColor = { mode: "rgb", r: 37, g: 99, b: 235 };
const OPTIONS = [
  { id: "warm", label: "Warm white", value: WARM },
  { id: "ocean", label: "Ocean", value: OCEAN },
];
const colourPending = () => run(startCommandLifecycle<KinetixDeviceColor>({ confirmed: WARM, requested: OCEAN, commandId: "c1" }), { type: "sent" });

describe("DeviceColorControl", () => {
  it("names every swatch, and the reported colour by name and value", async () => {
    const { container } = render(<DeviceColorControl options={OPTIONS} value={WARM} label="Desk lamp colour" onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "Desk lamp colour" });
    expect(within(group).getByRole("radio", { name: "Warm white" })).toHaveAttribute("aria-checked", "true");
    expect(within(group).getByRole("radio", { name: "Ocean" })).toHaveAttribute("aria-checked", "false");
    expect(container.querySelector("[data-color-shown]")).toHaveTextContent("Warm white (2700 K)");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("(5) confirmed keeps the reported colour while pending, and marks the request", async () => {
    const { container } = render(<DeviceColorControl options={OPTIONS} lifecycle={colourPending()} label="Desk lamp colour" />);
    expect(container.querySelector("[data-color-shown]")).toHaveAttribute("data-value-source", "reported");
    expect(container.querySelector("[data-color-shown]")).toHaveTextContent("Warm white (2700 K)");
    expect(screen.getByRole("radio", { name: "Warm white" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Ocean, requested, not yet confirmed" })).toBeInTheDocument();
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Requested Ocean (#2563EB), not yet confirmed");
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(announcers(container)).toEqual(["Changing to Ocean (#2563EB), waiting for the device."]);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("(6) optimistic previews and checks the requested colour, silently", () => {
    const { container } = render(<DeviceColorControl options={OPTIONS} lifecycle={colourPending()} strategy="optimistic" label="Desk lamp colour" />);
    expect(container.querySelector("[data-color-shown]")).toHaveTextContent("Ocean (#2563EB)");
    expect(screen.getByRole("radio", { name: "Ocean" })).toHaveAttribute("aria-checked", "true");
    expect(container.querySelector("[data-requested]")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(announcers(container)).toEqual([""]);
  });

  it("(7) optimistic failure rolls back and says so", () => {
    const failed = run(colourPending(), { type: "fail", commandId: "c1" });
    const { container } = render(<DeviceColorControl options={OPTIONS} lifecycle={failed} strategy="optimistic" label="Desk lamp colour" />);
    expect(container.querySelector("[data-color-shown]")).toHaveTextContent("Warm white (2700 K)");
    expect(screen.getByRole("radio", { name: "Warm white" })).toHaveAttribute("aria-checked", "true");
    const note = container.querySelector("[data-outcome]");
    expect(note).toHaveAttribute("data-rolled-back", "");
    expect(note).toHaveTextContent("Could not change to Ocean (#2563EB). The device still reports Warm white (2700 K).");
  });

  it("(8) hybrid previews the target with a dashed mark and names what the device reports", () => {
    const { container } = render(<DeviceColorControl options={OPTIONS} lifecycle={colourPending()} strategy="hybrid" label="Desk lamp colour" />);
    expect(container.querySelector("[data-color-shown]")).toHaveAttribute("data-value-source", "requested");
    expect(container.querySelector("[data-color-preview]")!.className).toContain("border-dashed");
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Requested, not yet confirmed. Device reports Warm white (2700 K)");
    // The reported colour stays the checked radio; the request is raised and named.
    expect(screen.getByRole("radio", { name: "Warm white" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Ocean, requested, not yet confirmed" })).toBeInTheDocument();
  });

  it("(9) a stale reply rendered through the control does not confirm the newer colour", () => {
    const newer = run(supersedeCommandLifecycle(colourPending(), { mode: "rgb", r: 255, g: 0, b: 0 }, { commandId: "c2" }), { type: "sent" });
    const late = transitionCommandLifecycle(newer, { type: "confirm", value: OCEAN, commandId: "c1" }, 5_000);
    expect(late.ok).toBe(false);
    const { container } = render(<DeviceColorControl options={OPTIONS} lifecycle={late.state} label="Desk lamp colour" />);
    expect(container.querySelector("[data-color-shown]")).toHaveTextContent("Warm white (2700 K)");
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Requested #FF0000, not yet confirmed");
  });

  it("(10) shows a reported colour that is none of the options, by value", () => {
    const reported = run(startCommandLifecycle<KinetixDeviceColor>({ confirmed: WARM }), { type: "report", value: { mode: "rgb", r: 255, g: 0, b: 0 } });
    const { container } = render(<DeviceColorControl options={OPTIONS} lifecycle={reported} label="Desk lamp colour" />);
    expect(container.querySelector("[data-color-shown]")).toHaveTextContent("#FF0000");
    expect(screen.queryByRole("radio", { checked: true })).toBeNull();
  });

  it("is keyboard-operable through the shared radiogroup, and asks rather than changes", () => {
    const onChange = vi.fn();
    render(<DeviceColorControl options={OPTIONS} value={WARM} control={READY} label="Desk lamp colour" onChange={onChange} />);
    const warm = screen.getByRole("radio", { name: "Warm white" });
    expect(warm).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(warm, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(OCEAN);
    expect(warm).toHaveAttribute("aria-checked", "true");
  });

  it("(24) read-only shows the colour without choices; unsupported says so", () => {
    const { container, rerender } = render(<DeviceColorControl options={OPTIONS} value={WARM} support="read-only" label="Desk lamp colour" />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByText("Read only on this device")).toBeInTheDocument();
    rerender(<DeviceColorControl options={OPTIONS} value={WARM} support="unsupported" label="Desk lamp colour" />);
    expect(container.querySelector("[data-support=unsupported]")).toHaveTextContent("Desk lamp colour: not supported by this device");
  });
});

const lockPending = () => run(startCommandLifecycle<"locked" | "unlocked">({ confirmed: "unlocked", requested: "locked", commandId: "l1" }), { type: "sent" });

describe("DeviceLockControl", () => {
  it("(11) never presents locked before the device confirms it, under confirmed or hybrid", async () => {
    for (const strategy of ["confirmed", "hybrid"] as const) {
      const { container, unmount } = render(<DeviceLockControl lifecycle={lockPending()} strategy={strategy} label="Front door" />);
      const group = screen.getByRole("group", { name: "Front door" });
      expect(group).toHaveAttribute("data-lock-state", "unlocked");
      expect(container.querySelector("[data-lock-headline]")!.textContent).not.toBe("Locked");
      expect(container.querySelector("[data-lock-glyph=locked]"), strategy).toBeNull();
      expect(screen.queryByText("Locked")).toBeNull();
      expect(await axeViolations(container)).toEqual([]);
      unmount();
    }
  });

  it("(12) a pending lock is busy, worded as pending, and not pressable", () => {
    const { container } = render(<DeviceLockControl lifecycle={lockPending()} label="Front door" onRequest={() => {}} />);
    expect(screen.getByRole("group", { name: "Front door" })).toHaveAttribute("aria-busy", "true");
    const button = screen.getByRole("button", { name: "Lock Front door" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(container.querySelector("[data-lock-headline]")).toHaveTextContent("Unlocked");
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Locking, not yet confirmed");
    expect(announcers(container)).toEqual(["Locking, waiting for the device."]);
  });

  it("hybrid leads with the direction and names the reported state", () => {
    const { container } = render(<DeviceLockControl lifecycle={lockPending()} strategy="hybrid" label="Front door" />);
    expect(container.querySelector("[data-lock-headline]")).toHaveTextContent("Locking");
    expect(container.querySelector("[data-lock-glyph=moving]")).not.toBeNull();
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Waiting for the device. It still reports unlocked");
  });

  it("(13) a failed lock stays unlocked and says so", () => {
    const { container } = render(<DeviceLockControl lifecycle={run(lockPending(), { type: "fail", commandId: "l1" })} label="Front door" />);
    expect(container.querySelector("[data-lock-headline]")).toHaveTextContent("Unlocked");
    expect(container.querySelector("[data-outcome]")).toHaveTextContent("Could not lock. The device still reports unlocked.");
    expect(announcers(container)).toEqual(["Could not lock. The device still reports unlocked."]);
    expect(screen.getByRole("button", { name: "Lock Front door" })).toBeEnabled();
  });

  it("(14) a stale reply rendered through the control cannot lock", () => {
    const newer = run(supersedeCommandLifecycle(lockPending(), "locked" as const, { commandId: "l2" }), { type: "sent" });
    const late = transitionCommandLifecycle(newer, { type: "confirm", value: "locked", commandId: "l1" }, 9_000);
    const { container } = render(<DeviceLockControl lifecycle={late.state} label="Front door" />);
    expect(container.querySelector("[data-lock-headline]")).toHaveTextContent("Unlocked");
    expect(screen.queryByText("Locked")).toBeNull();
  });

  it("(15) only a confirmation shows the closed lock", () => {
    const { container } = render(<DeviceLockControl lifecycle={run(lockPending(), { type: "confirm", commandId: "l1" })} label="Front door" />);
    expect(container.querySelector("[data-lock-headline]")).toHaveTextContent("Locked");
    expect(container.querySelector("[data-lock-glyph=locked]")).not.toBeNull();
    expect(announcers(container)).toEqual(["Locked."]);
    expect(screen.getByRole("button", { name: "Unlock Front door" })).toBeInTheDocument();
  });

  it("(16) an unknown lock is explicit and offers both actions", () => {
    const { container } = render(<DeviceLockControl state={null} label="Front door" />);
    expect(container.querySelector("[data-lock-headline]")).toHaveTextContent("Lock state unknown");
    expect(screen.getByRole("button", { name: "Lock Front door" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock Front door" })).toBeInTheDocument();
  });

  it("(17) an optimistic strategy from untyped code is drawn as confirmed", () => {
    const { container } = render(<DeviceLockControl lifecycle={lockPending()} strategy={"optimistic" as never} label="Front door" />);
    expect(screen.getByRole("group")).toHaveAttribute("data-strategy", "confirmed");
    expect(container.querySelector("[data-lock-headline]")).toHaveTextContent("Unlocked");
    expect(announcers(container)).toEqual(["Locking, waiting for the device."]);
  });

  it("(24) read-only shows the state without buttons", () => {
    render(<DeviceLockControl state="locked" support="read-only" label="Front door" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Read only on this device")).toBeInTheDocument();
  });
});

const playPending = () => run(startCommandLifecycle<"playing" | "paused">({ confirmed: "paused", requested: "playing", commandId: "p1" }), { type: "sent" });

describe("DeviceMediaControl", () => {
  const base = { label: "Kitchen speaker", title: "Morning news", duration: 200, onPlaybackRequest: () => {}, onPrevious: () => {}, onNext: () => {}, onSeek: () => {} };

  it("(22) names every icon button and exposes the scrubber's value, min and max", async () => {
    const { container } = render(<DeviceMediaControl {...base} playback="paused" position={65} volume={40} muted={false} onVolumeChange={() => {}} onMuteChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Kitchen speaker" })).toBeInTheDocument();
    for (const name of ["Previous", "Play", "Next", "Mute"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    const scrubber = screen.getByRole("slider", { name: "Position" });
    expect(scrubber).toHaveAttribute("min", "0");
    expect(scrubber).toHaveAttribute("max", "200");
    expect(scrubber).toHaveAttribute("aria-valuetext", "1 minute 5 seconds");
    expect(screen.getByRole("button", { name: "Mute" })).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector("audio, video")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("(18) a play request and the reported playback differ until confirmed", () => {
    const { container, rerender } = render(<DeviceMediaControl {...base} playbackLifecycle={playPending()} />);
    expect(container.querySelector("[data-playback-headline]")).toHaveTextContent("Paused");
    expect(container.querySelector("[data-requested]")).toHaveTextContent("Starting playback, not yet confirmed");
    expect(screen.getByRole("group")).toHaveAttribute("data-playback", "paused");
    expect(announcers(container)[0]).toBe("Starting playback, waiting for the device.");
    rerender(<DeviceMediaControl {...base} playbackLifecycle={run(playPending(), { type: "confirm", commandId: "p1" })} />);
    expect(container.querySelector("[data-playback-headline]")).toHaveTextContent("Playing");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(announcers(container)[0]).toBe("Playing.");
  });

  it("(23) a pending media action has an accessible busy state", () => {
    render(<DeviceMediaControl {...base} playbackLifecycle={playPending()} />);
    expect(screen.getByRole("group")).toHaveAttribute("aria-busy", "true");
    const play = screen.getByRole("button", { name: "Play" });
    expect(play).toHaveAttribute("aria-busy", "true");
    expect(play).toBeDisabled();
    // A pending play does not lock the other transport controls.
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("(19) a seek target and the reported position are drawn apart, in time words", () => {
    const seek = run(startCommandLifecycle<number>({ confirmed: 65, requested: 120, commandId: "s1" }), { type: "sent" });
    const { container } = render(<DeviceMediaControl {...base} playback="playing" seekLifecycle={seek} />);
    const scrubber = screen.getByRole("slider", { name: "Position" });
    expect(scrubber).toHaveAttribute("aria-valuetext", "1 minute 5 seconds, changing to 2 minutes");
    expect(scrubber).toHaveAttribute("aria-busy", "true");
    const part = container.querySelector("[data-media-part=scrubber]")!;
    expect(part.querySelector("[data-confirmed]")).toHaveTextContent("1:05");
    expect(part.querySelector("[data-requested]")).toHaveTextContent("Requested 2:00, not yet confirmed");
    expect(part.querySelector("[data-control-announcer]")).toHaveTextContent("Seeking to 2 minutes, waiting for the device.");
  });

  it("(20) a failed play and a failed seek are said, and optimistic rolls back", () => {
    const failed = run(playPending(), { type: "fail", commandId: "p1" });
    const { container, rerender } = render(<DeviceMediaControl {...base} playbackLifecycle={failed} strategy="optimistic" />);
    expect(container.querySelector("[data-playback-headline]")).toHaveTextContent("Paused");
    expect(container.querySelector("[data-outcome]")).toHaveAttribute("data-rolled-back", "");
    expect(container.querySelector("[data-outcome]")).toHaveTextContent("Could not start playback. The device still reports paused.");
    const seek = run(startCommandLifecycle<number>({ confirmed: 65, requested: 120, commandId: "s1" }), { type: "sent" }, { type: "fail", commandId: "s1" });
    rerender(<DeviceMediaControl {...base} playback="playing" seekLifecycle={seek} />);
    expect(container.querySelector("[data-media-part=scrubber] [data-outcome]")).toHaveTextContent(
      "Could not seek to 2 minutes. The device still reports 1 minute 5 seconds.",
    );
  });

  it("(21) volume is DeviceLevelControl: the same level semantics, the same chip and valuetext", () => {
    const volume = run(startCommandLifecycle<number>({ confirmed: 40, requested: 60, commandId: "v1" }), { type: "sent" });
    const { container } = render(<DeviceMediaControl {...base} volumeLifecycle={volume} onVolumeChange={() => {}} />);
    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(slider).toHaveAttribute("aria-valuetext", "40%, changing to 60%");
    expect(container.querySelector("[data-media-part=volume] [data-requested]")).toHaveTextContent("Requested 60%, not yet confirmed");
  });

  it("announces mute, and keeps aria-pressed at the reported state while a change is marked", () => {
    const muting = run(startCommandLifecycle<boolean>({ confirmed: false, requested: true, commandId: "m1" }), { type: "sent" });
    const { container, rerender } = render(<DeviceMediaControl {...base} muteLifecycle={muting} onMuteChange={() => {}} />);
    const mute = screen.getByRole("button", { name: "Mute" });
    expect(mute).toHaveAttribute("aria-pressed", "false");
    expect(mute).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector("[data-media-part=volume] [data-control-announcer]")).toHaveTextContent("Muting, waiting for the device.");
    rerender(<DeviceMediaControl {...base} muteLifecycle={run(muting, { type: "confirm", commandId: "m1" })} onMuteChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Mute" })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector("[data-media-part=volume] [data-control-announcer]")).toHaveTextContent("Muted.");
  });

  it("calls back and never plays anything itself", () => {
    const onPlaybackRequest = vi.fn();
    const onNext = vi.fn();
    render(<DeviceMediaControl {...base} playback="paused" onPlaybackRequest={onPlaybackRequest} onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPlaybackRequest).toHaveBeenCalledWith("playing");
    expect(onNext).toHaveBeenCalledTimes(1);
    // Still paused: the press was a request.
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("(24) unknown or unavailable devices disable every action, read-only and unsupported are said", () => {
    const { container, rerender } = render(<DeviceMediaControl {...base} playback="paused" control={resolveControlState()} />);
    expect(screen.getByText("Device status unknown")).toBeInTheDocument();
    for (const name of ["Previous", "Play", "Next"]) expect(screen.getByRole("button", { name })).toBeDisabled();
    rerender(<DeviceMediaControl {...base} playback="playing" support="read-only" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("[data-playback-headline]")).toHaveTextContent("Playing");
    rerender(<DeviceMediaControl {...base} support="unsupported" />);
    expect(container.querySelector("[data-support=unsupported]")).toHaveTextContent("Kitchen speaker: not supported by this device");
  });

  it("keeps transport and progress left-to-right in an RTL document", () => {
    const { container } = render(
      <div dir="rtl">
        <DeviceMediaControl {...base} playback="paused" position={10} />
      </div>,
    );
    expect(container.querySelector("[data-media-part=transport]")).toHaveAttribute("dir", "ltr");
    expect(container.querySelector("[data-media-part=scrubber]")).toHaveAttribute("dir", "ltr");
  });
});

describe("a device state and a command in flight together (PR #310 review)", () => {
  it("a ready `control` does not make a pending command pressable again", () => {
    const seek = run(startCommandLifecycle<number>({ confirmed: 65, requested: 120, commandId: "s1" }), { type: "sent" });
    const volume = run(startCommandLifecycle<number>({ confirmed: 40, requested: 60, commandId: "v1" }), { type: "sent" });
    const muting = run(startCommandLifecycle<boolean>({ confirmed: false, requested: true, commandId: "m1" }), { type: "sent" });
    render(
      <DeviceMediaControl
        label="Kitchen speaker"
        duration={200}
        control={READY}
        playbackLifecycle={playPending()}
        seekLifecycle={seek}
        volumeLifecycle={volume}
        muteLifecycle={muting}
        onPlaybackRequest={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onSeek={() => {}}
        onVolumeChange={() => {}}
        onMuteChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mute" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Position" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Volume" })).toBeDisabled();
    // The device itself is ready: the commands with nothing in flight stay available.
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  it("a ready `control` does not re-enable Lock while a lock request is open", () => {
    render(<DeviceLockControl label="Front door" lifecycle={lockPending()} control={READY} onRequest={() => {}} />);
    expect(screen.getByRole("button", { name: "Lock Front door" })).toBeDisabled();
  });

  it("shows the lifecycle's reported position when the duration is unknown", () => {
    const seek = startCommandLifecycle<number>({ confirmed: 65 });
    const { container } = render(<DeviceMediaControl label="Radio" playback="playing" seekLifecycle={seek} onPlaybackRequest={() => {}} />);
    expect(container.querySelector("[data-media-part=elapsed]")?.textContent).toBe("Elapsed 1:05");
  });
});
