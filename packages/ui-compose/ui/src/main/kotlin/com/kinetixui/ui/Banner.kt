package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
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
 * KinetixBanner — mirrors `packages/ui/src/components/banner.tsx`: a
 * full-bleed, page-level notice, optionally dismissible. Distinct from
 * [KinetixAlert] (in-flow, static) and [KinetixToaster] (transient):
 * persistent, edge-to-edge, no rounded corners (compare [KinetixInform]'s
 * rounded inline card). Reuses Inform's variant/tint taxonomy (and its
 * unported leading intent icon). The web version's `sticky` prop has
 * no Compose equivalent at the component level — pin it to the top by
 * placement instead (a `Scaffold`'s `topBar`, or the first child of a
 * non-scrolling `Column`), same as `KinetixAppBar`.
 *
 * `dismissIcon` replaces the default dismiss mark (Material's Close). Pass any composable — a Material
 * `Icon`, a vector or painter resource, your company's icon composable. The control lays it out at 14dp,
 * provides the content colour as `LocalContentColor` (which material3's `Icon` tints with by default), and
 * keeps the "Dismiss" name and button role, so pass `contentDescription = null` on an `Icon`. See /docs/icons.
 */
enum class KinetixBannerVariant { Information, Warning, Success, Error, Action }

@Composable
fun KinetixBanner(
    text: String,
    modifier: Modifier = Modifier,
    variant: KinetixBannerVariant = KinetixBannerVariant.Information,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    onDismiss: (() -> Unit)? = null,
    dismissIcon: (@Composable () -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val (container, content) = when (variant) {
        KinetixBannerVariant.Information -> colors.info.copy(alpha = 0.1f) to colors.onInfoContainer
        KinetixBannerVariant.Warning -> colors.warning.copy(alpha = 0.15f) to colors.warning
        KinetixBannerVariant.Success -> colors.success.copy(alpha = 0.15f) to colors.success
        KinetixBannerVariant.Error -> colors.destructive.copy(alpha = 0.1f) to colors.destructive
        KinetixBannerVariant.Action -> colors.foreground to colors.background
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(container)
            .padding(horizontal = dimensionResource(R.dimen.spacing_4), vertical = dimensionResource(R.dimen.spacing_3)),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = text,
            color = content,
            fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
            modifier = Modifier.weight(1f, fill = false),
        )
        if (actionLabel != null) {
            Text(
                text = actionLabel,
                color = content,
                fontWeight = FontWeight.Medium,
                fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
                modifier = Modifier
                    .padding(start = dimensionResource(R.dimen.spacing_3))
                    .clickable(enabled = onAction != null) { onAction?.invoke() },
            )
        }
        if (onDismiss != null) {
            KinetixIconControl(
                label = "Dismiss",
                onClick = onDismiss,
                iconSize = 14.dp,
                tint = content,
                modifier = Modifier.padding(start = dimensionResource(R.dimen.spacing_3)),
            ) { dismissIcon?.invoke() ?: KinetixIcon(KinetixIcons.Close, 14.dp) }
        }
    }
}
