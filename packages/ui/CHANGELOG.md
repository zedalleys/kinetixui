# @kinetixui/ui

## 0.24.0

### Minor Changes

- de94621: Give Collapsible the disclosure motion it shipped without, and put Accordion's timing back under the tokens.
  
  `Collapsible` was three Radix primitives re-exported untouched. Its content appeared and vanished in
  a single frame while `Accordion` — the same disclosure gesture on a sibling primitive — animated its
  height. Measured in a browser before this change, the content went 0px to 84px with no animation at
  all, against the accordion's 0px → 24.64px → 36px over 200ms. Disclosure is the case where motion
  carries meaning rather than decorating it: content growing out of the trigger is what says it belongs
  to the control you just pressed and where it will go when you press it again.
  
  `CollapsibleContent` is now wrapped rather than re-exported, so it carries `overflow-hidden` and the
  open/closed animation and merges a caller's `className` the way every other component here does. The
  props, the ref and the data attributes are still the primitive's own.
  
  **Accordion's timing was hard-coded.** `0.2s ease-out` happened to equal `--duration-fast` and to be
  the same curve as `--easing-enter`, so the values were right and the provenance was not: changing the
  token would have moved every other transition in the system and left disclosure behind. Both
  disclosure animations now read the tokens, and use the directional pair those easings exist for —
  opening decelerates, closing accelerates. Nothing moves at a different speed than before.
  
  The preset gains `animate-collapsible-down` / `animate-collapsible-up` and the keyframes behind them,
  which is additive and the reason this is a minor rather than a patch. `caret-blink` and `typing-dot`
  deliberately keep their literal timings: they are looping affordances rather than state transitions,
  and retiming them to the nearest token would change how they look to buy a consistency nobody asked
  for.
  
  **What a consumer sees.** A Collapsible that previously snapped now takes 200ms to open and close,
  and its content is clipped while it does. Under `prefers-reduced-motion` it lands instantly on the
  same end state, as it did before. Nothing else in the catalogue changes: Accordion renders
  identically, and no other component's timing moved.
- 93f21e7: Wire the unreachable motion tokens, and give every component a reduced-motion floor.
  
  Four motion tokens were defined in `tokens/primitives/motion.json` and emitted into `globals.css`,
  but never mapped in the Tailwind preset, so no class could reach them: `--duration-instant` and the
  `--easing-enter` / `--easing-exit` / `--easing-emphasized` trio. The preset now exposes them as
  `duration-instant`, `ease-enter`, `ease-exit` and `ease-emphasized`, added alongside Tailwind's own
  scales rather than replacing them. Directional easing is the point of the enter/exit pair — a
  surface that opens should decelerate and one that closes should accelerate — and until now you
  could not say that in a utility.
  
  The preset also emits a `prefers-reduced-motion: reduce` base layer. This package ships no CSS of
  its own, so the preset is the only place a library-wide guarantee can live, and it was missing:
  `tailwindcss-animate` emits no reduced-motion rule, so every `animate-in` / `animate-out` on Dialog,
  Sheet, Popover, Dropdown, Tooltip and the rest ran at full motion in a consumer's app no matter what
  the operating system asked for. The rule shortens durations to `0.01ms` rather than removing motion,
  which is the safety property: the end state still arrives, so a Switch thumb is still translated and
  a checked box is still checked, and Radix still gets the `animationend` it unmounts overlays on.
  `animation: none` would strand those overlays in the tree.
  
  Twenty components were then moved off untokenised values onto the scale — overlays adopt a
  consistent open/close pairing (`duration-fast ease-enter` in, `duration-instant ease-exit` out), and
  press-feedback controls adopt `duration-instant`. Several `transition-all` declarations were
  narrowed to the properties that actually animate, so a transition no longer fires on layout and
  paint properties it was never meant to touch. `Tour` additionally checks the preference in
  JavaScript before calling `scrollIntoView`, because an explicit `behavior: "smooth"` overrides the
  CSS `scroll-behavior` the base layer sets.
  
  Consumers inherit the base layer by extending the preset; no configuration or migration is needed.
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
- aff358a: Make the type scale follow the reader's text size, on every platform.
  
  A font size in `px` does not respond when someone raises their browser's default text size, so the
  KinetixUI type scale could not be made bigger. Measured across all 206 Storybook stories before this
  change: **1,357 rendered elements** carrying a type-scale class, across 115 stories and 13 of the 16
  steps, every one of them unchanged at 200% text. Components that mixed `text-body-md` with Tailwind's
  own `text-sm` showed the inconsistency directly — one half of a page doubled and the other did not.
  
  **The canonical tokens were never wrong.** `tokens/primitives/typography.json` stores plain unit-less
  numbers, which is the right thing for a source that feeds five platforms. `px` was added by a transform
  that appended it to every `$type: dimension` token, so a font size was treated exactly like a border
  width. The split now happens at the transform instead, and each platform says what scalable means in
  its own terms:
  
  - **Web** — `fontSize.*` and `lineHeight.*` are emitted in `rem`; every other dimension stays `px`.
    `--font-size-body-md: 14px` → `0.875rem`, `--text-body-md: 400 14px/20px …` → `400 0.875rem/1.25rem …`.
  - **Android resources** — unchanged, and deliberately so. `dp` looks like the Android spelling of the px
    problem and is not: the Compose code reads these as `dimensionResource(id).value.sp`, and
    `dimensionResource` already divides out density after `getDimension()` has applied the font scale to an
    `sp` resource — so emitting `sp` here would apply the scale twice and render 14sp at roughly 56px
    instead of 28 at a 2x font scale. With `dp` the scale is applied exactly once, by the `.sp` at the point
    of use. This was changed to `sp` during review and reverted when that was measured.
  - **SwiftUI** — `Font.custom(_:size:)` → `Font.custom(_:size:relativeTo:)`. The two-argument form is a
    fixed size that opts out of Dynamic Type entirely; the three-argument form keeps the designed size at
    the default setting and scales from there. The text style per step is chosen by nearest default point
    size, so it is derived from the scale rather than hand-assigned.
  - **Compose and Flutter** were already correct (`.sp`, and `TextStyle` under `TextScaler`) and their
    generated output is byte-identical after this change.
  
  **Default appearance is unchanged.** Every conversion is exact, because the scale is all sixteenths:
  14 → `0.875rem`, 11 → `0.6875rem`, 57 → `3.5625rem`. At the default 16px root every step computes to
  the pixel size it always did, and measured rendered dimensions are identical — delta 0.0px across the
  representative components. Letter-spacing deliberately stays in `px`: it is an optical constant rather
  than a size the reader asked to change, the primitive tokens are shared across steps so there is no one
  font size to make it relative to, and at 0.1–0.5px scaling it would not be legible.
  
  **Why minor, and what is observable.** No token is renamed or removed and nothing rendered moves at the
  default setting, but the *value representation* changes and that is visible to anyone reading tokens
  directly: `tokens.fontSize["body-md"]` is now `"0.875rem"` rather than `"14px"`, so code that does
  `parseInt(...)` on it gets `0.875`. The same applies to `--font-size-*` / `--line-height-*` in
  `globals.css`. The native artifacts are unchanged. `@kinetixui/tokens` is Beta
  and documents that pre-1.0 it carries no compatibility guarantee, and in `0.y.z` semver a change of this
  kind is expressed as a minor — the same call the reduced-motion base layer took for the same reason.
  If you consume the token values as strings, check any arithmetic you do on them.
  
  `Select`'s value also now wraps instead of being clamped to one line, and the value span gains `min-w-0`
  with `overflow-wrap: anywhere` so a value with no break opportunity — an identifier, a URL with no
  separators — breaks instead of overflowing the trigger and pushing the chevron out of it. `line-clamp-1` was invisible while
  the text could not grow; once it could, the span needed 80px and was given 40, with a computed
  `text-overflow` of `clip` rather than `ellipsis` — so "Select a fruit" rendered as "Select a" with
  nothing to say the rest existed. The trigger's `min-h` was always meant to absorb this.

### Patch Changes

- 74688da: Fix the form family under RTL, and give MultiSelect the arrow key that opens it.
  
  **InputOTP was broken in every RTL locale.** The slots are a flex row, so `dir="rtl"` reverses them and the
  first slot moves to the right-hand end — but their divider, their outer border and their two rounded corners
  were physical. Measured in Chromium at `dir="rtl"`, with six slots: both rounded corners sat on the group's
  *inner* edges, the divider after the first slot doubled to 2px, and the outer edge at the far end had no
  border at all. The slot now uses `border-e`, `first:border-s`, `first:rounded-s-md` and `last:rounded-e-md`,
  and measures as the exact mirror of LTR in either direction.
  
  **MultiSelect, and the Command and Tag it composes.** The "Create …" row was `text-left`, `CommandInput`'s
  magnifier was `mr-2` — a gap on the far side of the icon and none between it and the field — and `Tag`'s
  remove control was nudged with `-mr-0.5 ml-0.5`, toward the right-hand edge of a chip whose end is on the
  left. All four are now logical. `CommandShortcut` moves from `ml-auto` to `ms-auto` at the same time, so a
  shortcut in a Command list sits at the inline end.
  
  **MultiSelect did not open on Down Arrow.** WAI-ARIA's combobox pattern lists it as a way to open the popup
  and it is the first thing a keyboard user tries; the handler recognised only Enter and Space, so both
  vertical arrows did nothing at all. They now open the list, which Enter and Space already did.
  
  Patch rather than minor: no API is added, removed or renamed, nothing new is available to adopt, and each
  change corrects behaviour that was already wrong. Upgrading changes how these controls render in an RTL
  locale and adds a key that should always have worked, and changes nothing in an LTR app.
  
  One packaging note: the build now writes `dist/kx-src-hash.json`, a hash of the source the artifact was
  built from. It is inert at runtime — nothing imports it — and exists so the repository's browser checks can
  refuse to measure a `dist` that no longer matches its source.
- ded4054: Fix five accessibility defects on IoT surfaces: contrast on tinted cards, and duplicate landmark names.
  
  A real-browser axe pass over the IoT stories found nine colour-contrast failures and two duplicated
  navigation landmarks. Both are genuine WCAG failures, not false positives, and both predate the pull
  request that surfaced them.
  
  **Contrast.** `--muted-foreground` is tuned against `--background` and `--muted`, where it clears AA
  at 5.17:1. IoT device, group and activity cards tint their surface to carry state, and a 10% tint
  spends the whole margin: secondary text landed at 4.43:1 on `bg-primary/10` and 4.33:1 on
  `bg-destructive/10`, under the 4.5:1 that WCAG 1.4.3 requires. The token itself is not wrong —
  `neutral.600` is a published Figma value — so the fix is a new semantic token for the surfaces that
  tint, `--semantic-muted-on-container`, exposed as `text-muted-on-container`. This follows
  `--semantic-on-info-container`, which exists for the same reason on `bg-info/10`. It clears AA on
  every tint those cards use, worst case 4.79:1, and stays visibly lighter than `--foreground` so the
  type hierarchy is unchanged. Dark mode needed no new value and reuses `--muted-foreground`: a tint
  lightens a dark surface away from its text rather than toward it, so dark was already at 6.9–8.4:1.
  
  `DeviceControlCard`, `DeviceGroupCard`, `DeviceIdentity` and `ActivityTimeline` now use it for the
  text that sits on those surfaces. Nothing is restyled beyond the colour of that text.
  
  **Landmarks.** `SpaceBreadcrumb` named its `<nav>` "Location" for every instance, so a screen
  listing several places produced several identically-named navigation landmarks — which is no more
  useful than none when picking one from a landmark list. The accessible name now defaults to
  `Location: <current place>`, taken from the last item in `path`, and remains overridable with
  `label`. A breadcrumb rendered without a path still falls back to "Location".
  
  Patch rather than minor: the new token and utility exist only to carry the correction. Nothing is
  removed or renamed, no consumer has to adopt anything, and upgrading changes what was already wrong
  rather than adding capability to take up.
- 8ecbad9: Update lucide-react to ^1.48.0.
- 6aadc97: Fix three overlay defects found by scanning and measuring the surfaces while they were open.
  
  **Popover shipped an unnamed dialog.** Radix gives `PopoverContent` `role="dialog"`, and nothing named it,
  so a screen reader announced the single word "dialog" — WCAG 4.1.2, on every Popover in the library. There
  is now a fallback accessible name. It is only a fallback: an `aria-label` you pass wins, and
  `aria-labelledby` suppresses it entirely so a heading you point at is not shadowed. Naming your own
  popover is still better than the fallback, which says what kind of thing opened and nothing about what is
  in it.
  
  **Drawer left focus on its trigger.** Measured in Chromium with the drawer open: focus was still on the
  button, which by then sits inside a subtree the drawer marks `aria-hidden` — so a screen-reader user was
  left on an element their software had just been told does not exist. The panel now takes focus on open.
  The panel itself, not the first control inside it: `vaul` suppresses auto-focus deliberately so that a
  drawer containing a text field does not summon a mobile keyboard, and a container opens no keyboard while
  still giving the screen reader the drawer's heading to announce.
  
  **Popover, the three menus and Tooltip could grow wider than the window.** At 390px with the reader's
  default font size doubled the popover measured 576px — `w-72` is `rem`, so it doubles with the text — and
  the context menu 416px, pushing the page 186px sideways. Each surface is now capped with
  `max-w-[var(--radix-popper-available-width)]`, which is Radix's own measurement of the space it has rather
  than a viewport guess, and binds only when the surface would otherwise overflow.
  
  The cap alone was not enough, which is worth knowing if you have written one yourself: `min-width` beats
  `max-width` in CSS, and the menus carried a `rem` minimum. At 2x text `min-w-[8rem]` is 256px, so the
  context menu stayed 256px wide against a cap that had correctly resolved to 193px, with its right edge
  63px past the window and those items unreachable. The three menus' minimums now yield —
  `min-w-[min(8rem,var(--radix-popper-available-width))]` — keeping the comfortable width wherever there is
  room for it.
  
  **Both fixes compose with your own props.** The Popover name and the Drawer's focus entry were each set
  *before* the trailing `{...props}` spread, which meant the most ordinary call site undid them. Passing an
  optional name the usual way, `aria-label={maybe}` with `maybe` undefined, spread that undefined back over
  the fallback and deleted the attribute, so the unnamed dialog returned. Passing any `onOpenAutoFocus` to
  `DrawerContent` — even one that only logs — replaced the handler that moves focus, and since `vaul`
  suppresses auto-focus otherwise, focus was left on the hidden trigger again. Both props are now handled
  explicitly instead of being read back off the spread: your `aria-label` and `aria-labelledby` still win,
  your `onOpenAutoFocus` is still called, and calling `preventDefault` in it is how you take focus
  placement over yourself.
  
  Patch rather than minor: no API is added, removed or renamed, and nothing new is available to adopt. Each
  change corrects behaviour that was already wrong — an upgrade names a dialog that had no name, moves focus
  somewhere reachable, and keeps a surface inside the window at large text; in a desktop LTR app at the
  default font size it changes nothing.
  
  The `ContextMenu` example in the component registry also gets a responsive trigger (`w-full max-w-64`
  instead of `w-64`), so copying it into an app does not produce a box wider than a phone at 200% text.
- e367937: Update react-resizable-panels to ^4.13.3.
- 7de2a49: Mirror the rest of the overlay family under `dir="rtl"`.
  
  Slice 1 of the RTL conversion took Dialog, Sheet, Drawer, DropdownMenu and Select onto logical
  properties and stopped there, which left an app in Arabic or Hebrew with half a mirrored overlay set:
  open a Dialog and it reads correctly, open the ContextMenu behind it and the inset indent, the
  check gutter and the keyboard shortcut all sit on the wrong side.
  
  `ContextMenu` and `Menubar` now indent inset items with `ps-8`, place the check and radio gutter at
  `start-2`, push shortcuts with `ms-auto`, and mirror the submenu chevron with `rtl:-scale-x-100`.
  `AlertDialog` aligns its header with `sm:text-start`. `NavigationMenu` spaces its disclosure chevron
  with `ms-1` and anchors both panels at `start-0`.
  
  Two deliberate non-conversions, marked `// rtl-ok` with their reason rather than silently left:
  the `left-1/2` centring trick in `AlertDialog` and `Modal` is direction-agnostic by construction, and
  `Popover` and `Tooltip` keep their physical `data-[side=…]:slide-in-from-…` pairs because Radix has
  already resolved `data-side` to a physical side after flipping for direction and collisions — a
  logical class there would invert the animation under RTL and throw the surface the wrong way.
  
  `check-rtl.mjs` proves no physical class is left behind; it cannot prove the replacement is the right
  one or that the Radix primitive flips, which is the failure the first slice spent a pass discovering.
  `components-rtl.test.tsx` covers that half, asserting the rendered classes and the
  direction-dependent key handling. The conversion ratchet drops from 29 pending files to 22.
- 6d5c32e: Fix two defects in the selection controls: the Switch thumb under RTL, and controls that did not grow with the reader's text.
  
  **Switch, under `dir="rtl"`.** The thumb's travel used `translate-x`, which is physical. In an RTL locale the
  thumb correctly starts against the right edge — that is the start — and then moved further right: measured in
  Chromium, its left edge went from 26px to 50px on a 48px track. A switch turned on rendered as a filled pill
  with no thumb visible in it at all. It now mirrors with `rtl:data-[state=checked]:-translate-x-6`, travelling
  26px → 2px, the mirror image of the LTR 2px → 26px.
  
  **Checkbox and RadioGroupItem, at large text.** Both were sized `size-[18px]`. A reader who raises their
  browser's default font size scales `rem` and not `px`, so at 200% their labels doubled and the controls did
  not — 18×18 before and after, halving the control relative to its own text and taking its touch target with
  it, below the 24px WCAG 2.5.8 minimum. Both are now `size-[1.125rem]`: identical at the default font size,
  and scaling from there. Switch, Toggle and ToggleGroup were already rem-based and are unchanged.
  
  Patch rather than minor: no API is added, removed or renamed, and no consumer has to adopt anything. Both
  changes correct behaviour that was already wrong — an upgrade changes what a control does at a text size or
  in a direction where it was previously broken, and changes nothing otherwise.
- fca1e21: Make a table that scrolls reachable by keyboard.
  
  `Table` renders its own scroll container — `<div class="relative w-full overflow-auto">` — around the
  `<table>`. A container that scrolls and has no tab stop cannot be reached without a mouse, so a reader
  using a keyboard could see the first few columns of a wide table and had no way to get to the rest.
  That is WCAG 2.1.1, and axe reports it as `scrollable-region-focusable`.
  
  It was invisible for as long as it was, because these tables only start scrolling once something makes
  them wider than their column. The site's accessibility sweep gained a text-size axis in the previous
  change, and at 200% text the finding appeared immediately on the two pages that render this component:
  `/blocks` at 320px and `/create` at 1280px. The default-size sweep had never produced it.
  
  **It was not fixable from the call site.** `Table` forwards `className` and `ref` to the `<table>`, not
  to the wrapper, so no consumer could supply the attributes even knowing they were missing. The wrapper
  is the component's own, so the fix is too.
  
  **The contract is conditional, not blanket.** Adding `tabindex="0"` to every table wrapper would trade
  one defect for another: a tab stop on a container that cannot scroll is a stop that does nothing, and
  most tables in most layouts fit. The wrapper now measures itself — `scrollWidth > clientWidth`, with a
  1px tolerance so sub-pixel rounding does not mint a useless stop — and takes a tab stop only while that
  holds. A `ResizeObserver` watches the wrapper and the table, so a viewport change, a content change or
  the reader raising their text size all re-decide it, in both directions. This reuses the approach
  already proven in the docs site's own `useScrollable` rather than introducing a second way to answer the
  same question.
  
  **The accessible name comes from the table, or there is none.** When the table has a `<caption>`, the
  wrapper is `role="group"` labelled by it, so the focus stop is announced as the thing it actually
  contains. When there is no caption there is nothing truthful to call it, so it gets a tab stop and no
  name — a generic "Scrollable table" on every table in a page of tables tells a screen-reader user
  nothing they could act on. `role="group"` rather than `region`, because a landmark per table would
  clutter the landmark list. `TableCaption` now carries a generated id (`React.useId`, so it is stable
  across SSR and unique on a page with several tables) unless the caller supplies their own, which still
  wins.
  
  Measured in Chromium against the built site, on both pages, at 320px and 1440px, at 100% and 200% text,
  in light and dark, and with the document in LTR and RTL: the container is reached by Tab exactly when it
  scrolls, an arrow key scrolls it — negative `scrollLeft` where the element itself resolves to RTL — the
  focus ring is visible in both themes, and Tab moves on rather than trapping. The 20 views where the
  table fits its column correctly have no tab stop at all.
  
  The `scrollable-region-focusable` exception the previous change recorded against these two pages is
  removed, with no replacement: the rule is enforced everywhere again. The gate was run against the old
  component with the exception already gone, and it reported the finding on exactly those two pages; the
  same gate against the fixed component reports nothing.
  
  Patch rather than minor: no API is added, removed or renamed, nothing new is available to adopt, and the
  change corrects behaviour that was already wrong. The visible difference for a consumer is that a table
  too wide for its space now takes a focus ring when tabbed to, and that `TableCaption` renders an `id`
  when it was not given one.
- Updated dependencies [ded4054]
- Updated dependencies [476f316]
- Updated dependencies [aff358a]
  - @kinetixui/tokens@0.24.0

## 0.23.3

### Patch Changes

- @kinetixui/tokens@0.23.3

## 0.23.2

### Patch Changes

- @kinetixui/tokens@0.23.2

## 0.23.1

### Patch Changes

- @kinetixui/tokens@0.23.1

## 0.23.0

### Minor Changes

- 714c4ae: Graduate eleven audited components to lifecycle Stable, and correct four Beta APIs.
  
  **Breaking, on Beta components only.** Pre-1.0 Beta is when a bad API gets
  corrected rather than carried to 1.0 behind an alias:
  
  - **ColorPicker** — `value` and `onChange` were both required, so the picker
    could only be used controlled, and `onChange` contradicted the convention
    every other KinetixUI value control follows. Now `value?` / `defaultValue?` /
    `onValueChange?`. Migration: rename `onChange` to `onValueChange`; a
    controlled picker is otherwise unchanged.
  - **MarkdownEditor** — same two faults, same fix. The preview still escapes HTML
    on every path; a test now pins that against the state change.
  - **TreeView** — expansion and checking supported `default*`; selection did not,
    and `select` only called back, so an uncontrolled tree could never show a
    selection at all. Adds `defaultSelected`.
  - **JsonViewer** — `hideCopy` was a negative boolean whose default could not be
    stated without inverting it. Now `copyable`, defaulting to true. Migration:
    `hideCopy` → `copyable={false}`.
  
  **Accessibility fix.** A `TreeView` item's accessible name was computed from its
  contents, so an expanded node announced its whole subtree — "src" as "src
  index.ts". Items are now named by their own label.
  
  **Lifecycle promotions.** `color-picker`, `data-grid`, `diff-viewer`,
  `json-viewer`, `kanban-board`, `markdown-editor`, `message-bubble`,
  `multi-select`, `tour`, `tree-view` and `virtual-list` move from `beta` to
  `stable`, each against a documented gate rather than against a release cycle.
  `notification-center` stays Beta: its read-state ownership and its
  component-versus-Block boundary are genuinely unresolved, and the manifest now
  records that.
  
  This changes lifecycle status only. No implementation's verification level
  changed, and no package maturity changed.

### Patch Changes

- 714c4ae: Document every component's React API on its docs page.
  
  Component pages ended at `import { DataGrid } from "@kinetixui/ui"` and a
  paragraph about tokens. For a Badge that is enough; for a 792-line grid with
  column pinning, range selection and edit-in-place it is not, and "lifecycle
  stable" is meant to mean a reader can use the component without opening its
  source.
  
  Each page now renders its props — name, type, required, and the description from
  the source — from `specs/components/*.json`, which is generated from the
  TypeScript, so the table cannot drift from the props the component accepts.
  
  The table is headed **React API** and says so in as many words. SwiftUI, Jetpack
  Compose, Flutter and Angular share the design contract — the same variants,
  sizes, states and tokens — but each exposes its own idiomatic interface; their
  real usage stays in the platform tabs on the example above.
- a5564c0: Name a Tag's dismiss control after the tag, on the four platforms that didn't.
  
  A row of dismissible filter chips announced "Remove, Remove, Remove" — the
  control told a screen-reader user which button they were on but never what it
  would remove. Angular already solved this; React and SwiftUI hard-coded
  "Remove", and Compose and Flutter gave the control no accessible name and no
  button role at all, so it was neither findable by role nor readable.
  
  All four now default to `Remove <tag text>`, with a `removeLabel` override for
  the cases where the tag's text is not the right name — the same contract Angular
  already had, so the five implementations now agree.
  
  Found by writing the new `filter-panel` block, which puts three of them in a row.
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
- eff98f6: Evidence-backed implementation verification, kept separate from package maturity.
  
  Three different things were being said with one word, and the word being
  printed was the one nothing backed up: `platformDefinitions` called SwiftUI
  stable, and the only thing behind that was a filename.
  
  They are now three fields that never derive from each other — **component
  lifecycle** (is the API settled?), **package maturity** (is the offering a
  product?) and **verification** (how much automated evidence stands behind this
  implementation, on this platform).
  
  Verification is derived from the tests themselves: a marked passage declares
  what kind of verification it performs, and the components it covers are read
  from the KinetixUI symbols that passage calls. Every positive result carries
  the file and line range behind it, so `pnpm platform:matrix --verification`
  can answer "why does this say RTL verified?".
  
  Package maturity is unchanged — React stable, Angular preview, SwiftUI,
  Compose and Flutter stable. What is new is that the site no longer lets that
  word stand in for evidence. `@kinetixui/ui` is a stable, published package
  whose catalogue is verified to beta; both are true, and the pages now say both.
  
  `pnpm check:stories` closes the hole that let `direction-provider` go
  unchecked: two accessibility suites take their subjects from the story
  directory, so a component with no story is a component nothing checks.
- @kinetixui/tokens@0.23.0

## 0.22.1

### Patch Changes

- @kinetixui/tokens@0.22.1

## 0.22.0

### Minor Changes

- c2f491f: Radius **role aliases**: `radius.field` (→ `sm`, 4), `radius.control` (→ `md`, 8), `radius.container` (→ `lg`, 12) and `radius.surface` (→ `xl`, 16). Sizes say how round; roles say what is round, so a theme can reshape every field or every card by overriding one token without disturbing the size steps. On the web each is a live reference (`--radius-control: var(--radius-md)`), the Tailwind preset gains `rounded-field`, `rounded-control`, `rounded-container` and `rounded-surface`, and the SwiftUI, Compose and Flutter `KinetixRadius` gain `field`, `control`, `container` and `surface`. The mapping is measured from how the components use radius today. Additive: no existing token, utility or component changed, and components move to the roles incrementally. See `/docs/foundations`.

### Patch Changes

- 901bfa2: `AlertTitle` now renders a `div` instead of a hardcoded `<h5>`. A component can't know where it sits in the page's outline, so the fixed level skipped heading levels under any `<h2>` (WCAG 1.3.1 / axe `heading-order`). The alert's `role="alert"` still carries the semantics; pass `role="heading"` and `aria-level={n}` to `AlertTitle` if you want a specific heading level. Its ref type is now `HTMLDivElement` (it was `HTMLParagraphElement`).
- Updated dependencies [cf25de2]
- Updated dependencies [c2f491f]
  - @kinetixui/tokens@0.22.0

## 0.21.0

### Minor Changes

- 15ca0fb: `DataGrid` with `selectable` now scrolls while you drag-select. Hold the button at or past the top, bottom, left or right edge of the grid and it scrolls toward the pointer (faster the further out you go) and keeps extending the range; releasing stops it, and the last cell reached becomes the active one so Shift+arrows continue from it. The growable area excludes the sticky header and pinned columns. Horizontal auto-scroll is skipped under RTL. Nothing changes for grids without `selectable`.
- f64516d: `DataGrid` `selectable` can now select whole columns and rows. Ctrl/Cmd+click a column header (or press Ctrl+Space on it) to select the column and keep any other ranges; Shift+click a second header to extend across columns. A plain header click still sorts. Shift+Space on a cell selects its row. Fully selected columns set `aria-selected` on their `columnheader` and pick up the accent fill. Nothing changes for grids without `selectable`; `onSelectionChange` reports these like any other range.

### Patch Changes

- @kinetixui/tokens@0.21.0

## 0.20.1

### Patch Changes

- Updated dependencies [174c1fe]
  - @kinetixui/tokens@0.20.1

## 0.20.0

### Minor Changes

- 4209268: `DataGrid` `selectable` now supports drag-select and separate ranges. Drag across cells to select a rectangle; Ctrl/Cmd+click (or Ctrl+Space from the keyboard) keeps the current range and starts another, Shift+click / Shift+arrows extend the newest one, and Ctrl/Cmd+C copies every range as tab-separated text with a blank line between them. `onSelectionChange` now also reports `ranges` (all of them; `rows` / `columns` still describe the newest). `DataGridSelection` and the new `DataGridRange` type are exported from the package.

### Patch Changes

- @kinetixui/tokens@0.20.0

## 0.19.0

### Minor Changes

- 2b3b984: `DataGrid` gains opt-in range selection: pass `selectable` (and optionally `onSelectionChange`) and Shift+arrows or Shift+click extend a rectangle of cells from the anchor, Ctrl/Cmd+A selects everything, Ctrl/Cmd+C copies the range as tab-separated text (each column's `value()`), and Esc clears it. The grid gets `aria-multiselectable` and every cell `aria-selected`, and the count is announced. Off by default, so existing grids are unchanged. Re-sorting or changing the row count clears the selection; disjoint (Ctrl+click) selection and drag-select are not included.

### Patch Changes

- @kinetixui/tokens@0.19.0

## 0.18.0

### Minor Changes

- cb33179: `DataGrid` now follows the ARIA grid keyboard pattern. The grid is a single tab stop with roving focus: arrow keys move between cells (the header row included, mirrored under RTL), `Home` / `End` go to the row ends and `Ctrl`+`Home` / `Ctrl`+`End` to the grid corners, `PageUp` / `PageDown` move by a page, and focus scrolls virtualized rows into view. Column reorder and resize now work from the keyboard (`Alt`+`←/→` and `Shift`+`←/→` on a header, announced in a live region), and rows and cells carry `aria-rowindex` / `aria-colindex` with `aria-rowcount` / `aria-colcount` so screen readers report the right position in a virtualized grid. Behaviour change: every editable cell and sortable header used to be its own tab stop; the grid is now one tab stop.
- 5d5fdcf: Add role tokens on top of `primary`: `action` (+ `action-foreground`), `link`, `focus` and `brand` (+ `brand-foreground`), plus explicit `action-hover` / `action-pressed` for the native ports. `action`, `link` and `focus` default to `primary` / `ring` as live `var()` references in both themes, so an existing theme that only sets `--primary` keeps working, while `--action` can now be overridden on its own to split the interactive colour from `primary`. Components now read the role tokens (`bg-action`, `text-link`) instead of `primary` — no visual change with the default theme — and `Fab` no longer uses a hard-coded blue hover that inverted in dark mode. `kinetixui theme create/build` and the web theme-builder accept the new tokens (optional overrides). SwiftUI, Compose and Flutter get `action`, `actionHover`, `actionPressed`, `brand`, `link` and `focus` colours in their compiled tokens. **Upgrade note:** components using `bg-action` / `text-link` need the matching `@kinetixui/ui/tailwind.config` preset, so update the package when re-adding components.

### Patch Changes

- 6f30f5c: Accessibility fixes found by the real-browser pass, closing its baseline: `Banner` no longer uses the `banner` landmark role; a pressable `ListItem` is now a `listitem` containing a `button` (was a `button` in place of the listitem); `DiffViewer` rows have cells and `JsonViewer` nested items sit in a `group`; `FileUpload`'s dropzone is a plain drop surface with the Browse button as the single control (was a nested-interactive `role="button"`); `ScrollArea` and `VirtualList` scroll regions are keyboard-focusable; `ColorPicker` labels its hex field and gives its 2D square `aria-valuenow`; `MarkdownEditor` names its textarea (via `aria-label`, default "Markdown"); `MultiSelect` removes the last chip on Backspace in an empty search field.
- 90f49dc: Forced-colors and reduced-motion fixes found by new real-browser checks: `InputOTP`'s active slot and the `Chart` SVG now keep a visible focus outline in forced-colors mode (box-shadow rings are stripped there); `Skeleton`, the chart loading placeholder and `MessageBubble`'s typing dots stop under `prefers-reduced-motion`, and `Spinner` / the `FileUpload` spinner slow to one turn per three seconds instead of spinning at full speed.
- Updated dependencies [5d5fdcf]
  - @kinetixui/tokens@0.18.0

## 0.17.0

### Patch Changes

- 01c0ab6: Fix Button pressed-state contrast: Primary `active` is now `bg-primary/85` (was `/80`, 4.11:1 → 4.54:1) and Secondary `active` is solid `bg-secondary-foreground`, same as hover (was `/90`, 3.97:1). Both now clear WCAG AA. `check:contrast` gained alpha-aware pairs so a dimmed state can't regress below AA unnoticed.
- 683e0f8: Components now consume the type-scale aliases (`text-label-*`, `text-body-md`, `text-title-dialog`) instead of re-deriving them from Tailwind literals — Button, Badge, Tag, Kbd, Input, Select, NativeSelect, Textarea and Modal render identically. `cn()` now knows the type scale, so a `text-label-*` class no longer swallows a text colour class in `tailwind-merge`. Adds a rendered axe-core pass over every story.
- 5b5b2d6: Fix low contrast on tinted info surfaces: Banner and Inform `information` text used `--info` (#57788e) on its own 10% tint, only 4.15:1. They now use a new `text-info-on-container` utility backed by `--semantic-on-info-container` (light #395a70; dark now defined too, matching `--info`). Adds the dark value for `semantic.on-info-container` to the token contract; SwiftUI, Compose and Flutter get `colorSemanticOnInfoContainer` in their compiled tokens. Found by the new real-browser axe pass.
- 7d9864d: Keyboard and screen-reader fixes found by a new keyboard/focus/RTL test suite: `Tour` now has an accessible name, moves focus into its card, traps Tab and restores focus on close; `MultiSelect` can be operated from the keyboard (focus goes to the search field on open and back to the combobox on close); `DataGrid` sortable headers and editable cells are reachable with Tab and operable with Enter / Space / F2 / Esc; `Slider` and `ColorPicker` put their accessible name on the thumb (the `role="slider"` element) instead of the root. `DataGrid` still has no arrow-key cell navigation.
- Updated dependencies [5b5b2d6]
  - @kinetixui/tokens@0.17.0

## 0.16.1

### Patch Changes

- @kinetixui/tokens@0.16.1

## 0.16.0

### Patch Changes

- @kinetixui/tokens@0.16.0

## 0.15.0

### Patch Changes

- @kinetixui/tokens@0.15.0

## 0.14.0

### Patch Changes

- @kinetixui/tokens@0.14.0

## 0.13.0

### Minor Changes

- f2dea24: Add an `interaction` token category — `target.minimum` (44px), `target.default` (40px), `focus.width` (1px), `focus.offset` (2px), `press.opacity` (0.8), `drag.threshold` (4) — behavioral values that sit alongside the existing theme-independent `motion`/`opacity` primitives rather than colors or spacing. Two are wired into real consumers in this slice: `focus.width` now backs the `spread` of every `shadow.focus*` entry (compiled CSS is unchanged — same `0 0 0 1px …`, now token-backed instead of a magic number), and `drag.threshold` drives `KanbanBoard`'s `PointerSensor` activation distance via `tokens.interaction.drag.threshold` from `@kinetixui/ui`'s new runtime dependency on `@kinetixui/tokens`. The rest (`target.*`, `focus.offset`, `press.opacity`) are defined but not yet wired to a component — see `/docs/tokens`'s "Interaction tokens" section for why each one is or isn't, and what a follow-up slice would need. Web/tokens only in this slice; the native ports don't consume `interaction.*` yet.
- ba595d1: Add RTL support, slice 1: `KinetixDirectionProvider` (a thin wrapper over `@radix-ui/react-direction`) plus logical-property CSS conversions in `InputGroup`, `Select`, `NativeSelect`, `Dialog`, `Sheet`, `Drawer`, `DropdownMenu`, `Alert`, and `AppBar`. See `RTL.md` for the full picture — the two things RTL support needs are CSS logical properties (`ps-`/`pe-`, `start-`/`end-`, …) *and* telling Radix's own direction context about it, since every Radix primitive this library builds on (`Select`, `DropdownMenu`, `Popover`, `Tooltip`, …) defaults its portaled content to `ltr` regardless of the ambient `dir` attribute unless wrapped in a direction provider. Converting classes alone silently left every Radix-portaled component mispositioned under `dir="rtl"` — `KinetixDirectionProvider` closes that gap:
  
  ```tsx
  <html dir={dir}>
    <body>
      <KinetixDirectionProvider dir={dir}>{children}</KinetixDirectionProvider>
    </body>
  </html>
  ```
  
  Most of the component library is not yet converted — `scripts/check-rtl.mjs` (now run in CI) tracks the remaining files explicitly and fails the build if a converted file regresses or a new component ships with physical-direction classes from the start.

### Patch Changes

- Updated dependencies [f2dea24]
  - @kinetixui/tokens@0.13.0

## 0.12.0

### Minor Changes

- d6939d5: Add `ColorPicker` — a saturation/value square, hue and (optional) alpha sliders, a hex field, swatches, and an eyedropper (where `window.EyeDropper` exists). The 2D square is hand-rolled (no Radix primitive for a 2D gesture); the hue and alpha rails reuse `@radix-ui/react-slider` directly, not the package's own `Slider` wrapper, whose track styling is fixed, for their keyboard and ARIA handling.
  
  Internal HSV state, not derived from the hex `value` prop on every render: saturation 0 or value 0 erase hue information (every hue produces the same RGB there), so re-deriving HSV from the emitted hex on every change would make the hue thumb jump to red the moment a drag crosses either edge. `value` only resyncs the internal state when it changes from something other than the component's own last emission — the standard fix for this class of controlled color-picker bug.
  
  Ships on all four platforms with the same feature set except the eyedropper, which is web-only: no native platform exposes a public "sample a pixel anywhere on screen" API. The HSV math is hand-rolled identically (formula-for-formula) across React/Compose/SwiftUI/Flutter, same rationale as `DiffViewer`'s LCS diff.
- 4460c33: Add `DataGrid` — the "product on its own" the `COMPONENT-ADDITIONS.md` Tier 3 entry called for: a row-virtualized grid (the same fixed-row-height windowing `VirtualList` uses) with column resize, drag-to-reorder, left/right pin, single-column sort, and double-click-to-edit cells. `DataTable` stays the `@tanstack/react-table`-backed option for a plain sortable/paginated table; reach for `DataGrid` once the row count or column-manipulation needs outgrow it. Rendered as ARIA `grid`/`row`/`columnheader`/`gridcell` divs rather than a real `<table>`, since sticky pinned columns and a sticky header row need that flexibility. Deliberately out of scope: column *virtualization* (rare enough at typical column counts not to be worth it) and multi-column sort.
  
  Ships on all four platforms. Column resize, drag-to-reorder, and column pin are web-only — none of Compose, SwiftUI, or Flutter have a touch-friendly drag-a-column-border gesture convention, and a sticky column needs a custom layout none of their scroll containers give for free. Native ports carry the three features that map directly onto each platform's own primitives instead: row virtualization (`LazyColumn`, a `LazyVStack` pinned-header `ScrollView`, `ListView.builder`), tap-to-sort headers, and tap-to-edit cells that commit on the keyboard's submit action rather than the web's blur-also-commits.
- 40b45ac: Add `DiffViewer` — a side-by-side (`split`) or inline (`unified`) text diff with gutter line numbers, over a hand-rolled LCS line diff. Fifth pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog, closing it out. Not built on a diff package: the algorithm needs to behave identically across all four platforms, and a ~30-line DP table is easier to keep in lockstep across React/Compose/SwiftUI/Flutter than four bindings to (or ports of) someone else's diff library. `split` mode doesn't pair adjacent remove/add runs onto the same row the way GitHub's split view does — each op renders in its own column, blank on the other side, a documented simplification over that extra alignment heuristic.
  
  Ships on all four platforms with the same feature set and the same LCS algorithm.
- 2f93583: Add `JsonViewer` — a collapsible, syntax-colored tree for arbitrary JSON data (API responses, registry payloads, token diffs), with a copy-to-clipboard button. Fourth pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog. Distinct from `TreeView`: this renders a *data structure* (object/array/primitive), not a caller-composed hierarchy of `TreeItem`s, so expand state is per-node uncontrolled rather than a lifted `expanded` prop. Value colors reuse the existing `--success`/`--info`/`--warning` semantic tokens rather than introducing a separate syntax-highlighting palette.
  
  Ships on all four platforms with the same feature set — unlike `DataGrid`, a recursive expand/collapse tree needs no gesture or layout primitive any platform lacks. SwiftUI's port introduces a small `KinetixJSONValue` recursive enum (Swift has no equivalent to TypeScript's `unknown` for this) with an ordered `.object([(String, KinetixJSONValue)])` case, since Swift dictionaries don't preserve key order; Compose and Flutter accept the ad-hoc `Map`/`List` shape their own JSON deserialization already produces.
- e3195a6: Add `KanbanBoard` — draggable cards across columns with keyboard DnD, built on `@dnd-kit`'s "multiple containers" sortable pattern. No DnD primitive existed in this package at all; hand-rolling accessible pointer/touch/keyboard drag-and-drop with collision detection and live reordering from scratch would take far longer than this component's own logic and likely be worse than a battle-tested library, so `@dnd-kit` is a new dependency.
  
  Uses a custom collision detection strategy (`pointerWithin` → `rectIntersection` fallback, re-scoped to `closestCenter` against just the hovered column's cards when the initial hit is the column itself) — this is dnd-kit's own documented fix for a specific multi-container gotcha: each column is both a `useDroppable` (so an empty column, or the space below its last card, is still a valid drop target) and wraps a `SortableContext`, and a column's rect is a strict superset of its cards' rects, so plain `closestCorners`/`closestCenter` alone almost always reports the column itself as the collision and item-level reordering never fires.
  
  A **seventh standing non-port** (documented at `/docs/contributing`): no equivalent dependency exists in the native packages, and hand-rolling accessible drag-and-drop from scratch on three more platforms is a far bigger lift than porting the component's own logic. Each platform reaches for its own idiomatic drag primitive instead (Compose drag gestures, SwiftUI `.draggable`/`.dropDestination`, Flutter `Draggable`/`DragTarget`).
- df37573: Add `MarkdownEditor` — a formatting toolbar over a plain text field (never `contenteditable`) with an optional rendered preview pane. Closes out the last item in the `COMPONENT-ADDITIONS.md` Tier 3 backlog. Shipped as "Markdown-mode" rather than a `contenteditable`-based WYSIWYG (Tiptap/Lexical): `contenteditable` has no native-platform analogue, which would have made this an eighth standing non-port. A markdown textarea is just a text buffer the toolbar inserts syntax into, so it ports cleanly to all four platforms instead.
  
  Includes a small hand-rolled Markdown → HTML/native-view renderer covering exactly the syntax the toolbar produces (headings, bold, italic, links, inline/block code, bullet/numbered lists, blockquotes, paragraphs) — not a full CommonMark implementation, kept dependency-free and ported identically across platforms rather than pulling in a markdown parser, the same reasoning as `DiffViewer`'s hand-rolled LCS diff.
  
  Ships on all four platforms. React, Compose, and Flutter insert/wrap syntax at the real cursor position (`selectionStart`/`TextFieldValue`/`TextEditingController.selection`); SwiftUI's `TextEditor` has no selection API before iOS 17, so its toolbar appends the snippet at the end of the text instead — a documented scope-down, not a silent one.
- bfa8d01: Add `MessageBubble`/`TypingIndicator` — a sent/received chat bubble with grouping, timestamp, and a status tick, plus an animated typing indicator. Last pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog — just the bubble primitive, not the broader "AI-chat kit" (Attachment/Bubble/Message Scroller/Questionnaire), which stays a separate roadmap decision. `grouped` reduces the outer top corner's radius as a lightweight consecutive-run cue — the caller already knows which messages are consecutive, so it stays a single boolean rather than the component inferring group position itself.
  
  Ships on all four platforms per the four-platform rule: `KinetixMessageBubble`/`KinetixTypingIndicator` on Jetpack Compose, SwiftUI, and Flutter too. Compose and Flutter reproduce the web's precise single-corner rounding for `grouped`; SwiftUI falls back to a uniform radius reduction instead, since `UnevenRoundedRectangle`'s exact OS-version floor couldn't be verified against this package's iOS 16.0 floor without a local toolchain — a documented, deliberate simplification.
- 34e6cd5: Add `MultiSelect` — a `Combobox` that keeps multiple `Tag` chips, with a `creatable` free-entry mode. Sixth pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Built directly on `Popover` + `Command` + `Tag` rather than staying a doc-only recipe like `Combobox`. The trigger is `role="combobox"` on a plain `div`, not a `<button>` — `Tag`'s own remove control is a real `<button>`, and a `<button>` can't nest inside a `<button>` (invalid HTML); using `PopoverAnchor` + manual open-state instead of `PopoverTrigger` avoids that while keeping the whole thing keyboard-operable.
  
  Ships on all four platforms per the four-platform rule: `KinetixMultiSelect` on Jetpack Compose, SwiftUI, and Flutter too, each built directly on that platform's own anchored-popover primitive with its own `Input`/`Tag` components — no new text-entry or chip mechanism. Filtering is a plain substring check on every native platform (the web version's search is driven by `cmdk`'s own filtering, which has no native equivalent to lean on). SwiftUI's chip row scrolls horizontally rather than wrapping to multiple lines — SwiftUI has no built-in flow layout the way Compose's `FlowRow` or Flutter's `Wrap` are, a documented simplification, not a silent one.
- 22bd801: Add `NotificationCenter`/`NotificationCenterTrigger`/`NotificationCenterContent`/`NotificationItem` — a bell trigger opening a popover list of read/unread items with a "mark all read" action. Fourth pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Built directly on `Popover` (re-exported as the root) rather than a new open-state mechanism; `NotificationItem` follows `ListItem`'s interactive-row convention. Read-state (`unread`/`unreadCount`/`onMarkAllRead`) stays the caller's, the same as every other controlled component in this library.
  
  Ships on all four platforms per the four-platform rule: `KinetixNotificationCenter` family on Jetpack Compose, SwiftUI, and Flutter too, each built on that platform's own anchored-popover primitive (`KinetixDropdownMenu`, `.popover`, `KinetixPopover`/`MenuAnchor`) rather than a hand-rolled overlay.
- 6bd3e7d: Add `Tour` — sequenced spotlight popovers over real elements (onboarding walkthroughs), with dismiss/skip/next. First pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog. `target` is a CSS selector resolved against the live DOM on every step change (and on resize/scroll, so the spotlight tracks a target that moves or resizes) rather than a ref, since steps are authored as plain data ahead of the elements existing. The spotlight itself is a single positioned `div` with a `box-shadow: 0 0 0 9999px` — a well-known CSS-only cutout technique, no SVG mask or second overlay layer needed. No focus trap: a tour narrates the page rather than blocking interaction with it.
  
  This is a sixth standing non-port (documented at `/docs/contributing`, alongside `Combobox`/`NativeSelect`): targeting an arbitrary already-rendered element by CSS selector has no native-platform equivalent — every native platform only offers opt-in position *reporting* (a target must wrap itself in a registry ahead of time via `Modifier.onGloballyPositioned`, a `PreferenceKey`, or a `GlobalKey`), a materially different API shape than "point a selector at any element." Reach for a sequence of `KinetixPopover`/`KinetixDropdownMenu` steps on native platforms instead, each anchored to the element it explains.
- 2e9f289: Add `TreeView`/`TreeItem` — nested expand/collapse rows with keyboard roving tabindex and optional checkboxes. Fifth pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Hand-rolled (Radix has no tree primitive to build on): `role="treeitem"` sits on each item's own container rather than a separate "row" element, so a nested item's `closest('[role="treeitem"]')` correctly walks up to its real ancestor; visible items are queried live from the DOM on every arrow-key press, since collapsed subtrees simply don't render — no separate registration bookkeeping needed to stay in sync with expand/collapse state. `checkable` checkboxes are independent per item — no automatic parent-selects-all-children / indeterminate propagation, a documented simplification, not a silent one.
  
  Ships on all four platforms per the four-platform rule: `KinetixTreeView`/`KinetixTreeNode` on Jetpack Compose, SwiftUI, and Flutter too — data-driven (a plain tree of nodes) rather than the React composition API, since recursion over a data structure is far simpler than threading state through arbitrarily-nested children on those platforms. The native ports are tap-to-expand/select only; the web version's keyboard roving-tabindex arrow-key navigation isn't ported, a documented scope-down since touch is the primary interaction model there.
- 3fd4b7a: Add `VirtualList` — a windowed-rendering primitive: only the rows visible in the scroll viewport (plus `overscan`) actually mount, so a list of thousands of items costs the same as rendering a couple dozen. Second pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog, and a prerequisite for a future `DataGrid` or any `Command`/`Combobox`/`Select` with a large option list. Web is fixed-row-height only — variable-height virtualization needs a per-row measurement pass, out of scope for this primitive (that's `@tanstack/react-virtual`'s job).
  
  Ships on all four platforms with no fixed-height limitation on native: Compose's `LazyColumn`, SwiftUI's `List`, and Flutter's `ListView.builder` each already only build the rows near the viewport, so these ports just wrap the platform's own windowing rather than porting the web's scrollTop/ResizeObserver math.

## 0.11.0

### Minor Changes

- 17062c4: Add `ComparisonSlider` — a drag handle wiping between two stacked layers (before/after image, a redesign preview). Second pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Built on Radix's `Slider` for the drag/keyboard/ARIA behavior (a plain 0–100 value), but fully custom-drawn — Radix's own `Range` fill can't be reused as the divider line since it's Radix's own inline `width` style, which would win over any Tailwind width class, so the line is a separate element positioned from the same value instead.
  
  Ships on all four platforms per the four-platform rule: `KinetixComparisonSlider` on Jetpack Compose, SwiftUI, and Flutter too, each using the same "duplicate the layers, clip one of them from the handle position" technique the web's CSS `clip-path` uses. The Compose and SwiftUI ports only support dragging the handle itself, not clicking anywhere on the track to jump (the web's Radix `Slider` supports both) — a documented scope-down, not a silent gap; Flutter's plain `GestureDetector` gets both for free.
- f591419: Add `Marquee` — an auto-scrolling horizontal ticker (logo strip, testimonials), pausing on hover and respecting `prefers-reduced-motion`. First pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Lifted out of the marketing site's `reveal.tsx` (which leaned on a hand-written `.kx-marquee-track`/`@keyframes marquee` in its own `globals.css` — not something a CLI-installed app would have) onto the shared Tailwind preset (`animate-marquee`, `motion-reduce:animate-none`) instead, so it's portable. Also fixes an accessibility bug found in the site version: both content copies were marked `aria-hidden`, hiding the whole marquee from screen readers — only the duplicate copy needed for the seamless loop is hidden here.
  
  Ships on all four platforms per the four-platform rule: `KinetixMarquee` on Jetpack Compose, SwiftUI, and Flutter too, each using the same "duplicate the content, measure it, translate by exactly one content-width in an infinite loop" technique (no CSS keyframe to lean on natively). `pauseOnHover` is web-only — hover isn't a primary mobile interaction, so the native ports don't carry it.
- 612b21c: Add `PageHeader` — title + optional breadcrumb + description + action cluster + optional tabs row, closed off with a bottom border. Third pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog, and the last S-effort item on it. `breadcrumb`/`actions`/`tabs` are plain slots — `PageHeader` doesn't re-implement `Breadcrumb`, `Button`, or `Tabs`, callers compose their own into it.
  
  Ships on all four platforms per the four-platform rule: `KinetixPageHeader` on Jetpack Compose, SwiftUI, and Flutter too, each with the same plain-slot shape and closed off with the platform's own `Separator`.

## 0.10.0

### Minor Changes

- 9db6327: Add `Banner` — a full-bleed, page-level notice (info/promo/maintenance), optionally dismissible with an optional action. Fourth pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog. Distinct from `Alert` (in-flow, static) and `Sonner` (transient toast): persistent and edge-to-edge. Distinct from `Inform` (contained, rounded inline card): `Banner` has no rounded corners or own width — it spans whatever it's placed in, typically the full viewport. Reuses `Inform`'s intent taxonomy and icon set for a consistent look.
  
  Ships on all four platforms per the four-platform rule: `KinetixBanner` on Jetpack Compose, SwiftUI, and Flutter too. The web version's `sticky` prop has no component-level native equivalent — the native ports document pinning by placement instead (a `Scaffold`'s top bar, `.safeAreaInset(edge: .top)`, or the first child of a non-scrolling container), the same convention already established for `AppBar`.
- 17e6930: Add `DescriptionList`/`DescriptionListItem` — `<dl>` term/detail rows with the site's own spec-sheet skin (mono, uppercase, tracked term labels; a divided rounded shell). Third pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog — lifted out of two hand-rolled call sites (`ComponentMeta`'s doc-page spec strip and the homepage's "spec" card) into a reusable component; those two call sites were left as-is rather than migrated, which is out of scope here.
  
  `layout="row"` (default, term and value side by side) or `layout="stacked"` (value below a full-width term, for longer values); `showDivider` on each item. Ships on all four platforms per the four-platform rule: `KinetixDescriptionList`/`KinetixDescriptionListItem` on Jetpack Compose, SwiftUI, and Flutter too — each draws its own bottom divider per item rather than a shared `divide-y`, the same documented simplification already established for `List`/`ListItem`.
- 70a6d44: Add `SegmentedControl`/`SegmentedControlItem` — an iOS-style single-select strip. Fifth pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog. Functionally `ToggleGroup type="single"`: a thin, documented preset over the same Radix primitive (`type="single"` is fixed, not exposed) with `Tabs`' visual treatment — a filled `bg-muted` track and a raised, shadowed active segment — instead of `Toggle`'s individually-outlined-button look.
  
  Ships on all four platforms per the four-platform rule: `KinetixSegmentedControl`/`KinetixSegmentedControlItem` on Jetpack Compose, SwiftUI, and Flutter too, reusing each platform's existing `Tabs` visual treatment and its stateless, caller-owns-the-selected-value shape (no context to thread a shared value through the way Radix's `ToggleGroup` does).
- 89ca728: Add `Timeline` — ordered events down a rail (dot, connector, time, content). Sixth pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog, the first of the two remaining M-effort items. `alternating` lays content left/right of a centered rail (desktop); the default is a single left-aligned rail. Same rail/dot/connector technique as `Stepper`, but for a history/activity log rather than a progress indicator — an array of arbitrary events instead of complete/current/upcoming states.
  
  Ships on all four platforms per the four-platform rule: `KinetixTimeline` on Jetpack Compose, SwiftUI, and Flutter too. Compose/SwiftUI reuse `Stepper`'s documented connector simplification (a fixed minimum height instead of React's dynamic `flex-1` stretch — neither platform has a cheap equivalent without a custom layout); Flutter's `IntrinsicHeight` + `Expanded` gets a genuine dynamic-stretch connector, matching the web exactly.

## 0.9.0

### Minor Changes

- 3eb8edc: Add `ButtonGroup`/`ButtonGroupSeparator`/`ButtonGroupText` and `NativeSelect`/`NativeSelectOption`/`NativeSelectOptGroup` — the third and fourth picks from the "missing components" gap flagged in the infra/design-system audit against shadcn/ui's current matrix.
  
  `ButtonGroup` visually joins a row or column of independent `Button`s into a connected, segmented-control-style cluster. Ships on all four platforms per the four-platform rule: `KinetixButtonGroup` family on Jetpack Compose, SwiftUI, and Flutter too (each with a documented simplification — no cross-child border/radius override mechanism on those platforms, so only the group's outer corners are squared).
  
  `NativeSelect` is a styled wrapper around the browser's own `<select>`, for callers who want the OS-native picker instead of `Select`'s custom popover. This is a **standing non-port** (React/HTML only, alongside `Form`/`NavigationMenu`/`Combobox`): `Select` already wraps each native platform's own picker mechanism (Material3 `DropdownMenu`, SwiftUI `Menu`, Flutter `MenuAnchor`), so there's no further "more native" fallback to build there — see `/docs/contributing`.
  
  `Item` (a fifth candidate from the same gap list) was evaluated and deliberately skipped: its API is functionally near-identical to the existing `List`/`ListItem` (leading/title/description/trailing/disabled/onSelect), and shipping both would just create API confusion.

## 0.8.0

### Minor Changes

- 419ae12: Add `Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/`EmptyContent` — a composable placeholder for zero-results states (an empty table, an empty search, a fresh workspace). Second pick from the "missing components" gap flagged in the infra/design-system audit against shadcn/ui's current matrix. Ships on all four platforms per the four-platform rule: `KinetixEmpty` family on Jetpack Compose, SwiftUI, and Flutter too.
- 83830b2: Add `Kbd` and `KbdGroup` — a single keyboard key glyph, plus a wrapper for shortcut combos (`⌘` `K`). Fills the "missing components" gap flagged in the infra/design-system audit against shadcn/ui's current matrix. Ships on all four platforms per the four-platform rule: `KinetixKbd`/`KinetixKbdGroup` on Jetpack Compose, SwiftUI, and Flutter too.

## 0.7.0

### Minor Changes

- 7f19c38: Add `asChild` support to `Badge` and `Tag`, so both can render as a single wrapped element (e.g. `<Badge asChild><a href="/new">New</a></Badge>`) instead of always forcing a `<div>`/`<span>`. `Toggle` and `ToggleGroup` already supported `asChild` transparently via their underlying Radix primitives — no change needed there, just confirming for the record.
  
  `Tag`'s `onRemove` dismiss button still works with `asChild`: it nests inside the slotted element (Radix `Slot` can only render one root node). Avoid pairing `asChild` + `onRemove` with an `<a>` child specifically, since a nested `<button>` inside an anchor is invalid HTML.
- 7d1ef8f: Add three new DTCG token primitives — `duration`/`easing` (motion), `opacity`, and `z-index` — grounded in the values already hardcoded across the component library (`duration-200/300/500/1000`, `ease-linear`/`ease-in-out`, `opacity-0/50/70/100`, `z-[1]/z-10/z-20/z-40/z-50`), rather than invented from scratch. Compiled to `--duration-*`/`--easing-*`/`--opacity-*`/`--z-index-*` CSS custom properties, `KinetixMotion.swift`/`.kt`/`.dart` on the three native platforms, and new `packages/ui`'s `tailwind.config.ts` utilities (`duration-fast`, `ease-standard`, `opacity-disabled`, `z-overlay`, etc.) that every component that previously hardcoded these values now uses directly.
  
  A handful of pre-existing values that don't cleanly match a token step (`disabled:opacity-40` in `AudioPlayer`, `opacity-60` in `DropdownMenu`/`Select`, the `Calendar` nav buttons' resting `opacity-50`) are left as literals with a comment rather than silently normalized to the nearest token — that's a design call for later, not a rename.

## 0.6.5

No changes in this release.

## 0.6.4

### Patch Changes

- ea63e52: Upgrade the React platform to its latest supported toolchain: React 19, all Radix UI primitives, and the component library's other dependencies (recharts, react-day-picker, @tanstack/react-table, react-resizable-panels, zod, etc.) bumped to their current major releases.
  
  `Calendar`, `Chart`, `DataTable`, and `ResizablePanelGroup`/`ResizablePanel`/`ResizableHandle` were ported to the new APIs of `react-day-picker` v10, `recharts` v3, `@tanstack/react-table` v9, and `react-resizable-panels` v4 respectively — their own public props are unchanged, but anything reaching past them into the underlying library's DOM structure, class names, or data attributes (e.g. `.day-range-start`, `data-panel-group-direction`) should double check against the new libraries' output.

## 0.6.3

### Patch Changes

- ff37bef: Release plumbing: publish via npm **trusted publishing** (OIDC) instead of a long-lived `NPM_TOKEN`. Each package has a trusted publisher (this repo + `release.yml`) configured on npmjs.com; `pnpm publish` exchanges the GitHub Actions OIDC token for a short-lived registry token. No package contents change.

## 0.6.2

### Patch Changes

- ce4184f: The release now publishes via `pnpm -r publish --provenance` (a directory publish) instead of `changeset publish` (which packs to a tarball first — that path drops provenance). Git tags are created with `changeset git-tag`. This is the release that should finally carry an npm provenance attestation.

## 0.6.1

### Patch Changes

- 7f749b9: Publishes now carry an npm **provenance** attestation.
  
  `changeset publish` in this pnpm workspace shells out to `pnpm publish`, which didn't pick up the `NPM_CONFIG_PROVENANCE` workflow env var — so 0.5.1 / 0.6.0 shipped without attestations. `publishConfig.provenance: true` in each package's `package.json` is the tool-agnostic switch; it only fires in CI (OIDC), which is the only place these publish.

## 0.6.0

### Minor Changes

- fa72913: Add **AppBar** — a web application top bar.
  
  `AppBar` + `AppBarBrand` / `AppBarNav` / `AppBarLink` / `AppBarActions`: a sticky bordered header with a brand slot, a row of primary nav links (`active` marks the current one, `asChild` forwards to a framework `<Link>`), and a trailing actions slot. Below the `md` breakpoint the nav collapses behind a menu toggle into a panel under the bar. `useAppBar()` exposes the menu open state.
  
  `NavigationBar` remains the mobile back-button bar; `AppBar` is the desktop app shell. Registry / Storybook / docs entry included; native ports (SwiftUI / Compose / Flutter) to follow.

## 0.5.1

### Patch Changes

- bec7a0c: Security hardening.
  
  - **`@kinetixui/cli`** — validates the registry base URL (http/https only), every component / registry-dependency name, and every npm dependency spec before it reaches a fetch URL or the package manager, and refuses to write a file outside the project root. A hostile registry or a checked-in `kinetixui.json` can no longer steer where files land or what gets installed.
  - **`@kinetixui/ui`** — `chart.tsx` sanitises the identifiers and colour values it interpolates into its inline `<style>` (strips everything but `[\w-]` from identifiers; drops colour values carrying characters that could close the declaration, the rule, or the element).
  
  Published with npm provenance for the first time.

## 0.5.0

### Minor Changes

- 3e0dc4b: **New `azure` primitive ramp + `--primary` is an action blue, set independently
  per theme.** The desaturated navy (`Primay` from Figma) read as near-black once
  pushed for contrast, so `--primary` is now a real blue that pops as a button/link
  colour. A new `color.azure` ramp (15 steps, Tailwind-blue-derived) backs it;
  light and dark map to different steps — two palettes, not one flipped:
  
  - light `--primary` / `--ring` / `--accent-foreground` / `--sidebar-primary` /
    `--sidebar-accent-foreground` / `--sidebar-ring` → `azure.700` `#1d4ed8`
    (6.7:1 on the background, 6.2:1 under `--primary-foreground`).
  - dark `--primary` / `--ring` / `--sidebar-primary` / `--sidebar-ring` →
    `azure.400` `#60a5fa` (`#1d4ed8` would be ~2.9:1 on the near-black dark
    surface; `#60a5fa` clears 7.7:1).
  - `shadow.focus` re-baked per theme (`#1d4ed8` light, `#60a5fa` dark).
  
  **`--secondary` deepened** `green.50` → `green.200` (`#f1f3f1` → `#c7cfc7`) so a
  secondary button/chip actually stands off the white page; `--secondary-foreground`
  `green.600` → `green.700` (`#465245`), 5.2:1 on the new surface.
  
  `--chart-1` stays navy (`blue.500`) — the data-viz ramp is tuned for categorical
  separation, not brand. `check:contrast` passes AA in both themes. Native token
  sets (SwiftUI / Compose / Flutter) and the CLI registry `tokens` style are
  regenerated.

## 0.4.3

### Patch Changes

- 196d4b0: **`--chart-6`, `--chart-7`, `--chart-8`** added to the token contract (light +
  dark, plus the `chart.6/7/8` Tailwind colours) so stacked / categorical charts
  with more than five series stay distinguishable.
  
  **`ChartContainer`** gains `state` (`"loading" | "empty" | "error"` — renders a
  shimmer / message / alert placeholder), `stateMessage`, and `srTable` (a
  visually-hidden `<table>` of the underlying numbers for screen readers).

## 0.4.2

### Patch Changes

- 7ad6a21: **Chart text alternative.** `ChartContainer` now renders `role="img"` with an
  `aria-label` — pass `label` with a one-line summary of what the chart shows
  (WCAG 1.1.1); it falls back to `"Chart"`. Cartesian recipes already pass
  `accessibilityLayer` for keyboard data-point navigation.
- 32779bc: `ChartContainer` now scrubs two redundant Recharts a11y artefacts from its
  rendered output: the `role="img"` (no `<title>`) that Recharts stamps on every
  sector / dot `<path>` — noise, since the container already carries the text
  alternative — and the unnamed `<svg role="application">` its
  `accessibilityLayer` leaves behind, which now gets the container's label. Clears
  axe `svg-img-alt` on chart pages.
- f44e7a2: **Dark-mode focus ring.** The `--shadow-focus{,-destructive,-success,-warning}`
  composites now carry a real dark set built from the dark `--ring` / semantic
  primitives (`tokens/semantic/shadow.dark.json`). Previously they baked a
  light-theme navy that measured ~1.7:1 against the dark surface — below WCAG 2.2
  SC 1.4.11 (3:1); it now clears 8.8:1. New export
  `@kinetixui/tokens/css/extras/dark` (also bundled into
  `registry/kinetixui/globals.css`); add its `@import` after
  `@kinetixui/tokens/css/extras`.
  
  **NumberInput** — the −/+ stepper buttons now draw a `--ring` inset outline on
  `:focus-visible` so keyboard users can tell which control is focused (they
  previously showed only a container-level ring).
- 183abbf: Light-mode `--warning` moved from the Figma `onWarningContainer` orange
  (`#f97907`) to `amber.800` (`#7f5b21`). The orange was **2.7:1** as `text-warning`
  on the page and **2.6:1** in the `Tag` warning variant — both fail WCAG AA; the
  dark-amber clears 5.8–6.1:1. Dark-mode `--warning` is unchanged (bright
  `amber.400`). `check:contrast` now enforces every warning pair with no
  allow-list.

## 0.4.1

### Patch Changes

- 1fc0e08: Light-mode `--destructive` now resolves to `red.500` (`#c60a0a`) instead of the
  Figma `error` value (`#ec5047`), which failed WCAG AA — 3.33:1 as destructive-
  button text and 3.62:1 as `text-destructive` on the page. It now clears
  5.6–6.1:1. Dark mode is unchanged.
  
  Repository metadata (`repository` / `homepage` URLs) updated for the `zedalleys`
  GitHub org.

## 0.4.0

## 0.3.1

### Patch Changes

- 0c2b89c: Put `@kinetixui/cli`, `@kinetixui/tokens` and `@kinetixui/ui` on one shared version line (changesets `fixed` group). `@kinetixui/tokens` and `@kinetixui/ui` were realigned from 0.1.0 to match `@kinetixui/cli`; from here they always version and publish together.

## 0.1.0

### Minor Changes

- 07db4b3: Add 4 more components on the existing token contract:
  
  - **`AudioPlayer`** — native `<audio>` playback with a scrubber, `mm:ss` time
    labels, ±10s skip and prev/next callbacks. `variant="full" | "mini"`.
  - **`CircularProgress`** — ring progress indicator with an optional centre value.
  - **`Image`** — ratio-locked image (`1:1` / `3:2` / `4:3` / `3:4` / `3:1` /
    `16:9` presets or a number), muted loading placeholder, error fallback.
  - **`Inform`** — persistent, dismissible, intent-tinted inline notice with an
    optional CTA. `variant="information" | "warning" | "success" | "error" | "action"`.
- 3d87f1c: Add 10 more mobile-pattern components on the existing token contract:
  
  - **`Rating`** — star rating input / display, controlled or uncontrolled.
  - **`Spinner`** — lightweight loading indicator (`size`, `variant`).
  - **`List` / `ListItem`** — leading icon/avatar, title, description, trailing
    content; for mobile menus, settings screens, search results.
  - **`Stepper`** — numbered multi-step progress, `orientation="horizontal" |
    "vertical"`.
  - **`Fab`** / `fabVariants` — floating action button, circular or `extended`.
  - **`TabBar` / `TabBarItem`** — mobile bottom navigation, with an optional
    badge.
  - **`NavigationBar`** — mobile top app bar (back button, title, info text,
    actions).
  - **`FileUpload` / `FileUploadItem`** — drag-and-drop zone plus a file list
    (loading / uploaded / error states); upload logic stays the consumer's.
  - **`AvatarGroup`** — stacked avatars with a "+N" overflow marker.
  - **`DatePicker`** — promoted from a Popover+Calendar doc recipe to a real
    component, with `label` / `helperText` / `error` states.
- 3d87f1c: Add 6 more components on the existing token contract:
  
  - **`CodeBlock`** — code display with a copy button and, for more than one
    file, a tab strip.
  - **`Metric`** — stat / KPI display (label, value, trend indicator, optional
    chart or icon slot).
  - **`NumberInput`** — numeric field with increment / decrement controls.
  - **`Quote`** — blockquote with an optional attributed author.
  - **`Footer`** / `FooterColumn` / `FooterLink` / `FooterBottom` — page footer
    shell, columns of nav links plus a bottom bar.
  - **`TableOfContents`** — anchor-link nav list with indent levels and an
    active-item state.
- 1a727a7: First public release.
  
  - **@kinetixui/tokens** — the KinetixUI token contract: `--*` CSS variables
    (light + dark), `--shadow-*` / `--text-*` composites, a typed `tokens` object,
    and native text styles (`KinetixType.swift`, `KinetixType.kt`, `app_text.dart`).
  - **@kinetixui/ui** — 56 React components on the token contract (CVA + Radix +
    Tailwind), plus the `tailwind.config` preset. Also installable via the shadcn
    registry at `kinetixui.com/r/*.json`.
