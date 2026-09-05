package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp

/**
 * KinetixPopover — mirrors `packages/ui/src/components/popover.tsx`. Built
 * on Material3's `DropdownMenu` (itself built on `Popup`) rather than a
 * hand-rolled anchored overlay — it already does anchor-relative
 * positioning and outside-tap dismissal, the same "reuse the platform
 * machinery" call [KinetixDialog]/[KinetixSlider] made. `anchor` renders
 * normally in the layout (taking the place of Radix's `PopoverTrigger`);
 * `content` renders inside the menu, restyled away from Material3's own
 * menu look to the Popover spec. `w-72` (288dp) isn't on the shared
 * `spacing_*` scale — hardcoded, same reasoning as `KinetixFab`'s
 * off-scale sizes. Side/align/offset auto-flip positioning is entirely
 * `DropdownMenu`'s own — not reproduced or tuned here.
 */
@Composable
fun KinetixPopover(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    anchor: @Composable () -> Unit,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))

    Box {
        anchor()
        DropdownMenu(
            expanded = visible,
            onDismissRequest = onDismissRequest,
            modifier = modifier
                .width(288.dp) // w-72, not on the shared scale
                .clip(shape)
                .background(colors.popover, shape)
                .padding(dimensionResource(R.dimen.spacing_4)),
        ) {
            CompositionLocalProvider(LocalContentColor provides colors.popoverForeground) {
                content()
            }
        }
    }
}
