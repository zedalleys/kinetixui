package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.sp

/**
 * KinetixList / KinetixListItem — mirrors
 * `packages/ui/src/components/list.tsx`: a single-column list of rows
 * (leading icon/avatar, title, optional description, trailing content),
 * distinct from a `Table` (tabular data — not yet ported here). Radix has
 * no primitive here — the React version is plain `div`s — so this ports 1:1 with no
 * simplifications beyond the usual ones: `onSelect` (interactive rows) is
 * a nullable callback, same convention as [KinetixCheckbox]/
 * [KinetixRadioButton]; the row highlight ring the React version shows on
 * hover/focus isn't carried over (Material3's own ripple covers the
 * interaction cue, same call made for [KinetixButton]). Each row draws
 * its own bottom divider rather than a shared `divide-y` — Compose has no
 * single-property equivalent for "border between children, not around
 * them" the way Tailwind's `divide-y` does.
 */
@Composable
fun KinetixList(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(modifier = modifier) {
        content()
    }
}

@Composable
fun KinetixListItem(
    title: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    leading: (@Composable () -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
    showDivider: Boolean = true,
    enabled: Boolean = true,
    onSelect: (() -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current

    Column(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(enabled = enabled && onSelect != null, onClick = { onSelect?.invoke() })
                .padding(
                    horizontal = dimensionResource(R.dimen.spacing_3),
                    vertical = dimensionResource(R.dimen.spacing_3),
                ),
            horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3)),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            leading?.invoke()
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    color = colors.foreground,
                    fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
                    maxLines = 1,
                )
                if (description != null) {
                    Text(
                        text = description,
                        color = colors.mutedForeground,
                        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                        maxLines = 1,
                    )
                }
            }
            if (trailing != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2))) {
                    trailing()
                }
            }
        }
        if (showDivider) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(dimensionResource(R.dimen.border_width_default))
                    .background(colors.border),
            )
        }
    }
}
