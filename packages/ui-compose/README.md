# @kinetixui/ui-compose

Jetpack Compose port of KinetixUI. First of the native platforms — SwiftUI
and Flutter aren't started yet. Five components so far: `KinetixButton`,
`KinetixBadge`, `KinetixSwitch`, `KinetixInput`, `KinetixSeparator`.

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
- `Badge.kt` / `Switch.kt` / `Input.kt` / `Separator.kt` — mirror their
  `packages/ui/src/components/*.tsx` counterparts. Each file's doc comment
  says exactly what wasn't carried over (mostly: CVA axes that only exist
  for web docs/snapshot tooling, and a couple of literal Figma pixel values
  that aren't on the shared `spacing_*` token scale).
- `ButtonPreviews.kt` / `ComponentPreviews.kt` — `@Preview` galleries, light
  + dark, for everything above. Not public API — open these in Android
  Studio's Design/Split view to actually look at something.
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
    }
}
```
