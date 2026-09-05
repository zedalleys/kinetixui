package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * KinetixFab — mirrors `packages/ui/src/components/fab.tsx` (`fabVariants`).
 * `size-14`/`size-11` (56dp/44dp) aren't on the shared `spacing_*` scale —
 * hardcoded, same reasoning as `KinetixToggle`'s off-scale sizes. `shadow-lg`
 * has no elevation token in this package (see `KinetixCard`'s doc comment)
 * — approximated with a larger literal than Card's `shadow-sm` stand-in.
 * Hover/active color shifts aren't ported — same "no hover/focus states"
 * gap as `KinetixButton`.
 */
enum class KinetixFabVariant { Primary, Secondary }
enum class KinetixFabSize { Default, Sm }

@Composable
fun KinetixFab(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: KinetixFabVariant = KinetixFabVariant.Primary,
    size: KinetixFabSize = KinetixFabSize.Default,
    extended: Boolean = false,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val diameter: Dp = when (size) {
        KinetixFabSize.Default -> 56.dp // size-14, not on the shared scale
        KinetixFabSize.Sm -> 44.dp // size-11, not on the shared scale
    }
    val containerColor = when (variant) {
        KinetixFabVariant.Primary -> colors.primary
        KinetixFabVariant.Secondary -> colors.secondary
    }
    val contentColor = when (variant) {
        KinetixFabVariant.Primary -> colors.primaryForeground
        KinetixFabVariant.Secondary -> colors.secondaryForeground
    }
    val alpha = if (enabled) 1f else 0.5f
    val shape = CircleShape

    var fabModifier = modifier.height(diameter)
    fabModifier = if (extended) fabModifier.widthIn(min = diameter) else fabModifier.width(diameter)
    fabModifier = fabModifier
        .shadow(6.dp, shape)
        .clip(shape)
        .background(containerColor.copy(alpha = alpha))
        .clickable(enabled = enabled, onClick = onClick)
        .padding(if (extended) PaddingValues(horizontal = dimensionResource(R.dimen.spacing_5)) else PaddingValues(0.dp))

    Row(
        modifier = fabModifier,
        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2), Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CompositionLocalProvider(LocalContentColor provides contentColor.copy(alpha = alpha)) {
            content()
        }
    }
}
