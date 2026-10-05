# Interactive state and spatial audit

Audited `main` at `5db94f0` on 2026-10-05. Branch `claude/state-spatial-audit-vmqn20`.
Evidence (screenshots, sweep JSON, negative-control logs): `/mnt/project-files/state-spatial-audit/` in the project
share (`baseline/`, `after/`, `negative-controls/`).

## 1. Executive verdict

Both motivating reports were real, and both came from shared code rather than from one screenshot.

- **Thermostat (`DeviceSetpointControl`, `presentation="ring"`).** The ± buttons were pinned to the ring's bottom
  corners with fixed insets, which is exactly where the arc ends. Measured in Chromium, every width put each button
  6.6–16.7 px *into* the arc's end marker. At 200% text the numeral overflowed the ring and the 88 px buttons covered
  it. Fixed in the package, so all three places the ring is used (smart-space hallway, the Live control panel, the
  Storybook story) get it.
- **Door lock.** The illustration's only input was `on: boolean`, which has no meaning for a lock, and no caller set it.
  So the whole-home tile drew the same thrown deadbolt for "Locked" and "Unlocked", and the lock panel itself had no
  drawing at all. The lock drawing now reads `locked` and draws the bolt thrown into the strike plate or withdrawn
  into the body, driven by the same confirmed value as the word, the checked radio and the tile.

The audit also found and fixed three related defects: unlit lamps that looked lit in dark mode, plan markers whose
44 px targets overlapped at 200% text (16 pairs on the operations plan at 1280 px), and Eco-mode thermostats drawn as
switched off. No P0 was found. A new browser gate, `check:iot-state-spatial`, guards all of this, and six of its
seven negative controls fail as they should (§26).

## 2. Audit coverage (exact)

| Surface | How it was exercised | Coverage |
|---|---|---|
| `/iot` reference environments (Smart space, Agritech, Operations) | Chromium, driven: clicks, state changes, scrolling | Full sweep at 1280 / 390 / 320 px and 390 / 1280 px at 200% text |
| `/iot` single examples (state honesty, telemetry, alerts, automation, pairing, device detail, 6 "more layouts") | Chromium sweep: overflow, target size, overlapping targets, controls over graphics, focus clipping | Same 5 views, default state only |
| Smart-space lock, lamp, thermostat | Driven through Locked→Unlocked→Locked and Off→On→Off, light and dark mode, reduced motion | Full state cycle |
| `/blocks`, all 20 published blocks | Chromium sweep (same five checks) | Default state only, 5 views |
| Homepage | Inspected: it has no IoT or stateful device demo (only `HeroCommand`) | n/a |
| ~100 `packages/ui` component docs pages | **Not visually audited one by one.** Components were covered only as used inside the 20 blocks and the IoT demos | Partial, see §10 |
| `/create` previews | Not in scope for device state; not swept here | None |
| Angular, SwiftUI, Compose, Flutter | No device-state demos exist there (IoT is React-only) | n/a |

What "sweep" means: for every visible interactive element, its target size (WCAG 2.5.8 floor of 24 px), whether
its rectangle intersects another control or a ≥64 px graphic, and whether its real `:focus-visible` indicator (read
from computed outline and box-shadow) is clipped by a scrolling or `overflow:hidden` ancestor. The tool is not
committed; its findings were checked by hand, and the false positives are listed in §14.

## 3. Interactive demo inventory

| Demo | State | User action | Text response | Visual response | Accessible response | Consistent? |
|---|---|---|---|---|---|---|
| Smart space · thermostat | target, mode Heat/Eco/Off | ± step, mode tile | big confirmed numeral, "Requested …" pill | ring arc + marker, dashed request | live sentence, radios `aria-checked` | Yes, but the ring stays blue in Off (P2-7, open) |
| Smart space · lock | locked/unlocked | Locked/Unlocked tile | "Locked"/"Unlocked", status line | **before:** none in panel, constant bolt on tile; **after:** bolt thrown/withdrawn | radios `aria-checked` | **Was no** (P1-1), now yes |
| Smart space · lamp | on/off, brightness | switch, brightness pill | "60%"/"Off" | light cone + bulb; **dark-mode off looked lit** | switch `aria-checked`, slider value | **Was partial** (P1-2), now yes |
| Smart space · plugs | on/off | switch | "On"/"Off" | plug LED + halo | switch | Yes |
| Smart space · camera | online, privacy off (static) | none | "Sample image — no live feed" | sample frame of a closed door | status chip, privacy chip | Yes; frame is not tied to the lock on purpose (§8) |
| Smart space · whole-home tiles | per device | select tile, power switch | tile value word | `DeviceIllustration` | tile `aria-pressed`, switch | **Lock and Eco were wrong** (P1-1, P2-4), now yes |
| Smart space · plan | per device | marker press | marker name + value + state | marker + state glyph | named buttons `aria-pressed` | Yes; targets overlapped at 200% (P2-3), fixed |
| Agritech · valve, pump | open/closed, on/off | tiles, switch | words | `on` = open / running | radios / switch | Yes (source + sweep) |
| Operations · machines | running/stopped/offline | inspector controls | words | `on` = running | switch | Yes (source + sweep) |
| Live control panel (state honesty) | room target | ± step | numeral | ring | live sentence | Yes, ring clearance shared with P2-1 |
| Hero command strip | on/off lifecycle | switch | lifecycle words | switch track | switch | Yes |
| 20 blocks | static compositions | form controls | n/a | n/a | n/a | No state contradictions (no device state) |

## 4. State-fidelity matrix

| Component/block | State | Text | Control | Icon | Illustration | Color | A11y | Verdict |
|---|---|---|---|---|---|---|---|---|
| Lock panel | Locked | PASS | PASS | PASS (lock glyph) | **was N/A (none), now PASS** | PASS | PASS | PASS (after) |
| Lock panel | Unlocked | PASS | PASS | PASS (open shackle) | **was N/A, now PASS** (bolt withdrawn) | PASS | PASS | PASS (after) |
| Lock tile (whole home) | Unlocked | PASS | n/a | n/a | **FAIL → PASS** (was a thrown bolt) | PASS | PASS | PASS (after) |
| Lock, request in flight | Locked, Unlocked requested | PASS | PASS (dashed) | PASS | PASS (keeps confirmed) | PASS | PASS (`…requested, not yet confirmed`) | PASS |
| Lamp panel | On | PASS | PASS | n/a | PASS (cone + bulb) | PASS | PASS | PASS |
| Lamp panel | Off, light mode | PASS | PASS | n/a | PASS | PASS | PASS | PASS |
| Lamp panel | Off, dark mode | PASS | PASS | n/a | **FAIL → PASS** (white shade read as lit) | PASS | PASS | PASS (after) |
| Lamp panel | Off, brightness | PASS ("Brightness: 60%") | PARTIAL (slider still filled to 60%) | n/a | PASS | PARTIAL | PASS | PARTIAL (P2-6, open) |
| Thermostat tile | Eco | PASS | n/a | n/a | **FAIL → PASS** (drawn off) | PASS | PASS | PASS (after) |
| Thermostat ring | Off mode | PASS ("Off mode") | PASS | PASS | PARTIAL (arc stays primary) | PARTIAL | PASS | PARTIAL (P2-7, open) |
| Camera card | Online, privacy off | PASS | n/a | PASS | PASS (sample, labelled) | PASS | PASS | PASS |
| Camera tile | Online | PASS | n/a | n/a | PARTIAL (lens dot always muted) | n/a | PASS | PARTIAL (P3-3) |
| Plan marker, lock | Unlocked | PASS (name + value) | PASS | PARTIAL (category glyph is a closed padlock) | n/a | PASS | PASS | PARTIAL (P3-2) |
| Battery (lock 24%) | Low | PASS ("Low") | n/a | PASS (triangle) | n/a | PASS (destructive) | PASS (`role=img` sentence) | PASS |
| Valve / pump (agritech) | open / on | PASS | PASS | n/a | PASS | PASS | PASS | PASS (source + sweep) |

## 5. Thermostat findings

**Geometry (viewBox 200, ring scaled to its width `W`):** arc radius 84, stroke 14, sweep 270° from 135°, so the two
ends sit at (40.6, 159.4) and (159.4, 159.4); the marker drawn there at the range limits has radius 9 + 2 (half its
4 px stroke) = 11. Below y = 170.4 the box is empty from edge to edge: a band 14.8% of `W` tall. The buttons
(`size-11`, 44 px, `rem`-based) were absolutely positioned `inset-x-4 bottom-1`, i.e. at fixed pixels from the corners
of a box whose drawing scales.

| View | Ring `W` | Button → end-marker gap, before | After |
|---|---|---|---|
| 1280 px | 236 | −10.9 px | +23.8 px |
| 768 / 390 px | 256 | −6.6 px | +27.7 px |
| 320 px | 208 | −16.7 px | +18.8 px |
| 390 px / 200% text | 166 | buttons cover the numeral and arc | stacked layout, no overlap |

**Root cause:** fixed-pixel insets inside a scaling, non-rectangular drawing, plus `rem`-sized content (numeral,
buttons) inside a `px`-sized ring. Tokens were not the problem; nothing related the controls to the arc's geometry.

**Fix (shared, in `packages/iot`):** the steppers moved out of the face into a row below it, pulled up into the empty
band by `calc(−14.8% + var(--spacing-2))` (a percentage margin resolves against the ring's width, so the clearance holds
at every size). The 14.8% is computed from the same constants that draw the arc. The ring is a size container: below
12rem (which scales with text) the drawing steps aside and the numeral and steppers stack. The "Now …" reading wraps
instead of truncating. The steppers keep 44 px targets and their order, so − stays at the arc's start in both
directions. The row is `relative`, so it paints above the positioned face it tucks into: without that, the face's
numeral layer took the clicks aimed at the top half of each button. The new gate caught that during this work.

**Best-use scenario (§30):** the hierarchy is right. The target is the big number, the reading sits under it, mode is
one row of tiles and battery is secondary. The cramping was geometry, not density, so nothing was removed. One gap
remains: Off mode still draws the target arc in primary (P2-7).

## 6. Door findings

- **Contradiction (P1-1):** the lock's `DeviceIllustration` took `on`, and `deviceView` never set `on` for a lock, so the
  tile drew a thrown bolt (a locked lock) for both states. The LED dot was the only variable part, and it was keyed
  to `on`.
- **Missing representation (P2-5):** the lock panel had a word, a battery pill and two tiles, but no drawing of the
  object, unlike the lamp panel next to it.
- **Model:** the scenario models only `locked`/`unlocked`. Unlocked is not open: an unlocked door is usually a closed
  door. Drawing the door swinging open would be a false device state. The chosen representation is the lock's own
  mechanism. The deadbolt is thrown across into a strike plate when locked, and withdrawn into the body with a visible
  gap when unlocked. That is shape and position, so it does not depend on colour. A lock with no reported state draws
  no bolt at all.
- **Camera frame:** the "closed door" a reader sees in the hallway is the camera card's *sample image*, labelled
  "Sample image — no live feed". It deliberately does not follow the lock: making a sample frame react to device state
  would imply live footage (§25). Explicit open/closed would need a door sensor in the model. That is recorded as
  future work, not invented here.
- **Transition:** the bolt slides with `transition-transform duration-base ease-out`, an existing motion token, and has
  `motion-reduce:transition-none`. It moves only when the device *confirms*, never on the request, so repeated toggling
  cannot desynchronise it. The drawing is a function of the confirmed value, with no animation state of its own.

## 7. Light findings

- Off → On → Off keeps the word, the switch and the drawing in step in light and dark mode (gate-verified).
- **P1-2 (fixed):** in dark mode the shade uses `fill-foreground/85`, which is near-white. An unlit lamp therefore
  looked lit. Off now steps down to `dark:fill-muted-foreground/45`. On keeps the bright shade, and the glow goes from
  `/20` to `/30` in dark mode so it is visible. State never rests on colour alone: on adds a light cone and a lit bulb
  (shapes), and off has neither.
- **P2-6 (open):** when the lamp is off, the brightness pill stays filled to the remembered 60%. The text says
  "Brightness: 60%", which is true (a retained setting), but the filled bar reads as light output. Fixing it means
  changing `DeviceLevelControl`, a published package component, to dim a retained level. That needs a design call.
- Brightness does not change the drawing's intensity (P3-1).

## 8. Camera findings

Truthful as built. The frame is labelled as a sample, there is no live affordance, privacy is stated ("Privacy mode
off"), and the package's `privacy="on"` really removes the poster (source: `camera-device-card.tsx`). The demo has no
privacy control, so privacy has nothing to change, which is correct. The hierarchy reads in one pass: frame, name,
location, signal. The whole-home tile's camera drawing never lights its lens dot, because `on` is not set for cameras
(P3-3). It is cosmetic, because the tile's words carry the state.

## 9. Other IoT findings

- **P2-4 (fixed):** the whole-home thermostat tile set `on` only for Heat, so an Eco thermostat was drawn as off. Now
  any mode except Off counts as on.
- **P2-2 (fixed):** at 200% text the mode tiles' fixed 3-column grid truncated "Heat" to "Hea". The tiles now use an
  `auto-fit` grid with a `rem` minimum (wrapping at large text), shared by the thermostat and lock tiles.
- **P2-8 (fixed):** the battery pill could not wrap and overflowed its card at 200% text. It now wraps and is capped at
  the container's width.
- Agritech (valve open/closed, pump on/off, soil sensor fresh/stale) and operations (machine running) pass `on` with a
  meaning that fits each kind. Checked in source and by the sweep, but not cycled in the browser.
- `DeviceIllustration`'s `on` still means different things per kind (lit, powered, open, running, fresh). Only the
  lock needed its own input, so that is all that was added (§23).

## 10. Component findings

Components were exercised inside the 20 blocks and the IoT demos only. No component docs page was visually audited
on its own, so this is not a claim about ~100 components. Findings:

- Native checkboxes in sign-in, create-account, profile-form, filter-panel and onboarding-checklist are 18×18 px
  (P3-4). They pass WCAG 2.5.8 through the spacing exception and their labels are clickable, but they are below the
  44 px the IoT controls use. This belongs to the `packages/ui` Checkbox, not to this slice.
- The filter-panel chip remove button is 14×14 px (P3-5, spacing exception applies).
- The order-summary quantity input is 23 px wide at 320 px (P3-6).

## 11. Block findings

All 20 blocks: no horizontal overflow at any of the five views, no overlapping targets, and no control over a graphic.
No block demonstrates device state, so the state-fidelity part of the brief does not apply to them. Empty, loading
and error states appear only in empty-state, loading-state and alert-stack, and were not cycled. The block findings
are the target-size items in §10.

## 12. Spatial-clearance findings

| Kind | Finding | Status |
|---|---|---|
| Control clearance | Thermostat steppers inside the arc's end markers (P2-1) | Fixed, derived from geometry |
| Hit-target clearance | Plan markers overlapping at 200% text and on narrow plans (P2-3) | Fixed: collisions are judged on the measured plan width at the drawn text size, at every width |
| Content spacing | No defect found that more padding would fix | n/a |
| Focus clearance | Thermostat steppers' 4 px ring stays inside the card (gate) | Held |

**Root cause of P2-3:** the plan is `px` geometry with `rem` markers, and the culling pass ran only below `sm`, against a
constant 250 px plan width. Before the fix: 16 overlapping pairs on the operations plan, 3 on smart space, and some on
agritech, all at 1280 px / 200% text. After: zero in all 12 gate views. The first render still uses the constant, so
hydration is unchanged. A marker held back is named in the hidden list and remains in the device list.

## 13. Touch-target findings

IoT steppers, switches, mode tiles and plan markers are all ≥ 44 px (gate-asserted for the steppers). Small targets
appear only in blocks (§10).

## 14. Focus-clearance findings

The sweep flagged showcase Preview/Code tabs, composite field parts and code-sample scroll regions as clipped. Each was
checked in a screenshot and is a false positive: they draw an *inset* ring (`ring-inset`), or their outline colour is
transparent, so nothing is cut off. No focus-clipping defect is confirmed.

## 15. Responsive findings

Thermostat, lock, lamp and plans were checked at 1280, 768 (thermostat only), 390 and 320 px. The fixes hold at all of
them (gate, §26). `/iot` had 5 px of horizontal overflow at 390 px / 200% text before the fix (sweep).

## 16. 200% / large-text findings

Before: the thermostat numeral overflowed its ring, the buttons covered the gauge, "Heat" was truncated, the battery
pill overflowed and plan markers overlapped. After: all are fixed and gate-asserted. Text scaling is applied with CDP
`Page.setFontSizes`, as `a11y-site.mjs` does. Where the ring is too small to hold its numeral, the decoration is
dropped and the controls and words are kept, as the brief asks.

`/iot` stays on `a11y-site.mjs`'s 200%-text ratchet, with an updated reason. Re-measured after the fix, the page
still overflows from chrome outside this slice: 75 px at 320 px (environment tab labels, the "Built from" part list)
and 40 px at 768 px (the roadmap's "Deferred" chip). The ring is no longer the cause.

## 17. RTL findings

The thermostat ring mirrors (`rtl:-scale-x-100`), and the stepper row is a logical flex row, so − stays at the arc's
start. Clearance was gate-verified at 390 px RTL. The lock's bolt is **physical**, like a hinge, and does not mirror:
the bolt's side is a property of the hardware, not of reading direction. Plan markers already use logical inset. The
component preview RTL leak into the site shell is the known Demo State Isolation defect, confirmed in PR #300 §27 and
being fixed in the Public UX simplification thread. It was not touched here.

## 18. Dark / custom-theme findings

Dark mode: the lamp shade was fixed (P1-2). Lock, thermostat and camera drawings were checked in screenshots and are
legible. Custom theme: **not rendered in the browser in this slice.** From source: state meaning lives in shape and words
(bolt position, light cone, ring arc length, "Low" plus triangle), and colours are semantic tokens (`primary`, `warning`,
`destructive`). A brand-colour change can recolour the lock LED and the ring without removing the state. That is a
source inference, not a rendered proof. Coordinate with the Color and theming audit.

## 19. Accessibility findings

The drawings are `aria-hidden`, and their state is in visible words. The lock uses a radiogroup with `aria-checked` on
the confirmed mode, and a request is named "…, requested, not yet confirmed". The lamp uses a switch with
`aria-checked`. The setpoint's live sentence is unchanged. The visual and accessible state come from the same confirmed
binding (`lock.confirmed`, `power.confirmed`), so they cannot drift. No ARIA was added.

## 20. Motion findings

The only new motion is the bolt slide, which uses an existing duration token and has a reduced-motion opt-out. Under
reduced motion the bolt reaches the correct final position (gate). No animation framework was added. Motion tokens and
gates belong to the Motion system audit.

## 21. Illustration architecture

Inline SVG React components (`DeviceIllustration`, showcase code in `apps/web`, not in the package). Each kind is
drawn from token classes. Before this change the state input was one boolean `on`. After it, `on` is kept for kinds
where on/off is a real state, and `locked` is added for the lock. Every drawing reports `data-state` in the words its
tile uses.

## 22. Shared-state architecture

The demos already derive every representation from one simulated binding (`controlOf(iot, id, cap)` → `confirmed` /
`requested`). The defect was not duplicated state. It was an illustration contract (`on`) that could not express a
lock, so callers fed it nothing. `DeviceView.locked` is now derived from the same `lock.confirmed` that produces the
tile's word.

## 23. Pascal simplification findings

- Thermostat: REMOVE nothing. The geometry was the problem, not density.
- Lock: the panel says the state in a word, a tile and now a drawing. The drawing is the object and is not a second
  label, so the word stays. The status line "Door: Locked" under the title duplicates the headline. Recommend
  CLARIFYING it later to something that adds information (for example, when the state was last confirmed). Not changed.
- Lamp: DEFER the remembered brightness visually when off (P2-6).
- Camera: already minimal.

## 24. Severity

| ID | Sev | Finding | Status |
|---|---|---|---|
| P1-1 | P1 | Lock drawing contradicted the lock state on the whole-home tile | Fixed |
| P1-2 | P1 | Unlit lamp drawn lit in dark mode | Fixed |
| P1-3 | P1 | Thermostat at 200% text: numeral overflowed, buttons covered the gauge | Fixed |
| P2-1 | P2 | Thermostat steppers inside the arc's ends at every width | Fixed |
| P2-2 | P2 | Mode tiles truncated labels at 200% | Fixed |
| P2-3 | P2 | Plan marker targets overlapped at 200% text | Fixed |
| P2-4 | P2 | Eco thermostat drawn as off | Fixed |
| P2-5 | P2 | Lock panel had no object drawing | Fixed |
| P2-6 | P2 | Brightness pill filled while the lamp is off | Open (package design call) |
| P2-7 | P2 | Ring stays primary in Off mode | Open (package API) |
| P2-8 | P2 | Battery pill overflowed at 200% text | Fixed |
| P3-1 | P3 | Lamp drawing ignores brightness | Open |
| P3-2 | P3 | Plan marker glyph for a lock is a closed padlock in either state (category identity) | Open |
| P3-3 | P3 | Camera/sensor tiles never light their accent | Open |
| P3-4–6 | P3 | Small block targets (checkbox 18 px, chip remove 14 px, quantity input) | Open, `packages/ui` |

**Counts: P0 0 · P1 3 · P2 8 · P3 6.** 11 fixed, 6 open.

## 25. Fixes implemented

- `packages/iot` `DeviceSetpointControl`: geometry-derived stepper clearance, container-query stacking, wrapping reading.
- `packages/iot` `BatteryIndicator` pill: wraps within its container.
- `apps/web` `DeviceIllustration`: `locked` input, bolt mechanism, `data-state`, dark-mode unlit shade.
- `apps/web` smart-space example: lock drawing in the panel and tile from `lock.confirmed`, Eco counts as on, `rem`
  auto-fit mode tiles.
- `apps/web` `SpaceCanvas`: marker collisions judged on the measured plan width and text size, at every width.

## 26. Regression protection

Run on this branch against a production build (`next start`): `check:iot-state-spatial` 42/42, `check:a11y-site`
336 views clean (with `/iot` still pending at 200% text, verified needed), web unit tests 1603/1603, iot 814/814,
typecheck and lint clean (2 pre-existing warnings in `marketing-claims.test.ts`), and generators current
(`check:iot-examples`, `check:stories`, `check:blocks`, `check:usage`, `check:manifest`, `check:verification`).

- `pnpm check:iot-state-spatial` (`scripts/iot-state-spatial.mjs`, runs in the `a11y-site` workflow against
  `next start`): ring clearance (6 views), lock fidelity through the real control with and without reduced motion,
  light fidelity in light and dark, and plan markers (3 environments × 4 views). 42 checks.
- Unit tests: the ring structure and clearance formula (`visual-maturity.test.tsx`), lock/lamp drawing contract
  (`reference-pieces.test.tsx`), text-scaled collision layout (`space-canvas.test.tsx`), and lock word = drawing in
  panel and tile, with a request moving neither (`smart-space-environment.test.tsx`).

Negative controls, each run against the gate and then restored (logs in `negative-controls/`):

| # | Sabotage | Result |
|---|---|---|
| 1 | `main`'s `DeviceSetpointControl` | FAIL, 32 findings (−6.6 to −16.7 px) |
| 2 | Stepper row not `relative` | FAIL, 18 hit-test findings |
| 3 | Lock drawing pinned to `locked` | FAIL, drawing contradicts word |
| 4 | Tile not fed `locked` | FAIL, tile "unlocked" draws "unknown" |
| 5 | Bolt without `motion-reduce:transition-none` | **PASS (cannot fail):** the site's global reduced-motion reset already zeroes it. The unit test asserts the class instead |
| 6 | Unlit shade in the lit fill | FAIL, dark mode |
| 7 | `main`'s `SpaceCanvas` | FAIL, 51 overlapping pairs |

## 27. Remaining limitations

- Components were not audited page by page. Blocks were swept in their default state only.
- Custom-theme rendering was not exercised (§18).
- Agritech and operations state changes were checked in source and by the spatial sweep, not cycled in the browser.
- Native platforms have no device demos, so nothing native was run.
- The gate's reduced-motion check cannot tell the bolt's own opt-out from the site-wide reset (control 5).
- After hydration, a marker may disappear on a plan too narrow for it (by design: overlapping targets are worse).
- `/iot` still overflows at 200% text from page chrome (§16), so it stays on the `a11y-site` ratchet.

## 28. Recommended future work

1. P2-6 and P2-7 as one `packages/iot` slice: a retained-but-inactive presentation for `DeviceLevelControl` and the
   setpoint ring.
2. An explicit `open/closed` door-contact state in the scenario model, if the product needs it, drawn separately from
   the lock.
3. A per-page component visual sweep using the same instrument, committed as a gate once its false positives (inset
   rings, closed `<details>`) are handled.
4. Checkbox and chip target sizes in `packages/ui`.
5. The `/iot` page chrome at 200% text (tabs, part list, roadmap chip), so `/iot` can leave the `a11y-site` ratchet.
