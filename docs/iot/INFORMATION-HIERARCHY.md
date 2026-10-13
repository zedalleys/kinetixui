# IoT information hierarchy (M5A / M5B)

How the /iot environments decide what is said at a glance, what is one press away, and what is the record.
It is presentation only: the device interaction contract ([DEVICE-INTERACTION-CONTRACT.md](./DEVICE-INTERACTION-CONTRACT.md))
and the command lifecycle state machine are unchanged.

**The truth rule this preserves:** a requested value is not the device's state until the device reports it.
Every level below draws the requested value only as the object of "Changing to …", never as the confirmed value.

## Three levels

| Level | What it carries | Where it lives |
|---|---|---|
| 1. Glance | The primary (confirmed) value, a critical exception, a connection exception, the current pending action | Always visible |
| 2. Context | Requested vs reported, battery, connectivity, mode, last update, secondary telemetry | A closed "Details" / "Device details" disclosure; a low or critical battery stays inline |
| 3. Record | Request lifecycle, acknowledgement, attempts, timing, stale reports, history, diagnostics | A closed "Request details" disclosure, and the closed Activity / Shift log / Device health panels |

Nothing was removed. Every value that was visible before is still reachable by keyboard and screen reader as an
ordinary native `<details>`.

## Pending presentation

`apps/web/src/components/iot/showcase/pending-command.tsx` (showcase code) maps the lifecycle stage to one line,
and `apps/web/src/examples/iot/command-card.tsx` gives every command card on /iot (lock, valve, thermostat,
light, plug, pump, line) the same reserved row:

| Stage | The reserved row shows |
|---|---|
| idle / settled | the next action (the lock's "Unlock" or "Lock", the valve's "Open valve"); on a card whose controls are the action (dial, slider, switch) the row is empty but keeps its height |
| requested, retrying | "Changing to **X**" and Cancel (named "Cancel the *device* request") |
| acknowledged | "Waiting for device", with "X requested" under it, and Cancel while the device allows it |
| confirmed | "Confirmed: X" for 4 s of the simulated clock, beside the next action, then the next action alone |
| failed, timed-out, unreachable | the failure and its reason, "Still reports Y" from the sm breakpoint, Retry ("Retry *device*: X") and Dismiss |

The row is `min-h-14`, sized to the tallest single-line state, so asking does not push the card. At 100% text the
lock, thermostat and valve keep their height to the pixel through every state at 1280 and 390 (a failure at 390
may wrap to a second line). The control's own "requested, not yet confirmed" sentence is suppressed while the row
says it (`quietPending`), and the request's record ("Request details": stage, acknowledgement, attempts, times)
sits closed inside the card's closed "Details", so neither appears beside the control.

Two-state devices offer one named action from the confirmed state (`lockActions` from `@kinetixui/iot/functions`;
both when the state is unknown), never equal tiles, and the big state word reads the confirmed value only.

One polite `role="status"` line is mounted from the first render. It speaks "Changing to X. Not yet confirmed; the
device reports Y." once for both requested and acknowledged, so the acknowledgement is not announced, then the
confirmation or the failure. When the button that had focus disappears (Cancel at confirmation), focus moves to
the row's next action, never to the page.

## Camera glance

`CameraDeviceCard density="glance"` is a thumbnail beside the facts, not a large preview: name, location, privacy
and recording as words with a glyph (not colour), the camera's last event from the activity record, and a status
badge only when the camera is not online (healthy Online is sr-only). Below it: only the actions the device has.
The /iot hallway camera has no commands, so it offers "Activity" (its events) and "Device details"; it shows no
live, record, snapshot, talk, mute or pan control. Privacy is a fact, not a switch, because nothing can change it.
The sample image is `aria-hidden`; its caption ("Sample image — no live feed") says what it is.

## Severity order

`apps/web/src/components/iot/showcase/severity.ts`:

```
critical > needs attention > pending > offline / unknown > healthy
```

- Healthy is quiet: no marker badge, no tint, no "Confirmed" or "Online" word by default (online stays as sr-only text on glance cards).
- Offline is muted and dashed, never painted in the destructive colour used for a dangerous condition.
- One signal per condition: a glyph plus a word, not a tint, an icon, a badge and a sentence together.

## Spatial densities (semantic zoom)

`SpaceCanvas` derives a density from what is selected; there is no new public SpatialView API.

| Density | When | Markers | Labels |
|---|---|---|---|
| overview | nothing selected (whole home / site) | healthy markers recede; exceptions stay normal | no device names; each room gets a summary chip (attention count, device count) |
| zone | a room or line is selected | the selected room's markers stay normal, others recede | the room's device names when it has three or fewer, else only the selected one |
| device | a device is selected | the selected marker is focused (larger, ringed) | only the selected device |

A critical marker never recedes. Device names appear on hover or keyboard focus of that marker only.

Root cause of "maps show too many labels": marker labels used an unnamed Tailwind `group-hover`, which matched
the page's `<details class="group">`, so hovering anywhere over the environment revealed every name at once. The
marker now uses the named group `group/marker`.

## Card density

`DeviceCard` and `CameraDeviceCard` in `@kinetixui/iot/react` accept `density?: "full" | "glance"` (default
`"full"`, unchanged). `"glance"` keeps a low or critical battery inline and puts battery, signal and last update
behind a closed "Device details" disclosure; on a camera it also draws the compact thumbnail layout above. Changeset held in `.changeset-held/iot/`.

## Guarded by

- `pnpm check:iot-state-spatial` (part "hierarchy"): hovering the environment reveals no extra marker names;
  healthy markers carry no badge; offline badges are not destructive red; the overview names no device and has
  room summaries; a lock request shows one "Changing to" line, no visible stepper, its record closed, the lock
  word unchanged until the device confirms, and the line settles after confirmation.
- Same script (part "stability"): samples card height every animation frame through a lock, thermostat and failing
  valve request at 1280 and 390; tolerance 1px for every in-flight state, 24px (one wrapped line) for a failure at
  phone width, and no visible protocol rows or stepper.
- Unit tests: `pending-command.test.tsx`, `space-canvas.test.tsx` (semantic zoom), `card-density.test.tsx`.

## Motion Phase 2 candidates (not implemented)

Preparation only. No animation library and no continuous motion. Each candidate must respect reduced motion.

1. Requested → confirmed: the dashed "requested" tile settles to solid when the device reports.
2. Mode selection: the selected tile's check moves on confirmation, not on press.
3. Device selection: the focused marker grows and the others recede.
4. Zone selection: the room boundary strengthens while other rooms fade.
5. Contextual detail enter and exit: the Details and Request details disclosures open and close.
6. Failure transition: the pending line turns into the warning row without a jump in layout.
7. Confirmation fade-out: "Confirmed: X" fades as it settles back to nothing.
