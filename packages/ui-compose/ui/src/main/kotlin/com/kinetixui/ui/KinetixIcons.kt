package com.kinetixui.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The default artwork for icons the components draw themselves — a dialog's close, a disclosure chevron, a
 * checkbox's mark. Internal: an application never needs these, and the components that let it replace an
 * icon take a `@Composable () -> Unit`, not one of these.
 *
 * Why vectors and why here (docs/audits/ICON-ARCHITECTURE-AUDIT.md, "Compose"): until this file, every
 * component-owned icon on Compose was a Unicode character in a `Text` — "×", "‹", "▾", "✓", even an emoji
 * bell. A glyph depends on the device font (and "🔔", "⏩", "⏪" render as colour emoji that ignore the
 * theme's tint and disabled state), and TalkBack reads it aloud: "multiplication sign", "single
 * left-pointing angle quotation mark". These are Material icons' own path data (Apache 2.0, the
 * `material-icons-core` "Filled" set), drawn with material3's [Icon] — so Compose renders the Material icon a
 * Compose developer expects, with no new dependency. `androidx.compose.material:material-icons-core` is not
 * on this module's classpath (material3 stopped bringing it in), and pulling a frozen artifact in for a
 * dozen paths is the trade this avoids.
 *
 * Directional icons set `autoMirror`, so in a right-to-left layout they point the other way — the job the
 * bidi algorithm used to do for "‹" and "›". Everything else points the same way in both directions.
 */
internal object KinetixIcons {
    val Close = icon("Close", "M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12z")
    val Check = icon("Check", "M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41,-1.41z")
    val Remove = icon("Remove", "M19,13H5v-2h14v2z")
    val Add = icon("Add", "M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z")

    /** Points to the inline start: Back, Previous. */
    val ChevronStart = icon("ChevronStart", "M15.41,7.41L14,6l-6,6 6,6 1.41,-1.41L10.83,12z", autoMirror = true)

    /** Points to the inline end: Next, a collapsed disclosure. */
    val ChevronEnd = icon("ChevronEnd", "M10,6L8.59,7.41 13.17,12l-4.58,4.59L10,18l6,-6z", autoMirror = true)

    /** Points down in both directions: an accordion, a select, an expanded disclosure. */
    val ExpandMore = icon("ExpandMore", "M16.59,8.59L12,13.17 7.41,8.59 6,10l6,6 6,-6z")

    val Notifications = icon(
        "Notifications",
        "M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.89,2 2,2zM18,16v-5c0,-3.07 -1.64,-5.64 -4.5,-6.32V4c0,-0.83 -0.67,-1.5 " +
            "-1.5,-1.5s-1.5,0.67 -1.5,1.5v0.68C7.63,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2zM16,17H8v-6c0,-2.48 " +
            "1.51,-4.5 4,-4.5s4,2.02 4,4.5v6z",
    )
    val PlayArrow = icon("PlayArrow", "M8,5v14l11,-7z")
    val Pause = icon("Pause", "M6,19h4L10,5L6,5v14zM14,5v14h4L18,5h-4z")

    // Transport controls name a time direction, not a reading direction: they do not mirror.
    val SkipPrevious = icon("SkipPrevious", "M6,6h2v12L6,18zM9.5,12l8.5,6L18,6z")
    val SkipNext = icon("SkipNext", "M6,18l8.5,-6L6,6v12zM16,6v12h2V6h-2z")
    val FastRewind = icon("FastRewind", "M11,18L11,6l-8.5,6 8.5,6zM11.5,12l8.5,6L20,6l-8.5,6z")
    val FastForward = icon("FastForward", "M4,18l8.5,-6L4,6v12zM13,6v12l8.5,-6L13,6z")

    private fun icon(name: String, pathData: String, autoMirror: Boolean = false): ImageVector =
        ImageVector.Builder(
            name = name,
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f,
            autoMirror = autoMirror,
        ).addPath(
            pathData = PathParser().parsePathString(pathData).toNodes(),
            // Tinted by Icon at draw time; the fill only has to be opaque.
            fill = SolidColor(Color.Black),
        ).build()
}

/**
 * A component-owned icon, decorative: material3's [Icon] with no content description, so it adds nothing to
 * the semantics tree. The control it sits in carries the name. Tinted with [LocalContentColor] unless told
 * otherwise, so it follows the component's state colours like the text beside it.
 */
@Composable
internal fun KinetixIcon(icon: ImageVector, size: Dp, modifier: Modifier = Modifier, tint: Color = LocalContentColor.current) {
    Icon(imageVector = icon, contentDescription = null, modifier = modifier.size(size), tint = tint)
}

/**
 * The one shape every component-owned, icon-only control takes on Compose — a dismiss mark, a dialog's close,
 * a back chevron. It owns what the icon contract (/docs/icons) says the component owns, so the icon inside —
 * the default, or one the application passes in — only has to draw itself:
 *
 * - the accessible name ([label]) and the button role, so TalkBack says "Dismiss, button", not the name of a
 *   Unicode character or nothing at all;
 * - the icon's box ([iconSize], with min constraints propagated, so any composable is laid out at that size)
 *   and its colour ([tint], provided as [LocalContentColor], which material3's `Icon` uses by default).
 *
 * [padding] widens the touch target around the icon without changing the icon's own size.
 */
@Composable
internal fun KinetixIconControl(
    label: String,
    onClick: () -> Unit,
    iconSize: Dp,
    tint: Color,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    padding: Dp = 0.dp,
    icon: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = label }
            .padding(padding),
        contentAlignment = Alignment.Center,
    ) {
        Box(modifier = Modifier.size(iconSize), contentAlignment = Alignment.Center, propagateMinConstraints = true) {
            CompositionLocalProvider(LocalContentColor provides tint) { icon() }
        }
    }
}
