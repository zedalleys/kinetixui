package com.kinetixui.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.VectorConverter
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.dimensionResource
import com.kinetixui.tokens.KinetixDuration
import com.kinetixui.tokens.KinetixEasing

private class IndicatorTrack {
    val frames = mutableStateMapOf<Any, Rect>()
    val selections = mutableStateMapOf<Any, Boolean>()
    val itemCoordinates = mutableMapOf<Any, LayoutCoordinates>()
    var coordinates: LayoutCoordinates? = null

    fun measure(id: Any, item: LayoutCoordinates) {
        val parent = coordinates ?: return
        if (parent.isAttached && item.isAttached) {
            frames[id] = parent.localBoundingBoxOf(item, clipBounds = false)
        }
    }
}

private val LocalIndicatorTrack = compositionLocalOf<IndicatorTrack?> { null }

@Composable
internal fun KinetixSelectionIndicator(content: @Composable (Modifier) -> Unit) {
    val track = remember { IndicatorTrack() }
    val color = KinetixColorScheme.current.background
    val radius = dimensionResource(R.dimen.radius_md)
    val direction = LocalLayoutDirection.current
    val reduceMotion = KinetixDisclosureMotion.rememberReduceMotion()
    val targets = track.frames.toMap()
    val selected = targets.filterKeys { track.selections[it] == true }
    val target = selected.values.singleOrNull()
    val presentation = remember { Animatable(Rect.Zero, Rect.VectorConverter) }
    var previousFrames by remember { mutableStateOf<Map<Any, Rect>>(emptyMap()) }
    var previousDirection by remember { mutableStateOf(direction) }
    var previousTarget by remember { mutableStateOf<Rect?>(null) }

    LaunchedEffect(targets, direction, target, reduceMotion) {
        val canTravel = !reduceMotion && target != null && previousTarget != null &&
            targets == previousFrames && direction == previousDirection && previousTarget != target
        previousFrames = targets
        previousDirection = direction
        previousTarget = target
        if (target == null || !canTravel) {
            presentation.snapTo(target ?: Rect.Zero)
        } else {
            presentation.animateTo(
                target,
                tween(durationMillis = KinetixDuration.base, easing = KinetixEasing.emphasized),
            )
        }
    }

    CompositionLocalProvider(LocalIndicatorTrack provides track) {
        content(
            Modifier
                .onGloballyPositioned { coordinates ->
                    track.coordinates = coordinates
                    track.itemCoordinates.forEach(track::measure)
                }
                .drawBehind {
                    val corner = CornerRadius(radius.toPx())
                    if (target == null) {
                        for (frame in selected.values) {
                            drawRoundRect(color, frame.topLeft, frame.size, corner)
                        }
                    } else {
                        val frame = if (reduceMotion || targets != previousFrames ||
                            direction != previousDirection || presentation.value == Rect.Zero
                        ) target else presentation.value
                        drawRoundRect(color, frame.topLeft, frame.size, corner)
                    }
                },
        )
    }
}

/** Registers the native item's layout while leaving its input modifier intact. */
@Composable
internal fun KinetixSelectionIndicatorItem(selected: Boolean): Pair<Modifier, Boolean> {
    val track = LocalIndicatorTrack.current ?: return Modifier to selected
    val id = remember { Any() }
    SideEffect { track.selections[id] = selected }
    DisposableEffect(track, id) {
        onDispose {
            track.selections.remove(id)
            track.itemCoordinates.remove(id)
            track.frames.remove(id)
        }
    }
    return Modifier.onGloballyPositioned { coordinates ->
        track.itemCoordinates[id] = coordinates
        track.measure(id, coordinates)
    } to false
}
