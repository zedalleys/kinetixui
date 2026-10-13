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

`apps/web/src/components/iot/showcase/pending-command.tsx` (showcase code, three callers) maps the lifecycle
stage to one line:

| Stage | Line |
|---|---|
| idle / settled | nothing: the confirmed value is the whole story |
| requested, retrying | "Changing to **X**" (with Cancel request) |
| acknowledged | "Waiting for device · X requested" |
| confirmed | "Confirmed: X" for 4 s of the simulated clock, then nothing |
| failed, timed-out, unreachable | the failure and its reason, "Still reports Y", Retry / Dismiss, and the record one press away |

One polite `role="status"` line is mounted from the first render. The record holds no second live region.

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
behind a closed "Device details" disclosure. Changeset held in `.changeset-held/iot/`.

## Guarded by

- `pnpm check:iot-state-spatial` (part "hierarchy"): hovering the environment reveals no extra marker names;
  healthy markers carry no badge; offline badges are not destructive red; the overview names no device and has
  room summaries; a lock request shows one "Changing to" line, no visible stepper, its record closed, the lock
  word unchanged until the device confirms, and the line settles after confirmation.
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
