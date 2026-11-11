package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
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
    val reduceMotion = KinetixDisclosureMotion.rememberReduceMotion()
    val target = KinetixProgressMotion.fraction(value)
    val fraction = KinetixProgressMotion.animatedFraction(value, reduceMotion)
    val trackHeight = dimensionResource(R.dimen.spacing_2) // 8dp, matches `h-2`
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_full))

    Box(
        modifier = modifier
            .fillMaxWidth()
            .semantics { progressBarRangeInfo = ProgressBarRangeInfo(target, 0f..1f) }
            .height(trackHeight)
            .clip(shape)
            .background(colors.muted),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(fraction)
                .fillMaxHeight()
                .background(colors.action),
        )
    }
}
