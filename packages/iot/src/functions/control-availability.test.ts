import { describe, expect, it } from "vitest";
import { KINETIX_CONTROL_AVAILABILITIES, type KinetixControlAvailability } from "../types/control";
import { describeControlState, resolveControlState } from "./control";
import { advanceCommandLifecycle, startCommandLifecycle } from "./commands";

/**
 * M2B, audit G12: a control with no device status must not claim the device is offline.
 *
 * Reproduced on `main` f512e62 before the fix: `resolveControlState()`, `{ deviceStatus: null }`,
 * `""` and `"weird"` all resolved to availability `offline` with "Device offline. Showing the last
 * known setting", and the spelling `"unreachable"` was folded into `offline` too.
 */

const MISSING = [undefined, null, "", "   ", "weird", 42, {}] as const;

describe("G12: unknown is not offline", () => {
  it("(1) a missing or unreadable status resolves to unknown", () => {
    expect(resolveControlState().availability).toBe("unknown");
    for (const deviceStatus of MISSING) {
      expect(resolveControlState({ deviceStatus: deviceStatus as never }).availability, String(deviceStatus)).toBe("unknown");
    }
    // Unknown connectivity adds no evidence either way.
    expect(resolveControlState({ connectivity: "unknown" }).availability).toBe("unknown");
    expect(resolveControlState({ connectivity: { state: "unknown" } }).availability).toBe("unknown");
  });

  it("(2) a missing status never says offline, in the availability or in the words", () => {
    for (const deviceStatus of MISSING) {
      const state = resolveControlState({ deviceStatus: deviceStatus as never });
      expect(state.availability).not.toBe("offline");
      expect(state.description).not.toMatch(/offline/i);
      expect(state.description).toBe("Device status unknown");
      // Nothing was known before, so nothing is "last known".
      expect(state.lastKnown).toBe(false);
    }
    // A pending request to a device of unknown status is pending — the request is a fact we hold.
    const sent = advanceCommandLifecycle(startCommandLifecycle({ confirmed: "off", requested: "on" }), { type: "sent" });
    const pending = resolveControlState({ lifecycle: sent });
    expect(pending.availability).toBe("pending");
    expect(pending.description).not.toMatch(/offline/i);
  });

  it("keeps the fail-safe: an unknown control refuses input, as the old fallback did", () => {
    expect(resolveControlState().interactive).toBe(false);
    expect(resolveControlState({ connectivity: "online" })).toMatchObject({ availability: "ready", interactive: true });
  });

  it("(3) unknown stays distinct from offline, unreachable, stale, connecting and online", () => {
    const cases: [Parameters<typeof resolveControlState>[0], KinetixControlAvailability][] = [
      [{}, "unknown"],
      [{ deviceStatus: "offline" }, "offline"],
      [{ deviceStatus: "unreachable" }, "unreachable"],
      [{ deviceStatus: "stale" }, "stale"],
      [{ deviceStatus: "online" }, "ready"],
      [{ connectivity: "offline" }, "offline"],
      [{ connectivity: "unreachable" }, "unreachable"],
      [{ connectivity: "stale" }, "stale"],
      [{ connectivity: "connecting" }, "connecting"],
      [{ connectivity: "online" }, "ready"],
      // The link is the more specific claim: an "online" status with a failed attempt is unreachable.
      [{ deviceStatus: "online", connectivity: "unreachable" }, "unreachable"],
      [{ deviceStatus: "online", connectivity: "connecting" }, "connecting"],
      // Unknown connectivity does not override a status that was reported.
      [{ deviceStatus: "offline", connectivity: "unknown" }, "offline"],
      [{ deviceStatus: "online", connectivity: "unknown" }, "ready"],
    ];
    for (const [input, expected] of cases) {
      expect(resolveControlState(input).availability, JSON.stringify(input)).toBe(expected);
    }
    const words = new Set(KINETIX_CONTROL_AVAILABILITIES.map((a) => describeControlState(a)));
    expect(words.size).toBe(KINETIX_CONTROL_AVAILABILITIES.length);
    for (const availability of KINETIX_CONTROL_AVAILABILITIES) {
      if (availability !== "offline") expect(describeControlState(availability), availability).not.toMatch(/offline/i);
    }
  });

  it("marks only the link-loss states as last-known, and only stale and ready as operable", () => {
    const by = (input: Parameters<typeof resolveControlState>[0]) => resolveControlState(input);
    expect(by({ connectivity: "unreachable" })).toMatchObject({ lastKnown: true, interactive: false });
    expect(by({ connectivity: "connecting" })).toMatchObject({ lastKnown: true, interactive: false });
    expect(by({ deviceStatus: "stale" })).toMatchObject({ lastKnown: true, interactive: true });
    expect(by({ deviceStatus: "offline" })).toMatchObject({ lastKnown: true, interactive: false });
    expect(by({})).toMatchObject({ lastKnown: false, interactive: false });
    expect(by({ disabled: true, connectivity: "unreachable" }).availability).toBe("unavailable");
  });
});
