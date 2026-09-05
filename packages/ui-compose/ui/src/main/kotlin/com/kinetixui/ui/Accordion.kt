package com.kinetixui.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixAccordion family — mirrors
 * `packages/ui/src/components/accordion.tsx`. Radix's `Root`/`Item` don't
 * carry any styling of their own here beyond `border-b` — that border is
 * hand-drawn with `drawBehind` (a plain `Modifier.border` paints all four
 * sides), same "draw it yourself" approach `KinetixInputGroupButton`'s
 * single-side border uses. Expand/collapse reuses Compose's built-in
 * `AnimatedVisibility`, same as `KinetixCollapsible` — no
 * `Root`/`Trigger`/`Content` graph to reassemble, `expanded` is
 * caller-owned. The chevron is a plain "▾" glyph rotated 180° when open —
 * no icon library is wired into this package, same gap noted for
 * `KinetixRating`/`KinetixTag`.
 */
@Composable
fun KinetixAccordion(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(modifier = modifier) {
        content()
    }
}

@Composable
fun KinetixAccordionItem(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val borderWidthPx = with(LocalDensity.current) { dimensionResource(R.dimen.border_width_default).toPx() }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .drawBehind {
                drawLine(
                    color = colors.border,
                    start = Offset(0f, size.height),
                    end = Offset(size.width, size.height),
                    strokeWidth = borderWidthPx,
                )
            },
    ) {
        content()
    }
}

@Composable
fun KinetixAccordionTrigger(
    text: String,
    expanded: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    val rotation by animateFloatAsState(targetValue = if (expanded) 180f else 0f, label = "KinetixAccordionChevron")

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = dimensionResource(R.dimen.spacing_4)),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = text,
            color = colors.foreground,
            fontWeight = FontWeight.Medium,
            fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        )
        Text(
            text = "▾",
            color = colors.mutedForeground,
            modifier = Modifier.graphicsLayer { rotationZ = rotation },
        )
    }
}

@Composable
fun KinetixAccordionContent(
    expanded: Boolean,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    AnimatedVisibility(visible = expanded, modifier = modifier) {
        Column(modifier = Modifier.padding(bottom = dimensionResource(R.dimen.spacing_4))) {
            content()
        }
    }
}
