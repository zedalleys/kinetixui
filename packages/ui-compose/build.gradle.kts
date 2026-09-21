// Root build script — plugin versions only, applied per-module below.
// No org.jetbrains.kotlin.android: AGP 9's built-in Kotlin support replaced
// it (see ui/build.gradle.kts).
plugins {
    id("com.android.library") version "9.4.1" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.20" apply false
}
