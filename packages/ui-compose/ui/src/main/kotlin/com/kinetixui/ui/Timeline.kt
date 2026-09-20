package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixTimeline — mirrors `packages/ui/src/components/timeline.tsx`:
 * ordered events down a rail (dot, connector, time, content).
 * `alternating` lays content left/right of a centered rail with three
 * equal-weighted columns; the default is a single left-aligned rail. Same
 * "fixed min-height instead of a dynamic stretch" connector simplification
 * as [KinetixStepper]'s vertical orientation — Compose has no cheap
 * equivalent for React's `flex-1 self-stretch` without a custom layout.
 */
data class KinetixTimelineItem(
    val title: String,
    val time: String? = null,
    val content: String? = null,
)

@Composable
fun KinetixTimeline(
    items: List<KinetixTimelineItem>,
    modifier: Modifier = Modifier,
    alternating: Boolean = false,
) {
    Column(modifier = modifier) {
        items.forEachIndexed { i, item ->
            val isLast = i == items.lastIndex
            if (!alternating) {
                Row {
                    TimelineRail(isLast)
                    Column(
                        modifier = Modifier.padding(
                            start = dimensionResource(R.dimen.spacing_3),
                            bottom = if (!isLast) dimensionResource(R.dimen.spacing_6) else 0.dp,
                        ),
                    ) {
                        TimelineBody(item, Alignment.Start)
                    }
                }
            } else {
                val onRight = i % 2 == 0
                Row(verticalAlignment = Alignment.Top) {
                    Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.TopEnd) {
                        if (!onRight) TimelineBody(item, Alignment.End)
                    }
                    TimelineRail(isLast)
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = dimensionResource(R.dimen.spacing_4)),
                        contentAlignment = Alignment.TopStart,
                    ) {
                        if (onRight) TimelineBody(item, Alignment.Start)
                    }
                }
            }
        }
    }
}

@Composable
private fun TimelineRail(isLast: Boolean) {
    val colors = KinetixColorScheme.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        // dot size (10dp) isn't on the shared spacing scale — same call as KinetixBadge.
        Box(modifier = Modifier.size(10.dp).background(colors.action, CircleShape))
        if (!isLast) {
            Box(
                modifier = Modifier
                    .padding(vertical = dimensionResource(R.dimen.spacing_1))
                    .width(dimensionResource(R.dimen.border_width_default))
                    .heightIn(min = dimensionResource(R.dimen.spacing_6)) // fixed floor, not a dynamic stretch — see class doc
                    .background(colors.border),
            )
        }
    }
}

@Composable
private fun TimelineBody(item: KinetixTimelineItem, horizontalAlignment: Alignment.Horizontal) {
    val colors = KinetixColorScheme.current
    Column(horizontalAlignment = horizontalAlignment) {
        if (item.time != null) {
            Text(text = item.time, color = colors.mutedForeground, fontSize = dimensionResource(R.dimen.font_size_label_sm).value.sp)
        }
        Text(
            text = item.title,
            color = colors.foreground,
            fontWeight = FontWeight.Medium,
            fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
        )
        if (item.content != null) {
            Text(text = item.content, color = colors.mutedForeground, fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp)
        }
    }
}
