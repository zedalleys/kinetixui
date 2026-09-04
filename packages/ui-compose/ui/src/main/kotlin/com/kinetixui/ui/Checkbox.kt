package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.triStateToggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixCheckbox — mirrors `packages/ui/src/components/checkbox.tsx`.
 * Figma source: node 54863:483. 18px box (Figma-literal, not on the shared
 * `spacing_*` scale — hardcoded), `radius_sm`, 2px border (reuses
 * `border_width_focus`, which happens to equal the CVA's `border-2`).
 * Unchecked border reuses `colors.border` (`--input` == `--border` in both
 * themes, same simplification as [KinetixInput]).
 *
 * Radix's tri-state model (`checked | unchecked | indeterminate`) maps onto
 * Compose's built-in [ToggleableState] + `Modifier.triStateToggleable`
 * directly — no need to invent a parallel enum. The check/dash glyphs are
 * plain Unicode `Text`, same call made for [KinetixTag]'s remove glyph (no
 * icon library dependency in this package yet). The focus ring
 * (`focus-visible:ring-2 ring-ring ring-offset-2`) isn't ported — same
 * "no hover/focus states" gap noted on [KinetixButton]; Compose's own
 * focus indication covers the interaction cue instead.
 */
@Composable
fun KinetixCheckbox(
    state: ToggleableState,
    onClick: (() -> Unit)?,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false,
) {
    val colors = KinetixColorScheme.current
    val checkedLike = state != ToggleableState.Off
    val borderColor = when {
        isError -> colors.destructive
        checkedLike -> colors.primary
        else -> colors.border
    }
    val fillColor = if (checkedLike) (if (isError) colors.destructive else colors.primary) else colors.background
    val glyphColor = colors.primaryForeground
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_sm))

    Box(
        modifier = modifier
            .size(18.dp)
            .clip(shape)
            .triStateToggleable(
                state = state,
                onClick = { onClick?.invoke() },
                enabled = enabled && onClick != null,
                role = Role.Checkbox,
            )
            .background(fillColor, shape)
            .border(dimensionResource(R.dimen.border_width_focus), borderColor, shape),
        contentAlignment = Alignment.Center,
    ) {
        when (state) {
            ToggleableState.On -> Text(text = "✓", color = glyphColor, fontSize = 12.sp)
            ToggleableState.Indeterminate -> Text(text = "−", color = glyphColor, fontSize = 14.sp)
            ToggleableState.Off -> {}
        }
    }
}

/** Boolean convenience overload — most call sites don't need the indeterminate state. */
@Composable
fun KinetixCheckbox(
    checked: Boolean,
    onCheckedChange: ((Boolean) -> Unit)?,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false,
) {
    KinetixCheckbox(
        state = if (checked) ToggleableState.On else ToggleableState.Off,
        onClick = onCheckedChange?.let { callback -> { callback(!checked) } },
        modifier = modifier,
        enabled = enabled,
        isError = isError,
    )
}
