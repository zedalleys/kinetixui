import { describe, expect, it } from "vitest";
import {
  activeAlerts,
  buildDeviceCommand,
  classifyBatteryLevel,
  classifySignalStrength,
  classifyTelemetryQuality,
  compareFirmwareVersions,
  describeBattery,
  describeDeviceStatus,
  describeLastSeen,
  detectStaleReading,
  formatLastSeen,
  formatTelemetryValue,
  getPairingProgress,
  highestAlertSeverity,
  isCommandInFlight,
  isCommandSettled,
  isCommandUnsuccessful,
  isFirmwareOutdated,
  isKnownDeviceStatus,
  latestPoint,
  millisecondsSince,
  needsAttention,
  normalizeDeviceStatus,
  normalizeFirmwareVersion,
  normalizePairingCode,
  parseTimestamp,
  resolveFirmwareStatus,
  signalBars,
  validatePairingCode,
  KINETIX_DEVICE_STATUSES,
  type KinetixDeviceAlert,
} from "./index";

/**
 * The module's pure half.
 *
 * Every function here is deterministic, and every time-dependent one takes an injected `now`, so
 * nothing in this file reads the clock. The cases that matter are the ones a device payload actually
 * produces: nulls, `NaN`, negative percentages, values past 100, future timestamps, invalid dates and
 * status strings nobody documented.
 *
 * The recurring assertion is that "we do not know" survives. A missing battery is not a flat one, a
 * missing signal is not zero, an undated reading is not fresh, and an ungradeable firmware pair is not
 * up to date — each of those is a place where a convenient default would quietly become a lie the UI
 * tells about someone's hardware.
 */

const NOW = "2026-09-27T12:00:00.000Z";
const at = (offsetMs: number) => new Date(Date.parse(NOW) + offsetMs).toISOString();

describe("normalizeDeviceStatus", () => {
  it("returns every known status unchanged", () => {
    for (const status of KINETIX_DEVICE_STATUSES) {
      expect(normalizeDeviceStatus(status)).toBe(status);
    }
  });

  it("maps the documented aliases", () => {
    expect(normalizeDeviceStatus("connected")).toBe("online");
    expect(normalizeDeviceStatus("disconnected")).toBe("offline");
    expect(normalizeDeviceStatus("lost")).toBe("stale");
    expect(normalizeDeviceStatus("ota")).toBe("updating");
    expect(normalizeDeviceStatus("provisioning")).toBe("pairing");
    expect(normalizeDeviceStatus("degraded")).toBe("warning");
  });

  it("is case- and separator-insensitive", () => {
    expect(normalizeDeviceStatus("ONLINE")).toBe("online");
    expect(normalizeDeviceStatus("  Connected  ")).toBe("online");
    expect(normalizeDeviceStatus("FIRMWARE_UPDATE")).toBe("updating");
    expect(normalizeDeviceStatus("firmware update")).toBe("updating");
  });

  it("falls back to offline for anything it cannot recognise", () => {
    for (const input of [null, undefined, "", "   ", "wat", 7, {}, [], true, NaN]) {
      expect(normalizeDeviceStatus(input), `${JSON.stringify(input)} should fall back`).toBe("offline");
    }
  });

  /** The information the fallback throws away has to remain reachable, or it is a silent lie. */
  it("keeps whether the input was recognised at all", () => {
    expect(isKnownDeviceStatus("online")).toBe(true);
    expect(isKnownDeviceStatus("CONNECTED")).toBe(true);
    expect(isKnownDeviceStatus("offline")).toBe(true);
    expect(isKnownDeviceStatus("wat")).toBe(false);
    expect(isKnownDeviceStatus(null)).toBe(false);
    expect(isKnownDeviceStatus("")).toBe(false);
  });

  it("gives every status human-readable text, and never an enum value", () => {
    for (const status of KINETIX_DEVICE_STATUSES) {
      const text = describeDeviceStatus(status);
      expect(text.length).toBeGreaterThan(0);
      expect(text[0]).toBe(text[0]?.toUpperCase());
    }
    expect(describeDeviceStatus("stale")).toBe("Data is stale");
    expect(describeDeviceStatus("warning")).toBe("Needs attention");
  });

  it("flags the statuses that need a human", () => {
    expect(needsAttention("error")).toBe(true);
    expect(needsAttention("offline")).toBe(true);
    expect(needsAttention("stale")).toBe(true);
    expect(needsAttention("online")).toBe(false);
    expect(needsAttention("syncing")).toBe(false);
    expect(needsAttention("disabled")).toBe(false);
  });
});

describe("classifyBatteryLevel", () => {
  it("bands the documented ranges", () => {
    expect(classifyBatteryLevel(0)).toBe("critical");
    expect(classifyBatteryLevel(10)).toBe("critical");
    expect(classifyBatteryLevel(11)).toBe("low");
    expect(classifyBatteryLevel(25)).toBe("low");
    expect(classifyBatteryLevel(26)).toBe("medium");
    expect(classifyBatteryLevel(60)).toBe("medium");
    expect(classifyBatteryLevel(61)).toBe("high");
    expect(classifyBatteryLevel(94)).toBe("high");
    expect(classifyBatteryLevel(95)).toBe("full");
    expect(classifyBatteryLevel(100)).toBe("full");
  });

  /**
   * Fractional percentages are common, and the integer table alone leaves 10.4 undefined. Each band
   * is closed at its upper bound, so a fraction lands in the gentler one — except `full`, which opens
   * at exactly 95 so that 94.9 cannot read as fully charged.
   */
  it("bands fractional values without a gap", () => {
    expect(classifyBatteryLevel(9.9)).toBe("critical");
    expect(classifyBatteryLevel(10.4)).toBe("low");
    expect(classifyBatteryLevel(25.5)).toBe("medium");
    expect(classifyBatteryLevel(60.5)).toBe("high");
    expect(classifyBatteryLevel(94.9)).toBe("high");
    expect(classifyBatteryLevel(95.01)).toBe("full");
  });

  it("clamps impossible percentages instead of banding them oddly", () => {
    expect(classifyBatteryLevel(-5)).toBe("critical");
    expect(classifyBatteryLevel(105)).toBe("full");
    expect(classifyBatteryLevel(1e9)).toBe("full");
  });

  it("reports a missing battery as unknown, not as critical", () => {
    for (const input of [null, undefined, NaN, Infinity, -Infinity]) {
      expect(classifyBatteryLevel(input as number), `${String(input)} is unknown`).toBe("unknown");
    }
    expect(describeBattery(null)).toBe("Battery level unknown");
  });

  it("builds the accessible label from the value and the band", () => {
    expect(describeBattery(72)).toBe("Battery 72%, high");
    expect(describeBattery(4)).toBe("Battery 4%, critical");
    expect(describeBattery(99.94)).toBe("Battery 99.9%, full");
    expect(describeBattery(140)).toBe("Battery 100%, full");
  });
});

describe("classifySignalStrength", () => {
  it("bands the documented ranges", () => {
    expect(classifySignalStrength(0)).toBe("none");
    expect(classifySignalStrength(1)).toBe("weak");
    expect(classifySignalStrength(25)).toBe("weak");
    expect(classifySignalStrength(26)).toBe("fair");
    expect(classifySignalStrength(50)).toBe("fair");
    expect(classifySignalStrength(51)).toBe("good");
    expect(classifySignalStrength(80)).toBe("good");
    expect(classifySignalStrength(81)).toBe("excellent");
    expect(classifySignalStrength(100)).toBe("excellent");
  });

  /** "Not reported" and "reported as zero" are different facts about a device. */
  it("separates unknown from none", () => {
    expect(classifySignalStrength(null)).toBe("unknown");
    expect(classifySignalStrength(undefined)).toBe("unknown");
    expect(classifySignalStrength(NaN)).toBe("unknown");
    expect(classifySignalStrength(0)).toBe("none");
  });

  it("clamps out-of-range values", () => {
    expect(classifySignalStrength(-30)).toBe("none");
    expect(classifySignalStrength(250)).toBe("excellent");
  });

  it("fills bars in proportion, and never fills a reported signal with zero bars", () => {
    expect(signalBars(null)).toBe(0);
    expect(signalBars(0)).toBe(0);
    expect(signalBars(10)).toBe(1);
    expect(signalBars(40)).toBe(2);
    expect(signalBars(70)).toBe(3);
    expect(signalBars(95)).toBe(4);
    expect(signalBars(95, 5)).toBe(5);
    // A weak signal on a 2-bar meter still lights one: rounding to zero would render as "no signal".
    expect(signalBars(10, 2)).toBe(1);
  });

  /**
   * A fill count has to be renderable. `bars` is a public parameter with a default, so a caller
   * deriving it from a layout can hand over `0`, a fraction or a negative, and the answer must stay
   * an integer inside the meter — a meter with no segments cannot have one of them lit.
   */
  it("never reports more filled bars than the meter has", () => {
    for (const bars of [0, -4, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      for (const value of [null, 0, 10, 40, 70, 95]) {
        const filled = signalBars(value, bars);
        expect(Number.isInteger(filled), `signalBars(${String(value)}, ${String(bars)}) = ${filled}`).toBe(true);
        expect(filled).toBe(0);
      }
    }
  });

  it("floors a fractional meter and stays inside it", () => {
    // 2.5 bars is 2 bars: the half is not a segment anything can fill.
    expect(signalBars(95, 2.5)).toBe(2);
    expect(signalBars(70, 2.5)).toBe(2);
    expect(signalBars(10, 2.5)).toBe(1);
    for (const bars of [1, 2, 3, 4, 5, 7, 10]) {
      for (const value of [0, 1, 25, 26, 50, 51, 80, 81, 100]) {
        const filled = signalBars(value, bars);
        expect(filled).toBeGreaterThanOrEqual(0);
        expect(filled).toBeLessThanOrEqual(bars);
        expect(Number.isInteger(filled)).toBe(true);
      }
    }
  });

  it("lights exactly one bar on a single-bar meter for any reported signal", () => {
    expect(signalBars(1, 1)).toBe(1);
    expect(signalBars(100, 1)).toBe(1);
    expect(signalBars(0, 1)).toBe(0);
    expect(signalBars(null, 1)).toBe(0);
  });
});

describe("formatLastSeen", () => {
  it("formats the ladder with an injected now", () => {
    expect(formatLastSeen(at(0), { now: NOW })).toBe("Just now");
    expect(formatLastSeen(at(-30_000), { now: NOW })).toBe("Just now");
    expect(formatLastSeen(at(-5 * 60_000), { now: NOW })).toBe("5m ago");
    expect(formatLastSeen(at(-2 * 3_600_000), { now: NOW })).toBe("2h ago");
    expect(formatLastSeen(at(-3 * 86_400_000), { now: NOW })).toBe("3d ago");
  });

  it("says Never when there is no usable timestamp", () => {
    for (const input of [null, undefined, "", "   ", "not a date", NaN, new Date("nope")]) {
      expect(formatLastSeen(input as string, { now: NOW }), `${String(input)} is Never`).toBe("Never");
    }
    expect(formatLastSeen(null, { now: NOW, neverLabel: "No data" })).toBe("No data");
  });

  /** Device clocks run fast. "in 3 minutes" is never the useful reading of small skew. */
  it("treats a future timestamp as just now", () => {
    expect(formatLastSeen(at(60_000), { now: NOW })).toBe("Just now");
    expect(millisecondsSince(at(60_000), NOW)).toBe(0);
  });

  it("expands the shorthand for the accessible label", () => {
    expect(describeLastSeen(at(0), { now: NOW })).toBe("Last seen just now");
    expect(describeLastSeen(at(-60_000), { now: NOW })).toBe("Last seen 1 minute ago");
    expect(describeLastSeen(at(-5 * 60_000), { now: NOW })).toBe("Last seen 5 minutes ago");
    expect(describeLastSeen(at(-3_600_000), { now: NOW })).toBe("Last seen 1 hour ago");
    expect(describeLastSeen(at(-86_400_000), { now: NOW })).toBe("Last seen 1 day ago");
    expect(describeLastSeen(null, { now: NOW })).toBe("Never seen");
  });

  it("accepts a Date, an ISO string and epoch milliseconds alike", () => {
    const ms = Date.parse(NOW) - 5 * 60_000;
    expect(formatLastSeen(new Date(ms), { now: NOW })).toBe("5m ago");
    expect(formatLastSeen(new Date(ms).toISOString(), { now: NOW })).toBe("5m ago");
    expect(formatLastSeen(ms, { now: NOW })).toBe("5m ago");
  });

  /** Documented limitation, asserted so it is a decision rather than a surprise. */
  it("does not grow a month or year tier", () => {
    expect(formatLastSeen(at(-400 * 86_400_000), { now: NOW })).toBe("400d ago");
  });
});

describe("parseTimestamp", () => {
  it("returns null for everything that is not a usable instant", () => {
    for (const input of [null, undefined, "", "  ", "nope", new Date("nope"), NaN, Infinity]) {
      expect(parseTimestamp(input as string), `${String(input)} is not an instant`).toBeNull();
    }
  });

  it("accepts Dates, ISO strings and epoch milliseconds", () => {
    expect(parseTimestamp(NOW)?.toISOString()).toBe(NOW);
    expect(parseTimestamp(new Date(NOW))?.toISOString()).toBe(NOW);
    expect(parseTimestamp(Date.parse(NOW))?.toISOString()).toBe(NOW);
  });
});

describe("detectStaleReading", () => {
  it("compares against the threshold with an injected now", () => {
    expect(detectStaleReading(at(-1_000), 60_000, NOW)).toBe(false);
    expect(detectStaleReading(at(-61_000), 60_000, NOW)).toBe(true);
    // Exactly at the threshold is not yet past it.
    expect(detectStaleReading(at(-60_000), 60_000, NOW)).toBe(false);
  });

  /** Freshness is a claim; an absent timestamp is not evidence for it. */
  it("treats an unusable timestamp as stale", () => {
    expect(detectStaleReading(null, 60_000, NOW)).toBe(true);
    expect(detectStaleReading("not a date", 60_000, NOW)).toBe(true);
    expect(detectStaleReading(new Date("nope"), 60_000, NOW)).toBe(true);
  });

  it("treats a nonsensical threshold as stale rather than as never-stale", () => {
    expect(detectStaleReading(at(0), 0, NOW)).toBe(true);
    expect(detectStaleReading(at(0), -5, NOW)).toBe(true);
    expect(detectStaleReading(at(0), NaN, NOW)).toBe(true);
    expect(detectStaleReading(at(0), Infinity, NOW)).toBe(true);
  });
});

describe("firmware versions", () => {
  it("normalises what device firmware strings actually look like", () => {
    expect(normalizeFirmwareVersion("1.4.0")).toBe("1.4.0");
    expect(normalizeFirmwareVersion("v1.4.0")).toBe("1.4.0");
    expect(normalizeFirmwareVersion("  V2.0  ")).toBe("2.0");
    expect(normalizeFirmwareVersion("1.4.0-rc.2")).toBe("1.4.0-rc.2");
    expect(normalizeFirmwareVersion("2.1.3.7")).toBe("2.1.3.7");
  });

  it("returns null when there is no numeric core to compare", () => {
    for (const input of [null, undefined, "", "   ", "R3.2", "unknown", 140, {}]) {
      expect(normalizeFirmwareVersion(input), `${JSON.stringify(input)} has no numeric core`).toBeNull();
    }
  });

  it("compares numerically, not lexically", () => {
    expect(compareFirmwareVersions("1.9.9", "1.10.0")).toBe(-1);
    expect(compareFirmwareVersions("1.10.0", "1.9.9")).toBe(1);
    expect(compareFirmwareVersions("2.0.0", "2.0.0")).toBe(0);
    expect(compareFirmwareVersions("v1.2", "1.2.0")).toBe(0);
    expect(compareFirmwareVersions("1.2", "1.2.1")).toBe(-1);
    expect(compareFirmwareVersions("2.1.3.7", "2.1.3.8")).toBe(-1);
  });

  /** null, never 0: a caller that cannot tell "equal" from "unknown" reports gibberish as current. */
  it("returns null rather than guessing when either side is unparseable", () => {
    expect(compareFirmwareVersions("R3.2", "1.0.0")).toBeNull();
    expect(compareFirmwareVersions("1.0.0", null)).toBeNull();
    expect(compareFirmwareVersions(undefined, undefined)).toBeNull();
    expect(isFirmwareOutdated("R3.2", "1.0.0")).toBe(false);
  });

  /** The documented limitation: prerelease tags take no part in ordering. */
  it("does not order prereleases, and says so", () => {
    expect(compareFirmwareVersions("1.4.0-rc.2", "1.4.0")).toBe(0);
    expect(compareFirmwareVersions("2.0.0+build7", "2.0.0")).toBe(0);
  });

  it("derives a status, and never derives the two a product owns", () => {
    expect(resolveFirmwareStatus({ currentVersion: "1.0.0", availableVersion: "1.1.0", status: "unknown" })).toBe(
      "update-available",
    );
    expect(resolveFirmwareStatus({ currentVersion: "1.1.0", availableVersion: "1.1.0", status: "unknown" })).toBe("up-to-date");
    expect(resolveFirmwareStatus({ currentVersion: "1.2.0", availableVersion: "1.1.0", status: "unknown" })).toBe("up-to-date");
    expect(resolveFirmwareStatus({ status: "unknown" })).toBe("unknown");
    expect(resolveFirmwareStatus({ currentVersion: "R3", availableVersion: "1.0.0", status: "up-to-date" })).toBe("unknown");
    // updating/failed are passed through: no version pair can tell you either of them.
    expect(resolveFirmwareStatus({ currentVersion: "1.0.0", availableVersion: "9.0.0", status: "updating" })).toBe("updating");
    expect(resolveFirmwareStatus({ currentVersion: "1.0.0", availableVersion: "9.0.0", status: "failed" })).toBe("failed");
  });
});

describe("telemetry", () => {
  it("formats a value with its unit", () => {
    expect(formatTelemetryValue({ value: 23.4, unit: "°C" })).toBe("23.4 °C");
    expect(formatTelemetryValue({ value: 72 })).toBe("72");
    expect(formatTelemetryValue({ value: 23.456, unit: "°C" }, { precision: 1 })).toBe("23.5 °C");
    expect(formatTelemetryValue({ value: 23.456 }, { precision: 0 })).toBe("23");
  });

  /**
   * `toFixed` throws a `RangeError` outside 0–100, and this formatter is called from `SensorReading`'s
   * render. An out-of-range `precision` must not be the thing that takes a device screen down — the
   * one function whose entire purpose is refusing to print a misleading number should not be able to
   * throw instead of printing.
   */
  it("clamps precision rather than throwing", () => {
    for (const precision of [101, 500, Number.POSITIVE_INFINITY, -1, -50, Number.NEGATIVE_INFINITY]) {
      expect(() => formatTelemetryValue({ value: 23.456, unit: "°C" }, { precision }), `precision ${String(precision)}`).not.toThrow();
    }
    // Clamped to the ends of the legal range, not silently dropped.
    expect(formatTelemetryValue({ value: 23.456 }, { precision: -1 })).toBe("23");
    expect(formatTelemetryValue({ value: 23.456 }, { precision: 101 })).toBe(
      formatTelemetryValue({ value: 23.456 }, { precision: 100 }),
    );
    // A fractional precision truncates toward zero.
    expect(formatTelemetryValue({ value: 23.456 }, { precision: 1.9 })).toBe("23.5");
  });

  /** A non-finite precision is not a precision, so the value prints as given rather than as an integer. */
  it("treats a non-finite precision as absent", () => {
    expect(formatTelemetryValue({ value: 23.456 }, { precision: Number.NaN })).toBe("23.456");
    expect(formatTelemetryValue({ value: 23.456 })).toBe("23.456");
  });

  /** The bug this module exists for: a missing reading rendered as a confident number. */
  it("never renders a missing or errored reading as a number", () => {
    expect(formatTelemetryValue({ value: 0, quality: "missing" })).toBe("Unknown");
    expect(formatTelemetryValue({ value: 21, quality: "error" })).toBe("Unknown");
    expect(formatTelemetryValue({ value: NaN })).toBe("Unknown");
    expect(formatTelemetryValue({ value: Infinity })).toBe("Unknown");
    expect(formatTelemetryValue(null)).toBe("Unknown");
    expect(formatTelemetryValue(undefined)).toBe("Unknown");
    expect(formatTelemetryValue({ value: NaN }, { unknownLabel: "—" })).toBe("—");
    // An estimated reading is still a reading.
    expect(formatTelemetryValue({ value: 21, unit: "%", quality: "estimated" })).toBe("21 %");
  });

  it("does not give a NaN the benefit of the doubt", () => {
    expect(classifyTelemetryQuality({ value: 21 })).toBe("good");
    expect(classifyTelemetryQuality({ value: NaN })).toBe("missing");
    expect(classifyTelemetryQuality({ value: 21, quality: "estimated" })).toBe("estimated");
    expect(classifyTelemetryQuality({ value: 0, quality: "error" })).toBe("error");
    expect(classifyTelemetryQuality(null)).toBe("missing");
  });

  it("finds the newest point without assuming the series is sorted", () => {
    const series = {
      deviceId: "d1",
      metric: "temperature",
      points: [
        { timestamp: at(-3_600_000), metric: "temperature", value: 19 },
        { timestamp: at(-60_000), metric: "temperature", value: 21 },
        { timestamp: at(-7_200_000), metric: "temperature", value: 18 },
      ],
    };
    expect(latestPoint(series)?.value).toBe(21);
    expect(latestPoint({ deviceId: "d1", metric: "t", points: [] })).toBeNull();
    expect(latestPoint(null)).toBeNull();
  });

  /** An undated reading must not become the oldest thing in every series. */
  it("skips points with no usable timestamp rather than sorting them to epoch zero", () => {
    const series = {
      deviceId: "d1",
      metric: "temperature",
      points: [
        { timestamp: "nope", metric: "temperature", value: 99 },
        { timestamp: at(-60_000), metric: "temperature", value: 21 },
      ],
    };
    expect(latestPoint(series)?.value).toBe(21);
    expect(latestPoint({ deviceId: "d1", metric: "t", points: [{ timestamp: "nope", metric: "t", value: 5 }] })).toBeNull();
  });
});

describe("commands", () => {
  it("builds a queued command deterministically when given a time", () => {
    const command = buildDeviceCommand({ id: "c1", deviceId: "d1", name: "reboot", createdAt: NOW });
    expect(command).toEqual({ id: "c1", deviceId: "d1", name: "reboot", status: "queued", createdAt: NOW });
    expect(buildDeviceCommand({ id: "c1", deviceId: "d1", name: "reboot", createdAt: new Date(NOW) })).toEqual(command);
  });

  it("carries a payload verbatim and omits it when absent", () => {
    const payload = { target: 21.5, nested: { raw: "AAEC" } };
    expect(buildDeviceCommand({ id: "c1", deviceId: "d1", name: "set", payload, createdAt: NOW }).payload).toBe(payload);
    expect("payload" in buildDeviceCommand({ id: "c1", deviceId: "d1", name: "set", createdAt: NOW })).toBe(false);
  });

  it("separates settled, in-flight and unsuccessful", () => {
    expect(isCommandSettled("completed")).toBe(true);
    expect(isCommandSettled("expired")).toBe(true);
    expect(isCommandSettled("sent")).toBe(false);
    expect(isCommandInFlight("queued")).toBe(true);
    expect(isCommandInFlight("acknowledged")).toBe(true);
    expect(isCommandInFlight("completed")).toBe(false);
    expect(isCommandUnsuccessful("failed")).toBe(true);
    expect(isCommandUnsuccessful("expired")).toBe(true);
    // Somebody chose to cancel. Showing that as a failure makes users think the device broke.
    expect(isCommandUnsuccessful("cancelled")).toBe(false);
    expect(isCommandUnsuccessful("completed")).toBe(false);
  });
});

describe("pairing", () => {
  const steps = [
    { id: "scan", label: "Scan", status: "complete" as const },
    { id: "connect", label: "Connect", status: "active" as const },
    { id: "verify", label: "Verify", status: "pending" as const },
  ];

  it("reports progress and the active step", () => {
    const progress = getPairingProgress(steps);
    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(3);
    expect(progress.ratio).toBeCloseTo(1 / 3);
    expect(progress.activeStep?.id).toBe("connect");
    expect(progress.hasError).toBe(false);
  });

  /** A progress bar renders before the steps are known; `NaN%` is the wrong thing to show then. */
  it("gives an empty sequence a ratio of zero, not NaN", () => {
    for (const input of [[], null, undefined]) {
      const progress = getPairingProgress(input);
      expect(progress.ratio).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.activeStep).toBeNull();
    }
  });

  it("surfaces an errored step", () => {
    expect(getPairingProgress([{ id: "a", label: "A", status: "error" }]).hasError).toBe(true);
  });

  it("normalises the separators people type", () => {
    expect(normalizePairingCode("a1b-2c3")).toBe("A1B2C3");
    expect(normalizePairingCode(" 12 34 56 ")).toBe("123456");
    expect(normalizePairingCode(null)).toBe("");
  });

  it("validates shape only", () => {
    expect(validatePairingCode("A1B2C3")).toBe(true);
    expect(validatePairingCode("a1b-2c3")).toBe(true);
    expect(validatePairingCode("12345")).toBe(false);
    expect(validatePairingCode("1234567")).toBe(false);
    expect(validatePairingCode("")).toBe(false);
    expect(validatePairingCode(null)).toBe(false);
    expect(validatePairingCode("ABC!23")).toBe(false);
    expect(validatePairingCode("1234", { length: 4 })).toBe(true);
    expect(validatePairingCode("A1B2", { length: 4, digitsOnly: true })).toBe(false);
    expect(validatePairingCode("1234", { length: 4, digitsOnly: true })).toBe(true);
    expect(validatePairingCode("123456", { length: 0 })).toBe(false);
  });
});

describe("alerts", () => {
  const alert = (over: Partial<KinetixDeviceAlert>): KinetixDeviceAlert => ({
    id: "a",
    deviceId: "d1",
    severity: "info",
    message: "Something happened",
    raisedAt: at(-60_000),
    ...over,
  });

  it("returns the loudest severity", () => {
    expect(highestAlertSeverity([alert({ severity: "info" }), alert({ severity: "critical" }), alert({ severity: "warning" })])).toBe(
      "critical",
    );
    expect(highestAlertSeverity([alert({ severity: "info" }), alert({ severity: "warning" })])).toBe("warning");
  });

  /** "No alerts" and "an informational alert" are different states. */
  it("returns null for nothing to report", () => {
    expect(highestAlertSeverity([])).toBeNull();
    expect(highestAlertSeverity(null)).toBeNull();
    expect(highestAlertSeverity(undefined)).toBeNull();
  });

  it("ignores acknowledged alerts unless asked", () => {
    const alerts = [alert({ severity: "critical", acknowledgedAt: at(-30_000) }), alert({ severity: "info" })];
    expect(highestAlertSeverity(alerts)).toBe("info");
    expect(highestAlertSeverity(alerts, { includeAcknowledged: true })).toBe("critical");
  });

  it("does not promote an unrecognised severity to critical", () => {
    expect(highestAlertSeverity([alert({ severity: "catastrophic" as never })])).toBeNull();
    expect(highestAlertSeverity([alert({ severity: "catastrophic" as never }), alert({ severity: "info" })])).toBe("info");
  });

  it("sorts newest first and puts undated alerts last", () => {
    const list = activeAlerts([
      alert({ id: "old", raisedAt: at(-3_600_000) }),
      alert({ id: "undated", raisedAt: "nope" }),
      alert({ id: "new", raisedAt: at(-1_000) }),
    ]);
    expect(list.map((a) => a.id)).toEqual(["new", "old", "undated"]);
  });
});
