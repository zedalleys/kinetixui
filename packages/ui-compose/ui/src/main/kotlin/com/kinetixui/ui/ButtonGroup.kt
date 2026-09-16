package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixButtonGroup — mirrors `packages/ui/src/components/button-group.tsx`.
 * Visually joins a row (or column) of independent [KinetixButton]s into a
 * connected cluster. The web port uses CSS arbitrary-child-selectors to
 * override each `<Button>`'s own border/radius; Compose has no equivalent
 * cross-child override without changing [KinetixButton]'s own API, so this
 * port takes the simpler route Material3's own `SegmentedButtonRow` avoids
 * but many toolbar-style groups accept: a shared outer clip + border around
 * the whole group (squares off the group's *outer* corners), while each
 * child keeps drawing its own full corner radius at the internal seams.
 * Subtle in practice for the icon-toolbar use case this is built for — not
 * pixel-identical to the web port, but a documented, deliberate
 * simplification. Gap-fill addition (not in the original Figma source) —
 * matches the shadcn/ui Button Group API shape.
 */
enum class KinetixButtonGroupOrientation { Horizontal, Vertical }

@Composable
fun KinetixButtonGroup(
    orientation: KinetixButtonGroupOrientation = KinetixButtonGroupOrientation.Horizontal,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))
    val groupModifier = modifier
        .clip(shape)
        .border(dimensionResource(R.dimen.border_width_default), colors.border, shape)

    if (orientation == KinetixButtonGroupOrientation.Horizontal) {
        Row(modifier = groupModifier) { content() }
    } else {
        Column(modifier = groupModifier) { content() }
    }
}

@Composable
fun KinetixButtonGroupSeparator(
    orientation: KinetixButtonGroupOrientation = KinetixButtonGroupOrientation.Vertical,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    if (orientation == KinetixButtonGroupOrientation.Vertical) {
        Box(modifier.width(1.dp).fillMaxHeight().padding(vertical = dimensionResource(R.dimen.spacing_1)).background(colors.border))
    } else {
        Box(modifier.height(1.dp).fillMaxWidth().padding(horizontal = dimensionResource(R.dimen.spacing_1)).background(colors.border))
    }
}

/** A static, non-interactive label segment inside a group — e.g. a unit or a prefix next to steppers. */
@Composable
fun KinetixButtonGroupText(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))
    Row(
        modifier = modifier
            .background(colors.muted, shape)
            .border(dimensionResource(R.dimen.border_width_default), colors.border, shape)
            .padding(horizontal = dimensionResource(R.dimen.spacing_3)),
        // gap-1.5 — not on the shared spacing token scale, same reasoning as KinetixBadge's px-2.5
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

/** Convenience overload for a plain text label, mirroring [KinetixButtonGroupText]'s common web usage. */
@Composable
fun KinetixButtonGroupText(text: String, modifier: Modifier = Modifier) {
    val colors = KinetixColorScheme.current
    KinetixButtonGroupText(modifier = modifier) {
        Text(
            text = text,
            style = TextStyle(
                color = colors.foreground,
                fontWeight = FontWeight.Medium,
                fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
                lineHeight = dimensionResource(R.dimen.line_height_label_md).value.sp,
            ),
        )
    }
}
