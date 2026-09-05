package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixFooter family — mirrors `packages/ui/src/components/footer.tsx`:
 * a bordered footer shell holding `KinetixFooterColumn`s of
 * `KinetixFooterLink`s plus an optional `KinetixFooterBottom` bar. Plain
 * styled containers, no web-specific behavior — a "legal / links /
 * version" block at the bottom of a long scrollable screen is a real
 * native pattern too. Top borders are hand-drawn with `drawBehind`, same
 * approach `KinetixAccordionItem`/`KinetixNavigationBar` use. `px-6 py-10`
 * → `spacing_6` and 40dp (off the shared scale — hardcoded); the
 * `KinetixFooterBottom` `mt-8`/`pt-6` → 32dp/`spacing_6`.
 */
@Composable
fun KinetixFooter(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val borderWidthPx = with(LocalDensity.current) { dimensionResource(R.dimen.border_width_default).toPx() }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.background)
            .drawBehind {
                drawLine(colors.border, Offset(0f, 0f), Offset(size.width, 0f), borderWidthPx)
            }
            .padding(
                horizontal = dimensionResource(R.dimen.spacing_6),
                vertical = 40.dp, // py-10, off the shared scale
            ),
    ) {
        content()
    }
}

@Composable
fun KinetixFooterColumn(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3))) {
        Text(
            text = title,
            color = colors.foreground,
            fontWeight = FontWeight.Medium,
            fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
        )
        Column(verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2))) {
            content()
        }
    }
}

@Composable
fun KinetixFooterLink(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier.clickable(onClick = onClick),
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
    )
}

@Composable
fun KinetixFooterBottom(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val borderWidthPx = with(LocalDensity.current) { dimensionResource(R.dimen.border_width_default).toPx() }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 32.dp) // mt-8, off the shared scale
            .drawBehind {
                drawLine(colors.border, Offset(0f, 0f), Offset(size.width, 0f), borderWidthPx)
            }
            .padding(top = dimensionResource(R.dimen.spacing_6)),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}
