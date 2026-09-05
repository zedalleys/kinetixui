package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixInform — mirrors `packages/ui/src/components/inform.tsx`: a
 * persistent, dismissible, intent-tinted inline notice with an optional
 * action — filled and closable, distinct from the border-only, static
 * [KinetixAlert]. `Warning`/`Success`/`Error` use the source's `/10`–`/15`
 * alpha container tints (`Color.copy(alpha = ...)`, same technique
 * [KinetixAlert]'s border tint uses); `Action` inverts to
 * `foreground`-on-`background` — no separate token, just the pair swapped.
 * The leading intent icon isn't ported — no icon library wired in yet,
 * same gap noted for `KinetixAlert`/`KinetixFieldMessage`. The dismiss
 * "×" and action-label glyphs follow the same plain-text convention as
 * `KinetixTag`'s remove control.
 */
enum class KinetixInformVariant { Information, Warning, Success, Error, Action }

@Composable
fun KinetixInform(
    text: String,
    modifier: Modifier = Modifier,
    variant: KinetixInformVariant = KinetixInformVariant.Information,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    onDismiss: (() -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val (container, content): Pair<Color, Color> = when (variant) {
        KinetixInformVariant.Information -> colors.info.copy(alpha = 0.1f) to colors.info
        KinetixInformVariant.Warning -> colors.warning.copy(alpha = 0.15f) to colors.warning
        KinetixInformVariant.Success -> colors.success.copy(alpha = 0.15f) to colors.success
        KinetixInformVariant.Error -> colors.destructive.copy(alpha = 0.1f) to colors.destructive
        KinetixInformVariant.Action -> colors.foreground to colors.background
    }
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))

    Row(
        modifier = modifier
            .clip(shape)
            .background(container, shape)
            .padding(dimensionResource(R.dimen.spacing_3)),
        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2)),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = text,
                color = content,
                fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
            )
            if (actionLabel != null) {
                Text(
                    text = actionLabel,
                    color = content,
                    fontWeight = FontWeight.Medium,
                    fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
                    modifier = Modifier
                        .padding(top = dimensionResource(R.dimen.spacing_2))
                        .clickable(enabled = onAction != null) { onAction?.invoke() },
                )
            }
        }
        if (onDismiss != null) {
            Text(
                text = "×",
                color = content,
                modifier = Modifier
                    .align(Alignment.Top)
                    .clickable(onClick = onDismiss),
            )
        }
    }
}
