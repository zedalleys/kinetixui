package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource

/**
 * KinetixToggleGroup / KinetixToggleGroupItem — mirrors
 * `packages/ui/src/components/toggle-group.tsx`. The React version shares
 * `variant`/`size` from the group down to each item through a React
 * Context (`ToggleGroupContext`); a `compositionLocalOf` plays the exact
 * same role here — items don't repeat `variant`/`size` themselves.
 * `KinetixToggleGroupItem` is a thin pass-through to [KinetixToggle] with
 * those two values injected, not a reimplementation.
 */
private val LocalToggleGroupVariant = compositionLocalOf { KinetixToggleVariant.Default }
private val LocalToggleGroupSize = compositionLocalOf { KinetixToggleSize.Default }

@Composable
fun KinetixToggleGroup(
    modifier: Modifier = Modifier,
    variant: KinetixToggleVariant = KinetixToggleVariant.Default,
    size: KinetixToggleSize = KinetixToggleSize.Default,
    content: @Composable RowScope.() -> Unit,
) {
    CompositionLocalProvider(LocalToggleGroupVariant provides variant, LocalToggleGroupSize provides size) {
        Row(
            modifier = modifier,
            horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1)),
            content = content,
        )
    }
}

@Composable
fun KinetixToggleGroupItem(
    pressed: Boolean,
    onPressedChange: ((Boolean) -> Unit)?,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    KinetixToggle(
        pressed = pressed,
        onPressedChange = onPressedChange,
        modifier = modifier,
        variant = LocalToggleGroupVariant.current,
        size = LocalToggleGroupSize.current,
        enabled = enabled,
        content = content,
    )
}
