package com.kinetixui.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.PlainTooltip
import androidx.compose.material3.Text
import androidx.compose.material3.TooltipBox
import androidx.compose.material3.TooltipDefaults
import androidx.compose.material3.rememberTooltipState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.sp

/**
 * KinetixTooltip — mirrors `packages/ui/src/components/tooltip.tsx`.
 * Radix's `TooltipProvider`/`Tooltip`/`TooltipTrigger`/`TooltipContent`
 * split collapses into one composable wrapping Material3's `TooltipBox` +
 * `PlainTooltip` (`@ExperimentalMaterial3Api` at this project's Material3
 * version — stable behavior, just an opt-in annotation), which already
 * brings correct hover/long-press-to-show timing and dismissal for free —
 * the same "reuse the platform machinery" call made for [KinetixDialog]/
 * [KinetixPopover]/[KinetixSlider]. `content` takes the place of
 * `TooltipTrigger`'s child. `PlainTooltip` has no exposed content-padding
 * hook, so the source's exact `px-3 py-1.5` isn't reproduced — Material3's
 * own default tooltip padding is used instead, a real, documented gap.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KinetixTooltip(
    text: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val tooltipState = rememberTooltipState()

    TooltipBox(
        positionProvider = TooltipDefaults.rememberPlainTooltipPositionProvider(),
        tooltip = {
            PlainTooltip(
                containerColor = colors.primary,
                contentColor = colors.primaryForeground,
                shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md)),
            ) {
                Text(text = text, fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp)
            }
        },
        state = tooltipState,
        modifier = modifier,
    ) {
        content()
    }
}
