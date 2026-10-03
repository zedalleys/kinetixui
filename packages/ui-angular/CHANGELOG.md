# @kinetixui/angular

## 0.25.0

### Minor Changes

- c33a295: Add the content wave: twelve components, taking the Angular catalogue from 31 to 43 of 98.
  
  `KxBanner`, `KxButtonGroup` (with `KxButtonGroupSeparator` and `KxButtonGroupText`),
  `KxCircularProgress`, `KxCodeBlock`, `KxDescriptionList` / `KxDescriptionListItem`, `KxFab`, `KxImage`,
  `KxInform`, `KxList` / `KxListItem`, `KxMarquee` (with `KxMarqueeContent`), `KxPageHeader`, and
  `KxTimeline` / `KxTimelineItem` — eighteen exported symbols in all.
  
  Angular remains **Preview**. 53 components are still planned, and this release does not change that: the
  maturity of a platform is not a function of how many components it has.
  
  **These are Angular components, not translated React ones.** Each is a standalone directive or component
  with `OnPush` change detection and signal inputs, and each is a directive on the element HTML already has
  for the job wherever one exists — `[kxButtonGroup]` on a `<div>`, `[kxFab]` on a `<button>`, `[kxList]` on
  a `<ul>`, `[kxTimeline]` on an `<ol>`, `[kxDescriptionList]` on a `<dl>`. That keeps the platform's own
  semantics instead of restating them in ARIA, and it is why a pressable list row is a real `<button>` inside
  a real `<li>` rather than a `<div role="button">`: the keyboard contract comes with the element.
  
  Two places where the Angular idiom differs from React's on purpose. Icons arrive by content projection
  rather than from an icon package, so using a banner does not pull a dependency into your bundle — with
  one exception that matters: dismiss and copy buttons ship a built-in glyph as `<ng-content>` fallback,
  because an empty button is a few pixels of nothing and the only people who could find it are the ones
  reading its `aria-label`. Project `[kxDismissIcon]` or `[kxCopyIcon]` to replace the default. Actions
  arrive as content plus an `output()` rather than as an `action={{ label, onClick }}` object, because in
  Angular a label is content and a click is an event:
  
  ```html
  <kx-inform variant="error" dismissible (dismiss)="hide()">
    We could not reach the server.
    <button kxInformAction type="button" (click)="retry()">Try again</button>
  </kx-inform>
  ```
  
  Accessibility is implemented, not assumed. `KxCircularProgress` omits `aria-valuenow` entirely when it has
  no value, because an indeterminate bar reporting 0 claims something different from "we do not know yet".
  `KxCodeBlock`'s file switcher is a real tablist whose arrow keys resolve against the document direction, so
  ArrowLeft advances in an RTL page, and its copy button reports the result through a live region rather than
  only swapping an icon. `KxPageHeader` takes a heading `level` rather than hard-coding `<h1>`, so the
  document outline survives being used twice. `KxDescriptionListItem` is a component with an attribute
  selector on a `<div>`, so a list renders as `<dl><div><dt>…</dt><dd>…</dd></div></dl>` — a `dl`'s content
  model allows `dt`/`dd` directly or grouped in a `div`, and a custom element is neither. `KxImage` resets
  to loading whenever `src` changes, so a source that failed once does not keep its fallback for ever. `KxMarquee` renders its content twice for a seamless loop,
  hides the duplicate from assistive technology, and stops animating under `prefers-reduced-motion: reduce`
  while staying scrollable. Dismissible surfaces emit an event rather than hiding themselves — the caller owns
  that state — and their dismiss button takes its accessible name as an input, because this package ships no
  translations and a button labelled in the wrong language is worse than one you named yourself.
  
  Every value in the new styles resolves to a generated token, and every box uses logical properties, so all
  twelve mirror under `dir="rtl"` without a second rule.
  
  The package still reaches no browser global: `KxCodeBlock` gets the clipboard through its own host
  element's document, so the bundle stays usable where there is no `navigator`.

### Patch Changes

- 93f21e7: Accept `@kinetixui/tokens` 0.24.x as a peer.
  
  `@kinetixui/angular` peer-declared `@kinetixui/tokens` as `^0.23.0`, and 0.24.0 falls outside
  that range. The peer is now `>=0.23.0 <0.25.0`, written as an explicit span rather than
  `^0.23.0 || ^0.24.0` — the two accept exactly the same versions, but the caret form embeds the
  string `0.24`, which is also `@kinetixui/angular`'s own version, and the repository guards against a
  token peer that tracks Angular's version instead of the token contract. Nothing in `@kinetixui/tokens` changed to cause the bump: the token sources and every
  built artifact are byte-identical to 0.23.3. It moves only because `@kinetixui/tokens` shares a
  version line with `@kinetixui/ui` through the Changesets `fixed` group, and `@kinetixui/ui` took a
  minor for the motion pass.
  
  So the widened range is a claim that holds on inspection rather than an assumption: there is no
  0.24.0 token change for Angular to be incompatible with. A published `package.json` cannot be
  edited, so the new range only reaches consumers as a release — hence this changeset. The
  alternative the release gate offers, holding `@kinetixui/tokens` inside `^0.23.0`, would have meant
  publishing the `@kinetixui/ui` motion work as a patch, and a base layer that adds `!important`
  animation and transition rules to `*`, `::before` and `::after` in a consumer's stylesheet is not a
  patch.
- 476f316: Establish the surface model, and give Card a finished resting state and an opt-in interactive contract.
  
  **New token: `surface-grouped`.** The grouped section raised content sits on — a settings group, a dashboard
  region. Light is the grey of `muted` (`#f6f6f6`); dark is `blue.850` (`#081219`), between the page and
  `card`. It is its own role because dark `muted` is lighter than `card`, so a card placed on a `muted`
  section read as recessed in dark mode. Emitted to every platform output (`--surface-grouped`,
  `KinetixColors.surfaceGrouped`, `color_surface_grouped`, `KinetixColorScheme.surfaceGrouped`) and mapped in
  the Tailwind preset as `bg-surface-grouped`. `muted-foreground` clears AA on it in both themes (4.79:1 / 8.48:1).
  
  **Card looks raised without a heavy stroke.** Its edge is now `--border` at half strength, so it no longer
  draws the same line as the inputs and buttons inside it, and it rests on the `md` step of the elevation
  ladder instead of `sm`, whose 5% shadow did not visibly render. Both stay on tokens, so Create's surface
  treatments still apply. Visual change only; no class a consumer passes is overridden. `.kx-card` in
  `@kinetixui/angular` takes the same resting treatment.
  
  **`Card` gains `asChild`.** A Card stays static by default — no hover, no pointer cursor. Rendered as an
  `<a href>` or `<button>` through `asChild`, it takes interactive states keyed on that element: hover (on
  pointers that can hover) strengthens the edge and lifts to `lg`; pressed drops to `sm` with a `muted` wash;
  `aria-pressed="true"` or `aria-current` draws a 2px `--primary` edge; keyboard focus shows the shared
  `shadow-focus` ring above every other state. The hover elevation transitions over `duration-fast` and is
  removed under `prefers-reduced-motion`. `CardProps` is exported. Additive; existing usage is unchanged in API.

## 0.24.0

### Minor Changes

- 8618991: `@kinetixui/angular` becomes an installable package.
  
  Thirty-one components, built AOT with strict template checking, shipped as the Angular Package
  Format output ng-packagr generates: standalone directives and components with no NgModule, so a
  template imports the ones it uses and nothing else. Styling comes from the same generated token
  contract as every other KinetixUI platform — `@kinetixui/tokens` is a peer dependency, and
  `@kinetixui/angular/styles.css` spends those custom properties rather than defining a second set.
  
  Still **Preview**: the API may change, and the catalogue is a foundation subset rather than parity
  with the React set. It also versions on its own from here — it is no longer part of the release
  train that keeps `@kinetixui/{tokens,ui,cli}` on a single version, so an Angular change no longer
  moves those three.

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
