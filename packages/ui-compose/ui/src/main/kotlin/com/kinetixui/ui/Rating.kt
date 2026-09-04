package com.kinetixui.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin

/**
 * KinetixRating — mirrors `packages/ui/src/components/rating.tsx`: a row of
 * `max` stars, filled up to `value` (`--warning` fill) or outlined
 * (`--muted-foreground` stroke). `sm`/`md`/`lg` (16/20/24dp) all land on
 * the shared `spacing_*` scale exactly. Read-only vs. interactive follows
 * the same nullable-callback convention as [KinetixCheckbox] /
 * [KinetixRadioButton] (`onValueChange == null` ⇒ read-only). The live
 * hover preview the React version has (`onMouseEnter` per star) isn't
 * ported — same "no hover state" gap as [KinetixButton]; touch input has
 * no hover to preview with anyway. No icon library is wired into this
 * package, so the star is a hand-drawn `Path`, same call made for
 * [KinetixTag]'s remove glyph and [KinetixCheckbox]'s check mark (there as
 * text, here as geometry since a 5-point star has no clean Unicode glyph
 * at arbitrary token sizes).
 */
enum class KinetixRatingSize { Sm, Md, Lg }

@Composable
fun KinetixRating(
    value: Int,
    modifier: Modifier = Modifier,
    onValueChange: ((Int) -> Unit)? = null,
    max: Int = 5,
    size: KinetixRatingSize = KinetixRatingSize.Md,
) {
    val colors = KinetixColorScheme.current
    val starSize: Dp = when (size) {
        KinetixRatingSize.Sm -> dimensionResource(R.dimen.spacing_4) // 16dp
        KinetixRatingSize.Md -> dimensionResource(R.dimen.spacing_5) // 20dp
        KinetixRatingSize.Lg -> dimensionResource(R.dimen.spacing_6) // 24dp
    }
    val readOnly = onValueChange == null

    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(2.dp)) { // gap-0.5, not on the shared scale
        for (i in 1..max) {
            val filled = i <= value
            Canvas(
                modifier = Modifier
                    .size(starSize)
                    .clickable(enabled = !readOnly) { onValueChange?.invoke(i) },
            ) {
                val path = starPath(
                    center = Offset(this.size.width / 2f, this.size.height / 2f),
                    outerRadius = this.size.minDimension / 2f,
                    innerRadius = this.size.minDimension / 4f,
                )
                if (filled) {
                    drawPath(path, color = colors.warning, style = Fill)
                } else {
                    drawPath(path, color = colors.mutedForeground, style = Stroke(width = 1.dp.toPx()))
                }
            }
        }
    }
}

private fun starPath(center: Offset, outerRadius: Float, innerRadius: Float): Path {
    val path = Path()
    val angleStep = Math.PI / 5
    for (i in 0 until 10) {
        val angle = -Math.PI / 2 + i * angleStep
        val radius = if (i % 2 == 0) outerRadius else innerRadius
        val x = center.x + radius * cos(angle).toFloat()
        val y = center.y + radius * sin(angle).toFloat()
        if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
    }
    path.close()
    return path
}
