package com.kinetixui.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
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
    val targetBorder = when {
        isError -> colors.destructive
        selected -> colors.action
        else -> colors.border
    }
    val dotColor = if (isError) colors.destructive else colors.action
    // `selection-state` (fast, standard) on the edge, and on the dot's opacity — the dot is composed
    // either way now rather than appearing from nothing, because a radio whose only animated
    // property is its border reads as not animating at all. Matches the React port, where the dot
    // fades in and out on `fast`.
    val reduceMotion = KinetixDisclosureMotion.rememberReduceMotion()
    val borderColor by animateColorAsState(targetBorder, KinetixSelectionMotion.spec(reduceMotion), label = "KinetixRadioBorder")
    val dotAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0f,
        animationSpec = KinetixSelectionMotion.spec(reduceMotion),
        label = "KinetixRadioDot",
    )

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
        Box(modifier = Modifier.size(10.dp).alpha(dotAlpha).clip(CircleShape).background(dotColor))
    }
}
