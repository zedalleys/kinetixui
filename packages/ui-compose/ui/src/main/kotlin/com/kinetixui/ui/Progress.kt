package com.kinetixui.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource

/**
 * KinetixProgress — mirrors `packages/ui/src/components/progress.tsx`
 * (Radix `Progress`: `h-2 w-full rounded-full bg-muted` track, `bg-primary`
 * indicator translated by `-(100 - value)%`). Compose's native
 * `fillMaxWidth(fraction)` is the idiomatic, RTL-safe equivalent of that
 * translateX trick, so the indicator is sized directly rather than offset.
 *
 * @param value 0f..100f, same scale as the React `value` prop.
 */
@Composable
fun KinetixProgress(
    value: Float,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    val fraction by animateFloatAsState(
        targetValue = (value / 100f).coerceIn(0f, 1f),
        label = "KinetixProgressFraction",
    )
    val trackHeight = dimensionResource(R.dimen.spacing_2) // 8dp, matches `h-2`
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_full))

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(trackHeight)
            .clip(shape)
            .background(colors.muted),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(fraction)
                .fillMaxHeight()
                .background(colors.primary),
        )
    }
}
