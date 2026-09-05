package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixStepper — mirrors `packages/ui/src/components/stepper.tsx`: a
 * numbered multi-step progress indicator, complete/current/upcoming derived
 * from `current` against each step's index. `mt-3.5` (14dp, the horizontal
 * connector's top offset) isn't on the shared `spacing_*` scale —
 * hardcoded. The vertical orientation's connector is `flex-1 self-stretch`
 * in the React version (stretches to fill the row); Compose has no cheap
 * equivalent without a custom layout, so it's a fixed `min-h-6` (24dp,
 * matching the source's own `min-h-6` floor) instead of a dynamic stretch —
 * a real, documented simplification, not a silent one. The complete-step
 * checkmark is a plain "✓" glyph, same convention as `KinetixCheckbox`.
 */
data class KinetixStep(val label: String, val description: String? = null)
enum class KinetixStepperOrientation { Horizontal, Vertical }
private enum class StepStatus { Complete, Current, Upcoming }

@Composable
fun KinetixStepper(
    steps: List<KinetixStep>,
    current: Int,
    modifier: Modifier = Modifier,
    orientation: KinetixStepperOrientation = KinetixStepperOrientation.Horizontal,
) {
    if (orientation == KinetixStepperOrientation.Horizontal) {
        Row(modifier = modifier) {
            steps.forEachIndexed { i, step ->
                val status = statusOf(i, current)
                val isLast = i == steps.lastIndex
                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        StepBadge(index = i, status = status)
                        if (!isLast) {
                            StepConnector(
                                complete = status == StepStatus.Complete,
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(top = 14.dp) // mt-3.5, not on the shared scale
                                    .height(dimensionResource(R.dimen.border_width_default)),
                            )
                        }
                    }
                    StepLabels(step = step, status = status, horizontalAlignment = Alignment.CenterHorizontally)
                }
            }
        }
    } else {
        Column(modifier = modifier) {
            steps.forEachIndexed { i, step ->
                val status = statusOf(i, current)
                val isLast = i == steps.lastIndex
                Row {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        StepBadge(index = i, status = status)
                        if (!isLast) {
                            StepConnector(
                                complete = status == StepStatus.Complete,
                                modifier = Modifier
                                    .padding(vertical = dimensionResource(R.dimen.spacing_1))
                                    .width(dimensionResource(R.dimen.border_width_default))
                                    .heightIn(min = dimensionResource(R.dimen.spacing_6)), // min-h-6
                            )
                        }
                    }
                    Column(
                        modifier = Modifier.padding(
                            start = dimensionResource(R.dimen.spacing_3),
                            bottom = if (!isLast) dimensionResource(R.dimen.spacing_6) else 0.dp,
                        ),
                    ) {
                        StepLabels(step = step, status = status, horizontalAlignment = Alignment.Start)
                    }
                }
            }
        }
    }
}

private fun statusOf(index: Int, current: Int): StepStatus = when {
    index < current -> StepStatus.Complete
    index == current -> StepStatus.Current
    else -> StepStatus.Upcoming
}

private data class StepBadgeSpec(val container: Color?, val content: Color, val borderColor: Color?, val borderWidth: Dp)

@Composable
private fun stepBadgeSpec(status: StepStatus): StepBadgeSpec {
    val colors = KinetixColorScheme.current
    return when (status) {
        StepStatus.Complete -> StepBadgeSpec(colors.primary, colors.primaryForeground, null, 0.dp)
        StepStatus.Current -> StepBadgeSpec(null, colors.primary, colors.primary, dimensionResource(R.dimen.border_width_focus))
        StepStatus.Upcoming -> StepBadgeSpec(null, colors.mutedForeground, colors.border, dimensionResource(R.dimen.border_width_default))
    }
}

@Composable
private fun StepBadge(index: Int, status: StepStatus) {
    val spec = stepBadgeSpec(status)
    val shape = CircleShape
    var badgeModifier = Modifier.size(dimensionResource(R.dimen.spacing_7)).clip(shape) // size-7, matches spacing_7 exactly
    if (spec.container != null) badgeModifier = badgeModifier.background(spec.container, shape)
    if (spec.borderColor != null) badgeModifier = badgeModifier.border(spec.borderWidth, spec.borderColor, shape)

    Box(modifier = badgeModifier, contentAlignment = Alignment.Center) {
        Text(
            text = if (status == StepStatus.Complete) "✓" else "${index + 1}",
            color = spec.content,
            fontWeight = FontWeight.Medium,
            fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
            lineHeight = dimensionResource(R.dimen.line_height_label_md).value.sp,
        )
    }
}

@Composable
private fun StepConnector(complete: Boolean, modifier: Modifier) {
    val colors = KinetixColorScheme.current
    Box(modifier = modifier.background(if (complete) colors.primary else colors.border))
}

@Composable
private fun StepLabels(step: KinetixStep, status: StepStatus, horizontalAlignment: Alignment.Horizontal) {
    val colors = KinetixColorScheme.current
    Column(horizontalAlignment = horizontalAlignment) {
        Text(
            text = step.label,
            color = if (status == StepStatus.Upcoming) colors.mutedForeground else colors.foreground,
            fontWeight = FontWeight.Medium,
            fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
            lineHeight = dimensionResource(R.dimen.line_height_label_md).value.sp,
        )
        if (step.description != null) {
            Text(
                text = step.description,
                color = colors.mutedForeground,
                fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                lineHeight = dimensionResource(R.dimen.line_height_body_sm).value.sp,
            )
        }
    }
}
