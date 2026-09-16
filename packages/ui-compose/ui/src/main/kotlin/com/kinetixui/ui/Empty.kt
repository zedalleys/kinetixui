package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixEmpty family — mirrors `packages/ui/src/components/empty.tsx`.
 * A placeholder for a zero-results state — thin styled slots around a
 * `content` composable, same "no fixed schema" approach as [KinetixCard].
 * `KinetixEmpty` itself carries no border/background (composes cleanly
 * inside whatever already has one). Gap-fill addition (not in the original
 * Figma source) — matches the shadcn/ui Empty API shape.
 */
@Composable
fun KinetixEmpty(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier.padding(40.dp), // p-10, not on the shared spacing scale
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_6)),
    ) {
        content()
    }
}

@Composable
fun KinetixEmptyHeader(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2)),
    ) {
        content()
    }
}

enum class KinetixEmptyMediaVariant { Default, Icon }

/** `Icon` gives a muted circular badge behind the icon; `Default` renders `content` as-is. */
@Composable
fun KinetixEmptyMedia(
    variant: KinetixEmptyMediaVariant = KinetixEmptyMediaVariant.Default,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    if (variant == KinetixEmptyMediaVariant.Icon) {
        Box(
            modifier = modifier
                .background(colors.muted, CircleShape)
                .padding(dimensionResource(R.dimen.spacing_2)),
            contentAlignment = Alignment.Center,
        ) {
            CompositionLocalProvider(LocalContentColor provides colors.mutedForeground) {
                content()
            }
        }
    } else {
        Box(modifier = modifier, contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
fun KinetixEmptyTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        modifier = modifier,
        fontWeight = FontWeight.Medium,
        fontSize = dimensionResource(R.dimen.font_size_title_sm).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_title_sm).value.sp,
        letterSpacing = dimensionResource(R.dimen.letter_spacing_wide_1).value.sp,
        textAlign = TextAlign.Center,
    )
}

@Composable
fun KinetixEmptyDescription(text: String, modifier: Modifier = Modifier) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier,
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_body_sm).value.sp,
        textAlign = TextAlign.Center,
    )
}

@Composable
fun KinetixEmptyContent(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3)),
    ) {
        content()
    }
}
