package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixSegmentedControl / KinetixSegmentedControlItem — mirrors
 * `packages/ui/src/components/segmented-control.tsx`: an iOS-style
 * single-select strip. Same visual treatment as [KinetixTabsList]/
 * [KinetixTabsTrigger] (filled track, raised selected segment) and the
 * same stateless, caller-owns-the-selected-value shape — Compose has no
 * context to thread a shared value through the way Radix's `ToggleGroup`
 * does. Gap-fill addition (not in the original Figma source).
 */
@Composable
fun KinetixSegmentedControl(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_lg))

    Row(
        modifier = modifier
            .clip(shape)
            .background(colors.muted, shape)
            .padding(dimensionResource(R.dimen.spacing_1)),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

@Composable
fun KinetixSegmentedControlItem(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))
    val containerColor = if (selected) colors.background else Color.Transparent
    val contentColor = if (selected) colors.foreground else colors.mutedForeground

    Box(
        modifier = modifier
            .clip(shape)
            .background(containerColor, shape)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(
                horizontal = dimensionResource(R.dimen.spacing_3),
                vertical = dimensionResource(R.dimen.spacing_1),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            color = contentColor,
            fontWeight = FontWeight.Medium,
            fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
        )
    }
}
