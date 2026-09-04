package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixAvatar / KinetixAvatarFallback — mirror
 * `packages/ui/src/components/avatar.tsx`'s `Avatar` / `AvatarFallback`
 * (`size-10 rounded-full` container, `bg-muted text-sm` fallback). 40dp is a
 * fixed Figma size, not on the shared `spacing_*` scale — hardcoded.
 *
 * `AvatarImage` isn't ported: it's a bare `<img>` wrapper in the React
 * source with no design-specific styling beyond `aspect-square size-full`,
 * so it's just `Image(..., modifier = Modifier.fillMaxSize())` inside
 * [KinetixAvatar]'s `content` slot — no reason to wrap it.
 *
 * `AvatarGroup` (stacked, overflow "+N" marker) also isn't ported: it needs
 * to inspect and re-wrap its children, which isn't idiomatic Compose the
 * way `React.Children.toArray` is in React. Compose it directly instead:
 * `Row(horizontalArrangement = Arrangement.spacedBy((-8).dp)) { KinetixAvatar { ... } }`.
 */
@Composable
fun KinetixAvatar(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier.size(40.dp).clip(CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}

@Composable
fun KinetixAvatarFallback(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Box(
        modifier = modifier.fillMaxSize().background(colors.muted),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            color = colors.mutedForeground,
            fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        )
    }
}
