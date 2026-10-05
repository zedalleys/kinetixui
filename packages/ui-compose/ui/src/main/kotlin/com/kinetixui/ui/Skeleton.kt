package com.kinetixui.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.dimensionResource

/**
 * KinetixSkeleton — mirrors `packages/ui/src/components/skeleton.tsx`
 * (`animate-pulse rounded-md bg-muted`). Has no intrinsic size, same as the
 * React version, which is sized entirely by the caller's `className`; here
 * that's the caller's `modifier` (e.g. `Modifier.fillMaxWidth().height(20.dp)`).
 *
 * With animations off the placeholder rests at full alpha and does not pulse ([KinetixLoopMotion]),
 * which is React's `motion-reduce:animate-none`.
 */
@Composable
fun KinetixSkeleton(modifier: Modifier = Modifier) {
    val colors = KinetixColorScheme.current
    val reduceMotion = KinetixDisclosureMotion.rememberReduceMotion()
    val alpha = if (KinetixLoopMotion.runs(reduceMotion)) {
        val transition = rememberInfiniteTransition(label = "KinetixSkeleton")
        val pulsing by transition.animateFloat(
            initialValue = 1f,
            targetValue = 0.5f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = KinetixLoopMotion.skeletonHalfCycleMillis),
                repeatMode = RepeatMode.Reverse,
            ),
            label = "KinetixSkeletonAlpha",
        )
        pulsing
    } else {
        1f
    }
    Box(
        modifier = modifier
            .graphicsLayer { this.alpha = alpha }
            .clip(RoundedCornerShape(dimensionResource(R.dimen.radius_md)))
            .background(colors.muted),
    )
}
