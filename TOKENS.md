# KinetixUI token engine — design source → code mapping

**Authority.** Design source → canonical token contract → platform output.

1. **Design source** — the KinetixUI design file in Figma, node `3877-10388`
   (file `GQXTKKJAPbawd4wcuE77Pf`), extracted via Figma MCP `get_variable_defs` +
   `get_design_context`. It is where the palette, spacing, radius and type scale
   *originate*; it is **not** the sole authority.
2. **Canonical token contract** — `tokens/**/*.json` in this repo. Once a value
   is approved into these files it is authoritative, even where it departs from
   Figma: the entire dark theme, the `azure` action ramp, neutral interpolation,
   success colours, motion, opacity, z-index and several WCAG-driven overrides
   are repo-owned (see the Origin / notes columns below). Change the contract
   here, not by re-syncing Figma.
3. **Platform output** — compiled by Style Dictionary v4
   (`style-dictionary/build.mjs`) to CSS, TypeScript, SwiftUI, Compose and Flutter.
   Never hand-edit.

## Layers

| Layer | File | Origin |
|---|---|---|
| Shadows | `tokens/semantic/shadow.json` | `--shadow-sm/md/lg/xl` + `--shadow-focus*` (focus ring as colour glow) → `extras.css` |
| Text styles | `tokens/semantic/typography.json` | composites → `--text-<style>` (web) + `KinetixType.swift` / `KinetixType.kt` / `app_text.dart` (native `TextStyle`) |
| Primitives — 7 brand ramps + neutral | `tokens/primitives/color.json` | 6 from the Figma *Brand Colors* frame (step labels `0…10` remapped to a `0–1000` integer scale) + a synthesized `azure` action-blue ramp (Tailwind-blue-derived) added for the interactive tokens |
| Primitives — spacing / radius | `tokens/primitives/dimension.json` | Figma `spacing/*`, `Small`/`Button`/`Popup`/`Full` (steps 1–8) — extended additively to 128 (`spacing.10`…`32`, n × 4) and `radius.xxl`; an **8-unit grid with a 4-unit half-step**, guarded by `pnpm check:grid`; native ports get `KinetixSpacing` / `KinetixRadius` |
| Primitives — type | `tokens/primitives/typography.json` | Figma `fontSize/*`, `lineHeight/*` (Material 3 scale) |
| Semantic — light | `tokens/semantic/color.light.json` | aliases to primitives, named to the **semantic token** contract |
| Semantic — dark | `tokens/semantic/color.dark.json` | **synthesized** (no dark mode in Figma) |
| Semantic — text styles | `tokens/semantic/typography.json` | Figma composite text styles |
| Primitives — motion | `tokens/primitives/motion.json` | not from Figma — `duration`/`easing` scale grounded in the values already hardcoded across `packages/ui/src/components/*.tsx` (`duration-200/300/500/1000`, `ease-linear`/`ease-in-out`) |
| Primitives — opacity | `tokens/primitives/opacity.json` | not from Figma — grounded in the dominant `opacity-0/50/70/100` usages already in components |
| Primitives — z-index | `tokens/primitives/z-index.json` | not from Figma — grounded in the `z-[1]/z-10/z-20/z-40/z-50` usages already in components |

## Surface model

Hierarchy comes from surface, spacing, type and restrained elevation, not from a stroke around everything.
The model is the smallest set of roles that says where content sits; most of it already existed under
other names, and one role was missing.

| Role | Token(s) | Light | Dark |
|---|---|---|---|
| Page | `background` | `#ffffff` | `#050c11` |
| Grouped section | `surface-grouped` (**new**) | `#f6f6f6` | `#081219` |
| Raised content | `card` + edge `border` @ 50% + `shadow-md` | `#ffffff` | `#0b1821` |
| Inset / fill inside content | `muted` | `#f6f6f6` | `#102432` |
| Overlay | `popover` + `border` + elevation | `#ffffff` | `#0b1821` |

Interactive and selected are **states of a raised surface**, not surfaces of their own, so they are not
tokens: they are expressed with `border`, `primary`, `muted` and the elevation ladder (see Card below).
Seven explicit surface tokens (base / subtle / raised / interactive / selected / inset / overlay) were
considered and rejected as over-modelling: five would have been aliases of existing roles.

**Why `surface-grouped` exists.** `muted` cannot be the grouped section in dark mode: dark `muted`
(blue.700) is *lighter* than `card` (blue.800), so a card on a `muted` section read as recessed. In light
the two share a value. `pnpm check:card-visual` asserts card-above-group on rendered pixels in both themes,
and fails if the dark value is pointed back at `muted`'s.

### Elevation contract

The ladder itself (`shadow.sm/md/lg/xl`) is unchanged — Create's surface treatments (`flat`, `bordered`,
`elevated`) remap it, and the native ports and Create fixtures carry its values. What changed is which
step a role uses:

| Role | Step | Notes |
|---|---|---|
| Depth inside a control (segment thumb, pressed toggle) | `sm` | as before |
| Raised content, resting (Card) | `md` | was `sm`, whose 5% shadow did not visibly render (measured 1.02:1 under the card) |
| Raised content, hovered (interactive Card) | `lg` | |
| Overlay (popover, menus, select, hover card) | `md` today | should sit above raised content — follow-up |
| Modal (dialog, alert dialog, sheet) | `lg` today | Modal uses a literal equal to `xl` — follow-up |

In dark mode a black shadow on a near-black page has almost nothing to darken, so dark elevation is
carried by the surface step (`card` over `background` / `surface-grouped`) and the edge, and the gate
asserts that rather than pretending the shadow does.

### Card

Shared contract (every platform): a Card is a raised surface. **Surface** `card`; **edge** `border` at
half strength, softer than the controls inside it; **elevation** `md` at rest; **radius** `surface`
(`radius.xl`). A Card is **static**: no hover, no pressed state, no pointer affordance. Interaction is
opt-in and comes from the element's own semantics — the card IS the action (a link or a button), so it
holds no other controls.

| State | Trigger | Change | Not carried by colour alone |
|---|---|---|---|
| Hover | pointer that can hover | edge → full `border`, `md` → `lg` | depth |
| Pressed | `:active` | `lg` → `sm`, `muted` wash | depth + fill |
| Selected | `aria-pressed="true"` / `aria-current` | 2px `primary` edge | edge weight 1px → 2px |
| Focus | keyboard | shared `shadow-focus` ring, above every other state | ring |

Motion: `box-shadow`, `border-color`, `background-color` over `duration-fast` (200ms) with
`ease-standard`, on hover/press only; nothing moves or resizes. Reduced motion removes the transition and
lands on the same end state.

| Platform | Status |
|---|---|
| React | Implemented and verified on rendered pixels (`check:card-visual`, light + dark) |
| Angular | Implemented in `styles.css` and verified on rendered pixels by the same gate, every row, on the live Angular application: `kx-card` at rest (edge, lift, grouped, static), and `kxCard` on a real `<a href>` or `<button>` for hover, pressed, selected (`aria-current` / `aria-pressed`), focus and motion — the same element-keyed rule as React's `asChild`, so a static card cannot look clickable |
| SwiftUI, Compose, Flutter | Not changed in this slice — still `border` at full strength and `sm` elevation; `surface-grouped` is emitted to each port's colour constants but not yet in the themeable colour sets |

### Selection controls

Checkbox, RadioGroup, Switch and SegmentedControl share one state contract. It adds no token: every value
below is an existing role, and the one new relationship — the state layer — is `foreground` at a fixed
alpha, so it inverts with the theme on its own.

Shared contract (every platform):

| State | Trigger | Change | Not carried by colour alone |
|---|---|---|---|
| Rest | — | Unchecked checkbox / radio edge is `muted-foreground` (5.1:1 light, 8.1:1 dark on a card), not `input` (2.2:1). The box is the only thing that says the control is there, so it must clear SC 1.4.11's 3:1. The Switch's off track stays `tertiary` (a tracked exception in `check-contrast.mjs`): its thumb carries it | — |
| Hover | a pointer that can hover | A **state layer**: `foreground` at 8% in a 5px halo around a checkbox, radio or switch, or filling an unchosen segment; an unchecked edge darkens to `foreground`; a checked fill steps to `action`/90 | a shape appears around the control |
| Pressed | `:active` | The layer deepens to 14% (checked checkbox fill `action`/85) | layer depth |
| Checked | `data-state` / `aria-checked` / `:checked` | `action` fill **and** a glyph (checkbox), a dot or ring (radio), the thumb's side (switch); a chosen segment is a small raised surface — `card`, the Card's half-strength `border` edge and `sm` depth — on a `surface-grouped` well | glyph / dot / position / surface + edge + depth |
| Invalid | `aria-invalid="true"` | `destructive` edge (and fill when checked); hover does not replace it | the field's error text (SC 1.4.1) |
| Focus | keyboard | The ring (`ring`, 2px, offset), declared so no hover or pressed layer can cover it | ring |
| Disabled | `disabled` | `opacity-disabled`; hover and pressed are keyed on `:enabled`, so it never answers | inert |

Why a halo and not a fill: an 18px box has no room inside it for a hover fill that is distinguishable from
checked, and a darker edge alone is hard to see on a checked box. The halo is the same on every value, so
hover means "this is the target" whether the control is on or off.

Why the segment changed surface: the track was `muted` with a `background` segment. In dark mode
`background` is the darkest surface, so the chosen segment sat *below* its track and read as a hole
(measured: segment L 0.0031 vs track L 0.0160). It now follows the surface model — the track is an inset
well (`surface-grouped`, below a Card in both themes) and the chosen segment is raised content on it.

Motion:

| Control | Trigger | Property | Purpose | Duration | Easing | Reduced motion |
|---|---|---|---|---|---|---|
| Checkbox, Radio, Switch | hover, press | `box-shadow` (layer), `border-color`, `background-color` | affordance: this is the target, and it registered the press | `duration-instant` (100ms) | `ease-standard` | collapses (the library floor in React, `transition: none` in Angular); same end state |
| Switch thumb | on/off | `inset-inline-start` (a relative, logical offset — was a physical `translate`; see "Text entry and navigation" → Switch direction) | state transition: where the value went | `duration-instant` | `ease-standard` | collapses; thumb lands on the same side |
| Segment | hover, press, choose | `background-color`, `color`, `box-shadow` | selection | `duration-fast` (200ms) | `ease-standard` | collapses |

Nothing scales, slides or bounces; the checked glyph does not animate.

| Platform | Status |
|---|---|
| React | Implemented and verified on rendered pixels (`check:selection-visual`, light + dark) |
| Angular | Implemented in `styles.css` for checkbox, radio, switch and segmented control, and verified on rendered pixels by the same gate (Angular renders the DOM, Chromium paints it). Not implemented: an invalid state — Angular's checkbox and radio have no invalid input, and adding one is API work for a later wave. The checkbox edge is 1px where React's is 2px |
| SwiftUI, Compose, Flutter | Not changed. The shared contract is semantic (3:1 edge, a hover/press layer where the platform has hover, checked as a shape, focus on top); each port should express it with its own state-layer and focus APIs — Compose's `indication`/ripple and Material state layers, SwiftUI's `ButtonStyle` pressed state and focus effect, Flutter's `MaterialStateProperty`/`WidgetStateProperty`. Parity is not claimed |

### Text entry and navigation

Input, Textarea, Select, NativeSelect and Tabs share one interaction language with the selection controls.
It adds no token: the field edge is `muted-foreground` at a fixed 80% alpha, composited over the field's own
`background`, and every other value is an existing role.

Measured before (main at `f9ccf75`, Chromium, on a Card): the resting field edge was `input` at **2.21:1**
light / **2.44:1** dark — the only thing marking where an empty field is, below SC 1.4.11's 3:1; hover changed
**no pixel** on any of the four fields or on Tabs (1.00); read-only looked exactly like editable (fill 1.00);
NativeSelect's placeholder rendered in the value's colour; and in dark mode the selected tab sat **below** its
list (tab L 0.0031, list L 0.0167) — the inversion SegmentedControl had.

Text entry (Input, Textarea, Select's trigger, NativeSelect):

| State | Trigger | Change | Not carried by colour alone |
|---|---|---|---|
| Rest | — | Edge `muted-foreground`/80: **3.41:1** light, **5.40:1** dark on a card | — |
| Hover | a pointer that can hover | Edge steps to full `muted-foreground` (1.50:1 against rest). Never on a focused, open, invalid, read-only or disabled field | — |
| Focus | keyboard, or a click into a text field | `action` edge + the `--shadow-focus` ring (6.70:1 light, 7.02:1 dark); the pointer does not change it | ring |
| Invalid | `aria-invalid="true"` | `destructive` edge and `--shadow-focus-destructive` ring; kept under the pointer and when focused | the field's error text (SC 1.4.1) |
| Read-only | `readonly` (Input, Textarea) | Inset `muted` fill, full-strength text, no hover — readable and selectable, not editable, not disabled | fill |
| Placeholder | empty field | `muted-foreground` (5.10:1 light, 8.95:1 dark), below the value's `foreground`. NativeSelect: while the empty-valued option is chosen | — |
| Disabled | `disabled` | `opacity-disabled`, inert | inert |

A field is an inset, interactive control, not raised content: no elevation, at rest or on hover. There is no
pressed state: pressing a text field places the caret and focuses it, and pressing a select opens it.

Navigation (Tabs):

| State | Trigger | Change | Not carried by colour alone |
|---|---|---|---|
| Rest | — | One group: React's tabs sit in an inset `surface-grouped` well (below a Card in both themes); Angular's strip is underlined | — |
| Hover | a pointer that can hover, unselected and enabled | The selection controls' `foreground` state layer at 8% (1.16–1.19:1 against rest) and `foreground` text | fill |
| Selected | `aria-selected="true"` | React: a small raised surface on the well — `card`, the Card's half-strength `border` edge (1.33:1 light, 1.59:1 dark) and `sm` depth, above the well in both themes. Angular: a 2px `primary` indicator (6.66:1 light, 7.86:1 dark) | surface + edge + depth / indicator |
| Focus | keyboard | The ring (`ring`, 2px), drawn above the selected surface, which stays under it | ring |
| Disabled | `disabled` | `opacity-disabled`, inert | inert |

There is no pressed state: both Radix and Angular select a tab on press. At 200% text the tabs wrap inside the
list rather than running off the page (`check:large-text`, 390px wide).

Switch direction. The thumb travels along the inline axis of the switch's **own** direction. It was a physical
`translate-x` flipped by Tailwind's `rtl:` (React) or `[dir='rtl'] …` (Angular), and both match ANY rtl
ancestor, so a switch in an LTR section of an RTL page was flipped too: its thumb rendered 22px outside the
track, over its own focus ring. `:dir()` is the selector answer, but Vite 8's Lightning CSS lowers
`:dir(ltr)` for its default browser targets into `:not(:lang(ar, he, …))` — a guess from the page's language
— which broke every RTL switch in the built Storybook. So the thumb is now offset with `inset-inline-start`,
a logical property the browser resolves against the nearest `dir`, with no selector for a build step to
rewrite. `check:selection-visual` measures all four page/subtree direction pairs, on and off, under normal
and reduced motion.

Motion:

| Control | Trigger | Property | Purpose | Duration | Easing | Reduced motion |
|---|---|---|---|---|---|---|
| Input, Textarea, Select, NativeSelect | hover, focus, invalid | `border-color`, `box-shadow`, `background-color` | affordance: this field is the target | `duration-instant` (100ms) | `ease-standard` | collapses (the library floor in React, `transition: none` in Angular); same end state |
| Tabs | hover, select | `color`, `background-color`, `box-shadow` | navigation state | `duration-fast` (200ms) | `ease-standard` | collapses |
| Switch thumb | on/off | `inset-inline-start` | where the value went | `duration-instant` | `ease-standard` | collapses; same side |

Nothing scales or slides; no field or tab changes size between states.

| Platform | Status |
|---|---|
| React | Implemented and verified on rendered pixels (`check:entry-visual`, light + dark) for all five |
| Angular | Implemented in `styles.css` for `kxInput`, `kxTextarea`, `kxNativeSelect` and the tabs, and verified by the same gate. Angular has no Select (its catalogue entry is NativeSelect). Its tab strip keeps its underlined shape; the gate makes the same semantic assertions through an adapter |
| SwiftUI, Compose, Flutter | Not changed. The shared contract is semantic (a 3:1 field boundary, hover where the platform has a pointer, focus above hover, invalid that survives the pointer, read-only distinct from disabled, a selected tab that is more than a text colour); each port should use its own text-field and tab APIs. Parity is not claimed |

### Composite fields

InputGroup, NumberInput, MultiSelect and InputOTP (and Angular's number and password inputs) are text entry
built from parts: an add-on, a button, steppers, chips, code slots. Each is **one field**, so the text-entry
contract above applies to the wrapper the reader sees as the field, and reads its state from the input
inside it. No token is added.

Measured before (main at `7ffccd3`, Chromium, on a Card, `check:composite-visual`): every wrapper's edge was
`input` at **2.21:1** light / **2.44:1** dark; hover changed no pixel on any of them; NumberInput,
MultiSelect and InputOTP (and both Angular composites) had no invalid state, so an `aria-invalid` field
looked valid; NumberInput and InputGroup showed read-only exactly like editable (fill 1.00:1), and
NumberInput's steppers still changed a read-only value; a focused add-on button lit the field's own focus
ring as well as its own, so two rings claimed the keyboard, and Angular's password reveal toggle drew its
ring outside a wrapper that clips it (1.00:1 — invisible). 64 contract failures across React and Angular;
0 after.

| State | Trigger | Change |
|---|---|---|
| Rest | — | The wrapper's edge `muted-foreground`/80 (3.41:1 light, 5.40:1 dark on a card). One edge: no part draws a border along it |
| Internal divider | InputGroupButton, NumberInput's steppers | `input` (2.0–2.2:1) — visible structure, deliberately quieter than the field's edge |
| Hover | a pointer that can hover | The wrapper's edge steps to full `muted-foreground` (1.50:1). Never while the input is focused, invalid, read-only or disabled |
| Focus | the field's input focused | `action` edge + `--shadow-focus` on the wrapper (6.70:1 light, 7.02:1 dark); InputOTP draws it on the active slot |
| Part focus | a button inside the field focused | That part's own inset `ring` (6.1–7.1:1); the wrapper's ring stays off, so one ring says where the keyboard is |
| Invalid | `aria-invalid="true"` on the input (Angular: the component's `aria-invalid` input, forwarded) | `destructive` edge, kept under the pointer and when focused |
| Read-only | `readonly` on the input (InputGroup, NumberInput) | The inset `muted` fill; NumberInput's steppers are disabled too |
| Disabled | a disabled input | `opacity-disabled` on the whole field, inert |

Two shape changes come with it. MultiSelect takes the field radius (`rounded-sm`, as Input and Select) — it
was square — and its placeholder the field's `body-md`. NumberInput loses its fixed 40px height and is sized
by its input's padding, so in a row with Input or InputGroup it is the same 46px. InputOTP's slots drop
`shadow-sm`: a field is inset, not raised.

Motion: the wrapper's `border-color` and `box-shadow` over `duration-instant` with `ease-standard`; collapses
under reduced motion, same end state.

| Platform | Status |
|---|---|
| React | InputGroup, NumberInput, MultiSelect, InputOTP: implemented and verified on rendered pixels (`check:composite-visual`, light + dark). PasswordInput composes InputGroup and inherits it (not separately gated). MultiSelect has no read-only or disabled prop; that is an API gap, not part of this contract |
| Angular | `kx-input-group`, `kx-number-input`, `kx-input-otp` and `kx-password-input`: implemented in `styles.css` and verified by the same gate on the live Angular application. The composites forward `aria-invalid` and `aria-describedby` to their inner input; `kx-number-input` has a `readonly` input (read-only fill sampled inside the input, since its start stepper is always muted); `kx-password-input` has no read-only state. InputOTP's caret is static in Angular, so it has no motion. multi-select is still planned (overlays) |
| SwiftUI, Compose, Flutter | Not changed. Parity is not claimed |

### Navigation and disclosure

Angular Wave B (`@kinetixui/angular`: breadcrumb, pagination, table of contents, tab bar, stepper, navigation
bar, app bar, footer, accordion, collapsible). Every destination and every disclosure trigger uses one state
language, built from roles that already exist. No token is added.

| State | Trigger | Change | Not carried by colour alone |
|---|---|---|---|
| Rest | — | `muted-foreground` text, no surface (5.10:1 light, 8.95:1 dark): navigation recedes behind content | — |
| Hover | a pointer that can hover | The tabs' `foreground` state layer at 8% (1.16–1.18:1 against rest) and `foreground` text; prose-style links (breadcrumb, footer) turn `foreground` and show their underline instead | layer / underline |
| Pressed | `:active` | The layer deepens to 12% (1.31:1 against rest), so a press is seen before the page changes | layer |
| Current | `aria-current` | `foreground` text (18–20:1) AND a shape: the table of contents' 2px `primary` bar on the inline-start edge (6.66:1 / 7.86:1); pagination's outlined surface, edge `muted-foreground`/80 (3.41:1 / 5.98:1) plus `sm` lift; the tab bar's `action` pill behind an `action` icon; the app bar's `accent` surface with a 2px `primary` bar flush with its block-end edge (6.17:1 / 6.32:1 against that surface); the breadcrumb's current page in medium weight | bar / edge / pill / weight |
| Focus | keyboard | The shared `--shadow-focus` ring (6.70:1 light, 7.78:1 dark), which no other state draws | ring |
| Disabled | `disabled`, or `aria-disabled` on a link | `opacity-disabled`, no answer to the pointer; a disabled link leaves the tab order and is not followed | inert |

Disclosure triggers (the accordion's buttons) take the same layer, pressed and focus states. Their chevron
points down when collapsed and turns to point up when open; down is down in both directions, so it does not
mirror. A single accordion whose open item cannot close reports `aria-disabled` on that trigger and does not
answer the pointer. Direction glyphs that do mean reading order — the breadcrumb separator, pagination's
Previous and Next, the navigation bar's Back — are the Unicode angle quotes, which are `Bidi_Mirrored`: the
text engine flips them by the direction their own element resolves to, including an LTR region inside an RTL
page, with no selector for a build step to rewrite.

Measured before (the first build of these components, Chromium, `check:navigation-visual`): pagination's
current page was outlined in `input` (2.21:1 light, 2.70:1 dark), under SC 1.4.11's 3:1; the table of
contents' pressed state equalled its hover (1.18:1), because the hover rule out-specified `:active`; the tab
bar's current label was `action`, which in dark (7.86:1) read **quieter** than the resting `muted-foreground`
(8.95:1); and the app bar's current indicator, an inset shadow, started inside the link's 1px border and
floated 1px above its edge. Each was fixed in `styles.css`, not in the gate.

Motion:

| Control | Trigger | Property | Purpose | Duration | Easing | Reduced motion |
|---|---|---|---|---|---|---|
| Accordion, collapsible, app bar menu (narrow) | open / close | `grid-template-rows` 0fr ↔ 1fr, with `visibility` switched discretely | where the content came from and where it goes | `duration-fast` (200ms) | `ease-enter` opening, `ease-exit` closing | `transition: none`; the same open or closed end state |
| Accordion chevron | open / close | `transform` (a half turn) | state of the trigger | `duration-fast` | `ease-standard` | `transition: none`; same final direction |
| Every destination | hover, press, current | `color`, `background-color`, `box-shadow`, `border-color` | affordance | `duration-fast` | `ease-standard` | `transition: none`; same colours |

Nothing slides or changes size between destination states. The disclosure body clips with `overflow: clip`
and a 4px `overflow-clip-margin` (the focus ring's outer spread), so content can be cut while it animates
without cutting a focus ring flush with its edge.

| Platform | Status |
|---|---|
| Angular | Implemented in `styles.css` and verified on rendered pixels by `check:navigation-visual` (light + dark): every destination family above, the accordion, and the table of contents' bar side in RTL. Expand and collapse in both directions, under normal and reduced motion, are measured on the live application by `check:angular-browser` |
| React | Not changed by this contract. React's navigation components keep their current styling; parity is not claimed |
| SwiftUI, Compose, Flutter | Not changed. Parity is not claimed |

## Role tokens (added on top of `primary`)

`brand`, `action` (+ `action-foreground`), `link` and `focus` are **repo-owned** — none exist in Figma. `action`,
`action-foreground`, `link` and `focus` are aliases (`{color.primary}` / `{color.primary-foreground}` /
`{color.ring}`) and are emitted as live `var()` references in **both** themes (`ALIAS_TOKENS` in
`style-dictionary/sd.config.mjs`), so overriding `--primary` carries them along. `brand` is a real value
(`blue.500` light, `blue.200` dark). `action-hover` / `action-pressed` are explicit hexes for the native
ports: `action` at 90% / 85% over `background`. The web derives the same states with opacity, and
`scripts/check-contrast.mjs` fails if the explicit values drift from that derivation. See
[/docs/theming](apps/web/src/app/docs/theming/page.mdx).

## Semantic variable → Figma variable (light theme)

Values are the **current resolved** hex. Several roles diverge from their Figma
origin for WCAG AA — the "notes" column says why. Dark is a fully independent
palette (`color.dark.json`), not a flip of these. The live table on
`/docs/theming` and `apps/web/src/lib/token-contract.ts` mirror this.

| variable `--var` | value | Figma origin | notes |
|---|---|---|---|
| `--background` | `#ffffff` | `surfaceContainerLowest` | |
| `--foreground` | `#050c11` | `onSurface` | |
| `--primary` | `#1d4ed8` | *(was `Primay`, sic — navy `#1b3c53`)* | swapped for an `azure` action blue; the navy read near-black once pushed for contrast. Dark `--primary` = `#60a5fa` (`azure.400`). |
| `--primary-foreground` | `#f0f7ff` | `On Primary` | |
| `--secondary` | `#c7cfc7` | `secondaryContainer` *(was `#f1f3f1`)* | our "secondary" == Figma *container* role; deepened `green.50` → `green.200` so a secondary control reads against the page |
| `--secondary-foreground` | `#465245` | `onSecondaryContainer` *(was `#748873`)* | `green.700`, 5.2:1 on the deepened surface |
| `--muted` | `#f6f6f6` | `surfaceContainer` | |
| `--muted-foreground` | `#6d6d6d` | `onSurfaceVariant` | |
| `--accent` | `#f0f7ff` | `LightBlue` | the hover fill used by Outline/Ghost buttons |
| `--accent-foreground` | `#1d4ed8` | — | **synth** = `primary` |
| `--destructive` | `#c60a0a` | *(Figma `error` `#ec5047` fails AA — 3.3:1)* | `red.500`, clears 5.6–6.1:1 (since 0.4.1) |
| `--destructive-foreground` | `#fef3f2` | `onError` | |
| `--warning` | `#7f5b21` | *(Figma `onWarningContainer` `#f97907` fails AA — 2.6:1)* | `amber.800`, clears 5.8–6.1:1 (since 0.4.2); dark stays bright `amber.400` |
| `--border` / `--input` | `#92b2c8` | `outline` | |
| `--ring` | `#1d4ed8` | — | tracks `--primary`; focus ring drawn via `--shadow-focus` (re-baked per theme) |
| `--radius` | `8px` | `Button` | |

## Synthesized (not in Figma)

| Token | Value | Rationale |
|---|---|---|
| `color.azure.*` ramp | Tailwind-blue-derived, 15 steps | Figma has no bright interactive blue; backs `--primary` / `--ring` / `--accent-foreground` (`azure.700` light, `azure.400` dark) |
| `--card`, `--popover` (+ `-foreground`) | = background / foreground | the semantic contract needs them; Figma has no card/popover tokens |
| `--accent-foreground` | `primary` | readable text on `accent` |
| `--success`, `--success-foreground` | `green.600` / `green.50` | Figma has no success colour; taken from the green ramp, kept distinct from `secondary` |
| `--warning`, `--warning-foreground` | `amber.800` / `#fff8eb` | Figma only exposes `warningContainer` / `onWarningContainer`, and its `onWarningContainer` orange fails AA as text |
| `--chart-6…8` | `blue.300` / `red.600` / `green.700` | 6th–8th data-viz hues for >5-series charts |
| `color.neutral.*` ramp | interpolated | Figma exposes only 3 neutral anchors (`#ffffff`, `#f6f6f6`, `#6d6d6d`) |
| entire **dark** theme | its own palette (`color.dark.json`) — not a flip of light | no dark mode in Figma |
| `radius.lg` (12), `spacing.7` (28) | interpolated | gaps in the Figma scale |
| `duration.*`, `easing.*`, `opacity.*`, `zIndex.*` | see table above | not Figma extractions at all — a named scale for values that were previously ad hoc Tailwind literals scattered per-component (`z-50`, `duration-300`, …); each name earns its value from a real, distinct existing usage (see `tokens/primitives/{motion,opacity,z-index}.json` `$description`s). A handful of pre-existing values that don't cleanly match a step (`disabled:opacity-40` in `audio-player.tsx`, `opacity-60` in `dropdown-menu.tsx`/`select.tsx`, the Calendar nav buttons' resting `opacity-50`) are left as literals with a comment rather than silently normalized — that's a design call, not a rename. |

## Cleaned during extraction

- `Primay` → `primary`, `On Primary` → `primary-foreground`, `Outline` → `border`/`input`.
- `letterSpacing` float artifacts (`0.10000000149011612`, `0.15000000596046448`)
  rounded to `0.1` / `0.15`.
- Blue ramp light steps: Figma frame **names** (`#b0d0e5`, `#a1c1d6`) disagree with
  the swatch **label** text (`#F6FBFF`, `#F0F7FF`). The label values are used
  (they match the `blue.100`+ steps, which are internally consistent).

## Regenerate

```bash
pnpm build:tokens      # node style-dictionary/build.mjs — runs SD once per theme
                       # → packages/tokens/dist/{web,ios,android,flutter}
```

Multi-theme note: `build.mjs` runs Style Dictionary **once per theme** (light, then
dark) with separate source sets, because two files defining the same token path
(`color.primary` in both `color.light.json` and `color.dark.json`) collide inside
a single run. Light emits every platform; dark emits only `globals.dark.css`.
