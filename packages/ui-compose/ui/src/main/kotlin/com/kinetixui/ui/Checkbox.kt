package com.kinetixui.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.triStateToggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.unit.dp

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
 * directly — no need to invent a parallel enum. The check/dash marks are
 * Material's Check/Remove ([KinetixIcons]), decorative: the state is
 * announced by `triStateToggleable`. The focus ring
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
    val targetBorder = when {
        isError -> colors.destructive
        checkedLike -> colors.action
        else -> colors.border
    }
    val targetFill = if (checkedLike) (if (isError) colors.destructive else colors.action) else colors.background
    val glyphColor = colors.actionForeground
    // `selection-state` (fast, standard): the fill and the edge settle, timed from the tokens and
    // suppressed through the one shared preference reader. Before MX1d both were handed straight to
    // the modifier and cut in one frame.
    val reduceMotion = KinetixDisclosureMotion.rememberReduceMotion()
    val borderColor by animateColorAsState(targetBorder, KinetixSelectionMotion.spec(reduceMotion), label = "KinetixCheckboxBorder")
    val fillColor by animateColorAsState(targetFill, KinetixSelectionMotion.spec(reduceMotion), label = "KinetixCheckboxFill")
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
        // The glyph still swaps in one frame while the fill settles. Deliberate, and a stated
        // difference from the React port, which fades the tick in over `fast` and removes it at
        // once: a cross-fade between the tick and the dash is the one transition that can show a
        // tick on a box's way OUT of mixed, which #400 fixed on the web by keying display on state.
        // Doing it properly here means composing both glyphs and animating alpha; the fill already
        // carries the state change, so it is recorded rather than half-built.
        when (state) {
            // Decorative: the state is triStateToggleable's to announce, not a glyph's.
            ToggleableState.On -> KinetixIcon(KinetixIcons.Check, 12.dp, tint = glyphColor)
            ToggleableState.Indeterminate -> KinetixIcon(KinetixIcons.Remove, 12.dp, tint = glyphColor)
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
