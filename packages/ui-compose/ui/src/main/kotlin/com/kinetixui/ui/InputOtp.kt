package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixInputOtp — mirrors `packages/ui/src/components/input-otp.tsx`
 * (the `input-otp` library's `OTPInput` + `InputOTPSlot`). The source
 * layers real DOM-focused slots with a fake caret over a single hidden
 * `<input>`; this uses the same trick natively — a fully transparent
 * `BasicTextField` capturing keystrokes, laid under a visible `Row` of
 * boxes that render from `value` — a standard Compose OTP pattern, not a
 * hand-rolled reimplementation of `input-otp`'s own internals. `size-9`
 * (36dp) isn't on the shared `spacing_*` scale — hardcoded, same
 * reasoning as `KinetixNumberInput`'s. The source's shared/segmented
 * border (each slot only owns its right edge, first/last round their
 * outer corner) is simplified to each slot owning a full independent
 * border — visually close, and much simpler than replicating Tailwind's
 * `border-y border-r first:border-l` segment trick with per-index
 * modifiers.
 */
@Composable
fun KinetixInputOtp(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    length: Int = 6,
    enabled: Boolean = true,
) {
    val colors = KinetixColorScheme.current
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))

    Box(modifier = modifier) {
        BasicTextField(
            value = value,
            onValueChange = { text ->
                if (text.length <= length && text.all(Char::isDigit)) onValueChange(text)
            },
            modifier = Modifier.matchParentSize(),
            enabled = enabled,
            singleLine = true,
            textStyle = TextStyle(color = Color.Transparent),
            cursorBrush = SolidColor(Color.Transparent),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            interactionSource = interactionSource,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2))) {
            for (i in 0 until length) {
                val active = isFocused && i == value.length
                val borderColor = if (active) colors.primary else colors.border
                val borderWidth = if (active) dimensionResource(R.dimen.border_width_focus) else dimensionResource(R.dimen.border_width_default)
                Box(
                    modifier = Modifier
                        .size(36.dp) // size-9, not on the shared scale
                        .clip(shape)
                        .background(colors.background, shape)
                        .border(borderWidth, borderColor, shape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = value.getOrNull(i)?.toString().orEmpty(),
                        color = colors.foreground,
                        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
                    )
                }
            }
        }
    }
}
