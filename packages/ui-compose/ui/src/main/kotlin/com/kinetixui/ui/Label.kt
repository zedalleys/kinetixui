package com.kinetixui.ui

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixLabel — mirrors `packages/ui/src/components/label.tsx`
 * (`text-sm font-medium leading-none`). "leading-none" means line-height
 * equals font-size exactly (a CSS ratio-of-1 concept, not one of the shared
 * type-scale dimens) — expressed here by setting `lineHeight` to the same
 * value as `fontSize`.
 */
@Composable
fun KinetixLabel(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    val fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp
    Text(
        text = text,
        modifier = modifier,
        color = colors.foreground,
        fontWeight = FontWeight.Medium,
        fontSize = fontSize,
        lineHeight = fontSize,
    )
}
