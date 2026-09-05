package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixDropdownMenu family — mirrors
 * `packages/ui/src/components/dropdown-menu.tsx`. Same anchored-`DropdownMenu`
 * mechanism as [KinetixPopover] (one restyle layer over Material3's own
 * look), with items built on Material3's `DropdownMenuItem` for real
 * click/ripple/disabled handling rather than hand-rolled rows.
 * `Checkbox`/`Radio` item variants share one private row implementation,
 * differing only in their leading glyph ("✓"/"●") — same "leading glyph
 * parameter, not a separate hand-rolled component" approach `KinetixTag`'s
 * remove control and `KinetixCheckbox`'s check mark use. `min-w-32` (128dp)
 * isn't on the shared `spacing_*` scale — hardcoded, same reasoning as
 * `KinetixPopover`'s `w-72`. **`DropdownMenuSub` (nested submenus) isn't
 * ported** — a real, deliberately deferred gap, not a silent one.
 */
@Composable
fun KinetixDropdownMenu(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    anchor: @Composable () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))

    Box {
        anchor()
        DropdownMenu(
            expanded = visible,
            onDismissRequest = onDismissRequest,
            modifier = modifier
                .widthIn(min = 128.dp) // min-w-32, not on the shared scale
                .clip(shape)
                .background(colors.popover, shape),
            content = content,
        )
    }
}

@Composable
private fun KinetixMenuItemRow(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier,
    enabled: Boolean,
    leadingGlyph: String?,
) {
    val colors = KinetixColorScheme.current
    val leading: (@Composable () -> Unit)? = if (leadingGlyph != null) {
        { Text(text = leadingGlyph, color = colors.popoverForeground) }
    } else {
        null
    }
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
        leadingIcon = leading,
    )
}

@Composable
fun KinetixDropdownMenuItem(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    KinetixMenuItemRow(text = text, onClick = onClick, modifier = modifier, enabled = enabled, leadingGlyph = null)
}

@Composable
fun KinetixDropdownMenuCheckboxItem(
    text: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    KinetixMenuItemRow(
        text = text,
        onClick = { onCheckedChange(!checked) },
        modifier = modifier,
        enabled = enabled,
        leadingGlyph = if (checked) "✓" else null,
    )
}

@Composable
fun KinetixDropdownMenuRadioItem(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    KinetixMenuItemRow(text = text, onClick = onClick, modifier = modifier, enabled = enabled, leadingGlyph = if (selected) "●" else null)
}

@Composable
fun KinetixDropdownMenuLabel(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier.padding(horizontal = dimensionResource(R.dimen.spacing_2), vertical = 6.dp), // py-1.5, not on the shared scale
        color = colors.popoverForeground,
        fontWeight = FontWeight.SemiBold,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
    )
}

@Composable
fun KinetixDropdownMenuSeparator(modifier: Modifier = Modifier) {
    KinetixSeparator(modifier = modifier.padding(vertical = dimensionResource(R.dimen.spacing_1)))
}
