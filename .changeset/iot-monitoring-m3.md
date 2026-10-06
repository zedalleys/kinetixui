---
"@kinetixui/iot": minor
---

Add monitoring and feedback primitives (M3): `DeviceBattery`, `DeviceConnection`, `CommandFeedback` and `DeviceActivity`, a shared data-freshness contract, and generic readings in `TelemetryMetric` and `EnergySummary`.

- **Freshness.** `resolveFreshness({ observedAt, staleAfterMs, now, freshness })` → `fresh` / `stale` / `unknown` (`KinetixFreshness`). No default timeout: without a policy, or without a timestamp, freshness is `unknown`. Independent of connectivity.
- **`DeviceBattery`.** Level, charging (`true` / `false` / `null` = the device cannot tell), freshness, product `thresholds` and capability `support`. Unknown is never 0 %, 100 % never implies charging, stale never says offline, `unsupported` says "No battery". One accessible sentence (`describeDeviceBattery`). `classifyBatteryLevel` and `resolveBatteryState` take optional thresholds (`KinetixBatteryThresholds`, `resolveBatteryThresholds`); defaults unchanged.
- **`DeviceConnection`.** The six `KinetixConnectivityState`s as six shapes and words, last seen where meaningful, product transport text, optional signal; no animation. `describeDeviceConnection`, `normalizeConnectivityState` (missing → `unknown`), `connectionShowsLastSeen`.
- **`CommandFeedback`.** An inline line or small panel over an existing `KinetixCommandLifecycle`: acknowledged is not confirmed, a timeout "may still apply", unreachable is not "failed", cancelled claims no rollback; Retry only when allowed; one polite status region only with `announce`. `describeCommandFeedback` (`KinetixCommandFeedback`, `KinetixCommandFeedbackTone`).
- **`DeviceActivity`.** One device's history with a required `order` and an explicit origin. `KinetixActivityEvent` gains optional `origin` (`KinetixActivityOrigin`: user, device, automation, system, unknown; `KINETIX_ACTIVITY_ORIGINS`) and `commandId`; `resolveActivityOrigin` never infers a missing origin; `describeActivityOrigin`.
- **`TelemetryMetric`.** `metric` is now optional; new `formatValue`, `unitLabel`, `previous` / `previousLabel` (a delta only with a real comparison, `resolveReadingDelta`), `range` (printed, never judged), `severity`, `statusLabel`, `freshness`, `support` and `unavailable`. Screen readers get one phrase (`describeTelemetryReading`, `describeReadingAge`). **Visible change:** a reading with no value and no `quality` now says "Unknown" (`data-value-state="unknown"`) instead of "Unavailable"; `quality` `missing`/`error` still says "Unavailable". `data-reading-state` is unchanged.
- **`EnergySummary`.** `summary` is now optional. Without it, the metrics form composes `TelemetryMetric`s — `power`, `energy`, `cost`, `metrics` over a product-named `period` (`EnergyReading`) — assuming no unit, currency or period. The breakdown form is unchanged.

No capability kind or role was added. Migration: none required. Code that looked for the word "Unavailable" on an empty `TelemetryMetric` should read `data-value-state` instead.
