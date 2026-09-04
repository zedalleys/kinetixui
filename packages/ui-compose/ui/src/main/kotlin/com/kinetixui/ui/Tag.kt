package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixTag — mirrors `packages/ui/src/components/tag.tsx` (`tagVariants`).
 * Distinct from [KinetixBadge]: container-tinted dismissible chip, `rounded-sm`
 * (not a full pill), Label Medium type. Like the React source, `Destructive`
 * and `Warning` swap container/content (`bg-destructive-foreground
 * text-destructive`, `bg-warning-foreground text-warning`) rather than
 * following the usual foreground-on-color pattern — a deliberate "soft"
 * treatment, not a bug.
 *
 * `onRemove` renders a plain "×" glyph rather than pulling in an icon-font
 * dependency for one glyph (the React source uses lucide's `X`).
 */
enum class KinetixTagVariant { Default, Secondary, Destructive, Warning, Outline }

@Composable
fun KinetixTag(
    text: String,
    modifier: Modifier = Modifier,
    variant: KinetixTagVariant = KinetixTagVariant.Default,
    onRemove: (() -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val container: Color
    val content: Color
    var borderColor: Color? = null
    when (variant) {
        KinetixTagVariant.Default -> {
            container = colors.accent
            content = colors.accentForeground
        }
        KinetixTagVariant.Secondary -> {
            container = colors.secondary
            content = colors.secondaryForeground
        }
        KinetixTagVariant.Destructive -> {
            container = colors.destructiveForeground
            content = colors.destructive
        }
        KinetixTagVariant.Warning -> {
            container = colors.warningForeground
            content = colors.warning
        }
        KinetixTagVariant.Outline -> {
            container = Color.Transparent
            content = colors.foreground
            borderColor = colors.border
        }
    }

    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_sm))
    val fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp
    val lineHeight = dimensionResource(R.dimen.line_height_label_md).value.sp
    val letterSpacing = dimensionResource(R.dimen.letter_spacing_wide_5).value.sp

    var chip = modifier.clip(shape)
    if (borderColor != null) {
        chip = chip.border(dimensionResource(R.dimen.border_width_default), borderColor, shape)
    }
    chip = chip
        .background(container, shape)
        .padding(
            horizontal = dimensionResource(R.dimen.spacing_2),
            vertical = dimensionResource(R.dimen.spacing_1),
        )

    Row(
        modifier = chip,
        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = text,
            color = content,
            fontWeight = FontWeight.Medium,
            fontSize = fontSize,
            lineHeight = lineHeight,
            letterSpacing = letterSpacing,
        )
        if (onRemove != null) {
            Text(
                text = "×",
                color = content,
                fontSize = fontSize,
                modifier = Modifier.clickable(onClick = onRemove),
            )
        }
    }
}
