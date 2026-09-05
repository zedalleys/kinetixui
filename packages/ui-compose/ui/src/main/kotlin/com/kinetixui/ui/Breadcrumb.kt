package com.kinetixui.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixBreadcrumb family — mirrors
 * `packages/ui/src/components/breadcrumb.tsx`. Slot-shaped, same convention
 * as [KinetixCard]/[KinetixAlert], rather than an items-list API. `gap-1.5`
 * (6dp) isn't on the shared `spacing_*` scale — hardcoded, same reasoning
 * as `KinetixCard` header's gap. `BreadcrumbEllipsis` isn't ported (rare in
 * practice, and its `MoreHorizontal` icon needs the icon library this
 * package doesn't have); the separator defaults to "›" instead of lucide's
 * `ChevronRight`, same "no icon library" gap noted elsewhere.
 */
@Composable
fun KinetixBreadcrumb(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
        content()
    }
}

@Composable
fun KinetixBreadcrumbLink(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier.clickable(onClick = onClick),
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_body_md).value.sp,
    )
}

@Composable
fun KinetixBreadcrumbPage(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier,
        color = colors.foreground,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_body_md).value.sp,
    )
}

@Composable
fun KinetixBreadcrumbSeparator(
    modifier: Modifier = Modifier,
    text: String = "›",
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier,
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
    )
}
