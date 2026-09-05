package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixNumberInput — mirrors `packages/ui/src/components/number-input.tsx`:
 * a numeric field flanked by decrement/increment buttons. Modeled on `Int`
 * rather than the source's arbitrary (fractional-`step`-capable) number —
 * simpler, and matches the overwhelmingly common use case; a fractional
 * variant is a mechanical follow-up if ever needed. `h-10`/`w-9`
 * (40dp/36dp) aren't on the shared `spacing_*` scale — hardcoded, same
 * reasoning as `KinetixToggle`'s off-scale sizes. Buttons use plain "−"/"+"
 * glyphs, not lucide's `Minus`/`Plus` — no icon library wired in yet.
 */
@Composable
fun KinetixNumberInput(
    value: Int,
    onValueChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
    min: Int? = null,
    max: Int? = null,
    step: Int = 1,
    enabled: Boolean = true,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))

    fun clamp(n: Int): Int {
        var v = n
        if (min != null) v = maxOf(min, v)
        if (max != null) v = minOf(max, v)
        return v
    }

    val canDecrement = enabled && (min == null || value > min)
    val canIncrement = enabled && (max == null || value < max)

    Row(
        modifier = modifier
            .height(40.dp) // h-10, not on the shared scale
            .clip(shape)
            .border(dimensionResource(R.dimen.border_width_default), colors.border, shape),
    ) {
        Box(
            modifier = Modifier
                .width(36.dp) // w-9, not on the shared scale
                .fillMaxHeight()
                .clickable(enabled = canDecrement) { onValueChange(clamp(value - step)) },
            contentAlignment = Alignment.Center,
        ) {
            Text(text = "−", color = colors.mutedForeground)
        }

        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .border(dimensionResource(R.dimen.border_width_default), colors.border)
                .padding(horizontal = dimensionResource(R.dimen.spacing_2)),
            contentAlignment = Alignment.Center,
        ) {
            BasicTextField(
                value = value.toString(),
                onValueChange = { text -> text.toIntOrNull()?.let { onValueChange(clamp(it)) } },
                enabled = enabled,
                singleLine = true,
                textStyle = TextStyle(
                    color = colors.foreground,
                    textAlign = TextAlign.Center,
                    fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
                    lineHeight = dimensionResource(R.dimen.line_height_body_md).value.sp,
                ),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            )
        }

        Box(
            modifier = Modifier
                .width(36.dp) // w-9, not on the shared scale
                .fillMaxHeight()
                .clickable(enabled = canIncrement) { onValueChange(clamp(value + step)) },
            contentAlignment = Alignment.Center,
        ) {
            Text(text = "+", color = colors.mutedForeground)
        }
    }
}
