package com.kinetixui.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription

/** Float precision follows Compose's animation API; accessibility always receives the exact target. */
@Composable
fun KinetixAnimatedNumber(value: Float, format: (Float) -> String, modifier: Modifier = Modifier) {
    if (value.isFinite()) AnimatedFiniteNumber(value, format, modifier)
    else Text(text = format(value), modifier = modifier.clearAndSetSemantics { contentDescription = format(value) }, color = KinetixColorScheme.current.foreground)
}

@Composable
private fun AnimatedFiniteNumber(value: Float, format: (Float) -> String, modifier: Modifier) {
    val reduced = KinetixDisclosureMotion.rememberReduceMotion()
    val animated by animateFloatAsState(
        targetValue = value,
        animationSpec = KinetixNumberMotion.spec(reduced),
        label = "Kinetix numeric continuity",
    )
    Text(
        text = format(if (reduced) value else animated),
        modifier = modifier.clearAndSetSemantics { contentDescription = format(value) },
        color = KinetixColorScheme.current.foreground,
    )
}
