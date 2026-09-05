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
 * KinetixHoverCard — mirrors `packages/ui/src/components/hover-card.tsx`.
 * Same anchored-`DropdownMenu` mechanism as [KinetixPopover] (identical
 * except `w-64` vs `w-72`) — the two React components are themselves
 * nearly identical Radix wrappers, differing mainly in trigger event
 * (hover vs. click) and width. **Hover-triggering itself isn't wired in**:
 * Android's primary input is touch, which has no mouse-hover equivalent —
 * the caller decides what sets `visible` (a long-press, a focus event, a
 * real mouse-hover via `Modifier.hoverable` on a device that has one), a
 * real, documented gap rather than a fake "hover" that wouldn't work on
 * touch anyway.
 */
@Composable
fun KinetixHoverCard(
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
                .width(256.dp) // w-64, not on the shared scale
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
