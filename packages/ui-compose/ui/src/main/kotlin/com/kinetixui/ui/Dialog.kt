package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

/**
 * KinetixDialog family — mirrors `packages/ui/src/components/dialog.tsx`.
 * Radix's `Dialog`/`DialogPortal`/`DialogOverlay`/`DialogTrigger`/
 * `DialogClose` sub-components aren't reproduced 1:1: this wraps Compose's
 * own `androidx.compose.ui.window.Dialog`, which already owns a separate
 * window, a dim scrim, and back-press/outside-tap dismissal — the same
 * "reuse the platform's overlay machinery" call `KinetixSlider` made for
 * drag gestures. The caller supplies `visible`/`onDismissRequest` directly
 * (Radix's own controlled `open`/`onOpenChange` shape, just without a
 * separate `Portal`/`Root` graph to reassemble) rather than a `Trigger`
 * sub-component. `max-w-lg` (448dp) isn't on the shared `spacing_*` scale
 * — hardcoded, same reasoning as `KinetixFab`'s off-scale sizes. The
 * backdrop blur has no direct Compose equivalent and isn't approximated —
 * the dim scrim alone reads as "modal" without it.
 */
@Composable
fun KinetixDialog(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    if (!visible) return
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_xl))

    Dialog(onDismissRequest = onDismissRequest) {
        Box(
            modifier = modifier
                .widthIn(max = 448.dp) // max-w-lg, not on the shared scale
                .clip(shape)
                .background(colors.background, shape)
                .border(dimensionResource(R.dimen.border_width_default), colors.border, shape),
        ) {
            Column(
                modifier = Modifier.padding(dimensionResource(R.dimen.spacing_6)),
                verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_4)),
            ) {
                CompositionLocalProvider(LocalContentColor provides colors.foreground) {
                    content()
                }
            }
            Text(
                text = "×",
                color = colors.mutedForeground,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(dimensionResource(R.dimen.spacing_4))
                    .clickable(onClick = onDismissRequest),
            )
        }
    }
}

@Composable
fun KinetixDialogHeader(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) { // space-y-1.5, not on the shared scale
        content()
    }
}

@Composable
fun KinetixDialogFooter(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2), Alignment.End),
    ) {
        content()
    }
}

@Composable
fun KinetixDialogTitle(
    text: String,
    modifier: Modifier = Modifier,
) {
    val fontSize = dimensionResource(R.dimen.font_size_title_dialog).value.sp // text-lg (18dp)
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
fun KinetixDialogDescription(
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
