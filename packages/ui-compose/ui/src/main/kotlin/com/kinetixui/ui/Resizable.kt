package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp

/**
 * KinetixResizablePanels — mirrors
 * `packages/ui/src/components/resizable.tsx` (a themed wrapper over
 * `react-resizable-panels`' `PanelGroup`/`Panel`/`PanelResizeHandle`).
 * Scoped to exactly **two** panels rather than the source's arbitrary
 * `PanelGroup` with any number of `Panel`s — a real, deliberately narrowed
 * scope (the overwhelmingly common case, and it avoids reimplementing that
 * library's N-panel size-redistribution algorithm). The split fraction is
 * tracked with `Modifier.draggable` on the handle in between, converting
 * the drag delta (px) into a fraction against the container's own
 * measured size (`Modifier.onSizeChanged`); `minFraction`/`maxFraction`
 * clamp it, the same "caller sets the bounds" convention
 * `KinetixNumberInput`'s `min`/`max` uses. `w-3`/`h-4` (the grip handle)
 * are on the shared `spacing_*` scale; the handle's own hit-target width
 * isn't (`w-px` visually, wider here for a touch target) — hardcoded,
 * same reasoning as `KinetixToggle`'s off-scale sizes. The grip glyph is
 * a plain "⋮⋮" stand-in for lucide's `GripVertical` — no icon library
 * wired in yet, same gap noted for `KinetixBreadcrumbSeparator`.
 */
@Composable
fun KinetixResizablePanels(
    modifier: Modifier = Modifier,
    orientation: KinetixScrollAreaOrientation = KinetixScrollAreaOrientation.Horizontal,
    initialFraction: Float = 0.5f,
    minFraction: Float = 0.15f,
    maxFraction: Float = 0.85f,
    first: @Composable BoxScope.() -> Unit,
    second: @Composable BoxScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    var fraction by remember { mutableFloatStateOf(initialFraction) }
    var containerSizePx by remember { mutableFloatStateOf(0f) }
    val horizontal = orientation == KinetixScrollAreaOrientation.Horizontal
    val handleShape = RoundedCornerShape(dimensionResource(R.dimen.radius_sm))

    val draggableState = rememberDraggableState { delta ->
        if (containerSizePx > 0f) {
            fraction = (fraction + delta / containerSizePx).coerceIn(minFraction, maxFraction)
        }
    }

    val handle: @Composable BoxScope.() -> Unit = {
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .width(dimensionResource(if (horizontal) R.dimen.spacing_3 else R.dimen.spacing_4))
                .height(dimensionResource(if (horizontal) R.dimen.spacing_4 else R.dimen.spacing_3))
                .clip(handleShape)
                .background(colors.border),
        )
    }

    if (horizontal) {
        Row(
            modifier = modifier
                .fillMaxSize()
                .onSizeChanged { containerSizePx = it.width.toFloat() },
        ) {
            Box(modifier = Modifier.weight(fraction).fillMaxHeight()) { first() }
            Box(
                modifier = Modifier
                    .width(16.dp) // wider touch target than the source's visual `w-px`, not on the shared scale
                    .fillMaxHeight()
                    .draggable(orientation = Orientation.Horizontal, state = draggableState),
            ) {
                handle()
            }
            Box(modifier = Modifier.weight(1f - fraction).fillMaxHeight()) { second() }
        }
    } else {
        Column(
            modifier = modifier
                .fillMaxSize()
                .onSizeChanged { containerSizePx = it.height.toFloat() },
        ) {
            Box(modifier = Modifier.weight(fraction).fillMaxWidth()) { first() }
            Box(
                modifier = Modifier
                    .height(16.dp)
                    .fillMaxWidth()
                    .draggable(orientation = Orientation.Vertical, state = draggableState),
            ) {
                handle()
            }
            Box(modifier = Modifier.weight(1f - fraction).fillMaxWidth()) { second() }
        }
    }
}
