# @kinetixui/ui-compose

Jetpack Compose port of KinetixUI. First of the native platforms — SwiftUI
and Flutter aren't started yet. Fifty-four components so far:
`KinetixButton`, `KinetixBadge`, `KinetixSwitch`, `KinetixInput`,
`KinetixSeparator`, `KinetixLabel`, `KinetixSpinner`, `KinetixSkeleton`,
`KinetixTag`, `KinetixProgress`, `KinetixAvatar`, `KinetixAlert`,
`KinetixCheckbox`, `KinetixTextarea`, `KinetixCard`, `KinetixRadioGroup`,
`KinetixToggle`, `KinetixAspectRatio`, `KinetixCircularProgress`,
`KinetixRating`, `KinetixField`, `KinetixFab`, `KinetixQuote`,
`KinetixSlider`, `KinetixPasswordInput`, `KinetixMetric`,
`KinetixNumberInput`, `KinetixStepper`, `KinetixBreadcrumb`,
`KinetixPagination`, `KinetixDialog`, `KinetixPopover`, `KinetixTooltip`,
`KinetixDropdownMenu`, `KinetixSheet`, `KinetixAlertDialog`,
`KinetixHoverCard`, `KinetixContextMenu`, `KinetixMenubar`, `KinetixList`,
`KinetixImage`, `KinetixInputOtp`, `KinetixInputGroup`,
`KinetixCollapsible`, `KinetixTabs`, `KinetixAccordion`,
`KinetixToggleGroup`, `KinetixScrollArea`, `KinetixToaster`,
`KinetixSelect`, `KinetixTable`, `KinetixModal`, `KinetixNavigationBar`,
`KinetixTabBar`.

This is a **standalone Gradle project**, not a pnpm/npm workspace package —
there's no `package.json` here on purpose, so it's invisible to
`pnpm install` / Turborepo. It only exists inside this monorepo for
proximity to the token source it depends on.

## What's here

- `ui/src/main/kotlin/com/kinetixui/ui/Theme.kt` — `KinetixTheme` composable
  + `KinetixColorScheme`, the first real theme wrapper on any native
  platform (iOS/Flutter still only have static token constants, no
  framework-idiomatic wrapper).
- `ui/src/main/kotlin/com/kinetixui/ui/Button.kt` — `KinetixButton`, mirroring
  `packages/ui/src/components/button.tsx`'s variant × size matrix 1:1.
- `Badge.kt` / `Switch.kt` / `Input.kt` / `Separator.kt` / `Label.kt` /
  `Spinner.kt` / `Skeleton.kt` / `Tag.kt` / `Progress.kt` — mirror their
  `packages/ui/src/components/*.tsx` counterparts. Each file's doc comment
  says exactly what wasn't carried over (mostly: CVA axes that only exist
  for web docs/snapshot tooling, and a couple of literal Figma pixel values
  that aren't on the shared `spacing_*` token scale). `KinetixSpinner` and
  `KinetixSkeleton` are the first two components with a running animation
  (`rememberInfiniteTransition`) — no Compose equivalent of `animate-spin`
  or `animate-pulse` exists as a modifier, so both are hand-rolled.
- `Avatar.kt` / `Alert.kt` / `Checkbox.kt` / `Textarea.kt` / `Card.kt` —
  same pattern. `KinetixAlert` and `KinetixCard` cascade a text color down to
  their child slots (Title/Description/etc.) via Material3's
  `LocalContentColor`, mirroring the CSS color-inheritance the React
  versions get for free. `KinetixCheckbox` uses Compose's built-in
  `ToggleableState` for Radix's tri-state (checked/unchecked/indeterminate)
  model rather than a bespoke enum.
- `RadioGroup.kt` / `Toggle.kt` / `AspectRatio.kt` / `CircularProgress.kt` /
  `Rating.kt` — same pattern. `KinetixRadioButton`/`Toggle`/`Rating` reuse
  Compose's built-in selection/toggle modifiers (`selectable`,
  `toggleable`) rather than hand-rolling interaction handling.
  `KinetixCircularProgress` is the third hand-rolled animation
  (`animateFloatAsState` driving a `Canvas` arc, same technique as
  `KinetixSpinner`/`KinetixProgress`). `KinetixRating` draws its star with a
  hand-built `Path` — no icon library is wired into this package yet, and a
  5-point star has no clean Unicode glyph at arbitrary sizes the way Tag's
  "×" or Checkbox's "✓" do.
- `Field.kt` / `Fab.kt` / `Quote.kt` / `Slider.kt` / `PasswordInput.kt` —
  same pattern. `KinetixField`/`KinetixFieldLabel`/`KinetixFieldMessage`
  share an `invalid` flag through a `compositionLocalOf`, playing the role
  the React source's `useField()` context does (the `id`/`aria-describedby`
  wiring itself isn't ported — no Android equivalent). `KinetixSlider` is
  the first component to wrap a Material3 control outright rather than
  hand-rolling interaction (`Modifier.toggleable`/`selectable` elsewhere) —
  a slider's drag/keyboard/RTL handling is real surface area worth reusing,
  at the cost of the thumb using Material3's own size instead of the
  source's exact spec. `KinetixInput` gained `trailing` (an addon-style end
  slot) and `keyboardType`/`visualTransformation` params specifically to
  support `KinetixPasswordInput`'s show/hide toggle and masking.
- `Metric.kt` / `NumberInput.kt` / `Stepper.kt` / `Breadcrumb.kt` /
  `Pagination.kt` — same pattern. `KinetixPagination*` reuses
  [KinetixButton] directly (Outline/Ghost, Icon size) rather than
  re-deriving the same colors, mirroring how the React source is itself
  just `buttonVariants` recipes. `KinetixStepper`'s vertical connector is a
  fixed `min-h-6` rather than the source's dynamic `flex-1 self-stretch` —
  Compose has no cheap stretch-to-fill-siblings without a custom layout, a
  real documented simplification. `KinetixNumberInput` models its value as
  `Int`, not the source's arbitrary fractional-`step` number.
- `Dialog.kt` / `Popover.kt` / `Tooltip.kt` / `DropdownMenu.kt` / `Sheet.kt`
  — the first **overlay-class** components (everything above renders
  inline; these render in their own window/layer). Radix's Portal +
  Root/Trigger/Content composition doesn't map to Compose 1:1, so each
  wraps the closest matching Compose/Material3 overlay primitive directly
  instead: `androidx.compose.ui.window.Dialog` (Dialog), Material3's
  `DropdownMenu` (Popover *and* DropdownMenu — restyled two different ways
  over the same anchored-popup mechanism, matching how thin the React
  Popover already is over the same Radix primitive family DropdownMenu
  uses), `TooltipBox`/`PlainTooltip` (Tooltip), `ModalBottomSheet` (Sheet —
  bottom only; left/right/top aren't ported). Every one of these visibility
  states is caller-owned (`visible: Boolean` + `onDismissRequest: () ->
  Unit`) rather than a separate `Trigger`/`Portal` sub-component graph —
  simpler, and equivalent to Radix's own controlled `open`/`onOpenChange`
  mode. `DropdownMenuSub` (nested submenus) isn't ported. See "Known gaps"
  below for the full list of what these five simplify away.
- `AlertDialog.kt` / `HoverCard.kt` / `ContextMenu.kt` / `Menubar.kt` — the
  overlay follow-up batch, same architecture as the five above.
  `KinetixAlertDialog` composes [KinetixDialog] directly (`dismissible =
  false`) and reuses its Header/Footer/Title/Description rather than
  re-deriving near-identical copies — the React `AlertDialog` really is
  just `Dialog` plus `Action`/`Cancel` buttons. `KinetixHoverCard` is
  [KinetixPopover]'s exact mechanism at a different width; hover-triggering
  itself isn't wired in (touch has no hover — the caller decides what sets
  `visible`). `KinetixContextMenu` and `KinetixMenubar` reuse
  `KinetixDropdownMenuItem`/`CheckboxItem`/`RadioItem`/`Label`/`Separator`
  directly — both are, functionally, dropdown menus with a different
  trigger (long-press; a row of always-visible triggers). `KinetixContextMenu`
  is the one overlay in this package whose visibility isn't caller-owned —
  the long-press gesture that defines a context menu lives inside the
  composable itself, and it opens anchored to its container rather than the
  exact press point (documented, not silently approximated).
  **`NavigationMenu` was evaluated and deliberately skipped**: it's a
  hover-triggered, multi-panel desktop nav pattern with no equivalent
  Android navigation idiom (Android's own primary-nav patterns are
  `NavigationBar`/`Drawer`, already differently shaped) — porting it would
  produce something unconvincing rather than something useful.
- `List.kt` / `Image.kt` / `InputOtp.kt` / `InputGroup.kt` / `Collapsible.kt`
  — back to inline components; these round out the remaining
  straightforward primitives. `KinetixImage` only supplies the
  ratio-locked, muted, rounded container — no image-loading library
  (Coil, etc.) is wired in, so the caller's own image solution goes in its
  `content` slot. `KinetixInputOtp` uses the standard Compose OTP recipe
  (a transparent `BasicTextField` capturing keystrokes under a visible row
  of boxes) rather than reimplementing the `input-otp` library's internals.
  `KinetixInputGroup` doesn't reproduce the source's CSS `focus-within`
  border glow (no descendant-focus tracking across arbitrary children
  without a shared `InteractionSource`); its button add-on's single-side
  border is hand-drawn with `drawBehind`, the same "draw it yourself"
  approach `KinetixRating`'s star uses. `KinetixCollapsible` is a two-line
  wrapper over Compose's built-in `AnimatedVisibility` — the underlying
  Radix primitive it mirrors provides nothing beyond that animation.
- `Tabs.kt` / `Accordion.kt` / `ToggleGroup.kt` / `ScrollArea.kt` /
  `Sonner.kt` — the last of the straightforward primitives; what's left
  after this is genuinely data/layout-heavy (Table, DataTable, Calendar,
  Carousel, Select, Sidebar…) and needs its own design pass. There's no
  `KinetixTabs` root — Compose has no context to thread a shared selected
  value through the way Radix does, so `KinetixTabsTrigger` takes
  `selected`/`onClick` directly, caller-owned like everything else here.
  `KinetixToggleGroup`/`KinetixToggleGroupItem` share `variant`/`size` via
  a `compositionLocalOf`, the same role the React source's own
  `ToggleGroupContext` plays — `KinetixToggleGroupItem` is a thin
  pass-through to [KinetixToggle], not a reimplementation.
  `KinetixScrollArea` wraps Compose's built-in `verticalScroll`/
  `horizontalScroll`; Radix `ScrollArea`'s whole reason to exist (a custom
  draggable scrollbar replacing the browser's native one) isn't ported —
  Android's own system scroll indicators already cover that need, so
  there's nothing to replace. **`KinetixToaster`/`kinetixToast` wrap
  Material3's `SnackbarHostState`/`SnackbarHost` directly** rather than
  hand-rolling a toast queue — the same real queue/auto-dismiss/
  swipe-to-dismiss machinery `sonner` provides on the web, reused instead
  of re-derived (the same call made for `KinetixSlider`/`KinetixDialog`).
- `Select.kt` / `Table.kt` / `Modal.kt` / `NavigationBar.kt` / `TabBar.kt` —
  the first batch from the "needs its own design pass" tier, picked for
  being both genuinely native-relevant and highly reusable. There's no
  `KinetixSelect` wrapper — a select is structurally exactly
  [KinetixDropdownMenu] with a styled trigger and checkmarked items, so
  `KinetixSelectTrigger`/`KinetixSelectItem` compose it directly rather
  than wrapping it again. `KinetixModal` is a single high-level
  composable built entirely from [KinetixDialog]/[KinetixButton] — the
  source itself is just that same composition over its own `Dialog`
  primitives, so this is almost pure reuse. `KinetixTable` wraps
  [KinetixScrollArea] (horizontal) for the source's `overflow-auto`; since
  Compose has no `<table>` layout primitive, `KinetixTableHead`/
  `KinetixTableCell` take a `weight` the caller matches across rows — the
  standard Compose stand-in for HTML column alignment.
  `KinetixNavigationBar`/`KinetixTabBar` mirror Android's own Material3
  `TopAppBar`/`NavigationBar` shape almost exactly (this pair *is* the
  native mobile top-bar/bottom-nav pattern) but are written as plain
  composables rather than wrapping those Material3 components, so the
  leading/title/actions and icon/label/badge layouts match the source
  precisely rather than Material3's own app-bar/nav-bar conventions.
- `ButtonPreviews.kt` / `ComponentPreviews.kt` / `ComponentPreviews2.kt` /
  `ComponentPreviews3.kt` / `ComponentPreviews4.kt` / `ComponentPreviews5.kt`
  / `ComponentPreviews6.kt` / `ComponentPreviews7.kt` / `ComponentPreviews8.kt`
  / `ComponentPreviews9.kt` / `ComponentPreviews10.kt` / `ComponentPreviews11.kt`
  — `@Preview` galleries, light + dark, for everything above. Not public
  API — open these in Android Studio's Design/Split view to actually look
  at something (`ComponentPreviews7.kt`'s own doc comment flags that
  `Dialog`/`Popup`-based
  overlay *content* doesn't reliably render inside the static Preview
  renderer — a known Compose limitation, not a bug here; verify those in a
  running app or Interactive Preview).
- `ui/src/main/kotlin/com/kinetixui/tokens/` — **generated, do not edit.**
  Vendored from `packages/tokens/dist/android/`; re-copy after any token
  change with `pnpm build:tokens && pnpm vendor:compose` from the repo root.
- `ui/src/main/res/values/{colors,dimens}.xml` — same deal, vendored for
  `R.color.*` / `R.dimen.*` access (Button.kt's padding/type-scale/radius are
  all read from here — nothing is a hand-picked number).

## Known gaps (read before opening an issue about them)

- **Compiled and previewed on a real machine, not just CI.** Nothing in this
  package was written by a toolchain that could compile it — this repo's dev
  environment has no JDK/Android SDK/Gradle. It's since been built and
  synced in a real Android Studio (Gradle 8.7, Kotlin 1.9.22, JVM 21, Windows
  11), which generated and committed the Gradle wrapper (`gradlew`,
  `gradlew.bat`, `gradle/wrapper/gradle-wrapper.jar`) — `./gradlew :ui:assembleDebug`
  works locally now, no separate Gradle install needed. CI
  (`.github/workflows/native-compose.yml`) also runs `assembleDebug` +
  `lintDebug` on every push that touches this package or the token source.
- **Dark mode only exists for this one Android theme file.** Extending
  `sd.config.mjs`'s `android-compose-theme` platform was scoped narrowly to
  unblock `KinetixTheme`; iOS/Flutter native token output is still
  light-only.
- **No hover/focus states.** The React `Button`'s CVA `state` axis
  (Hover/Focus/Active) is docs/snapshot tooling on the web, not carried over
  — Material3 gives real press/ripple feedback for free instead.
- **No remote publishing.** `./gradlew publishToMavenLocal` works; Maven
  Central / GitHub Packages needs your own signing key and repository
  credentials, deliberately not configured here.
- **Overlay components simplify Radix's exact behavior.** `KinetixSheet`
  only has a bottom variant (no left/right/top slide-in — no equally
  idiomatic single Android primitive for those). `KinetixDropdownMenu` has
  no nested-submenu support. `KinetixPopover`/`KinetixDropdownMenu`'s
  positioning (side/align/auto-flip) and `KinetixTooltip`'s content padding
  are entirely whatever Material3's underlying `DropdownMenu`/`PlainTooltip`
  default to, not tuned to match the source pixel-for-pixel. `TooltipBox`/
  `ModalBottomSheet` are `@ExperimentalMaterial3Api` at this project's
  Material3 version (1.2.1 via the pinned BOM) — stable behavior, just an
  opt-in annotation, worth re-checking on the next BOM bump.
- **`NavigationMenu` isn't ported.** Evaluated deliberately, not an
  oversight: it's a hover-triggered, multi-panel desktop nav pattern with
  no equivalent Android idiom. `KinetixContextMenu` opens anchored to its
  container, not the exact long-press point (no custom `PopupPositionProvider`
  math yet).

## Try it

```kotlin
KinetixTheme {
    Column {
        KinetixButton(onClick = { /* ... */ }, variant = KinetixButtonVariant.Primary) {
            Text("Get started")
        }
        KinetixBadge(text = "Beta", variant = KinetixBadgeVariant.Subtle)
        KinetixSwitch(checked = enabled, onCheckedChange = { enabled = it })
        KinetixInput(value = email, onValueChange = { email = it }, placeholder = "you@example.com")
        KinetixSeparator()
        KinetixLabel(text = "Email address")
        KinetixSpinner()
        KinetixSkeleton(modifier = Modifier.width(240.dp).height(16.dp))
        KinetixTag(text = "Beta", variant = KinetixTagVariant.Secondary, onRemove = { /* ... */ })
        KinetixProgress(value = 66f)
        KinetixAvatar { KinetixAvatarFallback(text = "ZF") }
        KinetixAlert(variant = KinetixAlertVariant.Info) {
            KinetixAlertTitle(text = "Heads up")
            KinetixAlertDescription(text = "This is an alert.")
        }
        KinetixCheckbox(checked = agreed, onCheckedChange = { agreed = it })
        KinetixTextarea(value = comment, onValueChange = { comment = it }, placeholder = "Leave a comment")
        KinetixCard {
            KinetixCardHeader {
                KinetixCardTitle(text = "Notifications")
                KinetixCardDescription(text = "Manage your preferences.")
            }
            KinetixCardContent { KinetixLabel(text = "Email alerts") }
        }
        KinetixRadioGroup {
            KinetixRadioButton(selected = choice == "a", onClick = { choice = "a" })
        }
        KinetixToggle(pressed = bold, onPressedChange = { bold = it }) { Text("B") }
        KinetixAspectRatio(ratio = 16f / 9f) { /* ... */ }
        KinetixCircularProgress(value = 75f, showValue = true)
        KinetixRating(value = stars, onValueChange = { stars = it })
        KinetixField(invalid = emailError != null) {
            KinetixFieldLabel(text = "Email")
            KinetixInput(value = email, onValueChange = { email = it }, isError = emailError != null)
            emailError?.let { KinetixFieldMessage(text = it) }
        }
        KinetixFab(onClick = { /* ... */ }) { Text("+") }
        KinetixQuote(text = "Good design is as little design as possible.", author = "Dieter Rams")
        KinetixSlider(value = volume, onValueChange = { volume = it })
        KinetixPasswordInput(value = password, onValueChange = { password = it })
        KinetixMetric(label = "Revenue", value = "$12,480", trend = KinetixMetricTrend.Up, change = "12%")
        KinetixNumberInput(value = qty, onValueChange = { qty = it }, min = 0, max = 10)
        KinetixStepper(steps = listOf(KinetixStep("Account"), KinetixStep("Profile")), current = 0)
        KinetixBreadcrumb {
            KinetixBreadcrumbLink(text = "Home", onClick = { /* ... */ })
            KinetixBreadcrumbSeparator()
            KinetixBreadcrumbPage(text = "Components")
        }
        KinetixPagination {
            KinetixPaginationContent {
                KinetixPaginationPrevious(onClick = { /* ... */ })
                KinetixPaginationLink(text = "1", onClick = { /* ... */ }, isActive = true)
                KinetixPaginationNext(onClick = { /* ... */ })
            }
        }

        var dialogVisible by remember { mutableStateOf(false) }
        KinetixButton(onClick = { dialogVisible = true }) { Text("Open dialog") }
        KinetixDialog(visible = dialogVisible, onDismissRequest = { dialogVisible = false }) {
            KinetixDialogHeader {
                KinetixDialogTitle(text = "Delete item?")
                KinetixDialogDescription(text = "This action cannot be undone.")
            }
            KinetixDialogFooter {
                KinetixButton(onClick = { dialogVisible = false }, variant = KinetixButtonVariant.Destructive) {
                    Text("Delete")
                }
            }
        }

        var menuVisible by remember { mutableStateOf(false) }
        KinetixDropdownMenu(
            visible = menuVisible,
            onDismissRequest = { menuVisible = false },
            anchor = { KinetixButton(onClick = { menuVisible = true }) { Text("Options") } },
        ) {
            KinetixDropdownMenuItem(text = "Profile", onClick = { menuVisible = false })
        }

        KinetixTooltip(text = "Saved to your library") {
            KinetixButton(onClick = { /* ... */ }) { Text("Hover me") }
        }

        var confirmVisible by remember { mutableStateOf(false) }
        KinetixAlertDialog(visible = confirmVisible, onDismissRequest = { confirmVisible = false }) {
            KinetixDialogHeader { KinetixDialogTitle(text = "Are you sure?") }
            KinetixDialogFooter {
                KinetixAlertDialogCancel(text = "Cancel", onClick = { confirmVisible = false })
                KinetixAlertDialogAction(text = "Continue", onClick = { confirmVisible = false })
            }
        }

        KinetixContextMenu(
            content = { KinetixLabel(text = "Long-press me") },
            menuContent = { KinetixDropdownMenuItem(text = "Copy", onClick = { /* ... */ }) },
        )

        var fileMenuVisible by remember { mutableStateOf(false) }
        KinetixMenubar {
            KinetixMenubarMenu(
                text = "File",
                visible = fileMenuVisible,
                onDismissRequest = { fileMenuVisible = false },
                onTriggerClick = { fileMenuVisible = true },
                menuContent = { KinetixDropdownMenuItem(text = "New file", onClick = { fileMenuVisible = false }) },
            )
        }

        KinetixList {
            KinetixListItem(title = "Email", description = "Product news", trailing = { KinetixSwitch(checked = true, onCheckedChange = {}) })
        }
        KinetixImage(ratio = KinetixImageRatio.Widescreen16To9) {
            // place your own AsyncImage/painterResource here
        }
        KinetixInputOtp(value = code, onValueChange = { code = it }, length = 6)
        KinetixInputGroup {
            KinetixInputGroupText(text = "https://")
            KinetixInputGroupInput(value = url, onValueChange = { url = it }, placeholder = "kinetixui.com")
        }
        KinetixCollapsible(expanded = detailsOpen) { KinetixLabel(text = "Extra details") }

        var tab by remember { mutableIntStateOf(0) }
        KinetixTabsList {
            KinetixTabsTrigger(text = "Account", selected = tab == 0, onClick = { tab = 0 })
            KinetixTabsTrigger(text = "Password", selected = tab == 1, onClick = { tab = 1 })
        }
        KinetixTabsContent { KinetixLabel(text = if (tab == 0) "Account settings" else "Password settings") }

        var faqOpen by remember { mutableStateOf(false) }
        KinetixAccordion {
            KinetixAccordionItem {
                KinetixAccordionTrigger(text = "Is it accessible?", expanded = faqOpen, onClick = { faqOpen = !faqOpen })
                KinetixAccordionContent(expanded = faqOpen) { KinetixLabel(text = "Yes.") }
            }
        }

        KinetixToggleGroup {
            KinetixToggleGroupItem(pressed = bold, onPressedChange = { bold = it }) { Text("B") }
        }

        KinetixScrollArea(modifier = Modifier.height(200.dp)) {
            Column { repeat(50) { i -> KinetixLabel(text = "Row $i") } }
        }

        val toastHostState = remember { SnackbarHostState() }
        KinetixToaster(hostState = toastHostState)
        // elsewhere, inside a coroutine scope:
        // kinetixToast(toastHostState, message = "Saved successfully")
    }
}
```
