package com.kinetixui.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * KinetixScrollArea — mirrors
 * `packages/ui/src/components/scroll-area.tsx`: Radix's `Viewport`
 * wrapping arbitrary content in a scrollable region. Compose's own
 * `Modifier.verticalScroll`/`horizontalScroll` already provide that;
 * there's no `Corner`/custom `ScrollBar` here — Radix's whole reason to
 * exist is a custom draggable, always-visible scrollbar thumb replacing
 * the browser's native one, which Android doesn't need replaced (its
 * system scroll indicators/edge-glow already do that job). A real custom
 * draggable thumb (matching `ScrollBar`/`ScrollAreaThumb` 1:1) would need
 * its own drag-gesture and scroll-position math — a real, deliberately
 * deferred gap, not a silent one.
 */
enum class KinetixScrollAreaOrientation { Vertical, Horizontal }

@Composable
fun KinetixScrollArea(
    modifier: Modifier = Modifier,
    orientation: KinetixScrollAreaOrientation = KinetixScrollAreaOrientation.Vertical,
    content: @Composable () -> Unit,
) {
    val scrollState = rememberScrollState()
    val scrollModifier = when (orientation) {
        KinetixScrollAreaOrientation.Vertical -> Modifier.verticalScroll(scrollState)
        KinetixScrollAreaOrientation.Horizontal -> Modifier.horizontalScroll(scrollState)
    }

    Box(modifier = modifier.then(scrollModifier)) {
        content()
    }
}
