# KinetixUI (SwiftUI)

SwiftUI port of KinetixUI — the iOS counterpart to
[`packages/ui-compose`](../ui-compose) (Jetpack Compose). Built in
batches the same way the Compose library was. **68 components** — the
full React component surface bar three deliberate non-ports:
`KinetixButton`, `KinetixBadge`, `KinetixTag`, `KinetixLabel`,
`KinetixSeparator`, `KinetixSkeleton`, `KinetixSpinner`,
`KinetixProgress`, `KinetixCircularProgress`, `KinetixCard` (+ `Header` /
`Title` / `Description` / `Content` / `Footer`), `KinetixAspectRatio`,
`KinetixCheckbox`, `KinetixSwitch`, `KinetixToggle`, `KinetixSlider`,
`KinetixRadioGroup` / `KinetixRadioButton`, `KinetixRating`,
`KinetixInput`, `KinetixTextarea`, `KinetixNumberInput`,
`KinetixPasswordInput`, `KinetixField` (+ `Label` / `Description` /
`Message`), `KinetixAvatar` (+ `Fallback`), `KinetixAlert` (+ `Title` /
`Description`), `KinetixAccordion` (+ `Item` / `Trigger` / `Content`),
`KinetixCollapsible`, `KinetixList` / `KinetixListItem`, `KinetixStepper`,
`KinetixTabsList` / `Trigger` / `Content`, `KinetixBreadcrumb` (+ `Link` /
`Page` / `Separator`), `KinetixPagination` (+ `Item` / `Previous` /
`Next` / `Ellipsis`), `KinetixQuote`, `KinetixMetric`, `KinetixFab`,
`KinetixDialog` (+ `Header` / `Footer` / `Title` / `Description`),
`KinetixAlertDialog` (+ `Action` / `Cancel`), `KinetixSheet` (bottom;
`Header` / `Footer` / `Title` / `Description` alias the Dialog parts),
`KinetixTooltip`, `KinetixPopover`, `KinetixHoverCard`,
`KinetixDropdownMenu` (+ `KinetixMenuItem` / `KinetixMenuSeparator` /
`KinetixMenuLabel`, shared), `KinetixContextMenu`, `KinetixMenubar` /
`KinetixMenubarMenu`, `KinetixToggleGroup` / `KinetixToggleGroupItem`,
`KinetixScrollArea`, `KinetixImage`, `KinetixInputGroup` (+ `Input` /
`Text` / `Addon` / `Button`), `KinetixTableOfContents`, `KinetixFooter`
(+ `Column` / `Link` / `Bottom`), `KinetixSelect`, `KinetixDrawer`
(bottom; parts alias the Dialog parts), `KinetixModal`,
`KinetixNavigationBar` (+ `KinetixNavigationBackButton`), `KinetixAppBar`
(+ `KinetixAppBarLink`), `KinetixTabBar`
/ `KinetixTabBarItem`, `KinetixCodeBlock`, `KinetixDatePicker`,
`KinetixInputOtp`, `KinetixToaster` / `KinetixToast`, `KinetixTable`
family, `KinetixDataTable` (+ `KinetixDataColumn`), `KinetixCarousel`,
`KinetixFileUpload` (+ `KinetixFileItem`), `KinetixAudioPlayer`,
`KinetixResizablePanels`, `KinetixCommandDialog` (+ `Group` / `Item` /
`Separator`), `KinetixSidebar` / `KinetixSidebarItem`, `KinetixCalendar`,
`KinetixChart` (+ `KinetixChartPoint`, over the system `Charts`
framework).

### Not ported (deliberate)

Matching the Compose port's known-gaps stance:

- **`Form`** — `KinetixField` (+ `Label` / `Description` / `Message`) is
  the equivalent; there's no `react-hook-form`-shaped context to wrap.
- **`NavigationMenu`** — a hover-triggered desktop mega-menu with no
  touch idiom.
- **`Combobox`** — a recipe (Popover + Command) on the web, not a
  standalone component; compose `KinetixPopover` + a filtered list, or
  use `KinetixSelect`.

- `Sources/KinetixUI/Theme.swift` — `KinetixColors` (the semantic colour
  set), `@Environment(\.kinetixColors)`, and the `KinetixTheme { … }`
  wrapper that picks light/dark off the system `colorScheme`. The SwiftUI
  analogue of Compose's `KinetixColorScheme` / `KinetixTheme`.
- One file per component, each mirroring its
  `packages/ui/src/components/*.tsx` counterpart 1:1, with a doc comment
  stating what wasn't carried over.
- `Sources/KinetixUI/KinetixColorsSwiftUI.swift` / `.dark.swift` —
  **generated, vendored.** Do not hand-edit. Re-run
  `node scripts/vendor-swiftui-tokens.mjs` (or `pnpm vendor:swiftui`)
  after `pnpm build:tokens`.

## Standalone SwiftPM package

There's no `package.json` here on purpose — `pnpm-workspace.yaml`'s
`packages/*` glob only registers a directory with a `package.json`, so
this stays invisible to `pnpm install` / Turborepo, exactly like
`packages/ui-compose`. It lives in the monorepo only for proximity to the
token source it depends on.

Not on the SwiftPM registry. Consume it from a repo checkout:

```swift
.package(path: "../kinetixui/packages/ui-swiftui")
```

## Tokens: SwiftUI `Color`, not `UIColor`

The existing iOS token output (`packages/tokens/dist/ios/KinetixColors.swift`,
`Theme.swift`) is `UIColor`-based. `UIColor` is UIKit-only — it does not
compile on macOS, so a package that must `swift build` on a macOS CI
runner can't consume it. The token engine emits a **parallel SwiftUI-`Color`
semantic set** for this library
(`KinetixColorsSwiftUI` light / `KinetixColorsSwiftUIDark` dark), added in
`style-dictionary/sd.config.mjs`'s `ios-swiftui-theme` platform block. The
UIColor output is untouched — this is purely additive, mirroring how
Android has `Color.kt` alongside `Theme.kt` / `Theme.dark.kt`.

Unlike every other native platform, this set runs on **both** the light
and dark Style Dictionary passes — a `KinetixTheme` needs real values for
each.

## Usage

```swift
import KinetixUI
import SwiftUI

struct ContentView: View {
    var body: some View {
        KinetixTheme {
            VStack(spacing: 12) {
                KinetixButton(action: {}) { Text("Save") }
                KinetixButton(variant: .outline, size: .sm, action: {}) { Text("Cancel") }
                KinetixButton(variant: .destructive, action: {}) { Text("Delete") }
            }
        }
    }
}
```

## Verification

The dev environment has no Swift toolchain. `.github/workflows/native-swiftui.yml`
(`macos-latest`, `swift build`, path-filtered to
`packages/ui-swiftui/**` + `tokens/**` + `style-dictionary/**`) is the
sole compiler feedback.

## Type scale

`Sources/KinetixUI/KinetixType.swift` is **generated, vendored** (same
flow as the colour set — `pnpm build:tokens` then `pnpm vendor:swiftui`).
`TypeScale.swift` exposes it as named `Font`s — `Font.kinetixBody`,
`.kinetixLabelMd`, `.kinetixTitleMd`, … — and the component views apply
those via `.font(…)`. `KinetixTextStyle` + `KinetixType.<style>` are
public for your own text. Letter-spacing is still a sibling `.tracking(…)`
on the `Text` (SwiftUI has no single text style that also carries
tracking) — a combined modifier is a possible follow-up.

## Not in this pass

- A tagged SPM release — needs repo/signing decisions; consume via
  `.package(path:)` for now.
