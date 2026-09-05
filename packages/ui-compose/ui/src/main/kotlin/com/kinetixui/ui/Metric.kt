package com.kinetixui.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixMetric — mirrors `packages/ui/src/components/metric.tsx`: a stat/
 * KPI card (label, value, optional trend + change, optional icon/chart
 * slots). The trend arrows (lucide `ArrowUp`/`ArrowDown`) are plain Unicode
 * ("↑"/"↓") — no icon library is wired into this package (same call made
 * for `KinetixTag`'s remove glyph).
 */
enum class KinetixMetricTrend { Up, Down, Neutral }

@Composable
fun KinetixMetric(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    trend: KinetixMetricTrend? = null,
    change: String? = null,
    icon: (@Composable () -> Unit)? = null,
    chart: (@Composable () -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))

    Column(
        modifier = modifier
            .clip(shape)
            .border(dimensionResource(R.dimen.border_width_default), colors.border, shape)
            .padding(dimensionResource(R.dimen.spacing_4)),
        verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2)),
    ) {
        Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = label,
                color = colors.mutedForeground,
                fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                lineHeight = dimensionResource(R.dimen.line_height_body_sm).value.sp,
                modifier = Modifier.weight(1f),
            )
            icon?.invoke()
        }
        Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
            Text(
                text = value,
                color = colors.foreground,
                fontWeight = FontWeight.Medium,
                fontSize = dimensionResource(R.dimen.font_size_headline_sm).value.sp,
                lineHeight = dimensionResource(R.dimen.line_height_headline_sm).value.sp,
                modifier = Modifier.weight(1f),
            )
            if (trend != null) {
                val trendColor = when (trend) {
                    KinetixMetricTrend.Up -> colors.success
                    KinetixMetricTrend.Down -> colors.destructive
                    KinetixMetricTrend.Neutral -> colors.mutedForeground
                }
                val arrow = when (trend) {
                    KinetixMetricTrend.Up -> "↑ "
                    KinetixMetricTrend.Down -> "↓ "
                    KinetixMetricTrend.Neutral -> ""
                }
                Text(
                    text = "$arrow${change.orEmpty()}",
                    color = trendColor,
                    fontWeight = FontWeight.Medium,
                    fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
                    lineHeight = dimensionResource(R.dimen.line_height_label_md).value.sp,
                )
            }
        }
        chart?.invoke()
    }
}
