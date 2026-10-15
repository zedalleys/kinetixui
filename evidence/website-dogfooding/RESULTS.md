# Website dogfooding — evidence

## Wave 2c: site actions and fields (15 October 2026)

Against main `4f465a43b947b4708f0a5860589853bbdeb38a9a` (#382 merged). Production build: static Next.js 15.5.27, Chromium through Playwright. Details in `docs/audits/WEBSITE-DOGFOODING-AUDIT.md`, "Wave 2c".

| Check | Result / scope |
|---|---|
| `pnpm lint` / `pnpm typecheck` | PASS, 3 / 9 workspace tasks (2 existing warnings in `marketing-claims.test.ts`, untouched) |
| `@kinetixui/web` tests | PASS, 104 files / 2,176 tests. New `website-wave2c.test.tsx` (14) and `docs-sidebar.test.tsx` (4); changelog filters now asserted as a radiogroup (+2 keyboard cases); create tests moved to radio roles |
| `pnpm check:web-dogfooding` | PASS. A 1,273 · B 32 · C 5 · D 33 · E 9; B/C debt in 12 files. 23 approvals deleted, 2 shrunk to D (`Card asChild`), 1 reclassified C |
| Guard negative controls (live, then restored) | FAIL (exit 1) as intended on each: a raw button back in `changelog-view`, a raw input back in `docs-sidebar`, a second raw button in `camera-panel` (over its D `maxCount` of 1). Clean again after restoring |
| Generated output | `check:stories` (NavigationBar and AppBar stories regenerated from the demos), `check:verification`, `check:manifest`, `check:keyboard`, `check:usage`, `check:blocks`, `check:block-source`, `check:rtl`, `check:typography`, `check:type-scale`, `check:grid`, `check:iot-examples`, `check:flagship-examples`, `check:a11y-coverage`, `check:capabilities`, `check:icons`, `check:contrast`, `check:component-colors`, `check:token-contract`: PASS |
| `scripts/web-dogfooding-wave2c.mjs` | PASS, 16 views (`wave2c-browser.json`): 390/1280px × LTR/RTL × light/dark × 100/200% text, reduced motion (the hero pause with motion allowed, since reduced motion hides it). Real keyboard and pointer on: changelog filters (radiogroup `dir`, Tab in, arrows, Space, no un-choose, search Enter, empty-state clear), docs filter (clear by Tab with a ring, refocus, Escape, icon at the start edge in RTL), create (appearance arrows + Space, scene, all-pairs disclosure, invalid hex; sidebar in the sheet below `lg-rem`, including 1280px at 200%), chart series toggles (line-through when off, Space/Enter), colors (format radios, Copy ramp, swatch Card: hover lift, focus ring), building ops (zone toggle by pointer and Space, clear zone, camera Card selected edge and focus ring), IoT checkboxes (label press, Space, range disabling), registry icon buttons (36px), hero pause. **axe on every control region: 0 findings. No page overflow** |
| `check:a11y-site` | PASS. 576 views, no axe findings, no horizontal overflow |
| `check:web-quality` | PASS. Type floor, contrast, hit targets; 109 + 109 thumbnails; layout 220 views, 0 overflowing |
| `check:tabs-dogfood`, `check:home-systems`, `check:iot-state-spatial`, Wave 2a browser check | PASS (8 cases; home systems; 67 checks; 33 views) |
| Wave 2b browser check | 15/16 views passed in the full run; `390px rtl dark 100%` timed out waiting for the lazy device-dashboard preview to mount (a component this wave does not touch) and passed on both reruns of that view |

**Found and fixed during the browser pass.** At 1280px with 200% text the docs layout leaves the changelog article 128px wide (a pre-existing layout condition; 704px at 100%). The pill toggles kept label and count on one line and overflowed the pill; they now wrap inside it. The harness also applies direction and theme by init script, before hydration: applied after load, they raced hydration (next-themes could drop the `dark` class, and a Radix root could be read before it re-rendered with the page's direction); each view now asserts both held.

### Bundle (`bundle-wave2c.json`)

First-load JS per route on main `4f465a4` and this branch, same lockfile: the distinct chunks of the root layout, nested layouts and the page, each gzipped on its own and summed.

| Route | Chunks | Raw JS delta | Sum of per-chunk gzip delta |
|---|---|---:|---:|
| `/` | 15 → 14 | −149 B | −50 B |
| `/iot` | 16 → 15 | −53 B | −9 B |
| `/charts` | 20 → 19 | −128 B | −74 B |
| `/create` | 16 → 15 | −453 B | +82 B |
| `/demos/building-operations` | 16 → 15 | −282 B | −27 B |
| `/docs/changelog` | 16 → 15 | −363 B | +41 B |
| `/docs/colors` | 17 → 16 | −8,906 B | −2,267 B |
| `/docs/components/navigation-bar`, `/app-bar` | 21 → 20 | −279 B | −117 B |

Flat: the controls moved onto components the shared `@kinetixui/ui` chunk already ships. Summed per manifest entry instead, the changelog and colors pages look ~320 KB gzip heavier, because their page entries now list that shared chunk, which the root layout already loads; the union above is what a browser downloads.

### Not covered

No manual screen-reader pass. Touch is exercised as pointer presses. The pending-command Retry/Cancel need a failed device request to appear and are proven in jsdom only.

---

## Wave 2a: command menu and mobile menu (14 October 2026)

Against main `d155db19228d208cc73a00875c2c70edf863b4ea` (#379 merged). Production build: static Next.js 15.5.27, Chromium 141 through Playwright 1.64.0. Details in `docs/audits/WEBSITE-DOGFOODING-AUDIT.md`, "Wave 2a".

| Check | Result / scope |
|---|---|
| `pnpm install --frozen-lockfile` | PASS. No dependency or lockfile change |
| `pnpm lint` / `pnpm typecheck` | PASS, 3 / 9 workspace tasks |
| `@kinetixui/web` tests | PASS, 101 files / 2,148 tests. New `command-menu.test.tsx` (11) and 8 new Sheet cases in `mobile-nav.test.tsx`. The command-menu tests also pass against main's component (the behaviour they pin is unchanged); against main's mobile menu the outside-press and logical-side cases fail, which are the intended changes |
| `@kinetixui/ui` tests | PASS, 19 files / 514 tests. 9 new cases in `components-overlay.test.tsx` (Sheet `start`/`end`, scroll, `closeLabel`; CommandDialog name, description, focus return, anchoring); all 9 fail against main's `sheet.tsx`/`command.tsx` |
| `pnpm check:web-dogfooding` | PASS. A 1,218 · B 76 · C 4 · D 27 · E 9; B/C debt in 28 files. The 18 command-menu/mobile-nav approvals are gone, so the guard fails if either returns |
| Guard negative controls (live, then restored) | FAIL (exit 1) as intended on each: a direct Radix `Dialog` put back into `mobile-nav`, direct `cmdk` put back into `command-menu`, and a new file with a raw `role="dialog"` and a raw button. Clean again after restoring |
| `scripts/web-dogfooding-wave2a.mjs` | PASS, 33 views (`wave2a-browser.json`). Command menu at 390 and 1280px, mobile menu at 390 and 900px (the docs-only band), each × LTR/RTL × light/dark × 100/200% text, reduced motion. Per view: named dialog, no `aria-describedby`, focus in, wheel scroll locked, no focusable element outside the dialog exposed to AT, no page overflow, **axe on the open dialog: 0 findings**. Command menu: anchored at 20vh, the field does not move while filtering, Escape and an Enter route both return focus to the trigger. Mobile menu: at the left edge in LTR and the right edge in RTL, 75% wide, scrolls vertically, never sideways, animation 0.01ms under reduced motion, Tab never leaves it, Escape / close button / outside press / route all close it and return focus to "Menu", and ⌘K over it no longer stacks the command menu. Forced colors: both triggers keep a 2px solid focus outline |
| `check:a11y-site` | PASS. 576 views, no axe findings, no horizontal overflow, site search and docs navigation reachable at every width |
| `check:web-quality` | PASS. Type floor, contrast, hit targets; 109 + 109 thumbnails; layout 220 views, 0 overflowing. (The first run flagged the library `Kbd` at 11px in the header; the keys now use `text-label-md`.) |
| `check:tabs-dogfood`, Wave 1 browser check | PASS (8 cases; Wave 1 unchanged) |
| `check:a11y-browser` (Storybook, 270 stories × 2 themes) | PASS, nothing new; the 4 findings already accepted on main |
| `check:large-text`, `check:motion`, `check:overlay-visual` | PASS |
| `check:rtl`, `check:keyboard`, `check:verification`, `check:manifest`, `check:stories`, `check:usage`, `check:content`, `check:capabilities`, `check:a11y-coverage`, `check:registry-deps`, IoT/blocks/flagship examples | PASS. CI's generated-output step (keyboard, verification, manifest, tokens, vendored natives, stories, registry) regenerates to no diff |
| `git diff --check` | PASS |

### Bundle (`bundle-wave2a.json`)

Main `d155db1` and this branch, built from the same lockfile; distinct JS chunks per manifest entry, each gzipped on its own.

| Entry | Chunks | Raw JS delta | Sum of per-chunk gzip delta |
|---|---|---:|---:|
| Root layout (site header: both menus) | 14 → 14 | −1,170 B | −148 B |
| `/`, `/docs/installation`, `/components`, `/iot` | unchanged | +857 B | +173 to +187 B |
| `/docs/colors`, `/capabilities` | unchanged | 0 | −1 to 0 B |

The site's own overlay markup left the layout chunk; the shared `@kinetixui/ui` chunk grew by the new `CommandDialog`/`Sheet` code. Same chunk count everywhere.

### Not covered

No manual screen-reader pass. Touch gestures were exercised as pointer presses only. RTL is the document direction flipped on `<html>`, as the site's other RTL checks do; inside an LTR section of an RTL page the logical Sheet is placed correctly but slides from the other edge (documented in `sheet.tsx`).

---

## Wave 1 and the #379 audit refresh

Refreshed 14 October 2026 against main `acfe95af62befb4d11b3527a529bfd635c825fb8` (#357, #358, #375, #377, #378 and #380 included). Production build: static Next.js 15.5.27. Browser: Chromium 141 through Playwright 1.64.0. Diagnostic traffic uses `kx_traffic=diagnostic`. The original Wave 1 evidence (13 October, `ae9cc44`) is superseded by this file.

## Checks

| Check | Result / scope |
|---|---|
| `pnpm install --frozen-lockfile` | PASS. No dependency or lockfile change |
| `pnpm lint` | PASS, 3 workspace tasks |
| `pnpm typecheck` | PASS, 9 workspace tasks |
| `@kinetixui/web` tests | PASS, 100 files / 2,129 tests. Covers clipboard success/denial, payload privacy, analytics and URL state |
| `pnpm check:web-dogfooding` | PASS. 6 guard tests, then a scan of 252 files: A 1,196 · B 96 · C 4 · D 27 · E 9, with B/C debt in 30 files. The ledger matches the source exactly |
| Guard negative controls (live, on the real tree, then restored) | FAIL as intended on each: a raw `<button type="button">` injected into `docs-pager.tsx`, a raw `<select>` and a direct `@radix-ui/react-dialog` `Dialog.Root` in a new file. After restoring, the tree is clean and the guard passes |
| `check:rtl`, `check:keyboard`, `check:a11y-coverage` | PASS |
| `check:content`, `check:capabilities`, `check:manifest`, IoT example snippets (15, current) | PASS |
| Production web build | PASS |
| `check:a11y-site` (axe-core 4.14, Label in Name on) | PASS. 36 pages × light/dark × 320/390/768/1280 × 100%/200% text = 576 views, no axe findings, no horizontal overflow |
| `check:web-quality` | PASS. Type floor, contrast, coarse-pointer hit targets; thumbnails 109 LTR + 109 RTL, 0 problems; layout 220 views, 0 overflowing |
| `scripts/web-dogfooding-browser.mjs` (Wave 1) | PASS in LTR/RTL × light/dark at 390px with reduced motion. IoT `NativeSelect`s update their values and keep focus, and still fit at 200% root text. Simulation clock: `aria-pressed` toggles, step and reset work. "Copy as Markdown" is named by its visible text (no `aria-label`), copies via the keyboard and shows "Copied". Code copy works via the keyboard. Forced colors: 2px solid focus outline |
| `check:tabs-dogfood` (#380 surfaces) | PASS, 8 cases: keyboard, active state, focus, RTL, reduced motion, 200% text, local overflow, icons, axe, forced colors |
| `check:large-text`, `check:motion` (Storybook) | PASS. Library code is unchanged by this PR; run for completeness |
| `check:a11y-browser` (Storybook, 270 stories × 2 themes) | PASS, nothing new. The only 4 findings are those already accepted on main |
| `git diff --check` | PASS |
| PR CI | build (includes the guard), site axe, actionlint, CodeQL: all green on the pushed head |

## Bundle

`bundle.json` compares, per route, the distinct JavaScript chunks Next lists in its app-build manifest, each gzipped on its own. It compares this branch with main built from the same lockfile. These are sums over shared chunks, not a network waterfall.

| Route | Chunks | Raw JS delta | Sum of per-chunk gzip delta |
|---|---:|---:|---:|
| `/iot` | 13 → 13 | −269 B | −17 B |
| `/docs/installation` | 17 → 17 | −154 B | +5 B |
| `/components` | 14 → 14 | 0 | +1 B |
| `/create` | 11 → 11 | 0 | +1 B |
| `/docs/colors` | 8 → 8 | 0 | 0 |
| `/capabilities` | 6 → 6 | 0 | +1 B |

The site already ships the library `Button` and `NativeSelect`, so Wave 1 removes local markup and adds no code. Differences of a few bytes are within build noise.

## What changed in this refresh

- Merged current main. The only conflict was `docs-page-actions.tsx`: it keeps Wave 1's library `Button` and #357's Label-in-Name fix (no `aria-label`; the name is the visible "Copy as Markdown").
- Regenerated the inventory from the scan. The ledger dropped #380's 34 resolved Tabs entries (42 sites) and the table entries (tables are now E automatically). It added the four post-audit findings (#375, #377), reclassified the IoT pill selector C → B and the world map B → D, and every B entry now names its equivalent and wave.
- The guard now fails on stale approvals and on approvals without a positive integer `maxCount`. Its tests went from 1 to 6.
- The Wave 1 browser check uses #357's button name and asserts the name equals the visible text.
- Platform-tab maturity suffix: `ml-1.5` → `ms-1.5`, correct under RTL.

## Limits

These checks cover Wave 1 and the audited surfaces, not every route, state, input method or physical device. The guard is a source ratchet: it does not inspect CSS overrides, local wrappers around vendor primitives or styled links. No manual screen-reader pass was done. Screenshots were inspected locally and are not committed.
