package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixTabs family — mirrors `packages/ui/src/components/tabs.tsx`.
 * There's no `KinetixTabs` root: unlike Radix, Compose has no context to
 * thread a shared selected-value through, so [KinetixTabsTrigger] takes
 * `selected`/`onClick` directly (the caller owns the selected value the
 * same way it owns every other overlay/selection state in this package).
 * `h-9` (36dp) isn't on the shared `spacing_*` scale — hardcoded, same
 * reasoning as `KinetixToggle`'s off-scale sizes. The active tab's
 * `shadow` has no elevation token here — same documented gap as
 * `KinetixCard`'s `shadow-sm`.
 */
@Composable
fun KinetixTabsList(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_lg))

    Row(
        modifier = modifier
            .height(36.dp) // h-9, not on the shared scale
            .clip(shape)
            .background(colors.muted, shape)
            .padding(dimensionResource(R.dimen.spacing_1)),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

@Composable
fun KinetixTabsTrigger(
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
            fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        )
    }
}

@Composable
fun KinetixTabsContent(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(modifier = modifier.padding(top = dimensionResource(R.dimen.spacing_2))) { // mt-2
        content()
    }
}
