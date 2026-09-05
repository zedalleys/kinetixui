package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.sp

/**
 * KinetixInput — mirrors `packages/ui/src/components/input.tsx`'s bare
 * control (label/helper text live in a separate Field composition on the
 * web too — not ported here). Figma source: node 54855:13836. Border
 * `--input` (== `--border`, confirmed identical in both themes — reused
 * directly rather than adding a redundant field to KinetixColors), focus
 * `--primary`, error `--destructive`, radius `--radius-sm`, padding
 * `--spacing-3`, type = Body Medium (14/20, +0.25).
 *
 * Not ported: the `corners` variant (sharp/rounded/pill) and the focus-ring
 * shadow token — Compose's own focus outline / IME affordances cover the
 * interaction cue; `--radius-sm` (the CVA default) is the only corner style
 * here.
 *
 * `trailing` is this component's stand-in for the React `InputGroup`
 * composition (`InputGroupAddon`) — a single optional end-aligned slot
 * rather than a full addon system, enough for [KinetixPasswordInput]'s
 * show/hide control without pulling in a separate InputGroup type.
 * `keyboardType`/`visualTransformation` exist for the same reason —
 * [KinetixPasswordInput] needs to mask input, which this bare control has
 * no other way to request.
 */
@Composable
fun KinetixInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    enabled: Boolean = true,
    isError: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailing: (@Composable () -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val borderColor = when {
        isError -> colors.destructive
        isFocused -> colors.primary
        else -> colors.border
    }
    val textStyle = TextStyle(
        color = if (enabled) colors.foreground else colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_body_md).value.sp,
        letterSpacing = dimensionResource(R.dimen.letter_spacing_wide_25).value.sp,
    )
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_sm))

    Row(
        modifier = modifier
            .background(colors.background, shape)
            .border(dimensionResource(R.dimen.border_width_default), borderColor, shape)
            .padding(dimensionResource(R.dimen.spacing_3)),
    ) {
        Box(modifier = Modifier.weight(1f)) {
            if (value.isEmpty() && placeholder != null) {
                Text(text = placeholder, style = textStyle.copy(color = colors.mutedForeground))
            }
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier,
                enabled = enabled,
                singleLine = true,
                textStyle = textStyle,
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                visualTransformation = visualTransformation,
                interactionSource = interactionSource,
                cursorBrush = SolidColor(colors.primary),
            )
        }
        if (trailing != null) {
            trailing()
        }
    }
}
