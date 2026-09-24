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
    val action: Color,
    val actionForeground: Color,
    val actionHover: Color,
    val actionPressed: Color,
    val link: Color,
    val focus: Color,
    val brand: Color,
    val brandForeground: Color,
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
    val card: Color,
    val cardForeground: Color,
    val success: Color,
    val successForeground: Color,
    val info: Color,
    val infoForeground: Color,
    val popover: Color,
    val popoverForeground: Color,
    /**
     * The categorical chart palette, in order. A list rather than five named fields because callers index
     * into it by series — `chart[series % chart.size]` — which is what makes a chart with six series wrap
     * instead of crashing. Same shape as SwiftUI's `KinetixColors.chart`.
     */
    val chart: List<Color>,
)

private val LightKinetixColors = KinetixColors(
    primary = GeneratedLight.colorPrimary,
    primaryForeground = GeneratedLight.colorPrimaryForeground,
    action = GeneratedLight.colorAction,
    actionForeground = GeneratedLight.colorActionForeground,
    actionHover = GeneratedLight.colorActionHover,
    actionPressed = GeneratedLight.colorActionPressed,
    link = GeneratedLight.colorLink,
    focus = GeneratedLight.colorFocus,
    brand = GeneratedLight.colorBrand,
    brandForeground = GeneratedLight.colorBrandForeground,
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
    chart = listOf(
        GeneratedLight.colorChart1,
        GeneratedLight.colorChart2,
        GeneratedLight.colorChart3,
        GeneratedLight.colorChart4,
        GeneratedLight.colorChart5,
    ),
    card = GeneratedLight.colorCard,
    cardForeground = GeneratedLight.colorCardForeground,
    success = GeneratedLight.colorSuccess,
    successForeground = GeneratedLight.colorSuccessForeground,
    info = GeneratedLight.colorInfo,
    infoForeground = GeneratedLight.colorInfoForeground,
    popover = GeneratedLight.colorPopover,
    popoverForeground = GeneratedLight.colorPopoverForeground,
)

private val DarkKinetixColors = KinetixColors(
    primary = GeneratedDark.colorPrimary,
    primaryForeground = GeneratedDark.colorPrimaryForeground,
    action = GeneratedDark.colorAction,
    actionForeground = GeneratedDark.colorActionForeground,
    actionHover = GeneratedDark.colorActionHover,
    actionPressed = GeneratedDark.colorActionPressed,
    link = GeneratedDark.colorLink,
    focus = GeneratedDark.colorFocus,
    brand = GeneratedDark.colorBrand,
    brandForeground = GeneratedDark.colorBrandForeground,
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
    chart = listOf(
        GeneratedDark.colorChart1,
        GeneratedDark.colorChart2,
        GeneratedDark.colorChart3,
        GeneratedDark.colorChart4,
        GeneratedDark.colorChart5,
    ),
    card = GeneratedDark.colorCard,
    cardForeground = GeneratedDark.colorCardForeground,
    success = GeneratedDark.colorSuccess,
    successForeground = GeneratedDark.colorSuccessForeground,
    info = GeneratedDark.colorInfo,
    infoForeground = GeneratedDark.colorInfoForeground,
    popover = GeneratedDark.colorPopover,
    popoverForeground = GeneratedDark.colorPopoverForeground,
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
