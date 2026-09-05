package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixMenubar family — mirrors `packages/ui/src/components/menubar.tsx`.
 * `KinetixMenubarMenu`'s trigger + dropdown reuse the exact same
 * anchored-`DropdownMenu` mechanism and item family as [KinetixDropdownMenu]
 * (`KinetixDropdownMenuItem`/`CheckboxItem`/`RadioItem`/`Label`/`Separator`
 * apply here too — a menubar is, functionally, a row of dropdown menus).
 * `h-9` (36dp) and the content `min-w-[12rem]` (192dp) aren't on the
 * shared `spacing_*` scale — hardcoded, same reasoning as
 * `KinetixToggle`'s off-scale sizes. `shadow-sm` has no elevation token
 * here — same documented gap as `KinetixCard`. `MenubarSub` (nested
 * submenus) isn't ported, same gap as [KinetixDropdownMenu]'s.
 */
@Composable
fun KinetixMenubar(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))

    Row(
        modifier = modifier
            .height(36.dp) // h-9, not on the shared scale
            .clip(shape)
            .background(colors.background, shape)
            .border(dimensionResource(R.dimen.border_width_default), colors.border, shape)
            .padding(dimensionResource(R.dimen.spacing_1)),
        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1)),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

@Composable
fun KinetixMenubarMenu(
    text: String,
    visible: Boolean,
    onDismissRequest: () -> Unit,
    onTriggerClick: () -> Unit,
    modifier: Modifier = Modifier,
    menuContent: @Composable ColumnScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val triggerShape = RoundedCornerShape(dimensionResource(R.dimen.radius_sm))
    val menuShape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))
    val triggerContainer = if (visible) colors.accent else Color.Transparent
    val triggerContent = if (visible) colors.accentForeground else colors.foreground

    Box(modifier = modifier) {
        Text(
            text = text,
            color = triggerContent,
            fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
            modifier = Modifier
                .clip(triggerShape)
                .background(triggerContainer, triggerShape)
                .clickable(onClick = onTriggerClick)
                .padding(
                    horizontal = dimensionResource(R.dimen.spacing_3),
                    vertical = dimensionResource(R.dimen.spacing_1),
                ),
        )
        DropdownMenu(
            expanded = visible,
            onDismissRequest = onDismissRequest,
            modifier = Modifier
                .widthIn(min = 192.dp) // min-w-[12rem], not on the shared scale
                .clip(menuShape)
                .background(colors.popover, menuShape),
            content = menuContent,
        )
    }
}
