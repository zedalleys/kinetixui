package com.kinetixui.ui

import androidx.compose.foundation.clickable
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.sp

/**
 * KinetixPasswordInput — mirrors
 * `packages/ui/src/components/password-input.tsx`: a [KinetixInput] with a
 * show/hide toggle. The React version renders lucide's `Eye`/`EyeOff` in
 * the toggle; this uses plain text labels ("Show"/"Hide") instead of an
 * icon glyph — no icon library is wired into this package (same call made
 * for `KinetixTag`'s remove control), and unlike a single "×" or "✓",
 * an eye icon has no clean Unicode stand-in that reads correctly at small
 * sizes across fonts.
 */
@Composable
fun KinetixPasswordInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    enabled: Boolean = true,
    isError: Boolean = false,
) {
    var visible by remember { mutableStateOf(false) }
    val colors = KinetixColorScheme.current

    KinetixInput(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        placeholder = placeholder,
        enabled = enabled,
        isError = isError,
        keyboardType = KeyboardType.Password,
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        trailing = {
            Text(
                text = if (visible) "Hide" else "Show",
                color = colors.mutedForeground,
                fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
                modifier = Modifier.clickable(enabled = enabled) { visible = !visible },
            )
        },
    )
}
