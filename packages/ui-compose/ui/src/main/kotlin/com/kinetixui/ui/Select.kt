package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.sp

/**
 * KinetixSelectTrigger / KinetixSelectItem — mirrors
 * `packages/ui/src/components/select.tsx`. There's no `KinetixSelect`
 * wrapper: a select is, structurally, exactly [KinetixDropdownMenu] with a
 * styled trigger and checkmarked items — `KinetixSelectTrigger` as the
 * `anchor` and a column of `KinetixSelectItem`s as `content` composes it
 * directly, same "it's already the thing we built" call
 * [KinetixPagination] made for [KinetixButton]. `min-h-[44px]` (44dp)
 * isn't on the shared `spacing_*` scale — hardcoded, same reasoning as
 * `KinetixNumberInput`'s off-scale sizes. The scroll-up/down chevron
 * buttons for overflowing option lists aren't ported — Material3's
 * `DropdownMenu` scrolls its content natively without needing them.
 *
 * ```
 * var open by remember { mutableStateOf(false) }
 * KinetixDropdownMenu(
 *     visible = open,
 *     onDismissRequest = { open = false },
 *     anchor = { KinetixSelectTrigger(text = selected, onClick = { open = true }, modifier = Modifier.width(200.dp)) },
 * ) {
 *     options.forEach { option ->
 *         KinetixSelectItem(text = option, selected = option == selected, onClick = { selected = option; open = false })
 *     }
 * }
 * ```
 */
@Composable
fun KinetixSelectTrigger(
    text: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    enabled: Boolean = true,
    isError: Boolean = false,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_sm))
    val borderColor = if (isError) colors.destructive else colors.border

    Row(
        modifier = modifier
            .clip(shape)
            .background(colors.background, shape)
            .border(dimensionResource(R.dimen.border_width_default), borderColor, shape)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(dimensionResource(R.dimen.spacing_3)),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = text ?: placeholder.orEmpty(),
            color = if (text != null) colors.foreground else colors.mutedForeground,
            fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        )
        Text(text = "⌄", color = colors.mutedForeground)
    }
}

@Composable
fun KinetixSelectItem(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = KinetixColorScheme.current
    DropdownMenuItem(
        text = {
            Text(
                text = text,
                color = colors.popoverForeground,
                fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
            )
        },
        onClick = onClick,
        modifier = modifier,
        enabled = enabled,
        leadingIcon = if (selected) {
            { Text(text = "✓", color = colors.popoverForeground) }
        } else {
            null
        },
    )
}
