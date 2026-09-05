package com.kinetixui.ui

import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * KinetixSlider — mirrors `packages/ui/src/components/slider.tsx` (Radix
 * `Slider`: `bg-muted` track, `bg-primary` range, bordered `bg-background`
 * thumb). Unlike [KinetixSwitch]/[KinetixCheckbox]/[KinetixRadioButton],
 * this wraps Material3's own `Slider` rather than hand-rolling the drag
 * gesture: a slider's pointer handling (drag, keyboard step, RTL,
 * accessibility) is real surface area Material3 already gets right, so
 * only the color mapping is worth re-doing here. The tradeoff: the thumb
 * uses Material3's own size/shape, not the source's exact `size-4`
 * (16dp) circle — a real, documented gap, not a silent rounding.
 */
@Composable
fun KinetixSlider(
    value: Float,
    onValueChange: (Float) -> Unit,
    modifier: Modifier = Modifier,
    valueRange: ClosedFloatingPointRange<Float> = 0f..1f,
    enabled: Boolean = true,
) {
    val colors = KinetixColorScheme.current
    Slider(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        enabled = enabled,
        valueRange = valueRange,
        colors = SliderDefaults.colors(
            thumbColor = colors.background,
            activeTrackColor = colors.primary,
            inactiveTrackColor = colors.muted,
            disabledThumbColor = colors.background.copy(alpha = 0.5f),
            disabledActiveTrackColor = colors.primary.copy(alpha = 0.5f),
            disabledInactiveTrackColor = colors.muted.copy(alpha = 0.5f),
        ),
    )
}
