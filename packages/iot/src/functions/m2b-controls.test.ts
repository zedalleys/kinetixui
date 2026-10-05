import { describe, expect, it } from "vitest";
import type { KinetixCommandLifecycle, KinetixCommandLifecycleEvent } from "../types/command";
import type { KinetixDeviceCapability } from "../types/device-state";
import type { KinetixDeviceColor } from "../types/control";
import { resolveCapabilitySupport } from "./capabilities";
import { describeDeviceColor, findDeviceColorOption, formatDeviceColorHex, normalizeDeviceColor, previewDeviceColor } from "./color";
import { isSameDeviceValue, startCommandLifecycle, supersedeCommandLifecycle, transitionCommandLifecycle } from "./commands";
import { resolveControlPresentation } from "./control";
import { describeLockOutcome, describeLockState, lockActions, normalizeLockState, resolveLockStrategy } from "./lock";
import {
  describeMediaTime,
  describePlaybackOutcome,
  describePlaybackState,
  formatMediaTime,
  nextPlaybackRequest,
  normalizeMediaPlaybackState,
} from "./media";

/**
 * M2B: the pure half of the colour, lock and media controls. Every behaviour here goes through the
 * shared lifecycle and `resolveControlPresentation`; these tests prove the new helpers add words and
 * shapes, not a second state machine. Numbers in test names are the brief's list.
 */

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

const RED: KinetixDeviceColor = { mode: "rgb", r: 255, g: 0, b: 0 };
const BLUE: KinetixDeviceColor = { mode: "rgb", r: 37, g: 99, b: 235 };
const WARM: KinetixDeviceColor = { mode: "temperature", kelvin: 2700 };

describe("colour", () => {
  it("(4) structured colour equality is by value, never by reference", () => {
    const reported = JSON.parse(JSON.stringify(RED)) as KinetixDeviceColor;
    expect(reported).not.toBe(RED);
    expect(isSameDeviceValue(reported, RED)).toBe(true);
    // Key order is not identity either.
    expect(isSameDeviceValue({ b: 0, g: 0, r: 255, mode: "rgb" }, RED)).toBe(true);
    expect(isSameDeviceValue(BLUE, RED)).toBe(false);
    expect(isSameDeviceValue(WARM, { mode: "temperature", kelvin: 2701 })).toBe(false);
    // A report of a structurally equal colour confirms the request; a reference check would not.
    const sent = run(startCommandLifecycle<KinetixDeviceColor>({ confirmed: WARM, requested: RED, commandId: "c1" }), { type: "sent" });
    expect(run(sent, { type: "report", value: { mode: "rgb", r: 255, g: 0, b: 0 } }).stage).toBe("confirmed");
    expect(findDeviceColorOption([{ label: "Red", value: RED }], { mode: "rgb", r: 255, g: 0, b: 0 })?.label).toBe("Red");
  });

  it("normalises the shapes a device or a product sends, and refuses anything else", () => {
    expect(normalizeDeviceColor("#ff0000")).toEqual(RED);
    expect(normalizeDeviceColor("f00")).toEqual(RED);
    expect(normalizeDeviceColor({ mode: "rgb", r: 300, g: -4, b: 12.6 })).toEqual({ mode: "rgb", r: 255, g: 0, b: 13 });
    expect(normalizeDeviceColor({ mode: "temperature", kelvin: 2700.4 })).toEqual(WARM);
    for (const bad of [null, undefined, "", "#12", "red", { mode: "rgb", r: 1 }, { mode: "hsv", h: 1 }, { mode: "temperature", kelvin: 0 }]) {
      expect(normalizeDeviceColor(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(formatDeviceColorHex(BLUE)).toBe("#2563EB");
    expect(describeDeviceColor(WARM)).toBe("2700 K");
    expect(describeDeviceColor(null)).toBe("unknown");
    expect(previewDeviceColor(RED)).toBe("rgb(255 0 0)");
    // A warm white previews warmer than a cool one: red stays full, blue drops.
    expect(previewDeviceColor(WARM)).toMatch(/^rgb\(255 \d+ \d+\)$/);
  });

  const pendingRed = () => run(startCommandLifecycle<KinetixDeviceColor>({ confirmed: WARM, requested: RED, commandId: "c1" }), { type: "sent" });

  it("(5) confirmed keeps the reported colour while the request is pending", () => {
    const view = resolveControlPresentation({ lifecycle: pendingRed() });
    expect(view.value).toEqual(WARM);
    expect(view.valueSource).toBe("reported");
    expect(view.indicatePending).toBe(true);
  });

  it("(6) optimistic shows the requested colour", () => {
    const view = resolveControlPresentation({ lifecycle: pendingRed(), strategy: "optimistic" });
    expect(view.value).toEqual(RED);
    expect(view.indicatePending).toBe(false);
  });

  it("(7) optimistic failure rolls back to the reported colour, and says it did not happen", () => {
    const failed = run(pendingRed(), { type: "fail", commandId: "c1" });
    const view = resolveControlPresentation({ lifecycle: failed, strategy: "optimistic" });
    expect(view.value).toEqual(WARM);
    expect(view.rolledBack).toBe(true);
    expect(view.unsuccessful).toBe(true);
  });

  it("(8) hybrid shows the requested colour as a target, with pending semantics", () => {
    const view = resolveControlPresentation({ lifecycle: pendingRed(), strategy: "hybrid" });
    expect(view.value).toEqual(RED);
    expect(view.valueSource).toBe("requested");
    expect(view.indicatePending).toBe(true);
    expect(view.reportedValue).toEqual(WARM);
  });

  it("(9) a stale reply cannot confirm a newer colour request", () => {
    const blue = supersedeCommandLifecycle(pendingRed(), BLUE, { commandId: "c2" });
    const sent = run(blue, { type: "sent" });
    const late = transitionCommandLifecycle(sent, { type: "confirm", value: RED, commandId: "c1" }, 1_000);
    expect(late.ok).toBe(false);
    expect(late.ok ? null : late.rejection.code).toBe("stale-response");
    expect(late.state.confirmedValue).toEqual(WARM);
    expect(resolveControlPresentation({ lifecycle: late.state }).outcome).toBe("pending");
  });

  it("(10) a reconnect report updates the reported colour, and settles truthfully", () => {
    const lost = run(pendingRed(), { type: "deviceUnreachable" });
    const back = run(lost, { type: "report", value: { mode: "rgb", r: 255, g: 0, b: 0 } });
    expect(back.stage).toBe("confirmed");
    const lostAgain = run(pendingRed(), { type: "deviceUnreachable" });
    const other = run(lostAgain, { type: "report", value: BLUE });
    expect(other.stage).toBe("failed");
    expect(other.confirmedValue).toEqual(BLUE);
  });
});

describe("lock", () => {
  const lockReq = () => run(startCommandLifecycle<string>({ confirmed: "unlocked", requested: "locked", commandId: "l1" }), { type: "sent" });

  it("(11) never says locked before the device does, under any accepted strategy", () => {
    for (const strategy of ["confirmed", "hybrid", "optimistic"] as const) {
      const view = resolveControlPresentation({ lifecycle: lockReq(), strategy: resolveLockStrategy(strategy) });
      const reported = normalizeLockState(view.reportedValue);
      const headline = view.valueSource === "requested" ? describeLockState(reported, "locked") : describeLockState(reported);
      expect(headline, strategy).not.toBe("Locked");
      expect(describeLockOutcome(view)).not.toMatch(/^Locked/);
    }
    expect(describeLockState("unlocked", "locked")).toBe("Locking");
    expect(describeLockState("locked")).toBe("Locked");
  });

  it("(12) pending has explicit pending semantics", () => {
    const view = resolveControlPresentation({ lifecycle: lockReq() });
    expect(view.pending).toBe(true);
    expect(view.indicatePending).toBe(true);
    expect(describeLockOutcome(view)).toBe("Locking, waiting for the device.");
  });

  it("(13) a failed lock still reports unlocked", () => {
    const failed = run(lockReq(), { type: "fail", commandId: "l1", code: "jammed" });
    const view = resolveControlPresentation({ lifecycle: failed });
    expect(normalizeLockState(view.reportedValue)).toBe("unlocked");
    expect(view.unsuccessful).toBe(true);
    expect(describeLockOutcome(view)).toBe("Could not lock. The device still reports unlocked.");
    expect(failed.reasonCode).toBe("jammed");
  });

  it("(14) a stale reply cannot falsely lock, and a duplicate one is absorbed", () => {
    // An earlier lock request (l0) was superseded by l1; its late confirm must not lock anything.
    const superseded = run(supersedeCommandLifecycle(run(startCommandLifecycle<string>({ confirmed: "unlocked", requested: "locked", commandId: "l0" }), { type: "sent" }), "unlocked", { commandId: "l1" }), { type: "sent" });
    const late = transitionCommandLifecycle(superseded, { type: "confirm", value: "locked", commandId: "l0" }, 9_000);
    expect(late.ok ? null : late.rejection.code).toBe("stale-response");
    expect(normalizeLockState(late.state.confirmedValue)).toBe("unlocked");
    const done = run(lockReq(), { type: "confirm", commandId: "l1" });
    const duplicate = transitionCommandLifecycle(done, { type: "confirm", commandId: "l1" }, 9_000);
    expect(duplicate.ok ? null : duplicate.rejection.code).toBe("illegal-transition");
    expect(duplicate.state).toBe(done);
  });

  it("(15) a reconnect report confirms or fails truthfully", () => {
    const lost = run(lockReq(), { type: "deviceUnreachable" });
    expect(describeLockOutcome(resolveControlPresentation({ lifecycle: lost }))).toBe("Could not lock: the device is unreachable. It last reported unlocked.");
    expect(describeLockOutcome(resolveControlPresentation({ lifecycle: run(lost, { type: "report", value: "locked" }) }))).toBe("Locked.");
    expect(describeLockOutcome(resolveControlPresentation({ lifecycle: run(lost, { type: "report", value: "unlocked" }) }))).toBe(
      "Could not lock. The device still reports unlocked.",
    );
    // A thumb-turn while nothing was asked: the state tracks it, nothing is announced as an outcome.
    const manual = run(startCommandLifecycle<string>({ confirmed: "unlocked" }), { type: "report", value: "locked" });
    expect(manual.stage).toBe("idle");
    expect(describeLockOutcome(resolveControlPresentation({ lifecycle: manual }))).toBe("");
    expect(normalizeLockState(manual.confirmedValue)).toBe("locked");
  });

  it("(16) an unknown or jammed state is explicit, and offers both actions", () => {
    expect(normalizeLockState(undefined)).toBe("unknown");
    expect(normalizeLockState("open")).toBe("unknown");
    expect(describeLockState("unknown")).toBe("Lock state unknown");
    expect(describeLockState("jammed")).toBe("Jammed");
    expect(lockActions("unknown")).toEqual(["locked", "unlocked"]);
    expect(lockActions("jammed")).toEqual(["locked", "unlocked"]);
    expect(lockActions("locked")).toEqual(["unlocked"]);
  });

  it("(17) optimistic is not a lock strategy: it resolves to confirmed", () => {
    expect(resolveLockStrategy("optimistic")).toBe("confirmed");
    expect(resolveLockStrategy("hybrid")).toBe("hybrid");
    expect(resolveLockStrategy(undefined)).toBe("confirmed");
    expect(resolveLockStrategy("anything")).toBe("confirmed");
  });

  it("matches the M1 lock capability: mode with role lock, and answers support", () => {
    const door: KinetixDeviceCapability[] = [{ id: "lock", kind: "mode", role: "lock", modes: [{ id: "locked", label: "Locked" }, { id: "unlocked", label: "Unlocked" }] }];
    expect(resolveCapabilitySupport(door, "lock")).toBe("supported");
    expect(resolveCapabilitySupport([{ ...door[0]!, readOnly: true }], "lock")).toBe("read-only");
    expect(resolveCapabilitySupport([], "lock")).toBe("unsupported");
  });
});

describe("media", () => {
  const playReq = () => run(startCommandLifecycle<string>({ confirmed: "paused", requested: "playing", commandId: "p1" }), { type: "sent" });

  it("(18) a play request and the reported playback can differ", () => {
    const view = resolveControlPresentation({ lifecycle: playReq() });
    expect(view.reportedValue).toBe("paused");
    expect(view.requestedValue).toBe("playing");
    expect(describePlaybackState("paused", "playing")).toBe("Starting playback");
    expect(describePlaybackOutcome(view)).toBe("Starting playback, waiting for the device.");
    expect(describePlaybackOutcome(resolveControlPresentation({ lifecycle: run(playReq(), { type: "confirm", commandId: "p1" }) }))).toBe("Playing.");
  });

  it("(19) a seek target and the reported position can differ", () => {
    const seek = run(startCommandLifecycle<number>({ confirmed: 65, requested: 120, commandId: "s1" }), { type: "sent" });
    const confirmed = resolveControlPresentation({ lifecycle: seek });
    expect(confirmed.value).toBe(65);
    expect(confirmed.pendingValue).toBe(120);
    // An intermediate position report is the device playing on, not the seek landing.
    const drifted = run(seek, { type: "report", value: 66 });
    expect(drifted.stage).toBe("requested");
    expect(drifted.confirmedValue).toBe(66);
  });

  it("(20) a failed play or seek reports failure, and rolls back where it was shown", () => {
    const failed = run(playReq(), { type: "fail", commandId: "p1" });
    expect(describePlaybackOutcome(resolveControlPresentation({ lifecycle: failed }))).toBe("Could not start playback. The device still reports paused.");
    expect(resolveControlPresentation({ lifecycle: failed, strategy: "optimistic" })).toMatchObject({ rolledBack: true, value: "paused" });
    const seek = run(startCommandLifecycle<number>({ confirmed: 65, requested: 120, commandId: "s1" }), { type: "sent" }, { type: "timeout" });
    expect(resolveControlPresentation({ lifecycle: seek, strategy: "hybrid" })).toMatchObject({ rolledBack: true, value: 65, outcome: "timed-out" });
  });

  it("writes and speaks time without inventing a zero", () => {
    expect(formatMediaTime(65)).toBe("1:05");
    expect(formatMediaTime(3723)).toBe("1:02:03");
    expect(formatMediaTime(null)).toBe("--:--");
    expect(formatMediaTime(-1)).toBe("--:--");
    expect(describeMediaTime(65)).toBe("1 minute 5 seconds");
    expect(describeMediaTime(0)).toBe("0 seconds");
    expect(describeMediaTime(3600)).toBe("1 hour");
    expect(describeMediaTime(undefined)).toBe("unknown");
  });

  it("keeps unknown playback unknown, and asks for the opposite of what is shown", () => {
    expect(normalizeMediaPlaybackState("PLAYING")).toBe("playing");
    expect(normalizeMediaPlaybackState(null)).toBe("unknown");
    expect(describePlaybackState("unknown")).toBe("Playback state unknown");
    expect(nextPlaybackRequest("playing")).toBe("paused");
    expect(nextPlaybackRequest("buffering")).toBe("paused");
    expect(nextPlaybackRequest("unknown")).toBe("playing");
  });

  it("matches the M1 speaker: playback is mode/media-playback, volume is level/volume", () => {
    const speaker: KinetixDeviceCapability[] = [
      { id: "playback", kind: "mode", role: "media-playback" },
      { id: "volume", kind: "level", role: "volume", min: 0, max: 100 },
    ];
    expect(resolveCapabilitySupport(speaker, "playback")).toBe("supported");
    expect(resolveCapabilitySupport(speaker, "volume")).toBe("supported");
    expect(resolveCapabilitySupport(speaker, "mute")).toBe("unsupported");
  });
});
