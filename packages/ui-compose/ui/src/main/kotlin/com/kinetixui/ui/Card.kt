package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixCard family — mirrors `packages/ui/src/components/card.tsx`'s
 * `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` /
 * `CardFooter`, all thin styled slots around a `content` composable rather
 * than a fixed schema, same as the React version's plain `<div>`s. `p-6`
 * (`spacing_6`) and `radius_xl` are on the shared token scale; the
 * `space-y-1.5` gap between header children (6dp) isn't — hardcoded, same
 * reasoning as `KinetixBadge`'s padding. `shadow-sm` has no token in this
 * package yet (no elevation scale defined alongside spacing/radius/type) —
 * approximated with a small literal `1.dp` shadow rather than skipped
 * entirely, since a flat card reads visibly wrong next to the design.
 * Text color cascades to Title/Description via `LocalContentColor`, same
 * mechanism as [KinetixAlert].
 */
@Composable
fun KinetixCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_xl))
    Column(
        modifier = modifier
            .shadow(1.dp, shape)
            .clip(shape)
            .background(colors.card, shape)
            .border(dimensionResource(R.dimen.border_width_default), colors.border, shape),
    ) {
        CompositionLocalProvider(LocalContentColor provides colors.cardForeground) {
            content()
        }
    }
}

@Composable
fun KinetixCardHeader(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier.padding(dimensionResource(R.dimen.spacing_6)),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        content()
    }
}

@Composable
fun KinetixCardTitle(
    text: String,
    modifier: Modifier = Modifier,
) {
    val fontSize = dimensionResource(R.dimen.font_size_body_lg).value.sp
    Text(
        text = text,
        modifier = modifier,
        fontWeight = FontWeight.SemiBold,
        fontSize = fontSize,
        lineHeight = fontSize, // leading-none
        letterSpacing = dimensionResource(R.dimen.letter_spacing_tighter).value.sp,
    )
}

@Composable
fun KinetixCardDescription(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier,
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_body_md).value.sp,
    )
}

@Composable
fun KinetixCardContent(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier.padding(
            start = dimensionResource(R.dimen.spacing_6),
            end = dimensionResource(R.dimen.spacing_6),
            bottom = dimensionResource(R.dimen.spacing_6),
        ),
    ) {
        content()
    }
}

@Composable
fun KinetixCardFooter(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Row(
        modifier = modifier.padding(
            start = dimensionResource(R.dimen.spacing_6),
            end = dimensionResource(R.dimen.spacing_6),
            bottom = dimensionResource(R.dimen.spacing_6),
        ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        content()
    }
}
