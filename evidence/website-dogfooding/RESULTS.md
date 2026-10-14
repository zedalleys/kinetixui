# Website dogfooding — evidence

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
