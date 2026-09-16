package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixComparisonSlider — mirrors
 * `packages/ui/src/components/comparison-slider.tsx`: a drag handle
 * wiping between two stacked layers. The web version's Radix `Slider`
 * supports both dragging the thumb and clicking anywhere on the track to
 * jump; this port only drags the handle itself (`Modifier.draggable`) —
 * a documented scope-down, not a silent gap, since replicating
 * click-anywhere-to-jump needs its own pointer-input layer on top of the
 * drag one. Position math uses `BoxWithConstraints` (`maxWidth` directly
 * in Dp) rather than pixel-tracking via `onSizeChanged`.
 */
@Composable
fun KinetixComparisonSlider(
    before: @Composable BoxScope.() -> Unit,
    after: @Composable BoxScope.() -> Unit,
    modifier: Modifier = Modifier,
    value: Float = 50f,
    onValueChange: ((Float) -> Unit)? = null,
    beforeLabel: String? = null,
    afterLabel: String? = null,
) {
    var internal by remember { mutableFloatStateOf(value) }
    val current = if (onValueChange != null) value else internal
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))
    val density = LocalDensity.current

    BoxWithConstraints(
        modifier = modifier
            .aspectRatio(16f / 9f)
            .clip(shape)
            .background(colors.muted),
    ) {
        val handleX = maxWidth * (current / 100f)
        val maxWidthPx = with(density) { maxWidth.toPx() }

        Box(modifier = Modifier.fillMaxSize(), content = before)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .drawWithContent {
                    clipRect(left = size.width * (current / 100f)) { this@drawWithContent.drawContent() }
                },
            content = after,
        )

        Box(
            modifier = Modifier
                .fillMaxHeight()
                .width(2.dp)
                .offset(x = handleX - 1.dp)
                .background(colors.background),
        )

        if (beforeLabel != null) {
            Text(
                text = beforeLabel,
                color = colors.foreground,
                fontSize = dimensionResource(R.dimen.font_size_label_sm).value.sp,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(dimensionResource(R.dimen.spacing_2))
                    .background(colors.background.copy(alpha = 0.8f), RoundedCornerShape(4.dp))
                    .padding(horizontal = dimensionResource(R.dimen.spacing_2), vertical = 2.dp),
            )
        }
        if (afterLabel != null) {
            Text(
                text = afterLabel,
                color = colors.foreground,
                fontSize = dimensionResource(R.dimen.font_size_label_sm).value.sp,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(dimensionResource(R.dimen.spacing_2))
                    .background(colors.background.copy(alpha = 0.8f), RoundedCornerShape(4.dp))
                    .padding(horizontal = dimensionResource(R.dimen.spacing_2), vertical = 2.dp),
            )
        }

        Box(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .offset(x = handleX - 16.dp)
                .size(32.dp)
                .clip(CircleShape)
                .background(colors.background.copy(alpha = 0.9f), CircleShape)
                .border(2.dp, colors.background, CircleShape)
                .draggable(
                    orientation = Orientation.Horizontal,
                    state = rememberDraggableState { delta ->
                        val next = (current + delta / maxWidthPx * 100f).coerceIn(0f, 100f)
                        internal = next
                        onValueChange?.invoke(next)
                    },
                ),
        )
    }
}
