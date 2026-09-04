package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixAlert / KinetixAlertTitle / KinetixAlertDescription — mirror
 * `packages/ui/src/components/alert.tsx` (`alertVariants`). Every variant
 * but `Default` uses a `/50`-alpha border (`border-destructive/50`, etc.) —
 * reproduced with `Color.copy(alpha = 0.5f)` rather than adding a separate
 * muted-border token. Text color cascades from [KinetixAlert] down to
 * [KinetixAlertTitle] / [KinetixAlertDescription] via Material3's
 * `LocalContentColor`, the same mechanism `text-{variant}` inheritance uses
 * on the web — so title/description don't take a `variant` param of their
 * own. The leading icon slot (`[&>svg]:...`) isn't ported: no icon library
 * is wired into this package yet (same call made for Tag's/Checkbox's glyphs).
 */
enum class KinetixAlertVariant { Default, Destructive, Success, Warning, Info }

@Composable
fun KinetixAlert(
    modifier: Modifier = Modifier,
    variant: KinetixAlertVariant = KinetixAlertVariant.Default,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val (borderColor, textColor, bg) = when (variant) {
        KinetixAlertVariant.Default -> Triple(colors.border, colors.foreground, colors.background)
        KinetixAlertVariant.Destructive -> Triple(colors.destructive.copy(alpha = 0.5f), colors.destructive, colors.background)
        KinetixAlertVariant.Success -> Triple(colors.success.copy(alpha = 0.5f), colors.success, colors.background)
        KinetixAlertVariant.Warning -> Triple(colors.warning.copy(alpha = 0.5f), colors.warning, colors.background)
        KinetixAlertVariant.Info -> Triple(colors.info.copy(alpha = 0.5f), colors.info, colors.background)
    }
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_lg))

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(bg, shape)
            .border(dimensionResource(R.dimen.border_width_default), borderColor, shape)
            .padding(
                horizontal = dimensionResource(R.dimen.spacing_4),
                vertical = dimensionResource(R.dimen.spacing_3),
            ),
    ) {
        CompositionLocalProvider(LocalContentColor provides textColor) {
            content()
        }
    }
}

@Composable
fun KinetixAlertTitle(
    text: String,
    modifier: Modifier = Modifier,
) {
    val fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp
    Text(
        text = text,
        modifier = modifier.padding(bottom = dimensionResource(R.dimen.spacing_1)),
        fontWeight = FontWeight.Medium,
        fontSize = fontSize,
        lineHeight = fontSize, // leading-none
        letterSpacing = dimensionResource(R.dimen.letter_spacing_tighter).value.sp,
    )
}

@Composable
fun KinetixAlertDescription(
    text: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = text,
        modifier = modifier,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_body_md).value.sp,
    )
}
