package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixBadge — mirrors `packages/ui/src/components/badge.tsx`'s
 * `badgeVariants` CVA. Figma source: node 54855:13995. Type is Label Medium
 * (12/16, +0.5), same dimens as KinetixButton's `Md` size.
 *
 * Note (carried over from the React source): the design's "Secondary" badge
 * is the saturated sage, which in this token contract is
 * `--secondary-foreground` — `--secondary` is its pale container. Hence the
 * swapped container/content colors on that one variant, same as the web.
 */
enum class KinetixBadgeVariant { Default, Secondary, Destructive, Outline, Subtle }

@Composable
fun KinetixBadge(
    text: String,
    variant: KinetixBadgeVariant = KinetixBadgeVariant.Default,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    val (container, content, borderColor) = when (variant) {
        KinetixBadgeVariant.Default -> Triple(colors.primary, colors.primaryForeground, null)
        KinetixBadgeVariant.Secondary -> Triple(colors.secondaryForeground, colors.secondary, null)
        KinetixBadgeVariant.Destructive -> Triple(colors.destructive, colors.destructiveForeground, null)
        KinetixBadgeVariant.Outline -> Triple(Color.Transparent, colors.foreground, colors.border)
        KinetixBadgeVariant.Subtle -> Triple(colors.accent, colors.accentForeground, null)
    }
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_full))
    val textStyle = TextStyle(
        color = content,
        fontWeight = FontWeight.Medium,
        fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_label_md).value.sp,
        letterSpacing = dimensionResource(R.dimen.letter_spacing_wide_5).value.sp,
    )

    var pill = modifier.background(container, shape)
    if (borderColor != null) {
        pill = pill.border(dimensionResource(R.dimen.border_width_default), borderColor, shape)
    }
    // Figma's own px-2.5 isn't on the shared spacing token scale (which only
    // covers 0/4/8/12/16/20/24/28/32) — 10.dp mirrors the React `px-2.5`
    // literally rather than rounding to the nearest token step.
    pill = pill.padding(horizontal = 10.dp, vertical = dimensionResource(R.dimen.spacing_1))

    Text(text = text, style = textStyle, modifier = pill)
}
