import { describe, expect, it } from "vitest";
import type { KinetixCommandLifecycle, KinetixCommandLifecycleEvent } from "../types/command";
import type { KinetixConnectivityState } from "../types/device-state";
import { advanceCommandLifecycle, startCommandLifecycle } from "./commands";
import { describeControlOutcome, describeControlState, resolveControlPresentation, resolveControlState } from "./control";
import { describeCommandFeedback } from "./feedback";

/**
 * Phase 3D: a command phase crossed with the device's link, and the words each case gets.
 *
 * Reproduced on #317's head (3d44dc9) before the fix: a request still open when the link dropped to
 * `offline` or `unreachable` resolved to that availability (the command "is going nowhere", in
 * `resolveControlState`'s words), yet `describeControlState` gave the phase priority and said "Change
 * requested, not yet confirmed by the device" — the sentence for a request that is moving, with no
 * mention that the device was gone. A timed-out change was described as "The last change failed" and
 * announced as "Could not turn on: the device did not answer", although a timeout only means the
 * application stopped waiting.
 */

const POWER = {
  formatValue: (v: unknown) => (v === "on" ? "on" : "off"),
  pendingPhrase: (v: unknown) => (v === "on" ? "Turning on" : "Turning off"),
  failedPhrase: (v: unknown) => (v === "on" ? "Could not turn on" : "Could not turn off"),
};

function life(...events: KinetixCommandLifecycleEvent[]): KinetixCommandLifecycle<string> {
  let s = startCommandLifecycle<string>({ confirmed: "off", requested: "on" });
  for (const event of events) s = advanceCommandLifecycle(s, event, 1000);
  return s;
}

type Case = { name: string; lifecycle: KinetixCommandLifecycle<string>; connectivity: KinetixConnectivityState };

const CASES: Case[] = [
  { name: "requested + online", lifecycle: life({ type: "sent" }), connectivity: "online" },
  { name: "acknowledged + online", lifecycle: life({ type: "sent" }, { type: "acknowledge" }), connectivity: "online" },
  { name: "requested + connecting", lifecycle: life({ type: "sent" }), connectivity: "connecting" },
  { name: "requested + stale", lifecycle: life({ type: "sent" }), connectivity: "stale" },
  { name: "requested + offline", lifecycle: life({ type: "sent" }), connectivity: "offline" },
  { name: "requested + unreachable", lifecycle: life({ type: "sent" }), connectivity: "unreachable" },
  { name: "requested + unknown", lifecycle: life({ type: "sent" }), connectivity: "unknown" },
  { name: "confirmed", lifecycle: life({ type: "sent" }, { type: "confirm" }), connectivity: "online" },
  { name: "failed", lifecycle: life({ type: "sent" }, { type: "fail" }), connectivity: "online" },
  { name: "timed out", lifecycle: life({ type: "sent" }, { type: "timeout" }), connectivity: "online" },
];

/** Everything a reader can be told about one case: the control's description, its outcome sentence and the feedback headline. */
function words(c: Case) {
  const state = resolveControlState({ connectivity: c.connectivity, lifecycle: c.lifecycle });
  const outcome = describeControlOutcome(resolveControlPresentation({ lifecycle: c.lifecycle }), POWER);
  return { availability: state.availability, phase: state.phase, description: state.description, outcome, feedback: describeCommandFeedback(c.lifecycle).headline };
}

const at = (name: string) => words(CASES.find((c) => c.name === name)!);

describe("command phase × connectivity: the words", () => {
  it("the truth table", () => {
    // The whole table in one snapshot, so a wording change is a reviewed diff and not a side effect.
    expect(Object.fromEntries(CASES.map((c) => [c.name, words(c)]))).toMatchInlineSnapshot(`
      {
        "acknowledged + online": {
          "availability": "pending",
          "description": "Change requested, not yet confirmed by the device",
          "feedback": "Acknowledged, not yet confirmed",
          "outcome": "Turning on, waiting for the device.",
          "phase": "requested",
        },
        "confirmed": {
          "availability": "ready",
          "description": "Ready",
          "feedback": "Confirmed",
          "outcome": "On.",
          "phase": "confirmed",
        },
        "failed": {
          "availability": "ready",
          "description": "The last change was not confirmed. Showing the setting the device reports",
          "feedback": "Failed",
          "outcome": "Could not turn on. The device still reports off.",
          "phase": "failed",
        },
        "requested + connecting": {
          "availability": "connecting",
          "description": "Connecting to the device. The requested change is not yet confirmed. Showing the last known setting",
          "feedback": "Requested, not yet confirmed",
          "outcome": "Turning on, waiting for the device.",
          "phase": "requested",
        },
        "requested + offline": {
          "availability": "offline",
          "description": "Device offline. The requested change is not confirmed. Showing the last known setting",
          "feedback": "Requested, not yet confirmed",
          "outcome": "Turning on, waiting for the device.",
          "phase": "requested",
        },
        "requested + online": {
          "availability": "pending",
          "description": "Change requested, not yet confirmed by the device",
          "feedback": "Requested, not yet confirmed",
          "outcome": "Turning on, waiting for the device.",
          "phase": "requested",
        },
        "requested + stale": {
          "availability": "stale",
          "description": "Change requested, not yet confirmed by the device. Device data is out of date",
          "feedback": "Requested, not yet confirmed",
          "outcome": "Turning on, waiting for the device.",
          "phase": "requested",
        },
        "requested + unknown": {
          "availability": "pending",
          "description": "Change requested, not yet confirmed by the device",
          "feedback": "Requested, not yet confirmed",
          "outcome": "Turning on, waiting for the device.",
          "phase": "requested",
        },
        "requested + unreachable": {
          "availability": "unreachable",
          "description": "Device unreachable. The requested change is not confirmed. Showing the last known setting",
          "feedback": "Requested, not yet confirmed",
          "outcome": "Turning on, waiting for the device.",
          "phase": "requested",
        },
        "timed out": {
          "availability": "ready",
          "description": "The last change was not confirmed. Showing the setting the device reports",
          "feedback": "Timed out, may still apply",
          "outcome": "No confirmation for on: the device did not confirm in time, so the change may still apply. It last reported off.",
          "phase": "failed",
        },
      }
    `);
  });

  it("offline and unreachable never sound in progress, and name the link first", () => {
    for (const name of ["requested + offline", "requested + unreachable"]) {
      const { description } = at(name);
      expect(description, name).not.toMatch(/not yet|waiting|in progress/i);
      expect(description, name).toMatch(/^Device (offline|unreachable)\./);
      expect(description, name).toMatch(/not confirmed/);
    }
  });

  it("requested and acknowledged are never confirmed", () => {
    for (const name of ["requested + online", "acknowledged + online", "requested + stale", "requested + connecting", "requested + unknown"]) {
      const w = at(name);
      expect(w.description, name).toMatch(/not yet confirmed/);
      expect(w.phase, name).toBe("requested");
    }
    expect(at("acknowledged + online").feedback).toMatch(/not yet confirmed/);
  });

  it("disconnected is not failed, and unknown is not offline", () => {
    for (const name of ["requested + offline", "requested + unreachable", "requested + connecting", "requested + unknown"]) {
      expect(at(name).description, name).not.toMatch(/fail/i);
      expect(at(name).phase, name).toBe("requested");
    }
    expect(at("requested + unknown").description).not.toMatch(/offline/i);
    expect(at("requested + unknown").availability).not.toBe("offline");
  });

  it("a timeout does not claim the device ignored the change", () => {
    const w = at("timed out");
    expect(w.description).not.toMatch(/fail/i);
    expect(w.outcome).not.toMatch(/could not/i);
    expect(w.outcome).toMatch(/may still apply/);
    expect(w.feedback).toMatch(/may still apply/);
  });

  it("every requested sentence at every availability keeps 'requested' and 'not … confirmed'", () => {
    for (const availability of ["pending", "offline", "unreachable", "connecting", "stale", "unknown"] as const) {
      const sentence = describeControlState(availability, "requested");
      expect(sentence, availability).toMatch(/requested/i);
      expect(sentence, availability).toMatch(/not (yet )?confirmed/);
    }
  });
});
