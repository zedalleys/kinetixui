# Manual QA — PR #259 (IoT 0.3 and three site fixes)

Preview: https://kinetixui-git-claude-charming-thompson-lhf1hc-zed-alleys.vercel.app

No human has run this plan yet. Section 6 records an automated pass on 2026-09-30 (Claude Code driving Chromium
141): 39 of the 49 rows were executed and 10 are marked NOT RUN because they need a screen reader, Safari or
Firefox, genuine browser zoom, or a real phone. A person should spend their time on those ten, which are the
part tooling cannot judge.

**Update — visual maturity pass.** After §6 was recorded, the `/iot` showcase and the package components were
restyled (§2 item 6). §6 was run against the earlier composition, so its rows describe that layout, not the current
one. Rows 50–64 (§3.10) are new and cover the new compositions; §7 records what an automated run could and could not
say about them. **No row in §3.10 has been executed by a person.**

---

## 1. What was already checked, and how far that goes

| Check | Result | What it does not prove |
| --- | --- | --- |
| IoT package: typecheck, lint, 708 unit tests | Pass | Logic only; no rendering in a real browser |
| Web: typecheck, lint, 1,300+ tests | Pass | jsdom cannot measure layout, contrast or focus order |
| `check:iot-dist` — headless entry point stays React-free | Pass | — |
| Tree-shaking guards (source scan, mutation-tested) | Pass | Measured with esbuild, not a consumer's bundler |
| Repo browser gate `scripts/a11y-site.mjs` (21 pages × light/dark × 4 widths) | Pass, no axe findings, no overflow | Axe finds about a third of accessibility problems, and it never sees a clipped container |
| Chromium pass on `/iot`: 390 / 768 / 1440, light and dark, LTR and RTL, every tab and lazy section | No overflow, no axe violations | Chromium only; no screen reader. **Correction (see §6, finding 1):** the RTL half of this earlier pass did not mirror the examples; it is superseded by the pass in §6 |
| `/components` filter sheet: 390 / 768 / 1440, light/dark, LTR/RTL | Opens, filters, Esc closes and returns focus, no overflow | Safari and Firefox, real touch |
| Home flagship at 320 / 375 / 390 / 768 | Card, checklist and tabs inside the frame; tabs wrap, no scroll | Real iPhone Safari (the original report came from one) |
| CodeQL (JS/TS, Actions, Swift) and all 7 PR checks | Pass | — |

**Not run by anyone:** a screen reader, Safari, Firefox, Android Chrome, a real touch device, and genuine
200% and 400% browser zoom. (Forced-colors and slow-network were run in §6 as emulation.)

---

## 2. What changed, so you know where to look

1. **`/iot`** rebuilt as a "Connected Product Lab" (hero with a simulated device; Smart space / Agritech /
   Operations environments; state honesty; telemetry; alerts; automation builder; pairing flow; Device detail;
   architecture; install; roadmap). 15 examples, lazy-mounted.
2. **`@kinetixui/iot`**: a headless state model plus 15 new React patterns (27 in total). Documented in
   `/docs/iot` and `docs/iot/EXPERIENCE-MATURITY.md` §9.
3. **`/docs/platforms`**: the seven-column table is now one card per platform (no hidden sideways scroll).
4. **Home page**: the cross-platform code section no longer overflows on phones.
5. **`/components`**: on phones the filter chips fold behind one **Filters** button and a bottom sheet.

6. **Visual maturity pass.** The three environments were recomposed: Smart space is a "connected space" (house
   header, room rail, floor plan with device hotspots, a room focus area, and an attention / energy / activity
   column); Agritech is a field console (zone rail led by soil moisture, irrigation valve and pump, conditions);
   Operations is a shift-supervisor console (fleet health, alert triage, site plan, inspector, shift log). Device
   detail is one product view instead of six tabs. Package components gained optional presentations (setpoint
   ring, pill level, mode tiles, sparkline energy, row/tile groups, block timeline, pill battery) with defaults
   that keep the previous API valid.

Everything interactive on `/iot` is simulation. That is by design and is stated on the page; do not report
"no real device responds" as a bug.

---

## 3. Manual test script

Mark each row Pass / Fail / Note. Test at least: iPhone Safari (or a 390px window), a tablet width, and desktop.

### 3.1 State honesty — the point of the release

| # | Steps | Expected |
| --- | --- | --- |
| 1 | `/iot` hero: press the switch | Shows **Requested** and the device-reported value **unchanged**; the switch is not usable for a second press; after a moment it confirms and flips |
| 2 | Tick "Make the device stop answering", press the switch | Goes to timed out → unreachable, a **Retry** button appears, and the device still reports the old value |
| 3 | Untick it, press Retry | Completes, and the value changes only at confirmation |
| 4 | "Requested is not confirmed" section: Valve 03 (the flaky one) | Fails once with a stated reason, then succeeds on retry |
| 5 | Same section: "Request a change, then lose the pump" | Timed out → unreachable → Retry; wording never says the pump changed |
| 6 | Read every status line | "Acknowledged" must never read as done. Look for any wording that overclaims |

### 3.2 Environments

| # | Steps | Expected |
| --- | --- | --- |
| 7 | Switch Smart space / Agritech / Operations by tapping, then by arrow keys | One environment at a time; a visible "Simulated" notice on each; the URL hash (`#agritech`) is selectable and deep-links |
| 8 | Agritech: soil-moisture trend | 28% threshold is drawn and labelled by dash pattern, not just colour; a gap in the data shows as a break |
| 9 | Operations header | Reads **24 devices · 22 healthy · 1 warning · 1 offline**, the parts adding up to 24 |
| 10 | Smart space camera | A labelled placeholder "Sample image — no live feed"; never a video player |
| 11 | Agritech rain forecast | Labelled as application-provided demo data |

### 3.3 Device detail

| # | Steps | Expected |
| --- | --- | --- |
| 12 | Six tabs at 390px | Wrap onto rows, no sideways scroll |
| 13 | Arrow keys, Home/End across tabs | Focus and selection move; in RTL the arrows reverse |
| 14 | Controls tab | Same request-vs-confirmed behaviour as 3.1 |
| 15 | Telemetry tab: "View data" | A real table of the plotted values |
| 16 | Settings tab | Read-only, and says nothing here configures hardware |

### 3.4 Automation builder

| # | Steps | Expected |
| --- | --- | --- |
| 17 | Load: the Zone 3 rule | Summary sentence reads sensibly, e.g. "When soil moisture falls below 28%, provided rain is not expected, open Zone 3 irrigation for 12 minutes." |
| 18 | Add, remove and move conditions with keyboard only | Buttons have specific names ("Move condition 2 up"); focus lands somewhere sensible after each action |
| 19 | Empty a required value; set a range with min above max | Inline errors tied to the field, plus a list at the top; **Save** stays blocked |
| 20 | Save a valid rule | "Saved as demo state — nothing is executed." No engine is implied |

### 3.5 Pairing flow

| # | Steps | Expected |
| --- | --- | --- |
| 21 | Walk all nine steps by keyboard | The stepper shows the current step; focus moves to the new step heading each time |
| 22 | Try every "Simulate a failure" option (six) | Each shows a specific title, description and recovery actions — never a generic "Something went wrong" |
| 23 | Retry, Back and Cancel on a failure | Retry only where the failure is retryable; Back returns to the stage before |
| 24 | Enter a wrong code | Fails as authentication, not as a crash |
| 25 | OS "reduce motion" on | Nothing auto-advances; "Finish this step" buttons appear instead |

### 3.6 Alerts, telemetry, energy

| # | Steps | Expected |
| --- | --- | --- |
| 26 | Acknowledge an alert | Becomes "Acknowledged" but stays listed; acknowledged is not resolved |
| 27 | Make the sensor stop answering | A stale alert appears; the reading shows a stale state and never a confident number |
| 28 | Telemetry grid of 12 metrics | Each of normal / warning / critical / stale / unavailable is distinguishable **without colour** (word and shape) |
| 29 | Energy card | Shares are numbers, not only bars; the 7-day chart has a "View data" table |

### 3.7 Screen reader — the biggest gap

Run with VoiceOver on iOS or macOS, plus NVDA or TalkBack if you can.

| # | Steps | Expected |
| --- | --- | --- |
| 30 | Press a control in the hero | Announces the request once, and the result once. Not silent, not doubled |
| 31 | Pairing failure appears | Announced as an alert, once, with its recovery actions reachable |
| 32 | Automation builder: add / remove / move | One short polite announcement each; typing does not announce the summary on every keystroke |
| 33 | Trend chart | The description is read, and the data table is reachable |
| 34 | Tabs and the environment switcher | Role, selected state and position are announced |
| 35 | Page landmarks and headings | One h1, headings in order, the "On this page" links land on their sections |

### 3.8 Cross-browser, zoom and layout

| # | Steps | Expected |
| --- | --- | --- |
| 36 | Safari (iOS and macOS), Firefox, Chrome | No layout differences beyond fonts; nothing cropped |
| 37 | 200% and 400% zoom on `/iot` | No horizontal scrolling of the page; controls still reachable |
| 38 | Rotate a phone to landscape | Sheets and tab strips still fit |
| 39 | Windows forced-colors (high contrast) | Status shapes and borders are still visible |
| 40 | Slow 3G, scroll `/iot` quickly | Lazy example placeholders reserve height; no jump when they load; the Code tabs work before the preview appears |
| 41 | Print preview of `/iot` | Readable; nothing important hidden |

### 3.9 The three site fixes

| # | Steps | Expected |
| --- | --- | --- |
| 42 | `/docs/platforms` at 390px | One card per platform, all text inside, no sideways scroll |
| 43 | Home page, scroll to the "React / SwiftUI / Jetpack Compose / Flutter" section at 375–390px, on a real phone | The preview card is fully visible and centred; the checklist wraps inside its border; the four tabs wrap onto two rows |
| 44 | `/components` at 390px | Search plus a **Filters** button; the sticky bar is one row (about 60px), not half the screen |
| 45 | Tap Filters | Bottom sheet with category, platform and beta chips; choosing one updates the list behind and the button shows a count (for example "1") |
| 46 | "Show N components" / Esc / the X | Each closes the sheet; focus returns to the Filters button |
| 47 | Reload `/components?platform=SwiftUI`, and one with a category | Filter applies; the button shows the count; the shared link works |
| 48 | Tablet (768px) and desktop | The chips are inline as before; no Filters button |
| 49 | RTL | Sheet and button mirror correctly |

---

### 3.10 Visual maturity pass (new)

| # | Steps | Expected |
| --- | --- | --- |
| 50 | Smart space at desktop width | Reads as zones (header, room rail, plan, room focus, attention column), not a stack of equal cards. Selecting a room updates the rail, the plan highlight and the focus area together |
| 51 | Select a device hotspot on the plan, by pointer and by keyboard | The focus area narrows to that device. A pending request shows a dashed ring and its accessible name says "requested …, not yet confirmed" |
| 52 | Thermostat: press + and − | The big number stays the confirmed target while a dashed "requested" value shows; nothing drags; a failure keeps the last confirmed value and offers Retry (never automatic) |
| 53 | Lamp: the pill brightness slider, by touch and by arrow keys | Label and value stay legible either side of the thumb; a request shows as a dashed "Requested N, not yet confirmed" chip |
| 54 | Smart space at 390px | One column; room names are not cut off; the plan is legible; controls are comfortable to hit; Energy, Activity and Scenes are collapsed and open on tap |
| 55 | Energy sparkline | Latest marker and value, comparison in words, and a "View data" table with the same numbers |
| 56 | Camera | A labelled "Sample image — no live feed"; no video, no play control |
| 57 | Agritech | Clearly not a house: zone rail with moisture numerals, valve Open/Closed tiles, a failing valve shows Failed with a manual Retry, the stale orchard sensor says "Last known" |
| 58 | Operations | Fleet numerals add up; acknowledging an alert keeps it listed as acknowledged; the offline meter shows words and no controls; Run and Duty show requested against confirmed |
| 59 | Device detail | One product view (not tabs); the primary word is the confirmed state; a pending request is visible beside it |
| 60 | RTL (set the document direction) on all three environments | Rail, plan, ring, sparkline and timeline mirror; each number stays with its unit ("16.4 °C", "34 %") |
| 61 | Dark mode on all three | Surfaces stay tonal and readable; state is distinguishable without colour |
| 62 | Reduced motion | Nothing pulses; a pending state is a static dashed treatment plus words |
| 63 | A real phone, one-handed | Thermostat ±, mode tiles, room tiles and the alert Acknowledge buttons are reachable and hit reliably |
| 64 | Screen reader on Smart space | Hotspots announce name, state and any request; the room rail announces the current room; the date strip is a radio group with day, event count and "today" |

---

## 4. Known limitations, so they are not reported as bugs

- **Simulation only.** No MQTT, BLE, Matter, HTTP or WebSocket exists. The camera never streams. Nothing evaluates
  an automation.
- **React only.** No SwiftUI, Compose, Flutter or Angular IoT support is claimed or implied.
- **Experimental, still `0.2.0`.** No changeset was added and nothing was published; the page shows no new version.
- **`/iot` route JS grew** from 21 kB to 45.5 kB (First Load 447 → 472 kB) even after lazy loading; about 38.7 kB
  of that is the package itself, pulled in by the eager hero.
- **Per-import size** grew: one control 4.03 → 5.30 KB, `DeviceCard` 10.25 → 11.79 KB. The visual pass added more
  (§7): all components together are 133.5 → 172.2 KB minified, and `/iot` is now 55.9 kB (First Load 483 kB).
- **Alert rows show internal source keys** such as `sim:threshold:pressure`, because the simulation supplies them as
  the alert `source` and the card prints what it is given. Cosmetic; not fixed here.
- **English inside an RTL page.** Mirroring is correct, but English sentences that mix numerals and words (header
  subtitles such as "3 lines · 24 devices") can read oddly in RTL. Numerals with units are kept together.
- **Headless offline counting.** `summarizeFleetHealth` counts an offline device in a warning bucket as well as in
  `offline`. The UI shows exclusive buckets; a consumer using the raw function needs the same care.
- **axe `link-name` with a modal open.** With any modal open on `/components` (the existing mobile menu as well as the
  new filter sheet), axe reports `link-name` on four of the cards behind it. Present before this PR (proved against
  `main`, §6 finding 5) and clean when the modal is closed; it is a real, pre-existing gap and not just an axe artifact.
- **The repo's overflow gate cannot see content clipped by `overflow: hidden`.** That is why the home-page crop
  passed CI. A clipped-content check would need to be added to `scripts/a11y-site.mjs`.

---

## 5. Sign-off

Automated rows are signed as Claude Code, not as a person. A human still has to sign the NOT RUN rows.

| Area | Tester | Device / browser | Date | Result |
| --- | --- | --- | --- | --- |
| State honesty (3.1) | Claude Code (automated) | Chromium 141, local production build | 2026-09-30 | PASS (6 of 6) |
| Environments and Device detail (3.2–3.3) | Claude Code (automated) | Chromium 141, local production build | 2026-09-30 | PASS (10 of 10; row 13 failed in RTL until fixed) |
| Automation and pairing (3.4–3.5) | Claude Code (automated) | Chromium 141, local production build | 2026-09-30 | PASS (9 of 9) |
| Alerts, telemetry, energy (3.6) | Claude Code (automated) | Chromium 141, local production build | 2026-09-30 | PASS (4 of 4) |
| Screen reader (3.7) | — | — | — | NOT RUN — SCREEN READER REQUIRED |
| Cross-browser, zoom, layout (3.8) | Claude Code (automated) | Chromium 141 only | 2026-09-30 | 3 executed (40 PASS; 39 FAIL, 41 FAIL); 36, 37, 38 NOT RUN |
| Visual maturity pass (3.10) | — | — | — | NOT RUN by a person. Automated evidence in §7 |
| Site fixes (3.9) | Claude Code (automated) | Chromium 141, local production build | 2026-09-30 | 7 PASS; 43 NOT RUN — REAL PHONE REQUIRED |

---

## 6. Execution record — 2026-09-30

**Tester:** Claude Code (automated) — Chromium 141.0.7390.37 driven by Playwright. Not a person.

**Environment, stated plainly.**
- **Not the Vercel preview.** The preview host and `kinetixui.com` are blocked by this session's network policy
  (the proxy answers 403 to the connection), and the Vercel connector has no access to the `zed-alleys` team, so the
  live preview could not be reached or matched to a commit. **Live preview: NOT TESTED.**
- Everything below ran against a **local production build (`next build` + `next start`)** of PR head `8fdd51d`
  plus one source fix (`e5056b0`, finding 1). Rows 1–11 and 14–16 were run on the `8fdd51d` build; the fix only
  changes direction handling, so their LTR behaviour is unchanged. The RTL results were gathered after the fix.
- RTL was produced by setting `dir="rtl"` on `<html>` before load; the site has no RTL switch of its own.
- Rows marked NOT RUN needed something this environment does not have. Chromium emulation was **not** counted
  as a real phone, a real Safari or Firefox, genuine zoom, or a screen reader.

**Result: 39 of 49 executed — 37 PASS, 2 FAIL, 10 NOT RUN.**

| # | Result | What was observed |
| --- | --- | --- |
| 1 | PASS | `aria-checked` stayed false and the switch was disabled while "Turning on — Change requested, not yet confirmed by the device" showed; it flipped only at confirmation (~2 s) |
| 2 | PASS (note) | "Timed out — the device last reported off", Retry offered, old value kept. The hero shows Timed out only; **Unreachable** appears in the "Requested is not confirmed" section (row 5), so this row over-specifies the hero |
| 3 | PASS | Retry: "Retrying, attempt 2 of 3" → "Acknowledged, not yet confirmed" → confirmed; value changed only at confirmation |
| 4 | PASS | Valve 03: Requested → Acknowledged (not yet confirmed) → Failed ("The change to Open failed. Valve position not reported. The device still reports Closed") → Retry (never automatic) → Confirmed |
| 5 | PASS | Pump: Requested → Timed out ("Device offline. Showing the last known setting") → Unreachable; kept reporting On until it answered again and a retry confirmed |
| 6 | PASS | Every distinct status sentence across the three panels was collected; "Acknowledged" is always paired with "not yet confirmed" or "(not reached yet)"; no overclaiming wording found |
| 7 | PASS (note) | Tabs by click and by arrow keys (Right, Right, Home); each environment shows a Simulated notice; `#agritech` deep link selects Agritech with the tablist at 172 px. Smart space (the default) clears the hash. No content leaked between environments; returning to one restarts its state |
| 8 | PASS (note) | Threshold drawn as a dashed line (`4 3`) with legend "Warning at or below 28 %". The Agritech soil trend has no gap by design; the gap is in the Telemetry section's "Weather station temperature, with a gap": two separate line runs and "7 missing of 97" at 24 h and 7 d (none in the 6 h window) |
| 9 | PASS | "24 devices · 22 healthy · 1 warning · 1 offline"; with S-101 silenced it reads 21 / 1 / 2, still summing to 24 |
| 10 | PASS | No video, audio, canvas or iframe; "Sample image — no live feed" |
| 11 | PASS | Two labels: "Application-provided demo data — KinetixUI fetches no forecast" |
| 12 | PASS | At 390 px the six tabs sit on two rows, tablist 324/324 wide, page overflow 0, in LTR and RTL |
| 13 | PASS after fix | **Found FAIL, then fixed (finding 1).** LTR: Right, Right, End, Left, Home moved Controls, Telemetry, Settings, Controls, Overview. RTL before the fix behaved identically to LTR; after it, Right moves to the previous tab (Settings, Activity) and Left to the next. The environment switcher reversed correctly throughout |
| 14 | PASS | Pressing the switch left `aria-checked` unchanged and disabled it while pending; it settled afterwards |
| 15 | PASS | Two "View data" disclosures; the opened table has headers Time / Value / Quality / Status and 50 rows |
| 16 | PASS | "Read-only. Nothing on this tab configures hardware…"; no inputs or buttons in the panel |
| 17 | PASS (note) | "When soil moisture falls below 28%, provided rain forecast is not expected, open Zone 3 irrigation for 12 minutes." The label reads "rain forecast", not "rain" |
| 18 | PASS | Fields are labelled; Add → focus on the new condition, status "Condition 2 added. 2 in total."; Move → focus stays on the moved item's button, "Condition moved down to position 2 of 2."; Remove → focus on "Remove condition 1", "Condition 2 removed. 1 remaining."; one status region |
| 19 | PASS (note) | Save is **enabled by design**; activating it on a blank rule is blocked, focus moves to "3 problems to fix before this can be saved", and each field carries `aria-invalid` and a linked error. Minimum 50 above maximum 10 shows "The minimum cannot be greater than the maximum." on both fields and does not save |
| 20 | PASS | "Saved as demo state — nothing is executed." with the summary |
| 21 | PASS | All nine steps by keyboard (Enter/Space on focused buttons); focus lands on each step's heading; the stepper marks the current step; finishes at "Step 9 of 9: Done … no device was paired" |
| 22 | PASS | All six scenarios: Device not found; Already set up (Reset the device / Get help / Cancel); Signal too weak; Update required; Setup only partly finished (with the partial-state note); Could not verify the device. Each has a title, a description and recovery actions; none is generic |
| 23 | PASS | A retry-type action appears only where the failure is retryable (already-owned offers none); Back from Identify returns to the stage before (Searching, which then continues); Cancel gives "Setup cancelled" and "Start again"; after partial-provisioning → Try again the flow completes to Done with no cleanup marker |
| 24 | PASS | A well-formed wrong code (KX2469) → "Could not verify the device — The code or credentials were not accepted" with Try again / Go back / Cancel setup; a malformed code keeps Verify disabled |
| 25 | PASS | With `prefers-reduced-motion: reduce` nothing advanced in 6.5 s; "Finish this step" advanced it |
| 26 | PASS | Acknowledge → "Acknowledged" chip, still listed; acknowledge buttons 3 → 2 |
| 27 | PASS (note) | Agritech Soil Sensor 05: alert "Sensor stale — has not reported for 3 hours" and reading "37 % Last known value Stale 3h ago". The Alert centre's button raises a **Device offline** alert rather than a stale one (22/1/1 → 21/1/2, resolved on "answers again"). The two-metric stale-alert collision cannot be produced in the UI (no example has a device with two silent metrics); it is covered by a unit test only |
| 28 | PASS | Twelve metrics show Normal / Warning / Critical / Unavailable ("— No reading") / Stale ("Last known value") as words, with at least five distinct glyph shapes |
| 29 | PASS (note) | Shares are numbers ("52% · 3.9 kWh"); the 7-day chart has a "View data" table ("Daily energy in kWh", 7 rows). Unusual `precision` values are not reachable from the UI; covered by a unit test only |
| 30–34 | NOT RUN — SCREEN READER REQUIRED | No VoiceOver, NVDA, TalkBack or JAWS was available. DOM and axe checks are not a substitute |
| 35 | NOT RUN — SCREEN READER REQUIRED | Structural half checked and passing: one `h1`, no heading-level skips, one `main`, navs "Primary" and "On this page", 16 named sections, 14 of 14 "On this page" links land within 300 px of their target at 390 and 1440 px. The screen-reader half was not run |
| 36 | NOT RUN — SAFARI AND FIREFOX REQUIRED | Playwright Firefox and WebKit are not installed here; only Chromium was available |
| 37 | NOT RUN — genuine browser zoom unavailable | Layout at 320 and 390 px viewport widths was checked (rows 12, 42, 44) but a narrower viewport is not zoom and is not counted |
| 38 | NOT RUN — REAL DEVICE ROTATION REQUIRED | Supplementary emulation at 667×375: the filter sheet fits with its button visible, the tabs wrap, overflow 0. At 844×390 the inline chips show instead of the sheet |
| 39 | FAIL (forced-colors emulation) | Status words and glyphs, borders, focus rings, the stepper shapes, alert severity glyphs and the health-bar patterns stay visible. **But the `DevicePowerControl` switch is drawn identically On and Off** (no visible thumb); the state is carried only by the adjacent word. The component is unchanged by this PR (it arrived in #255). Emulation, not a real Windows High Contrast test |
| 40 | PASS (note) | Slow-3G-class throttle (400 kbps, 400 ms) against the local server: the h1 and sections were present after DOMContentLoaded (6.8 s), layout shift 0.0003, the Code tab worked before the preview appeared, previews mount as they approach. Notes: the reserved placeholder is visually blank (no loading text), and previews scrolled past before hydration finished stay unmounted until scrolled back to (mounted within 5 s) |
| 41 | FAIL (low; print-media emulation, not a human print preview) | In print rendering straight after load 0 of 7 lazy previews were mounted, so the live examples are missing from the printed page unless they were scrolled into view first (Chromium print-to-PDF: 24 pages) |
| 42 | PASS | h1 → h2 → h3 with no level skips; the five platform cards' names are paragraphs, not headings; cards inside the viewport; no overflow; axe clean at 390 and 1440 |
| 43 | NOT RUN — REAL PHONE REQUIRED | Supplementary emulation at 320, 375, 390, 768 and 1440 px (LTR and RTL): preview card, checklist and tabs all inside the frame, tabs on two rows below 768, each tab shows its source, axe clean |
| 44 | PASS | At 390 px the sticky bar is 61 px; the chips are hidden; **Filters** button shown |
| 45 | PASS | Sheet holds category, platform and beta chips; choosing SwiftUI gives "90 of 98 components · SwiftUI" behind it and the button reads "Filters, 1 active" |
| 46 | PASS | "Show 90 components", Escape and the X each close it; focus returns to the Filters button every time; reopening works; 25 Tab presses never left the dialog; a click outside closes it without navigating; the body ignores pointer events while open; the background is hidden from assistive technology except the four cards in finding 5 |
| 47 | PASS | `?platform=SwiftUI` → "Filters, 1 active", 90 cards; `?cat=Overlays&platform=Flutter` → "Filters, 2 active", 11 cards; `?status=beta` → 1 card |
| 48 | PASS | At 768 and 1440 px the chips are inline, no Filters button, and the SwiftUI chip filters to 90 of 98 |
| 49 | PASS | In RTL the sheet mirrors (close button at the start edge, right-aligned title, chips flowing right to left) and the same open, choose, close flow works |

### Findings

1. **FIXED — the examples never rendered in RTL.** Radix `Tabs.Root` renders `dir` on its root and defaults it to
   `ltr`, so the showcase forced every live preview to LTR whatever the document said. The RTL passes recorded for
   the examples earlier (in this PR's description and in `EXPERIENCE-MATURITY.md` §9.7) therefore did not test
   mirrored examples; the package's unit tests, which render components inside `dir="rtl"`, were unaffected. Fixed
   in `e5056b0` (the showcase reads the document direction after mount) with a regression test that fails without it. After
   the fix a full matrix — `/iot` at 390 / 768 / 1440, light and dark, LTR and RTL, all sections loaded and every tab
   clicked — found no overflow, no offscreen content and no axe violations.
2. **OPEN, pre-existing (from #255) — forced colors.** The `DevicePowerControl` switch looks the same On and Off
   (row 39). The state stays readable in the adjacent text. Not caused by this PR; not fixed here.
3. **OPEN, low — print.** Unmounted lazy previews do not print (row 41). A product decision (lazy mounting versus print).
4. **OBSERVATIONS, not defects.** The lazy placeholder shows blank space with no loading text on a slow connection.
   A pairing failure shows "Cancel setup" and "Go back" next to the stepper's own "Cancel setup" and "Back".
5. **`link-name` with a modal open — determination: pre-existing and unchanged.** With a modal open on `/components`
   axe reports `link-name` on the same four cards (calendar, sonner, data-grid, kanban-board) in all three cases:
   the **existing mobile menu on `main` (5927117, before this PR)**, the existing menu on this PR's head, and the
   new Filters sheet. Same rule, same four nodes; not worsened and not caused by this PR. Those four cards stay
   exposed to assistive technology while any modal is open, and their names come out empty. All four contain live
   regions in their decorative thumbnails, which fits how the aria-hidden helper spares live regions, but four other
   cards with live regions are hidden correctly, so the mechanism is not proven. It is worth its own fix.

---

## 7. Execution record — visual maturity pass, 2026-09-30

**Tester:** Claude Code (automated) — Chromium 141 driven by Playwright. Not a person. **No row of §3.10 was executed
by a person and none is marked PASS.**

**Environment.** A local production build (`next build` + `next start`) of the branch head at the time; not the Vercel
preview (still unreachable from this session).

**What automation established (evidence, not a pass of the manual rows).**

| Evidence | Result |
| --- | --- |
| axe-core in Chromium, colour contrast enabled, on each of the three environment tabs and the whole page at 390 / 768 / 1440, light and dark, LTR and RTL (48 runs) | 0 violations |
| Repo site gate `scripts/a11y-site.mjs` (21 pages × 2 themes × 4 widths) | no findings, no horizontal overflow |
| Horizontal overflow of the page with each environment open, every width / theme / direction captured | 0 px |
| Unit tests (jsdom) for the new compositions: room switching, requested-versus-confirmed staying worded and unconfirmed, keyboard on rails and pills, offline honesty, acknowledge keeps alerts listed, "shown, not executed" labelling | passing (IoT 775, web 1,370) |

**What was looked at by eye (screenshots).** 1440 light LTR for all three environments; 390 light LTR for Smart space,
Agritech and Operations (top and middle sections); 1440 dark LTR and 1440 dark RTL for Smart space and Operations;
390 dark RTL for Smart space; 1440 light RTL for Agritech; 768 dark LTR for Smart space was captured (overflow 0)
but not inspected. **Not inspected by eye:** 768 for Agritech and Operations, 390 dark LTR, the lower half of the
390 pages, and any device other than desktop Chromium.

**Defects found by looking, and fixed:** room names truncated in the phone rail; plan labels and chips collided with
hotspots on phones; alert and activity messages truncated in narrow columns; a value and its unit reordered in RTL
("C° 16.4", "% 34"); the showcase did not follow a direction change made after mount.

**Row status.**

| # | Status | Note |
| --- | --- | --- |
| 50–59 | NOT RUN — needs a person's judgement | Automated evidence above covers accessibility and overflow, not whether the composition reads well or the interactions feel right |
| 60 | NOT RUN — needs a person's judgement | Mirroring inspected in screenshots on the captures listed above, English content only |
| 61 | NOT RUN — needs a person's judgement | Dark inspected as above; colour-independence not judged by a person |
| 62 | NOT RUN | Reduced motion was on for every capture, so pulsing was never seen; no comparison run |
| 63 | NOT RUN — REAL PHONE REQUIRED | Emulated 390 px viewport only |
| 64 | NOT RUN — SCREEN READER REQUIRED | No screen reader was available |

**Distinctions kept.** Automated browser verification (Chromium) is not WebKit or Safari verification; neither is
available here. Emulated viewport is not a real touch device. Forced-colors was emulated in §6 only, and not re-run
for the new compositions; real Windows high contrast has not been tested. Print was not re-tested.

**Bundle, before → after (esbuild, minified, React external).**

| | Before (06c0f32) | After |
| --- | --- | --- |
| Everything (`@kinetixui/iot/react`) | 133.5 KB | 172.2 KB |
| `DevicePowerControl` | 5.30 KB | 6.79 KB |
| `DeviceCard` | 11.79 KB | 16.69 KB |
| `DeviceControlCard` | 13.91 KB | 16.93 KB |
| `@kinetixui/iot/functions` (React-free) | unchanged | unchanged |
| `dist` JS total | 284.5 KB | 356.7 KB |
| `/iot` route | 45.5 kB (First Load 472 kB) | 55.9 kB (First Load 483 kB) |

