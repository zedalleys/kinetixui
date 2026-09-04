package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * KinetixToggle — mirrors `packages/ui/src/components/toggle.tsx`
 * (`toggleVariants`). Figma's `h-9/h-8/h-10` sizes (36/32/40dp) and their
 * matching `px-2/px-1.5/px-2.5` padding aren't all on the shared
 * `spacing_*` scale (`sm`'s 32dp/8dp are; `default`'s 36dp and `lg`'s
 * 40dp/10dp are not) — hardcoded where off-scale, same reasoning as
 * `KinetixBadge`'s padding. Hover state and the `ring-inset` focus/selected
 * ring aren't ported — same "no hover/focus states" gap as `KinetixButton`.
 */
enum class KinetixToggleVariant { Default, Outline }
enum class KinetixToggleSize { Sm, Default, Lg }

@Composable
fun KinetixToggle(
    pressed: Boolean,
    onPressedChange: ((Boolean) -> Unit)?,
    modifier: Modifier = Modifier,
    variant: KinetixToggleVariant = KinetixToggleVariant.Default,
    size: KinetixToggleSize = KinetixToggleSize.Default,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val height: Dp = when (size) {
        KinetixToggleSize.Sm -> dimensionResource(R.dimen.spacing_8) // 32dp, matches h-8
        KinetixToggleSize.Default -> 36.dp // h-9, not on the shared scale
        KinetixToggleSize.Lg -> 40.dp // h-10, not on the shared scale
    }
    val horizontalPadding: Dp = when (size) {
        KinetixToggleSize.Sm -> 6.dp // px-1.5, not on the shared scale
        KinetixToggleSize.Default -> dimensionResource(R.dimen.spacing_2) // 8dp, matches px-2
        KinetixToggleSize.Lg -> 10.dp // px-2.5, not on the shared scale
    }

    // "bg-transparent" in the unpressed state — this package has no
    // transparent-over-arbitrary-backdrop primitive yet, so unpressed falls
    // back to the ambient background color, same simplification Badge's
    // Outline variant makes with Color.Transparent where that's safe.
    val containerColor = if (pressed) colors.accent else colors.background
    val contentColor = if (pressed) colors.accentForeground else colors.foreground
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))

    var toggleModifier = modifier
        .height(height)
        .widthIn(min = height)
        .clip(shape)
        .toggleable(
            value = pressed,
            enabled = enabled && onPressedChange != null,
            role = Role.Checkbox, // Compose has no dedicated "toggle button" role; Checkbox best matches on/off semantics
            onValueChange = { onPressedChange?.invoke(it) },
        )
        .background(containerColor, shape)
    if (variant == KinetixToggleVariant.Outline) {
        toggleModifier = toggleModifier.border(dimensionResource(R.dimen.border_width_default), colors.border, shape)
    }

    Row(
        modifier = toggleModifier.padding(horizontal = horizontalPadding),
        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2), Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CompositionLocalProvider(LocalContentColor provides contentColor) {
            content()
        }
    }
}
