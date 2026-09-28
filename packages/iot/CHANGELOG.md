# @kinetixui/iot

## 0.1.0

### Minor Changes

- 05e15c1: New package: `@kinetixui/iot`, a connected-device module for building products that pair, monitor,
  control, and troubleshoot devices.
  
  Generic by design — the device, telemetry, command, pairing, firmware and alert models carry only
  fields that mean the same thing to a soil probe, an infusion pump, a thermostat, a delivery van
  tracker and a fitness band. Anything narrower belongs in `metadata`.
  
  Three entry points, because the useful half has nothing to do with rendering: `@kinetixui/iot` for
  everything, `@kinetixui/iot/functions` for the models and the pure functions with no React, and
  `@kinetixui/iot/react` for five primitives — `DeviceStatusBadge`, `BatteryIndicator`,
  `SignalStrength`, `LastSync` and `SensorReading`. Each renders its fact as text, so the reading
  survives greyscale, forced-colors and a screen reader; colour is only ever a second encoding of
  something already written down.
  
  The rule running through all of it is that "we do not know" survives. A device that does not report a
  battery is not a device with a flat one, an undated reading is not a fresh one, and a firmware pair
  that cannot be compared is not up to date — each one a place where a convenient default becomes a lie
  the interface tells about someone's hardware.
  
  **Experimental**: the API may change without a major version. It is a separate module rather than part
  of `@kinetixui/ui`, it is not counted in the 98-component core surface, and it has no SwiftUI, Compose
  or Flutter port.
  
  No transport. There is no MQTT, BLE, WebSocket or HTTP client, no vendor adapter, and no code that
  parses or executes a device payload. It also has no runtime dependencies at all, including no
  `@kinetixui/tokens` or `@kinetixui/ui` — the token contract is spent as Tailwind class names and
  documented as a prerequisite rather than declared as a peer.
