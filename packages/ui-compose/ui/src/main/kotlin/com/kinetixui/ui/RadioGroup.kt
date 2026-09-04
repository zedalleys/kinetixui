package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp

/**
 * KinetixRadioGroup / KinetixRadioButton — mirror
 * `packages/ui/src/components/radio-group.tsx` (`grid gap-3` group,
 * 18px/2px-border circle items). Figma-literal 18px size and 10dp dot
 * (`size-2.5`) aren't on the shared `spacing_*` scale — hardcoded, same
 * reasoning as `KinetixCheckbox`'s box. Grouping/selection state is left to
 * the caller (a `selectedOption` + `onSelect` pattern), same division of
 * responsibility Radix's own `RadioGroup`/`RadioGroupItem` split has —
 * `KinetixRadioGroup` only supplies the layout + `selectableGroup()`
 * semantics, same as [KinetixCheckbox]'s nullable-callback convention for
 * a disabled/read-only item.
 */
@Composable
fun KinetixRadioGroup(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier.selectableGroup(),
        verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3)),
    ) {
        content()
    }
}

@Composable
fun KinetixRadioButton(
    selected: Boolean,
    onClick: (() -> Unit)?,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false,
) {
    val colors = KinetixColorScheme.current
    val borderColor = when {
        isError -> colors.destructive
        selected -> colors.primary
        else -> colors.border
    }
    val dotColor = if (isError) colors.destructive else colors.primary

    Box(
        modifier = modifier
            .size(18.dp)
            .clip(CircleShape)
            .selectable(
                selected = selected,
                onClick = { onClick?.invoke() },
                enabled = enabled && onClick != null,
                role = Role.RadioButton,
            )
            .border(dimensionResource(R.dimen.border_width_focus), borderColor, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (selected) {
            Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(dotColor))
        }
    }
}
