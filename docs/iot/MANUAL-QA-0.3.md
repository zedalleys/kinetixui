# Manual QA — PR #259 (IoT 0.3 and three site fixes)

Preview: https://kinetixui-git-claude-charming-thompson-lhf1hc-zed-alleys.vercel.app

Nothing below has been run by a human yet. Section 1 says what was already checked by tooling, so a person can
spend their time on section 3, which is what tooling cannot judge: how it feels, what a screen reader says, and
what Safari and Firefox do.

---

## 1. What was already checked, and how far that goes

| Check | Result | What it does not prove |
| --- | --- | --- |
| IoT package: typecheck, lint, 708 unit tests | Pass | Logic only; no rendering in a real browser |
| Web: typecheck, lint, 1,300+ tests | Pass | jsdom cannot measure layout, contrast or focus order |
| `check:iot-dist` — headless entry point stays React-free | Pass | — |
| Tree-shaking guards (source scan, mutation-tested) | Pass | Measured with esbuild, not a consumer's bundler |
| Repo browser gate `scripts/a11y-site.mjs` (21 pages × light/dark × 4 widths) | Pass, no axe findings, no overflow | Axe finds about a third of accessibility problems, and it never sees a clipped container |
| Chromium pass on `/iot`: 390 / 768 / 1440, light and dark, LTR and RTL, every tab and lazy section | No overflow, no axe violations | Chromium only; no screen reader; reduced motion was on |
| `/components` filter sheet: 390 / 768 / 1440, light/dark, LTR/RTL | Opens, filters, Esc closes and returns focus, no overflow | Safari and Firefox, real touch |
| Home flagship at 320 / 375 / 390 / 768 | Card, checklist and tabs inside the frame; tabs wrap, no scroll | Real iPhone Safari (the original report came from one) |
| CodeQL (JS/TS, Actions, Swift) and all 7 PR checks | Pass | — |

**Not run by anyone:** a screen reader, Safari, Firefox, Android Chrome, a real touch device, forced-colors mode,
200% and 400% zoom, or slow-network loading of the lazy examples.

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

## 4. Known limitations, so they are not reported as bugs

- **Simulation only.** No MQTT, BLE, Matter, HTTP or WebSocket exists. The camera never streams. Nothing evaluates
  an automation.
- **React only.** No SwiftUI, Compose, Flutter or Angular IoT support is claimed or implied.
- **Experimental, still `0.2.0`.** No changeset was added and nothing was published; the page shows no new version.
- **`/iot` route JS grew** from 21 kB to 45.5 kB (First Load 447 → 472 kB) even after lazy loading; about 38.7 kB
  of that is the package itself, pulled in by the eager hero.
- **Per-import size** grew: one control 4.03 → 5.30 KB, `DeviceCard` 10.25 → 11.79 KB.
- **Headless offline counting.** `summarizeFleetHealth` counts an offline device in a warning bucket as well as in
  `offline`. The UI shows exclusive buckets; a consumer using the raw function needs the same care.
- **axe `link-name` with a modal open.** With any modal open on `/components` (the existing mobile menu as well as the
  new filter sheet), axe reports `link-name` on the cards behind it. It is an axe artifact of `aria-hidden`
  subtrees, present before this PR, and clean when the modal is closed.
- **The repo's overflow gate cannot see content clipped by `overflow: hidden`.** That is why the home-page crop
  passed CI. A clipped-content check would need to be added to `scripts/a11y-site.mjs`.

## 5. Sign-off

| Area | Tester | Device / browser | Date | Result |
| --- | --- | --- | --- | --- |
| State honesty (3.1) | | | | |
| Environments and Device detail (3.2–3.3) | | | | |
| Automation and pairing (3.4–3.5) | | | | |
| Alerts, telemetry, energy (3.6) | | | | |
| Screen reader (3.7) | | | | |
| Cross-browser, zoom, layout (3.8) | | | | |
| Site fixes (3.9) | | | | |
