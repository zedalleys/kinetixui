# Website dogfooding — Wave 1 evidence

Baseline main: `ae9cc44a1f2529da77f7ac0df2e3e25ae07128aa`. Audited 13 October 2026, Asia/Riyadh. Production build is static Next.js 15.5.27. Browser engine: local desktop Chromium (Google Chrome), Playwright 1.63.0. Diagnostic traffic uses `kx_traffic=diagnostic`.

## Checks

| Check | Result / scope |
|---|---|
| `pnpm lint` | PASS, 3 workspace tasks; 2 existing unused-variable warnings in marketing-claims tests, plus upstream JSX AST parser diagnostic |
| `pnpm typecheck` | PASS, 9 workspace tasks after building package declarations |
| `pnpm --filter @kinetixui/web test` | PASS, 95 files / 2,033 tests; includes clipboard success/denial, payload privacy, analytics and URL state |
| `pnpm --filter @kinetixui/ui --filter @kinetixui/iot test` | PASS, UI 432 tests / 15 files; IoT 1,165 tests / 45 files |
| `pnpm check:web-dogfooding` | PASS; 1 negative-control test plus AST scan of 241 files; catches new vendor/native sites and growth, accepts shrinking debt |
| `node scripts/check-rtl.mjs` | PASS; no new physical classes in its converted scope; 18 library files remain on the repository's existing pending list |
| `node scripts/gen-iot-examples.mjs --check` | PASS, 15 example snippets current; Wave 1 changes no copyable source region |
| `pnpm build:tokens` and UI/IoT/theme/preset package builds | PASS; no tracked generated-token changes |
| `pnpm build:web` | PASS, 139 generated static pages |
| `scripts/web-dogfooding-browser.mjs` | PASS; LTR/RTL × light/dark on 390px, reduced-motion preference; selects update values; opened select panel measured at 200% root text; pause/resume pressed state and step/reset callbacks; Enter copies Markdown/code; forced-colors outline remains 2px solid |
| `scripts/a11y-site.mjs --page /docs/installation --page /iot --page /components` | PASS, 48 page views: 3 pages × light/dark × 320/390/768/1280 × normal/200% text; no axe findings or page overflow; navigation and layout contract held |
| `scripts/web-quality-browser.mjs` | PASS; full type/contrast/coarse-pointer hit-target/inert-thumbnail/layout sweep, zero failures; quantitative report in `web-quality.json` |
| `git diff --check` | PASS |

The 19px IoT overflow first observed was introduced by Button's default non-shrinking layout, reproduced against unchanged main (which passed), then fixed by explicitly restoring shrink behavior on the copy composition. The final sweep passes. The small Markdown Button size initially violated the site's 12px text floor; final `md` is canonical and clears that finding. These are resolved regressions, not accepted baseline exceptions.

The browser sweeps were run against the production build on port 3124. An unchanged source archive with the same locked dependencies was separately built on port 3125 for the baseline comparison. The public site was not changed. Screenshots are saved locally alongside this report: `iot-selects-{ltr,rtl}-{light,dark}.png` and `docs-copy-{ltr,rtl}-{light,dark}.png`. Light and RTL/dark captures were visually inspected. Screenshots are local evidence rather than permanent repository assets.

## Bundle comparison

`bundle.json` compares the distinct JavaScript chunks listed for each route in Next's app-build manifest. Each chunk is gzip-compressed independently; counts include shared dependencies and are not a measured network waterfall or a performance claim. Different build roots can affect chunk splitting/IDs, so small reductions should not be read as an optimization result.

| Route | Raw JS delta | Sum of per-chunk gzip delta |
|---|---:|---:|
| `/iot` | -2,690 bytes | -1,537 bytes |
| `/docs/installation` | -2,542 bytes | -1,347 bytes |
| `/components` | -330 bytes | -430 bytes |
| `/create` | -2,327 bytes | -1,128 bytes |

No new dependency or lockfile change. Next's rounded first-load summary is about 499kB for `/iot`, 521kB for installation and 489kB for `/components`; no sampled route bundle increase was observed.

## Files changed

Five website source files: `copy-button.tsx`, `code-pre.tsx`, `docs-page-actions.tsx`, `iot/device-showcase.tsx`, and `examples/iot/harness.tsx`. Infrastructure: root package script and CI workflow. Audit: canonical Markdown report, grouped inventory, per-site JSON inventory and exception/debt ledger. Verification: AST guard, its negative-control test, focused browser runner, this results report and compact JSON evidence. No library implementation, URL contract, analytics callback, device state machine, generated snippet or dependency changed.

## Limits and merge recommendation

Local checks are focused on this consumer-only Wave 1. No component-library implementation changed, so full Storybook browser/visual suites and the Storybook-only large-text runner were not rebuilt; real site browser checks above provide the relevant reflow/a11y evidence. No claim is made about every route, every overlay state, all input methods, physical devices or all remaining B/C debt. The full source audit and source ratchet cover more files than the behavioral sweep.

**Recommendation:** keep this PR draft until the active Tabs/platform-filter work is finalized and ordering is agreed. Once that work lands, rebase, shrink the native-pattern ledger and refresh the descriptive inventory; run PR CI and the focused browser checks on the combined result. Wave 1 is locally validated and reviewable; do not merge automatically.
