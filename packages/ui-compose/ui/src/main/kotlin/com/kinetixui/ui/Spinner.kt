package com.kinetixui.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp

/**
 * KinetixSpinner — mirrors `packages/ui/src/components/spinner.tsx`
 * (a `border-2 border-current border-t-transparent` ring, `animate-spin`).
 * Compose has no CSS-current-color / border-side-transparent equivalent, so
 * this draws the same shape directly: a 270°-sweep arc (i.e. one quadrant
 * left transparent, matching `border-t-transparent`), rotating continuously.
 *
 * With animations off the arc rests and does not rotate ([KinetixLoopMotion]). [label] is the content
 * description in both modes, so the loading state never depends on the motion.
 */
enum class KinetixSpinnerSize { Sm, Md, Lg }
enum class KinetixSpinnerVariant { Default, Muted, OnColor }

@Composable
fun KinetixSpinner(
    modifier: Modifier = Modifier,
    size: KinetixSpinnerSize = KinetixSpinnerSize.Md,
    variant: KinetixSpinnerVariant = KinetixSpinnerVariant.Default,
    label: String = "Loading",
) {
    val colors = KinetixColorScheme.current
    val color = when (variant) {
        KinetixSpinnerVariant.Default -> colors.action
        KinetixSpinnerVariant.Muted -> colors.mutedForeground
        KinetixSpinnerVariant.OnColor -> colors.actionForeground
    }
    val diameter: Dp = when (size) {
        KinetixSpinnerSize.Sm -> dimensionResource(R.dimen.spacing_4) // 16dp
        KinetixSpinnerSize.Md -> dimensionResource(R.dimen.spacing_6) // 24dp
        KinetixSpinnerSize.Lg -> dimensionResource(R.dimen.spacing_8) // 32dp
    }
    val strokeWidth = dimensionResource(R.dimen.border_width_focus) // 2dp, matches `border-2`

    val reduceMotion = KinetixDisclosureMotion.rememberReduceMotion()
    val angle = if (KinetixLoopMotion.runs(reduceMotion)) {
        val transition = rememberInfiniteTransition(label = "KinetixSpinner")
        val spinning by transition.animateFloat(
            initialValue = 0f,
            targetValue = 360f,
            animationSpec = infiniteRepeatable(tween(durationMillis = KinetixLoopMotion.spinnerPeriodMillis, easing = LinearEasing)),
            label = "KinetixSpinnerAngle",
        )
        spinning
    } else {
        0f
    }

    Canvas(modifier = modifier.semantics { contentDescription = label }.size(diameter).rotate(angle)) {
        drawArc(
            color = color,
            startAngle = 0f,
            sweepAngle = 270f, // leaves one quadrant open, i.e. `border-t-transparent`
            useCenter = false,
            style = Stroke(width = strokeWidth.toPx()),
        )
    }
}
