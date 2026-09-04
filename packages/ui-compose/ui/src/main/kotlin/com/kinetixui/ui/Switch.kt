package com.kinetixui.ui

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp

/**
 * KinetixSwitch — mirrors `packages/ui/src/components/switch.tsx`. Figma
 * source: node 54855:13984. The 48×24 track / 20dp thumb / 24dp travel
 * distance are Figma's own literal pixel spec (not on the shared
 * `spacing_*` token scale, same reasoning as KinetixBadge's padding) — see
 * the React source's own comment for the same numbers.
 */
@Composable
fun KinetixSwitch(
    checked: Boolean,
    onCheckedChange: ((Boolean) -> Unit)?,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = KinetixColorScheme.current
    val trackColor = if (checked) colors.primary else colors.tertiary
    val thumbOffset by animateDpAsState(targetValue = if (checked) 24.dp else 0.dp, label = "KinetixSwitchThumb")

    Box(
        modifier = modifier
            .size(width = 48.dp, height = 24.dp)
            .clip(RoundedCornerShape(dimensionResource(R.dimen.radius_full)))
            .toggleable(
                value = checked,
                enabled = enabled && onCheckedChange != null,
                role = Role.Switch,
                onValueChange = { onCheckedChange?.invoke(it) },
            )
            .background(if (enabled) trackColor else trackColor.copy(alpha = 0.5f))
            .padding(2.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Box(
            modifier = Modifier
                .offset(x = thumbOffset)
                .size(20.dp)
                .clip(CircleShape)
                .background(colors.background),
        )
    }
}
