package com.kinetixui.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

/**
 * KinetixCircularProgress — mirrors
 * `packages/ui/src/components/circular-progress.tsx`: a ring, `--muted`
 * track / `--primary` indicator, round-capped, optional centered value
 * label. `size`/`strokeWidth` default to the React version's own defaults
 * (48dp/4dp) — literal, caller-overridable prop defaults rather than
 * design-system tokens, same status as those props have on the web.
 */
@Composable
fun KinetixCircularProgress(
    value: Float,
    modifier: Modifier = Modifier,
    size: Dp = 48.dp,
    strokeWidth: Dp = 4.dp,
    showValue: Boolean = false,
    label: String? = null,
) {
    val colors = KinetixColorScheme.current
    val fraction by animateFloatAsState(
        targetValue = (value / 100f).coerceIn(0f, 1f),
        label = "KinetixCircularProgressFraction",
    )

    Box(modifier = modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.size(size)) {
            val stroke = Stroke(width = strokeWidth.toPx(), cap = StrokeCap.Round)
            drawArc(
                color = colors.muted,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = stroke,
            )
            drawArc(
                color = colors.primary,
                startAngle = -90f,
                sweepAngle = fraction * 360f,
                useCenter = false,
                style = stroke,
            )
        }
        if (showValue || label != null) {
            Text(
                text = label ?: "${(fraction * 100f).roundToInt()}%",
                color = colors.foreground,
                fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
                lineHeight = dimensionResource(R.dimen.line_height_label_md).value.sp,
            )
        }
    }
}
