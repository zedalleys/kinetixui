# @kinetixui/ui

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
