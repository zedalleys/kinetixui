package com.kinetixui.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button as Material3Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
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

/**
 * The original entry point, unchanged.
 *
 * It delegates to the overload below, and that is not a style choice. This artifact is published to
 * Maven, so an app can be compiled against one version and run against another, which makes the JVM
 * method descriptor part of the contract. Adding a defaulted `pending` parameter HERE would keep every
 * source call compiling while replacing the descriptor — the breakage would surface later, in someone
 * else's app, as `NoSuchMethodError`. The house rule, set by `KinetixTheme` and `KinetixInput`, is a
 * second overload whose distinguishing parameters are undefaulted and last, with the original
 * delegating to it. `ButtonBinaryCompatibilityTest` reads the methods the compiler actually emitted,
 * so a later edit that collapses these two back into one fails a test.
 */
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
    KinetixButton(
        onClick = onClick,
        modifier = modifier,
        variant = variant,
        size = size,
        corners = corners,
        enabled = enabled,
        content = content,
        pending = null,
        pendingLabel = KinetixButtonDefaults.PendingLabel,
    )
}

/**
 * Defaults for [KinetixButton], in the shape Material3's own `ButtonDefaults` uses.
 *
 * [PendingLabel] is exposed because the overload that takes `pending` cannot default its
 * `pendingLabel` — the binary-compatibility rule above requires the distinguishing parameters to be
 * undefaulted — so a caller who wants the standard wording asks for it by name.
 */
object KinetixButtonDefaults {
    /** The default status wording. English, like every other default label in this package. */
    const val PendingLabel: String = "Working…"
}

/**
 * [pending] says the action this button started is in flight.
 *
 * It is deliberately NOT `enabled = false`. Disabling a composable changes its semantics node: the
 * control is reported as disabled, which is a different thing from busy, and TalkBack's focus moves
 * off it. While [pending] the button stays `enabled`, [onClick] is gated so a second press cannot
 * start the work twice, the status is carried as a `stateDescription` — separate from the name, which
 * is whatever [content] says — inside a polite `liveRegion` so a change is announced, and a
 * `CircularProgressIndicator` is drawn in a slot that is reserved in both states so the label does not
 * shift.
 *
 * Three-valued on purpose: `null` means this call site never mentioned `pending`, and the composable
 * emits exactly what it did before the parameter existed — no indicator slot, no semantics additions.
 *
 * NOT VERIFIED AT RUNTIME. There is no instrumented TalkBack run behind this; the gate compiles the
 * library and the unit tests read semantics, which is a claim about the modifiers, not a measurement
 * of what an assistive technology does with them.
 */
@Composable
fun KinetixButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: KinetixButtonVariant = KinetixButtonVariant.Primary,
    size: KinetixButtonSize = KinetixButtonSize.Md,
    corners: KinetixCorners = KinetixCorners.Default,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit,
    pending: Boolean?,
    pendingLabel: String,
) {
    val colors = KinetixColorScheme.current
    val spec = kinetixButtonSpec(size)
    val shape = kinetixCornerShape(corners)
    val contentPadding = PaddingValues(horizontal = spec.horizontal, vertical = spec.vertical)

    val pendingAware = pending != null
    val isPending = pending == true

    // Gated rather than disabled. A press while pending reaches this lambda and stops here, so the
    // node keeps its enabled semantics, its name and TalkBack's focus. Every input device arrives
    // through the same `onClick`, so there is nothing else to suppress.
    val guardedOnClick: () -> Unit = if (pendingAware) ({ if (!isPending) onClick() }) else onClick

    // `stateDescription` is the status, and it is not the name: the name comes from `content`. The
    // polite live region is what makes a CHANGE of it announced rather than only read on focus. Both
    // are added only for a call site that uses `pending`, so nothing else's semantics node moves.
    val decoratedModifier = if (pendingAware) {
        modifier.semantics {
            if (isPending) {
                stateDescription = pendingLabel
                liveRegion = LiveRegionMode.Polite
            }
        }
    } else {
        modifier
    }

    // Only font/size/line-height/tracking are overridden — color is left alone so it
    // keeps flowing from Material3's own LocalContentColor (set by the `colors =`
    // argument on each branch below), the same way a bare `Text("Button")` would.
    val label: @Composable RowScope.() -> Unit = {
        if (pendingAware) {
            // The slot is 18dp in both states — matching React's `[&_svg]:size-[18px]` icon slot —
            // so the label does not shift when the ring appears. The indicator carries no semantics
            // of its own; the status is on the button's node, and two sources would say it twice.
            if (isPending) {
                CircularProgressIndicator(
                    // Cleared rather than merged: the status belongs to the button's node, and an
                    // indicator that also reports progress would have TalkBack say it twice.
                    modifier = Modifier.size(18.dp).clearAndSetSemantics { },
                    strokeWidth = 2.dp,
                )
            } else {
                Spacer(Modifier.size(18.dp))
            }
            Spacer(Modifier.width(4.dp))
        }
        ProvideTextStyle(spec.textStyle) { content() }
    }

    when (variant) {
        KinetixButtonVariant.Primary -> {
            // hover:bg-action/90 and active:bg-action/85 in React, as the explicit actionHover / actionPressed tokens
            val interaction = remember { MutableInteractionSource() }
            val pressed by interaction.collectIsPressedAsState()
            val hovered by interaction.collectIsHoveredAsState()
            Material3Button(
                onClick = guardedOnClick, modifier = decoratedModifier, enabled = enabled, shape = shape, contentPadding = contentPadding,
                interactionSource = interaction,
                colors = ButtonDefaults.buttonColors(
                    containerColor = when {
                        pressed -> colors.actionPressed
                        hovered -> colors.actionHover
                        else -> colors.action
                    },
                    contentColor = colors.actionForeground,
                    disabledContainerColor = colors.border,
                    disabledContentColor = colors.mutedForeground,
                ),
                content = label,
            )
        }

        KinetixButtonVariant.Secondary -> Material3Button(
            onClick = guardedOnClick, modifier = decoratedModifier, enabled = enabled, shape = shape, contentPadding = contentPadding,
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
            onClick = guardedOnClick, modifier = decoratedModifier, enabled = enabled, shape = shape, contentPadding = contentPadding,
            border = BorderStroke(dimensionResource(R.dimen.border_width_default), colors.border),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = colors.foreground,
                disabledContentColor = colors.mutedForeground,
            ),
            content = label,
        )

        KinetixButtonVariant.Destructive -> Material3Button(
            onClick = guardedOnClick, modifier = decoratedModifier, enabled = enabled, shape = shape, contentPadding = contentPadding,
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.destructive,
                contentColor = colors.destructiveForeground,
                disabledContainerColor = colors.border,
                disabledContentColor = colors.mutedForeground,
            ),
            content = label,
        )

        KinetixButtonVariant.Ghost -> TextButton(
            onClick = guardedOnClick, modifier = decoratedModifier, enabled = enabled, shape = shape, contentPadding = contentPadding,
            colors = ButtonDefaults.textButtonColors(
                contentColor = colors.foreground,
                disabledContentColor = colors.mutedForeground,
            ),
            content = label,
        )

        // React's Link variant drops its own horizontal padding (`px-0`) — mirrored here.
        KinetixButtonVariant.Link -> TextButton(
            onClick = guardedOnClick, modifier = decoratedModifier, enabled = enabled, contentPadding = PaddingValues(0.dp),
            colors = ButtonDefaults.textButtonColors(
                contentColor = colors.link,
                disabledContentColor = colors.mutedForeground,
            ),
            content = label,
        )
    }
}
