package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

enum class KinetixSeparatorOrientation { Horizontal, Vertical }

/**
 * KinetixSeparator — mirrors `packages/ui/src/components/separator.tsx`
 * (`bg-border`, 1px thick, full-length on its own axis). Decorative by
 * default, same as the React source (Radix's `decorative` default).
 */
@Composable
fun KinetixSeparator(
    modifier: Modifier = Modifier,
    orientation: KinetixSeparatorOrientation = KinetixSeparatorOrientation.Horizontal,
) {
    val colors = KinetixColorScheme.current
    val axisModifier = when (orientation) {
        KinetixSeparatorOrientation.Horizontal -> Modifier.fillMaxWidth().height(1.dp)
        KinetixSeparatorOrientation.Vertical -> Modifier.fillMaxHeight().width(1.dp)
    }
    Box(modifier = modifier.then(axisModifier).background(colors.border))
}
