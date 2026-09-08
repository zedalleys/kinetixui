package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixAppBar family — mirrors `packages/ui/src/components/app-bar.tsx`:
 * a top application bar with a `brand` slot, a row of primary nav links
 * (`KinetixAppBarLink`, `active` marks the current one) and a trailing
 * `actions` slot, in a bordered header. The React component's
 * `md`-breakpoint collapse-to-menu-toggle is **dropped** — a native top
 * bar keeps the nav visible, horizontally scrollable if it overflows;
 * same kind of documented scope-down as `KinetixSheet` (bottom-only) or
 * `KinetixSidebar` (no rail mode). `KinetixNavigationBar` remains the
 * mobile back-button bar. Bottom border is hand-drawn with `drawBehind`,
 * same as `KinetixNavigationBar`/`KinetixFooter`. `h-14` (56dp) and the
 * link `px-3 py-1.5` (12dp / 6dp) aren't on the shared `spacing_*` scale
 * — hardcoded, same reasoning as `KinetixNavigationBar`'s off-scale sizes.
 */
@Composable
fun KinetixAppBar(
    modifier: Modifier = Modifier,
    brand: (@Composable () -> Unit)? = null,
    nav: (@Composable RowScope.() -> Unit)? = null,
    actions: (@Composable () -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val borderWidthPx = with(LocalDensity.current) {
        dimensionResource(R.dimen.border_width_default).toPx()
    }

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
            .padding(horizontal = dimensionResource(R.dimen.spacing_4)),
        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_4)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (brand != null) brand()
        if (nav != null) {
            Row(
                modifier = Modifier
                    .weight(1f)
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1)),
                verticalAlignment = Alignment.CenterVertically,
                content = nav,
            )
        } else {
            Spacer(modifier = Modifier.weight(1f))
        }
        if (actions != null) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2)),
                verticalAlignment = Alignment.CenterVertically,
            ) { actions() }
        }
    }
}

/** A primary nav link inside a [KinetixAppBar]. `active` = the current destination. */
@Composable
fun KinetixAppBarLink(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    active: Boolean = false,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = label,
        color = if (active) colors.foreground else colors.mutedForeground,
        fontWeight = FontWeight.Medium,
        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
        modifier = modifier
            .clip(RoundedCornerShape(dimensionResource(R.dimen.radius_sm)))
            .background(if (active) colors.accent else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp), // px-3 py-1.5, not on the shared scale
    )
}
