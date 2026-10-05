---
"@kinetixui/tokens": minor
"@kinetixui/ui": minor
"@kinetixui/angular": patch
---

Colour and theming correctness. One theme now means one thing in the preview, the CSS and every native export.

- **`primary` pins cascade.** Pinning `primary`, `primary-foreground` or `ring` in Create's Advanced panel moves `action`, `action-foreground`, `link` and `focus` with it, in light and dark, as the token source's own aliases already said. Previously the web CSS followed, the preview did not, and the SwiftUI, Compose and Flutter exports kept the shipped blue. A role pinned on its own still wins; hover and pressed are regenerated.
- **New role `scrim`** (black 40% light, 60% dark): the backdrop behind Dialog, Alert dialog, Sheet, Drawer, the command menu, Tour and Angular `<dialog>` (`bg-scrim`, `--scrim`), and Sheet, Dialog and Sidebar on SwiftUI and Flutter, Sheet and Sidebar on Compose. React previously used `foreground` at 40%, which lightened the page in dark mode.
- **New role `on-info-container`**: text on a tinted info container. Web `text-info-on-container` already existed; Banner and Inform now read it on SwiftUI, Compose and Flutter (4.19:1 -> 6.47:1 in light).
- **Status focus rings follow their roles.** `shadow-focus-destructive`, `-success` and `-warning` read `--destructive`, `--success` and `--warning`. The light destructive ring changes from `#ec5047` to the role `#c60a0a` (3.62:1 -> 6.09:1 on the page).
- **NavigationMenu trigger** draws a `ring-ring` focus ring (its only cue was a 1.08:1 background change).
- `modal.tsx` uses `shadow-xl` instead of an equal literal.

Native integrators: `KinetixColors` gains `onInfoContainer` and `scrim`.

- **SwiftUI and Flutter**: optional parameters with defaults, so every existing theme compiles unchanged. Swift lets a defaulted parameter be omitted and Dart's are named, so neither platform's call sites move.
- **Compose**: two defaulted parameters on the `KinetixColors` data class, before `chart`, which stays last because the Create exporter emits the chart list last and `compose.test.ts` reads the data class to hold the two in step. Named-argument callers are unaffected, which is every call site in and out of this repository — a 35-field colour set is not written positionally. Positional callers, `componentN()` destructuring and JVM **binary** compatibility are not preserved: the primary constructor and the generated `copy` gain parameters, so anything compiled against an earlier build needs recompiling. No placement could have kept binary compatibility; this one is taken deliberately rather than worked around.
- **Semver consequence in this repository**: none for the versioned packages. Changesets version the npm packages, and this change does not alter the public surface of `@kinetixui/tokens`, `@kinetixui/ui` or `@kinetixui/angular` beyond the two new roles already described. `com.kinetixui:ui-compose` has never been released (`platform-parity.json`: `published: false`; `publish-compose.yml` is manual-dispatch and defaults to a dry run), so no consumer is compiled against the old signature and there is no version to break. The fields are present from its first publication, with no migration step.
- `pnpm check:compose-api` now snapshots that parameter list to `packages/ui-compose/colors-api.json` and holds `chart` last, so the next role cannot arrive without the diff saying so and without this consequence being restated.
