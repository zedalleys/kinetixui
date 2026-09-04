package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixTextarea — mirrors `packages/ui/src/components/textarea.tsx`,
 * which is (per its own doc comment) identical to [KinetixInput] except
 * multi-line with `min-h-[100px]`. Same token choices as `KinetixInput`;
 * 100dp is the Figma-literal min-height, not on the shared `spacing_*`
 * scale — hardcoded, same reasoning as `KinetixBadge`'s padding.
 */
@Composable
fun KinetixTextarea(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    enabled: Boolean = true,
    isError: Boolean = false,
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

    Box(
        modifier = modifier
            .heightIn(min = 100.dp)
            .background(colors.background, shape)
            .border(dimensionResource(R.dimen.border_width_default), borderColor, shape)
            .padding(dimensionResource(R.dimen.spacing_3)),
    ) {
        if (value.isEmpty() && placeholder != null) {
            Text(text = placeholder, style = textStyle.copy(color = colors.mutedForeground))
        }
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier,
            enabled = enabled,
            singleLine = false,
            textStyle = textStyle,
            interactionSource = interactionSource,
            cursorBrush = SolidColor(colors.primary),
        )
    }
}
