package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixKbd — mirrors `packages/ui/src/components/kbd.tsx`. A single
 * keyboard key glyph; wrap several in [KinetixKbdGroup] for a shortcut
 * combo. Gap-fill addition (not in the original Figma source) — matches
 * the shadcn/ui Kbd/KbdGroup API shape.
 */
@Composable
fun KinetixKbd(text: String, modifier: Modifier = Modifier) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_sm))
    Box(
        modifier = modifier
            .defaultMinSize(minWidth = dimensionResource(R.dimen.spacing_5), minHeight = dimensionResource(R.dimen.spacing_5))
            .background(colors.muted, shape)
            .border(dimensionResource(R.dimen.border_width_default), colors.border, shape)
            // Figma has no 1.5x spacing step (6dp) — px-1.5 mirrored
            // literally, same "off-scale, documented" call as KinetixBadge.
            .padding(horizontal = 6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = TextStyle(
                color = colors.mutedForeground,
                fontWeight = FontWeight.Medium,
                fontSize = dimensionResource(R.dimen.font_size_label_sm).value.sp,
                lineHeight = dimensionResource(R.dimen.line_height_label_sm).value.sp,
            ),
        )
    }
}

/** Lays out multiple [KinetixKbd] for a shortcut combo. */
@Composable
fun KinetixKbdGroup(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1))) {
        content()
    }
}
