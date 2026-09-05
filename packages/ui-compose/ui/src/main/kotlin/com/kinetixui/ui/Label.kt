package com.kinetixui.ui

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixLabel — mirrors `packages/ui/src/components/label.tsx`
 * (`text-sm font-medium leading-none`). "leading-none" means line-height
 * equals font-size exactly (a CSS ratio-of-1 concept, not one of the shared
 * type-scale dimens) — expressed here by setting `lineHeight` to the same
 * value as `fontSize`.
 *
 * `color` defaults to the theme's `foreground` but is overridable —
 * [KinetixFieldLabel] uses this to switch to `destructive` when its
 * enclosing [KinetixField] is invalid, mirroring the React source's
 * `invalid && "text-destructive"`.
 */
@Composable
fun KinetixLabel(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = KinetixColorScheme.current.foreground,
) {
    val fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp
    Text(
        text = text,
        modifier = modifier,
        color = color,
        fontWeight = FontWeight.Medium,
        fontSize = fontSize,
        lineHeight = fontSize,
    )
}
