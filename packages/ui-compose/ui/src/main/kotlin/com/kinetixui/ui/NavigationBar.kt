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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixNavigationBar — mirrors
 * `packages/ui/src/components/navigation-bar.tsx`: a mobile top app bar
 * (leading back button or custom slot, title + optional info text,
 * trailing actions) — the same shape as Android's own Material3
 * `TopAppBar`, ported here as a plain composable rather than wrapping
 * `TopAppBar` itself so the leading/title/actions layout matches the
 * source exactly rather than Material3's own app-bar conventions.
 * `h-14`/`min-w-9`/`size-9` (56dp/36dp/36dp) aren't on the shared
 * `spacing_*` scale — hardcoded, same reasoning as `KinetixFab`'s
 * off-scale sizes. The back chevron is a plain "‹" glyph, same "no icon
 * library" gap noted for `KinetixRating`/`KinetixTag`. The bottom border
 * is hand-drawn with `drawBehind`, same approach `KinetixAccordionItem`'s
 * `border-b` uses.
 */
@Composable
fun KinetixNavigationBar(
    title: String,
    modifier: Modifier = Modifier,
    infoText: String? = null,
    onBack: (() -> Unit)? = null,
    leading: (@Composable () -> Unit)? = null,
    actions: (@Composable () -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val borderWidthPx = with(LocalDensity.current) { dimensionResource(R.dimen.border_width_default).toPx() }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp) // h-14, not on the shared scale
            .background(colors.background)
            .drawBehind {
                drawLine(
                    color = colors.border,
                    start = Offset(0f, size.height),
                    end = Offset(size.width, size.height),
                    strokeWidth = borderWidthPx,
                )
            }
            .padding(horizontal = dimensionResource(R.dimen.spacing_2)),
        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(modifier = Modifier.widthIn(min = 36.dp), contentAlignment = Alignment.CenterStart) { // min-w-9, not on the shared scale
            when {
                leading != null -> leading()
                onBack != null -> {
                    Box(
                        modifier = Modifier
                            .size(36.dp) // size-9, not on the shared scale
                            .clip(CircleShape)
                            .clickable(onClick = onBack),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(text = "‹", color = colors.foreground, fontSize = 20.sp)
                    }
                }
            }
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = colors.foreground,
                fontWeight = FontWeight.Medium,
                fontSize = dimensionResource(R.dimen.font_size_body_lg).value.sp,
                maxLines = 1,
            )
            if (infoText != null) {
                Text(
                    text = infoText,
                    color = colors.mutedForeground,
                    fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                    maxLines = 1,
                )
            }
        }
        if (actions != null) {
            Row(horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1))) {
                actions()
            }
        }
    }
}
