package com.kinetixui.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.material3.Button as Material3Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixButton — mirrors `packages/ui/src/components/button.tsx`'s
 * `buttonVariants` CVA 1:1 (variant × size). Figma source: "KinetixUI" ›
 * UI Components › 02. Controls & Actions › Button (node 54863:351).
 *
 * Not ported from the React source: the `state` CVA axis (Hover/Focus/Active
 * are docs/snapshot-only there — a real Compose button gets genuine
 * interaction states for free from Material3) and the `sr-only` label
 * treatment on `Icon` size (pass an icon-only `content` yourself; there is
 * no automatic text-hiding here).
 */
enum class KinetixButtonVariant { Primary, Secondary, Outline, Destructive, Ghost, Link }
enum class KinetixButtonSize { Sm, Md, Lg, Icon }
enum class KinetixCorners { Sharp, Default, Pill }

private data class KinetixButtonSpec(
    val horizontal: Dp,
    val vertical: Dp,
    val textStyle: TextStyle,
)

/** All values below are `dimensionResource(R.dimen.*)` reads of the vendored
 *  token dims (packages/tokens/dist/android/res/values/dimens.xml) — nothing
 *  here is a hand-picked number. See the size comments on the React CVA for
 *  the Figma spacing/type-scale each one maps to. */
@Composable
private fun kinetixButtonSpec(size: KinetixButtonSize): KinetixButtonSpec {
    val spacing2 = dimensionResource(R.dimen.spacing_2)
    val spacing3 = dimensionResource(R.dimen.spacing_3)
    val spacing4 = dimensionResource(R.dimen.spacing_4)
    val spacing6 = dimensionResource(R.dimen.spacing_6)

    @Composable
    fun textStyle(fontSizeRes: Int, lineHeightRes: Int, trackingRes: Int) = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = dimensionResource(fontSizeRes).value.sp,
        lineHeight = dimensionResource(lineHeightRes).value.sp,
        letterSpacing = dimensionResource(trackingRes).value.sp,
    )

    return when (size) {
        // spacing/3 + spacing/2 ; Label Small (11/16, +0.5 tracking)
        KinetixButtonSize.Sm -> KinetixButtonSpec(
            horizontal = spacing3, vertical = spacing2,
            textStyle = textStyle(R.dimen.font_size_label_sm, R.dimen.line_height_label_sm, R.dimen.letter_spacing_wide_5),
        )
        // spacing/4 + spacing/3 ; Label Medium (12/16, +0.5)
        KinetixButtonSize.Md -> KinetixButtonSpec(
            horizontal = spacing4, vertical = spacing3,
            textStyle = textStyle(R.dimen.font_size_label_md, R.dimen.line_height_label_md, R.dimen.letter_spacing_wide_5),
        )
        // spacing/6 + spacing/3 ; Label Large (14/20, +0.1)
        KinetixButtonSize.Lg -> KinetixButtonSpec(
            horizontal = spacing6, vertical = spacing3,
            textStyle = textStyle(R.dimen.font_size_label_lg, R.dimen.line_height_label_lg, R.dimen.letter_spacing_wide_1),
        )
        // spacing/3 all round, square — same type scale as Md
        KinetixButtonSize.Icon -> KinetixButtonSpec(
            horizontal = spacing3, vertical = spacing3,
            textStyle = textStyle(R.dimen.font_size_label_md, R.dimen.line_height_label_md, R.dimen.letter_spacing_wide_5),
        )
    }
}

@Composable
private fun kinetixCornerShape(corners: KinetixCorners) = RoundedCornerShape(
    when (corners) {
        KinetixCorners.Sharp -> dimensionResource(R.dimen.radius_none)
        KinetixCorners.Default -> dimensionResource(R.dimen.radius_md) // matches React's `rounded-md`
        KinetixCorners.Pill -> dimensionResource(R.dimen.radius_full)
    },
)

@Composable
fun KinetixButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: KinetixButtonVariant = KinetixButtonVariant.Primary,
    size: KinetixButtonSize = KinetixButtonSize.Md,
    corners: KinetixCorners = KinetixCorners.Default,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val spec = kinetixButtonSpec(size)
    val shape = kinetixCornerShape(corners)
    val contentPadding = PaddingValues(horizontal = spec.horizontal, vertical = spec.vertical)
    // Only font/size/line-height/tracking are overridden — color is left alone so it
    // keeps flowing from Material3's own LocalContentColor (set by the `colors =`
    // argument on each branch below), the same way a bare `Text("Button")` would.
    val label: @Composable RowScope.() -> Unit = {
        ProvideTextStyle(spec.textStyle) { content() }
    }

    when (variant) {
        KinetixButtonVariant.Primary -> Material3Button(
            onClick = onClick, modifier = modifier, enabled = enabled, shape = shape, contentPadding = contentPadding,
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.primary,
                contentColor = colors.primaryForeground,
                disabledContainerColor = colors.border,
                disabledContentColor = colors.mutedForeground,
            ),
            content = label,
        )

        KinetixButtonVariant.Secondary -> Material3Button(
            onClick = onClick, modifier = modifier, enabled = enabled, shape = shape, contentPadding = contentPadding,
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.secondary,
                contentColor = colors.secondaryForeground,
                disabledContainerColor = colors.border,
                disabledContentColor = colors.mutedForeground,
            ),
            content = label,
        )

        // 1px border (`border_width_default`); rest = --foreground text on transparent,
        // matching the React Outline variant's resting state (hover-to-accent isn't
        // portable 1:1 — Material's own press/ripple state covers the interaction cue).
        KinetixButtonVariant.Outline -> OutlinedButton(
            onClick = onClick, modifier = modifier, enabled = enabled, shape = shape, contentPadding = contentPadding,
            border = BorderStroke(dimensionResource(R.dimen.border_width_default), colors.border),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = colors.foreground,
                disabledContentColor = colors.mutedForeground,
            ),
            content = label,
        )

        KinetixButtonVariant.Destructive -> Material3Button(
            onClick = onClick, modifier = modifier, enabled = enabled, shape = shape, contentPadding = contentPadding,
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.destructive,
                contentColor = colors.destructiveForeground,
                disabledContainerColor = colors.border,
                disabledContentColor = colors.mutedForeground,
            ),
            content = label,
        )

        KinetixButtonVariant.Ghost -> TextButton(
            onClick = onClick, modifier = modifier, enabled = enabled, shape = shape, contentPadding = contentPadding,
            colors = ButtonDefaults.textButtonColors(
                contentColor = colors.foreground,
                disabledContentColor = colors.mutedForeground,
            ),
            content = label,
        )

        // React's Link variant drops its own horizontal padding (`px-0`) — mirrored here.
        KinetixButtonVariant.Link -> TextButton(
            onClick = onClick, modifier = modifier, enabled = enabled, contentPadding = PaddingValues(0.dp),
            colors = ButtonDefaults.textButtonColors(
                contentColor = colors.primary,
                disabledContentColor = colors.mutedForeground,
            ),
            content = label,
        )
    }
}
