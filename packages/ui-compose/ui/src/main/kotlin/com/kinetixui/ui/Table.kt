package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixTable family — mirrors `packages/ui/src/components/table.tsx`.
 * Compose has no `<table>` layout primitive (no automatic cross-row column
 * alignment) — [KinetixTableHead]/[KinetixTableCell] take a `weight`
 * matched by the caller across every row, the standard Compose stand-in
 * for HTML table column sizing, same simplification `KinetixNumberInput`'s
 * segmented border makes for a different HTML-only layout trick.
 * `KinetixTable` wraps [KinetixScrollArea] (horizontal) for the source's
 * `overflow-auto` — genuine reuse, not a new scroll implementation. Row
 * borders are hand-drawn with `drawBehind`, same approach
 * `KinetixAccordionItem`'s `border-b` uses. `h-10` (40dp) isn't on the
 * shared `spacing_*` scale — hardcoded, same reasoning as
 * `KinetixToggle`'s off-scale sizes.
 */
@Composable
fun KinetixTable(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    KinetixScrollArea(modifier = modifier, orientation = KinetixScrollAreaOrientation.Horizontal) {
        Column {
            content()
        }
    }
}

@Composable
fun KinetixTableHeader(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(modifier = modifier) {
        content()
    }
}

@Composable
fun KinetixTableBody(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(modifier = modifier) {
        content()
    }
}

@Composable
fun KinetixTableFooter(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    Row(
        modifier = modifier.fillMaxWidth().background(colors.muted.copy(alpha = 0.5f)),
        content = content,
    )
}

@Composable
fun KinetixTableRow(
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    showDivider: Boolean = true,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val borderWidthPx = with(LocalDensity.current) { dimensionResource(R.dimen.border_width_default).toPx() }
    val backgroundColor = if (selected) colors.muted else Color.Transparent

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(backgroundColor)
            .then(
                if (showDivider) {
                    Modifier.drawBehind {
                        drawLine(
                            color = colors.border,
                            start = Offset(0f, size.height),
                            end = Offset(size.width, size.height),
                            strokeWidth = borderWidthPx,
                        )
                    }
                } else {
                    Modifier
                },
            ),
        content = content,
    )
}

@Composable
fun RowScope.KinetixTableHead(
    text: String,
    modifier: Modifier = Modifier,
    weight: Float = 1f,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier
            .weight(weight)
            .height(40.dp) // h-10, not on the shared scale
            .padding(dimensionResource(R.dimen.spacing_2)),
        color = colors.mutedForeground,
        fontWeight = FontWeight.Medium,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
    )
}

@Composable
fun RowScope.KinetixTableCell(
    text: String,
    modifier: Modifier = Modifier,
    weight: Float = 1f,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier
            .weight(weight)
            .padding(dimensionResource(R.dimen.spacing_2)),
        color = colors.foreground,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
    )
}

@Composable
fun KinetixTableCaption(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier.padding(top = dimensionResource(R.dimen.spacing_4)),
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
    )
}
