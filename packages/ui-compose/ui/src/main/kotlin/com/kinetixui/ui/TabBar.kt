package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixTabBar / KinetixTabBarItem — mirrors
 * `packages/ui/src/components/tab-bar.tsx`: a mobile bottom navigation
 * bar, the same shape as Android's own Material3 `NavigationBar`/
 * `NavigationBarItem` — ported as a plain composable rather than wrapping
 * those directly so the icon/label/badge layout matches the source
 * exactly. The badge's `size-4`/`min-w-4` (16dp) and its `10px` text
 * aren't on the shared `spacing_*`/type scales — hardcoded, same
 * reasoning as `KinetixFab`'s off-scale sizes. The top border is
 * hand-drawn with `drawBehind`, same approach `KinetixNavigationBar`'s
 * `border-b` uses.
 */
@Composable
fun KinetixTabBar(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val borderWidthPx = with(LocalDensity.current) { dimensionResource(R.dimen.border_width_default).toPx() }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.background)
            .drawBehind {
                drawLine(
                    color = colors.border,
                    start = Offset(0f, 0f),
                    end = Offset(size.width, 0f),
                    strokeWidth = borderWidthPx,
                )
            },
        content = content,
    )
}

@Composable
fun RowScope.KinetixTabBarItem(
    icon: @Composable () -> Unit,
    label: String,
    active: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    badge: String? = null,
) {
    val colors = KinetixColorScheme.current
    val contentColor = if (active) colors.primary else colors.mutedForeground

    Column(
        modifier = modifier
            .weight(1f)
            .clickable(onClick = onClick)
            .padding(vertical = dimensionResource(R.dimen.spacing_2)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1)),
    ) {
        Box {
            CompositionLocalProvider(LocalContentColor provides contentColor) {
                icon()
            }
            if (badge != null) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 6.dp, y = (-4).dp)
                        .size(16.dp) // size-4/min-w-4, not on the shared scale
                        .clip(CircleShape)
                        .background(colors.destructive),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(text = badge, color = colors.destructiveForeground, fontSize = 10.sp)
                }
            }
        }
        Text(
            text = label,
            color = contentColor,
            fontWeight = FontWeight.Medium,
            fontSize = dimensionResource(R.dimen.font_size_label_sm).value.sp,
        )
    }
}
