package com.kinetixui.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * KinetixChart — mirrors `packages/ui/src/components/chart.tsx`, which is a recharts *theming shell* rather
 * than a chart engine.
 *
 * This is the port that used to be missing, and its absence was worse than a gap: the website's Chart page
 * showed a Compose `KinetixChart` snippet with no source behind it, under a comment describing Flutter's
 * implementation. `check:platform-code` exists because of that, and this file is what closes it honestly.
 *
 * Compose has no system charting framework, and this package takes no charting dependency, so the chart is
 * drawn with `Canvas` — the same decision the Flutter port made (`lib/src/chart.dart`) and for the same
 * reason. Bars and lines are supported; anything richer is a charting library's job, and adding one is a
 * dependency decision, not a drawing one.
 *
 * Colours come from `KinetixColors.chart`, the generated `--chart-1…5` palette, indexed by series and wrapped
 * with `%` so a sixth series reuses the first colour rather than crashing.
 *
 * Accessibility: a canvas is opaque to assistive technology, so the chart carries a `contentDescription`.
 * `description` is required rather than optional — a chart nobody can read is not an accessible default, and
 * only the caller knows what the data means.
 */
enum class KinetixChartKind { Bar, Line }

data class KinetixChartPoint(
    val label: String,
    val value: Float,
    val seriesIndex: Int = 0,
)

@Composable
fun KinetixChart(
    points: List<KinetixChartPoint>,
    description: String,
    modifier: Modifier = Modifier,
    kind: KinetixChartKind = KinetixChartKind.Bar,
    height: Dp = 200.dp,
) {
    val colors = KinetixColorScheme.current
    val palette = colors.chart
    val axis = colors.border

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .semantics { contentDescription = description },
    ) {
        if (points.isEmpty()) return@Canvas
        val maxValue = points.maxOf { it.value }
        if (maxValue <= 0f) return@Canvas

        // room under the plot for the category axis; the labels themselves are the caller's, because text
        // measurement in a draw scope needs a TextMeasurer and a chart with unreadable 8px labels is worse
        // than a chart with none
        val axisInset = 18f
        val plotHeight = size.height - axisInset

        drawLine(
            color = axis,
            start = Offset(0f, plotHeight),
            end = Offset(size.width, plotHeight),
            strokeWidth = 1f,
        )

        val slot = size.width / points.size
        when (kind) {
            KinetixChartKind.Bar -> {
                val barWidth = slot * 0.6f
                points.forEachIndexed { i, point ->
                    val barHeight = (point.value / maxValue) * (plotHeight - 4f)
                    drawRect(
                        color = palette[point.seriesIndex % palette.size],
                        topLeft = Offset(i * slot + (slot - barWidth) / 2f, plotHeight - barHeight),
                        size = Size(barWidth, barHeight),
                    )
                }
            }
            KinetixChartKind.Line -> {
                // one path per series, so two series do not join into a zig-zag through each other
                points.groupBy { it.seriesIndex }.forEach { (series, seriesPoints) ->
                    val path = Path()
                    seriesPoints.forEachIndexed { i, point ->
                        val x = i * slot + slot / 2f
                        val y = plotHeight - (point.value / maxValue) * (plotHeight - 4f)
                        if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
                    }
                    drawPath(
                        path = path,
                        color = palette[series % palette.size],
                        style = Stroke(width = 2f),
                    )
                }
            }
        }
    }
}
