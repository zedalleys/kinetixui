package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixTableOfContents — mirrors
 * `packages/ui/src/components/table-of-contents.tsx`: a nested list of
 * jump links with an active-item state (left accent border + primary
 * text when active). The scroll-spy that computes `active` is the
 * caller's, same as the source (`active` is a prop); this only renders,
 * and calls `onItemClick(id)` on tap. Genuinely portable — a "jump to a
 * section" nav for a long scrollable screen is a real native pattern too.
 * `level` indent step is the source's own `(level - 1) * 12 + 12` px.
 */
data class KinetixTocItem(val id: String, val label: String, val level: Int = 1)

@Composable
fun KinetixTableOfContents(
    items: List<KinetixTocItem>,
    activeId: String?,
    onItemClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current

    Column(modifier = modifier) {
        items.forEach { item ->
            val active = item.id == activeId
            Row(
                modifier = Modifier
                    .clickable { onItemClick(item.id) }
                    .height(IntrinsicSize.Min),
            ) {
                Box(
                    modifier = Modifier
                        .width(dimensionResource(R.dimen.border_width_default))
                        .fillMaxHeight()
                        .background(if (active) colors.primary else Color.Transparent),
                )
                Text(
                    text = item.label,
                    color = if (active) colors.primary else colors.mutedForeground,
                    fontWeight = if (active) FontWeight.Medium else FontWeight.Normal,
                    fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                    lineHeight = dimensionResource(R.dimen.line_height_body_sm).value.sp,
                    modifier = Modifier.padding(
                        start = (((item.level - 1) * 12) + 12).dp, // source's own indent formula
                        top = 6.dp,
                        bottom = 6.dp,
                    ),
                )
            }
        }
    }
}
