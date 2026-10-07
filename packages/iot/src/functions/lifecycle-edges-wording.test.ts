import { describe, expect, it } from "vitest";
import type { KinetixCommandLifecycle, KinetixCommandLifecycleEvent } from "../types/command";
import type { KinetixConnectivityState } from "../types/device-state";
import { isLifecycleAdjusted, startCommandLifecycle, supersedeCommandLifecycle, transitionCommandLifecycle } from "./commands";
import { describeControlOutcome, resolveControlPresentation, resolveControlState } from "./control";
import { describeCommandFeedback } from "./feedback";

/**
 * M4A on top of Phase 3D: the conditions M4A makes representable, read through the words Phase 3D wrote.
 *
 * Phase 3D's table (`pending-connectivity.test.ts`) covers a command phase crossed with the link. This one adds
 * the M4A edges (an adjusted confirmation, a report then a timeout, a lost link, a late report, device clock
 * skew and a superseded timeout) and pins that each still reads truthfully with no wording change: requested and
 * acknowledged are never confirmed, a lost link is not a failure, a timeout is not a refusal, offline never sounds
 * in progress and unknown is never offline.
 *
 * `outcome` is `describeControlOutcome` alone, which does not know the link. A control's status region replaces
 * it with "Device offline. The requested change is not confirmed." while the link is gone (Phase 3D,
 * `control-outcome.tsx`), and `CommandFeedback` is a command record that takes no link on purpose.
 */

const at = (ms: number) => new Date(ms).toISOString();
const SETPOINT = { formatValue: (v: unknown) => `${v}°`, pendingPhrase: (v: unknown) => `Setting ${v}°`, failedPhrase: (v: unknown) => `Could not set ${v}°` };

function run(state: KinetixCommandLifecycle<number>, ...steps: [KinetixCommandLifecycleEvent, number][]): KinetixCommandLifecycle<number> {
  let s = state;
  for (const [event, now] of steps) {
    const result = transitionCommandLifecycle(s, event, now);
    s = result.state;
  }
  return s;
}

/** Request 22 from 20 at app time 10s, correlated as `a`. */
const sent = () => run(startCommandLifecycle<number>({ confirmed: 20, requested: 22, commandId: "a" }), [{ type: "sent", commandId: "a" }, 10_000]);

type Case = { lifecycle: KinetixCommandLifecycle<number>; connectivity: KinetixConnectivityState };

const CASES: Record<string, Case> = {
  "adjusted confirmation": { lifecycle: run(sent(), [{ type: "confirm", value: 21.5, commandId: "a" }, 10_500]), connectivity: "online" },
  "unrelated differing report": { lifecycle: run(sent(), [{ type: "report", value: 21.5, observedAt: at(10_500) }, 10_500]), connectivity: "online" },
  "post-report timeout": {
    lifecycle: run(sent(), [{ type: "report", value: 21.5, observedAt: at(10_500) }, 10_500], [{ type: "timeout", commandId: "a" }, 18_000]),
    connectivity: "online",
  },
  "link lost during an open request": { lifecycle: run(sent(), [{ type: "acknowledge", commandId: "a" }, 10_200]), connectivity: "offline" },
  "late report after timeout": {
    lifecycle: run(sent(), [{ type: "timeout", commandId: "a" }, 18_000], [{ type: "report", value: 22, observedAt: at(19_000) }, 19_000]),
    connectivity: "online",
  },
  "report with device clock skew": {
    lifecycle: run(sent(), [{ type: "report", value: 22, observedAt: at(7_000), receivedAt: at(11_000) }, 11_000]),
    connectivity: "online",
  },
  "timeout for a superseded command": {
    lifecycle: run(supersedeCommandLifecycle(sent(), 23, { commandId: "b" }), [{ type: "sent", commandId: "b" }, 10_100], [{ type: "timeout", commandId: "a" }, 18_000]),
    connectivity: "online",
  },
};

function words({ lifecycle, connectivity }: Case) {
  const state = resolveControlState({ connectivity, lifecycle });
  const feedback = describeCommandFeedback(lifecycle, { formatValue: SETPOINT.formatValue });
  return {
    stage: lifecycle.stage,
    adjusted: isLifecycleAdjusted(lifecycle),
    availability: state.availability,
    description: state.description,
    outcome: describeControlOutcome(resolveControlPresentation({ lifecycle }), SETPOINT),
    feedback: `${feedback.headline} | ${feedback.sentence}`,
  };
}

const w = (name: string) => words(CASES[name]!);

describe("M4A edges in Phase 3D's words", () => {
  it("the truth table", () => {
    expect(Object.fromEntries(Object.entries(CASES).map(([name, c]) => [name, words(c)]))).toMatchInlineSnapshot(`
      {
        "adjusted confirmation": {
          "adjusted": true,
          "availability": "ready",
          "description": "Ready",
          "feedback": "Confirmed | Confirmed: the device reports 21.5°.",
          "outcome": "21.5°.",
          "stage": "confirmed",
        },
        "late report after timeout": {
          "adjusted": false,
          "availability": "ready",
          "description": "Ready",
          "feedback": "Confirmed | Confirmed: the device reports 22°.",
          "outcome": "22°.",
          "stage": "confirmed",
        },
        "link lost during an open request": {
          "adjusted": false,
          "availability": "offline",
          "description": "Device offline. The requested change is not confirmed. Showing the last known setting",
          "feedback": "Acknowledged, not yet confirmed | The device acknowledged the request for 22° but has not confirmed it. It last reported 20°.",
          "outcome": "Setting 22°, waiting for the device.",
          "stage": "acknowledged",
        },
        "post-report timeout": {
          "adjusted": false,
          "availability": "ready",
          "description": "The last change was not confirmed. Showing the setting the device reports",
          "feedback": "Timed out, may still apply | No confirmation for 22°: the request timed out. The device last reported 21.5°. It may still apply.",
          "outcome": "No confirmation for 22°: the device did not confirm in time, so the change may still apply. It last reported 21.5°.",
          "stage": "timed-out",
        },
        "report with device clock skew": {
          "adjusted": false,
          "availability": "ready",
          "description": "Ready",
          "feedback": "Confirmed | Confirmed: the device reports 22°.",
          "outcome": "22°.",
          "stage": "confirmed",
        },
        "timeout for a superseded command": {
          "adjusted": false,
          "availability": "pending",
          "description": "Change requested, not yet confirmed by the device",
          "feedback": "Requested, not yet confirmed | Requested 23°. Waiting for the device; not yet confirmed. It last reported 20°.",
          "outcome": "Setting 23°, waiting for the device.",
          "stage": "requested",
        },
        "unrelated differing report": {
          "adjusted": false,
          "availability": "pending",
          "description": "Change requested, not yet confirmed by the device",
          "feedback": "Requested, not yet confirmed | Requested 22°. Waiting for the device; not yet confirmed. It last reported 21.5°.",
          "outcome": "Setting 22°, waiting for the device.",
          "stage": "requested",
        },
      }
    `);
  });

  it("an adjusted confirmation names the device's value and is not confused with a report that differs", () => {
    const adjusted = w("adjusted confirmation");
    const report = w("unrelated differing report");
    expect(adjusted.stage).toBe("confirmed");
    expect(adjusted.adjusted).toBe(true);
    // The value spoken is what the device holds, never the 22 that was asked for.
    expect(adjusted.outcome).toBe("21.5°.");
    expect(adjusted.feedback).toMatch(/reports 21\.5°/);
    expect(adjusted.feedback).not.toMatch(/22/);
    // A report that differs is not a confirmation: the request is still open and says so.
    expect(report.stage).toBe("requested");
    expect(report.adjusted).toBe(false);
    expect(report.description).toMatch(/not yet confirmed/);
    expect(report.feedback).toMatch(/not yet confirmed/);
  });

  it("a timeout after a differing report says the change may still apply and names what was last reported", () => {
    const t = w("post-report timeout");
    expect(t.stage).toBe("timed-out");
    expect(t.adjusted).toBe(false);
    expect(t.outcome).toMatch(/may still apply\. It last reported 21\.5°/);
    expect(t.outcome).not.toMatch(/could not|did not answer|fail/i);
    expect(t.description).not.toMatch(/fail/i);
  });

  it("a link lost during an acknowledged request names the link, not progress or failure", () => {
    const l = w("link lost during an open request");
    expect(l.availability).toBe("offline");
    expect(l.description).toMatch(/^Device offline\. The requested change is not confirmed/);
    expect(l.description).not.toMatch(/not yet|waiting|in progress|fail/i);
  });

  it("a late report matching the request after a timeout settles it, and is not called adjusted", () => {
    const late = w("late report after timeout");
    expect(late.stage).toBe("confirmed");
    expect(late.adjusted).toBe(false);
    expect(late.outcome).toBe("22°.");
  });

  it("a skewed device clock confirms through receivedAt with the ordinary confirmed words", () => {
    const skew = w("report with device clock skew");
    expect(skew.stage).toBe("confirmed");
    expect(skew.adjusted).toBe(false);
    expect(skew.outcome).toBe("22°.");
  });

  it("a superseded command's timeout leaves the current request open and in its own words", () => {
    const s = w("timeout for a superseded command");
    expect(s.stage).toBe("requested");
    expect(s.outcome).toBe("Setting 23°, waiting for the device.");
    expect(s.feedback).not.toMatch(/timed out|may still apply/i);
  });
});
