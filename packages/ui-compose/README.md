# @kinetixui/ui-compose

Jetpack Compose port of KinetixUI. First of the native platforms — SwiftUI
and Flutter aren't started yet. Twenty-five components so far:
`KinetixButton`, `KinetixBadge`, `KinetixSwitch`, `KinetixInput`,
`KinetixSeparator`, `KinetixLabel`, `KinetixSpinner`, `KinetixSkeleton`,
`KinetixTag`, `KinetixProgress`, `KinetixAvatar`, `KinetixAlert`,
`KinetixCheckbox`, `KinetixTextarea`, `KinetixCard`, `KinetixRadioGroup`,
`KinetixToggle`, `KinetixAspectRatio`, `KinetixCircularProgress`,
`KinetixRating`, `KinetixField`, `KinetixFab`, `KinetixQuote`,
`KinetixSlider`, `KinetixPasswordInput`.

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
- `ButtonPreviews.kt` / `ComponentPreviews.kt` / `ComponentPreviews2.kt` /
  `ComponentPreviews3.kt` / `ComponentPreviews4.kt` / `ComponentPreviews5.kt`
  — `@Preview` galleries, light + dark, for everything above. Not public
  API — open these in Android Studio's Design/Split view to actually look
  at something.
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
    }
}
```
