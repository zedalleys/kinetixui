package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixDescriptionList / KinetixDescriptionListItem — mirrors
 * `packages/ui/src/components/description-list.tsx`: term/detail rows
 * with the site's own spec-sheet skin (mono, uppercase, tracked term
 * labels; a divided rounded shell). Gap-fill addition (not in the
 * original Figma source). Same divider call as [KinetixList]: each row
 * draws its own bottom divider (`showDivider`) rather than a shared
 * `divide-y` — Compose has no single-property equivalent for "border
 * between children, not around them."
 */
@Composable
fun KinetixDescriptionList(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_lg))
    Column(
        modifier = modifier
            .clip(shape)
            .border(dimensionResource(R.dimen.border_width_default), colors.border, shape)
            .background(colors.muted.copy(alpha = 0.2f)), // bg-muted/20
        content = { content() },
    )
}

enum class KinetixDescriptionListLayout { Row, Stacked }

@Composable
fun KinetixDescriptionListItem(
    term: String,
    modifier: Modifier = Modifier,
    layout: KinetixDescriptionListLayout = KinetixDescriptionListLayout.Row,
    showDivider: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val termStyle = @Composable {
        Text(
            text = term,
            color = colors.mutedForeground,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Normal,
            fontSize = 10.sp, // font-mono text-[10px], off the named type scale — same call as the React source
            letterSpacing = 1.4.sp, // tracking-[0.14em] at 10sp
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }

    Column(modifier = modifier) {
        // py-2.5 (10dp) and w-24 (96dp) aren't on the shared spacing scale —
        // same "off-scale, documented" call as KinetixBadge's px-2.5.
        val rowModifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = dimensionResource(R.dimen.spacing_3), vertical = 10.dp)

        if (layout == KinetixDescriptionListLayout.Row) {
            Row(
                modifier = rowModifier,
                horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3)),
                verticalAlignment = Alignment.Top,
            ) {
                Box(modifier = Modifier.width(96.dp)) { termStyle() }
                content()
            }
        } else {
            Column(modifier = rowModifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                termStyle()
                content()
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
