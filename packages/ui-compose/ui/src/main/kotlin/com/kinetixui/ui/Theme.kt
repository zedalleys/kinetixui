package com.kinetixui.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.Color
import com.kinetixui.tokens.KinetixTheme as GeneratedLight
import com.kinetixui.tokens.KinetixThemeDark as GeneratedDark

/**
 * The semantic color set a KinetixUI component reads from — the same handful
 * of tokens every variant in the React source (packages/ui/src/components)
 * resolves to (bg-primary, text-foreground, …). Built from the generated
 * [com.kinetixui.tokens.KinetixTheme] / [com.kinetixui.tokens.KinetixThemeDark]
 * objects (vendored from packages/tokens/dist/android — do not hand-edit those,
 * re-run `node scripts/vendor-compose-tokens.mjs` after `pnpm build:tokens`).
 */
data class KinetixColors(
    val primary: Color,
    val primaryForeground: Color,
    val secondary: Color,
    val secondaryForeground: Color,
    val destructive: Color,
    val destructiveForeground: Color,
    val foreground: Color,
    val background: Color,
    val border: Color,
    val muted: Color,
    val mutedForeground: Color,
    val accent: Color,
    val accentForeground: Color,
    val tertiary: Color,
    val warning: Color,
    val warningForeground: Color,
)

private val LightKinetixColors = KinetixColors(
    primary = GeneratedLight.colorPrimary,
    primaryForeground = GeneratedLight.colorPrimaryForeground,
    secondary = GeneratedLight.colorSecondary,
    secondaryForeground = GeneratedLight.colorSecondaryForeground,
    destructive = GeneratedLight.colorDestructive,
    destructiveForeground = GeneratedLight.colorDestructiveForeground,
    foreground = GeneratedLight.colorForeground,
    background = GeneratedLight.colorBackground,
    border = GeneratedLight.colorBorder,
    muted = GeneratedLight.colorMuted,
    mutedForeground = GeneratedLight.colorMutedForeground,
    accent = GeneratedLight.colorAccent,
    accentForeground = GeneratedLight.colorAccentForeground,
    tertiary = GeneratedLight.colorTertiary,
    warning = GeneratedLight.colorWarning,
    warningForeground = GeneratedLight.colorWarningForeground,
)

private val DarkKinetixColors = KinetixColors(
    primary = GeneratedDark.colorPrimary,
    primaryForeground = GeneratedDark.colorPrimaryForeground,
    secondary = GeneratedDark.colorSecondary,
    secondaryForeground = GeneratedDark.colorSecondaryForeground,
    destructive = GeneratedDark.colorDestructive,
    destructiveForeground = GeneratedDark.colorDestructiveForeground,
    foreground = GeneratedDark.colorForeground,
    background = GeneratedDark.colorBackground,
    border = GeneratedDark.colorBorder,
    muted = GeneratedDark.colorMuted,
    mutedForeground = GeneratedDark.colorMutedForeground,
    accent = GeneratedDark.colorAccent,
    accentForeground = GeneratedDark.colorAccentForeground,
    tertiary = GeneratedDark.colorTertiary,
    warning = GeneratedDark.colorWarning,
    warningForeground = GeneratedDark.colorWarningForeground,
)

private val LocalKinetixColors = compositionLocalOf { LightKinetixColors }

/**
 * Wrap a screen (or preview) in `KinetixTheme { … }` to make [KinetixColorScheme]
 * — and therefore every `Kinetix*` component — resolve to the right light/dark
 * value set. Defaults to the system setting, same as the web `next-themes`
 * "system" mode.
 */
@Composable
fun KinetixTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkKinetixColors else LightKinetixColors
    CompositionLocalProvider(LocalKinetixColors provides colors) {
        // Layered on MaterialTheme (not replacing it) so Material ripple/elevation
        // defaults keep working; only KinetixColorScheme drives Kinetix component
        // colors for now — a real color-scheme -> MaterialTheme bridge is a
        // follow-up once there's more than one component to validate it against.
        MaterialTheme(content = content)
    }
}

object KinetixColorScheme {
    val current: KinetixColors
        @Composable get() = LocalKinetixColors.current
}
