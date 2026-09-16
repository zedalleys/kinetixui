package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixPageHeader — mirrors `packages/ui/src/components/page-header.tsx`:
 * title + optional breadcrumb + description + action cluster + optional
 * tabs row, closed off with a [KinetixSeparator]. `breadcrumb`/`actions`/
 * `tabs` are plain composable slots so callers compose their own
 * navigation/button/tab composables into them.
 */
@Composable
fun KinetixPageHeader(
    title: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    breadcrumb: (@Composable () -> Unit)? = null,
    actions: (@Composable RowScope.() -> Unit)? = null,
    tabs: (@Composable () -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    Column(modifier = modifier) {
        Column(
            modifier = Modifier.padding(bottom = dimensionResource(R.dimen.spacing_6)),
            verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_4)),
        ) {
            breadcrumb?.invoke()
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Text(
                        text = title,
                        color = colors.foreground,
                        fontWeight = FontWeight.Medium,
                        fontSize = dimensionResource(R.dimen.font_size_headline_sm).value.sp,
                        lineHeight = dimensionResource(R.dimen.line_height_headline_sm).value.sp,
                    )
                    if (description != null) {
                        Text(
                            text = description,
                            color = colors.mutedForeground,
                            fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
                            lineHeight = dimensionResource(R.dimen.line_height_body_md).value.sp,
                        )
                    }
                }
                if (actions != null) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2)),
                        verticalAlignment = Alignment.CenterVertically,
                        content = actions,
                    )
                }
            }
            tabs?.invoke()
        }
        KinetixSeparator()
    }
}
