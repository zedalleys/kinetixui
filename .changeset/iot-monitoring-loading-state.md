---
"@kinetixui/iot": minor
---

IoT monitoring surfaces can say a reading has not arrived yet, instead of saying the device reported nothing.

`@kinetixui/iot` was careful about every other kind of absence — `stale` is a real value that is old, `unknown` is nothing reported, `unavailable` is a source that cannot answer, `unsupported` is a device that does not measure this, and none of them is ever drawn as `0`. The one case it had no word for was the first one a product meets: a surface that has asked and is waiting. With nothing to show, such a tile could only render "Unknown" — which tells a person the device answered with nothing, and sends them to inspect hardware that is fine.

**New state.** `KinetixReadingState` gains `"loading"`, with its own word ("Loading") and its own glyph (`circle-dot`, the ringed dot this package already uses for "requested, not yet answered"), so it survives greyscale, forced colours and a screen reader like the other five. `KINETIX_READING_STATES` gains it **last**, outside the attention-first ordering of the other five, because a pending reading is not a verdict about a value; a reducer comparing positions therefore ranks it below every real state rather than above an alarm.

**New props.** `loading?: boolean` on `TelemetryMetric`, `SensorReading`, `DeviceBattery` and `SignalStrength`, and `announce?: boolean` on `TelemetryMetric`. `evaluateReading` takes `loading`, `describeTelemetryReading` takes `availability: "loading"`, `describeDeviceBattery` takes `loading`, and `describeSignal` takes an options argument.

Three rules the implementation holds to:

- **`loading` is only ever an explicit claim.** It is never inferred from an absent value, because an absent value cannot tell "not asked yet" from "asked, nothing back". Only the code doing the asking knows.
- **A value already on screen is never blanked.** With a usable reading in hand `loading` is a *refresh*: the number, its status and its age stay exactly as they are and only `aria-busy` is set. Destroying a real measurement in order to describe a request is a worse answer than showing it. A measured `0`, and a reported `0%` signal, survive an open request unchanged.
- **`support="unsupported"` wins.** A device that does not measure something is not waiting for it.

**Accessibility.** `aria-busy` on the container for both shapes of waiting, which tells assistive technology content is in flux without interrupting anyone. The spoken sentence changes from "Line pressure loading, no reading yet" to the value as it lands and never contains a number while pending. `announce` makes that sentence a polite live region for the one tile somebody is waiting on — opt-in, because a dashboard of thirty announcing tiles is a dashboard nobody can use. The placeholder is `aria-hidden`: the words carry the fact.

The placeholder is sized in `ch` and `em` so the slot scales with the type rather than being pinned in pixels, keeps a `currentColor` border under forced colours where its background is dropped, and pairs its pulse with `motion-reduce:animate-none` so what remains without animation is a visible bar rather than an empty slot.

**Compatibility.** Additive: every new prop defaults to off and every existing rendering is unchanged. What a consumer may notice: `KinetixReadingState` has a sixth member, so an exhaustive `switch` over it in TypeScript now wants a `loading` case, and `KINETIX_READING_STATES` has a sixth entry.
