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
- 076fd5c: Wave A: the rest of the input family, interactive cards, and browser evidence for everything the package
  ships. The Angular catalogue goes from 43 to 46 of 98.
  
  **New components.** `KxInputGroup` (with `KxInputGroupInput`, `KxInputGroupAddon`, `KxInputGroupText` and
  `KxInputGroupButton`), `KxInputOtp` and `KxRating` — seven exported symbols.
  
  - `kx-input-group` is one bordered field around a real `<input kxInputGroupInput>`, so forms, labels,
    `readonly` and `aria-invalid` work on the input and the shell follows the composite-field contract.
  - `kx-input-otp` is one real input with `autocomplete="one-time-code"` under `aria-hidden` cells: SMS
    autofill, whole-code paste and a single labelled field for assistive technology. `[groups]="[3, 3]"`
    splits the cells, `allow` picks digits or alphanumeric, and `completed` fires when the code is full.
  - `kx-rating` is a `radiogroup` of real radios named "1 star" … "5 stars": one tab stop, arrows (mirrored in
    RTL), Home and End, hover preview, and a `readonly` form that is a single image named "Rated 4 out of 5".
    This deliberately differs from React's Rating, which uses `aria-pressed` buttons without arrow keys.
  
  **Additions to existing components.** `kxCard` on a real `<a href>` or `<button>` gives a card the interactive
  states (hover, pressed, focus, and selected through `aria-current` or `aria-pressed`). `kx-card` stays static.
  `kx-number-input` gains `readonly`.
  
  **Fixes found by the new browser evidence.**
  
  - Single-select `kx-toggle-group` radios had no accessible name: projected content only reached one of the
    two branches. Toggle-group items were also 20px tall with no size class; they now use the `md` toggle size.
  - Tab panels had no `id`, so each tab's `aria-controls` pointed at nothing.
  - Under `forced-colors: active` no control had a visible focus indicator, because box-shadow rings are
    removed in that mode. Focusable controls now draw an outline there.
  - Selection controls, toggles and the slider were sized in px and did not grow at 200% text. They are now
    rem, with identical geometry at the default size.
  - The stylesheet assumed `border-box` without setting it, so in an app without a CSS reset a 44px input
    rendered 62px tall. KinetixUI's own classes now set `box-sizing: border-box` at zero specificity.
  - The slider's fill was a `to right` gradient, so in RTL it grew from the wrong end. It is now an element
    placed with logical properties.
  - The circular progress spun faster than the 3s reduced-motion floor.
  
  Angular remains **Preview**: 50 components are still planned. Nothing here claims React parity beyond the
  behaviours the browser passes assert, and it is not an accessibility certification.
- dd9eed1: Wave B: navigation and disclosure. The Angular catalogue goes from 46 to 56 of 98.
  
  **New components** (37 exported symbols, standalone, on real elements wherever one carries the semantics):
  
  - `kx-accordion` with `kx-accordion-item`, `kx-accordion-trigger` and `kx-accordion-content`: each trigger is
    a real button inside a heading (`headingLevel`, default 3) with `aria-expanded` and `aria-controls`;
    `type="single"` or `"multiple"`, `collapsible`, two-way `[(value)]`; ArrowUp/ArrowDown/Home/End move between
    triggers and never open anything. A single accordion's open item that cannot close reports `aria-disabled`.
  - `kx-collapsible` with `button[kxCollapsibleTrigger]` (on your own button) and `kx-collapsible-content`.
  - `nav[kxBreadcrumb]` and its list, item, link, page (`aria-current="page"`) and separator parts.
  - `nav[kxPagination]` with `kxPaginationLink` (an anchor or a button; `current`), Previous, Next and an
    ellipsis. A disabled anchor says so, leaves the tab order and is not followed.
  - `nav[kxTableOfContents]`: entries as links with `aria-current="location"` and two-way `[(active)]`.
  - `nav[kxTabBar]` with `kxTabBarItem` (link or button, `active`, `badge`) and a projected `kxTabBarIcon`. The
    badge is read after the label ("Inbox (3)"). It is a navigation, not a tablist.
  - `ol[kxStepper]`: an ordered list with `aria-current="step"` and visually hidden "completed" text;
    horizontal or vertical, reflowing to a list in a narrow container.
  - `kxNavigationBar` (title, optional heading `level`, `infoText`, a Back button with a `(back)` output, or
    your own leading and action slots).
  - `header[kxAppBar]` with brand, `nav[kxAppBarNav]`, `kxAppBarLink` (`active`) and actions. Below 48rem the
    same `<nav>` becomes a disclosure behind a Menu button; Escape and following a link close it and return
    focus.
  - `footer[kxFooter]` with columns (each a group named by its title), links and a bottom row.
  
  **Shared contracts.** Every destination has one state language (rest, hover, pressed, focus, current,
  disabled), and "current" is always a shape as well as a colour — a bar, an outline, a pill or weight. Expand
  and collapse animate the content's height over `--duration-fast` with `--easing-enter`/`--easing-exit`, and
  under `prefers-reduced-motion: reduce` use `transition: none` and land on the same open or closed state.
  Direction glyphs that mean reading order (breadcrumb separator, Previous/Next, Back) mirror with the
  direction their own element resolves to; the accordion's chevron does not.
  
  Angular remains **Preview**: 40 components are still planned. Nothing here claims React parity beyond the
  behaviours the browser passes assert, and it is not an accessibility certification.
- 6e13ccb: Wave C1: the overlay layer and the dialog family. The Angular catalogue goes from 56 to 64 of 98.
  
  **New components** (32 exported symbols):
  
  - `kx-dialog` with `button[kxDialogTrigger]`, `dialog[kxDialogContent]` (a real `<dialog>` opened modally, with
    a built-in close button you can turn off with `closeButton="false"`), `[kxDialogTitle]`,
    `[kxDialogDescription]`, `kx-dialog-header`, `kx-dialog-footer` and `button[kxDialogClose]`. Two-way
    `[(open)]`, and a `returnFocus` input for when the trigger is not where focus should go back to.
  - `kx-alert-dialog` with `dialog[kxAlertDialogContent]` (`role="alertdialog"`, no close button, never closed by
    a press outside), `kxAlertDialogCancel` (focused first, and what Escape does) and `kxAlertDialogAction`.
  - `kx-modal`: a structured dialog (title and close, body, footer) whose `type` (`Info`, `Confirmation`,
    `Warning`, `Destructive`) chooses its actions.
  - `kx-sheet` with `dialog[kxSheetContent]` and a logical `side` (`start`, `end`, `top`, `bottom`), so `end` is
    the right edge in a left-to-right page and the left edge in a right-to-left one.
  - `kx-drawer` with `dialog[kxDrawerContent]`: a bottom panel with a grab handle; focus goes to the panel.
  - `kx-popover` with `kxPopoverTrigger`, `kxPopoverAnchor`, `kx-popover-content` (a non-modal, named dialog
    with `side`, `align` and `offset`) and `kxPopoverClose`.
  - `kx-tooltip` with `kxTooltipTrigger` and `kx-tooltip-content`: a description (`aria-describedby`), opened by
    hover after `openDelay` and at once by keyboard focus, never by touch.
  - `kx-hover-card` with `kxHoverCardTrigger` and `kx-hover-card-content`: a preview on hover intent or keyboard
    focus whose own links stay reachable.
  
  Every surface, title and description takes an `id` input, static or bound; `aria-controls`, `aria-labelledby`
  and `aria-describedby` follow it, and a generated id is used when there is none.
  
  **One overlay layer underneath them all.** Surfaces render in the browser's top layer (`showModal()` and
  `popover="manual"`) instead of being moved to a portal, so they keep their injector, styles and direction and
  need no z-index. One stack decides what Escape and an outside press close (only the topmost surface; a press
  in a popover nested in a dialog is inside both), closes nested surfaces with their parent, locks page scroll
  while any modal surface is open, holds Tab inside a modal surface and returns focus on close, to the trigger or,
  if it was removed, to the surface that contained it. Floating surfaces are placed by one function: logical
  sides, flip, shift, a size cap that turns into scrolling at 200% text, and re-placement on scroll, resize and
  layout change.
  
  **Evidence.** `check:angular-overlays` drives all eight in Chromium (keyboard, nesting, outside presses,
  scroll lock, focus restoration, axe on every open state in light and dark, forced colours, four direction
  cases, 200% text at desktop and phone width, and motion with and without reduced motion), and
  `check:overlay-visual` measures their rendered pixels in light and dark. Both run in CI.
  
  Angular stays Preview.
- 7ea47f0: Composite fields get the text-entry state contract (TOKENS.md, "Composite fields"): InputGroup, NumberInput,
  MultiSelect and InputOTP in React, and `kx-number-input` and `kx-password-input` in Angular.
  
  **The edge.** Each wrapper is one field. Its edge was `--input`, measured at 2.21:1 (light) and 2.44:1 (dark) on
  a card, below the 3:1 SC 1.4.11 asks of the only thing marking where an empty field is. It is now
  `--muted-foreground` at 80%, as on Input: 3.41:1 and 5.40:1. Internal dividers (InputGroupButton, NumberInput's
  steppers) stay `--input`, deliberately quieter than the field's edge.
  
  **States.** Hover steps the edge to full `--muted-foreground`, never over focus, invalid, read-only or disabled.
  Focusing the input draws the field's focus ring on the wrapper; focusing a button inside the field (InputGroupButton,
  a NumberInput stepper, Angular's reveal toggle) draws only that button's inset ring, where before both lit at
  once. `aria-invalid="true"` now gives NumberInput, MultiSelect and InputOTP a destructive edge (they had no invalid
  state), kept under the pointer and focus. Read-only InputGroup and NumberInput get the inset `--muted` fill, and a
  read-only NumberInput's steppers are disabled: they used to change the value.
  
  **Shape.** MultiSelect takes the field radius (`rounded-sm`) and its placeholder the field's `body-md`. NumberInput
  is sized by its input's padding instead of a fixed `h-10`, so it matches Input and InputGroup (46px) in a row.
  InputOTP's slots drop `shadow-sm`.
  
  **Angular API.** `kx-number-input` and `kx-password-input` gain `aria-invalid` and `aria-describedby` inputs,
  forwarded to the inner input. Before, neither could be marked invalid or tied to its error text accessibly.
  
  Verified on rendered pixels by the new `check:composite-visual` (React + Angular, light and dark): 64 contract
  failures on main before this change, 0 after. Angular remains Preview.

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
- 882b78c: Colour and theming correctness. One theme now means one thing in the preview, the CSS and every native export.
  
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
- 6ef6f20: Icon contract: a replaceable dismiss icon and correct direction.
  
  `Banner` and `Inform` take a `dismissIcon` (any `ReactNode`). The button keeps its "Dismiss" name and sizes the icon to 14px, so your own icon needs neither. Leaving it out keeps lucide's `X`.
  
  Directional icons now turn around in right-to-left layouts: `NavigationBar`'s back chevron, `Pagination`'s previous and next, the `Breadcrumb` separator, and the collapsed `TreeView` and `JsonViewer` chevrons. An expanded disclosure only rotates, and close, check and accordion icons do not mirror.
  
  `@kinetixui/angular`: an icon projected into `[kxDismissIcon]` or `[kxCopyIcon]` is now sized by the slot. Before, a projected `<svg>` with no width rendered at the browser default of 300x150.
- f9ccf75: Selection controls get one state contract (TOKENS.md, "Selection controls"), in React and Angular.
  
  - **Checkbox and RadioGroup:** the unchecked edge is now `--muted-foreground`, so the control itself clears SC 1.4.11's 3:1 (it was `--input`, 2.2:1). The invalid state now renders in React: `aria-invalid:` is not a Tailwind 3 variant, so `aria-invalid="true"` used to change nothing on screen; it is now a `--destructive` edge (and fill when checked) that hover does not erase.
  - **Checkbox, RadioGroup, Switch:** hover draws a `--foreground` state layer (8%) around the control and press deepens it (14%); the focus ring can no longer be covered by either; disabled controls do not respond.
  - **SegmentedControl:** the track is `--surface-grouped` and the chosen segment is a small raised surface (`--card`, half-strength `--border` edge, `sm` depth). In dark mode the chosen segment used to sit below its track. An unchosen segment now answers hover and press.
  - **Angular:** the same contract in `styles.css` for `kx-checkbox`, `kx-radio`, `kx-switch` and `kx-segmented-control`, and the checkbox and switch transitions (including the thumb) now stop under `prefers-reduced-motion`. The README's component count, list and symbol count are corrected (43 components, 94 symbols).
  
  No props, exports or tokens were added or removed.
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
- 7ffccd3: Text entry and tabs get one state contract (TOKENS.md, "Text entry and navigation"), and the Switch thumb
  follows its own direction.
  
  **Fields: Input, Textarea, Select's trigger, NativeSelect.** The resting edge was `--input`, measured at 2.21:1
  (light) and 2.44:1 (dark) on a card, which is below the 3:1 that SC 1.4.11 asks of the only thing marking where
  an empty field is. It is now `--muted-foreground` at 80%: 3.41:1 and 5.40:1. Hover used to change no pixel.
  Now a pointer that can hover steps the edge to full `--muted-foreground`. It never does so on a field that is
  focused, open, invalid, read-only or disabled, so hover cannot take over a stronger state. Read-only Input and
  Textarea get an inset `--muted` fill and no hover, so they no longer look editable. NativeSelect shows its
  empty-valued placeholder option in `--muted-foreground`, as the other fields show placeholders.
  
  **Tabs.** The list is now an inset `--surface-grouped` well and the selected tab is a small raised surface on
  it: `--card`, the Card's half-strength edge, and `sm` depth. Before, in dark mode the selected tab sat below
  its list (`--background` on `--muted`). An unselected tab answers hover with the same 8% `--foreground` layer
  as the selection controls. The focus ring is drawn above the selected surface. At 200% text, tabs wrap inside
  the list instead of running off a narrow page (`min-h-9 flex-wrap`, which is identical at the default size).
  
  **Switch.** A checked switch inside an LTR section of an RTL page drew its thumb 22px outside the track. This
  happened because Tailwind's `rtl:` variant matches any rtl ancestor. The thumb now travels with
  `inset-inline-start`, which the browser resolves against the switch's own direction.
  
  **Angular.** The same contract is in `styles.css` for `kxInput`, `kxTextarea`, `kxNativeSelect` and the tabs
  (Angular keeps its underlined tab strip). It also fixes four Angular defects:
  
  - A disabled tab changed colour on hover.
  - An invalid native select drew the default focus ring instead of the destructive one.
  - `kx-input` and `kx-tab` were missing from the reduced-motion list.
  - `kx-switch` had the same mixed-direction thumb defect as React.
  
  No API changed, and no token was added.

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
