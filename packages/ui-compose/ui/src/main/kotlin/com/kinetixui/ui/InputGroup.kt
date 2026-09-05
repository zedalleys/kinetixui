package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp

/**
 * KinetixInputGroup family — mirrors
 * `packages/ui/src/components/input-group.tsx`: a single bordered shell
 * hosting an input plus fixed add-ons (text, button) on either side,
 * border/focus/invalid applying to the whole group. The `focus-within`
 * border glow the React version gets from the CSS pseudo-class isn't
 * reproduced: Compose has no equivalent for "any descendant is focused"
 * without explicitly sharing one `InteractionSource` across every child a
 * caller might place here, which would make this a much narrower API — a
 * real, documented simplification, same spirit as
 * [KinetixButton]'s "no hover/focus states" gap. `KinetixInputGroupButton`'s
 * single left border is drawn with `drawBehind` (a plain
 * `Modifier.border` paints all four sides) — the same "draw it yourself"
 * approach [KinetixRating]'s star and the animated arcs in
 * [KinetixSpinner]/[KinetixCircularProgress] already use for shapes
 * Compose has no built-in modifier for.
 */
@Composable
fun KinetixInputGroup(
    modifier: Modifier = Modifier,
    isError: Boolean = false,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_sm))
    val borderColor = if (isError) colors.destructive else colors.border

    Row(
        modifier = modifier
            .clip(shape)
            .background(if (enabled) colors.background else colors.background.copy(alpha = 0.5f), shape)
            .border(dimensionResource(R.dimen.border_width_default), borderColor, shape),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

@Composable
fun RowScope.KinetixInputGroupInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    enabled: Boolean = true,
) {
    val colors = KinetixColorScheme.current
    val textStyle = TextStyle(
        color = if (enabled) colors.foreground else colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
    )

    Box(
        modifier = modifier
            .weight(1f)
            .padding(dimensionResource(R.dimen.spacing_3)),
    ) {
        if (value.isEmpty() && placeholder != null) {
            Text(text = placeholder, style = textStyle.copy(color = colors.mutedForeground))
        }
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            singleLine = true,
            textStyle = textStyle,
            cursorBrush = SolidColor(colors.primary),
        )
    }
}

@Composable
fun KinetixInputGroupText(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier.padding(horizontal = dimensionResource(R.dimen.spacing_3)),
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
    )
}

@Composable
fun KinetixInputGroupButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = KinetixColorScheme.current
    val borderColor = colors.border
    val borderWidthPx = with(LocalDensity.current) { dimensionResource(R.dimen.border_width_default).toPx() }

    Box(
        modifier = modifier
            .fillMaxHeight()
            .drawBehind {
                drawLine(color = borderColor, start = Offset(0f, 0f), end = Offset(0f, size.height), strokeWidth = borderWidthPx)
            }
            .background(colors.muted)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = dimensionResource(R.dimen.spacing_3)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            color = colors.foreground,
            fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
        )
    }
}
