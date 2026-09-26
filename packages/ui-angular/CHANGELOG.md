# @kinetixui/angular

## 0.23.0

### Minor Changes

- 34e5b06: New package: `@kinetixui/angular`, KinetixUI's Angular implementation.
  
  Eleven standalone components — Button, Badge, Card, Input, Label, Checkbox, Switch, Alert, Separator,
  Progress and Tabs — built on the same generated design tokens as React, SwiftUI, Jetpack Compose and
  Flutter. No Angular-specific token system: the package ships one stylesheet that spends the CSS custom
  properties `@kinetixui/tokens` already generates.
  
  Angular 21 (LTS), standalone components with signal inputs, `ControlValueAccessor` on both toggles, and
  zoneless-compatible. Built with `ng-packagr` under `strictTemplates` and covered by behaviour tests for
  roles, keyboard interaction, disabled state, forms integration and RTL — both run in CI.
  
  Overlay components (Dialog, Select, Popover, Tooltip, DropdownMenu, Sheet) are deliberately not in this
  release: they share one overlay/portal architecture that should be designed once for all of them.
- 6f5cce9: Five-platform component guidance, Angular waves 1–2, and a Compose chart.
  
  **Every component page now represents all five platforms truthfully.**
  `components.manifest.json` gains `platformGuidance`: for every (component,
  platform) pair with no implementation, one of `native-equivalent`,
  `composition` or `planned` (with a delivery wave). `platforms` keeps its single
  meaning — a real KinetixUI implementation — so guidance never counts towards
  parity anywhere on the site. `pnpm check:manifest` fails if any pair is
  uncovered; `pnpm check:platform-code` fails if guidance promises a snippet and
  has none, or if a snippet sits under a `planned` gap.
  `platform-code-compositions.json` is folded into the manifest and deleted.
  
  **`@kinetixui/angular` (preview) gains 20 components**, taking it from 11 to
  31: `KxAspectRatio`, `KxAvatar`/`KxAvatarImage`/`KxAvatarFallback`/
  `KxAvatarGroup`, `KxKbd`/`KxKbdGroup`, `KxSkeleton`, `KxSpinner`, `KxTag`,
  `KxQuote`, `KxMetric`, the `KxEmpty` family, `KxTextarea`, `KxNativeSelect`,
  `KxRadioGroup`/`KxRadio`, `KxSlider`, `KxNumberInput`, `KxPasswordInput`, the
  `KxField` family, `KxToggle`, `KxToggleGroup`/`KxToggleGroupItem` and
  `KxSegmentedControl`/`KxSegment`. Radio groups, sliders, number inputs,
  segmented controls and single-select toggle groups are built on real native
  form controls, so arrow-key selection, roving focus, `aria-valuenow` and the
  form value come from the browser rather than from an ARIA re-implementation.
  
  **Breaking (preview package):** `kxInput` no longer matches `<textarea>`. A
  multi-line field is `<textarea kxTextarea>`, matching the React package's
  Input/Textarea split, which have different metrics.
  
  **Jetpack Compose gains `KinetixChart`** — Canvas-drawn bar and line charts
  over the generated `--chart-1…5` palette, the same decision the Flutter port
  made. This was the last partial platform gap: all four catalogue-complete
  platforms now carry 90 of 98 components.
  
  Angular remains **Preview**. `/docs/angular` now lists what is left by delivery
  wave, derived from the manifest, and states the package-level gates that
  Stable would require.
