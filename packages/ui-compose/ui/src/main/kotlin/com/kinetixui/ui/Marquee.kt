package com.kinetixui.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.semantics.clearAndSetSemantics

/**
 * KinetixMarquee — mirrors `packages/ui/src/components/marquee.tsx`: an
 * auto-scrolling horizontal ticker (logo strip, testimonials). Renders
 * `content` twice side by side and translates the row by exactly minus
 * half its own measured width per loop, the same "duplicate + shift by
 * one content-width" technique as the web version — Compose has no CSS
 * keyframe/animation shorthand to lean on. The duplicate copy is hidden
 * from TalkBack via `clearAndSetSemantics`, same accessibility fix as the
 * web port. `pauseOnHover` isn't ported — hover isn't a primary Android
 * interaction, unlike the web (and desktop-pointer) case it's built for.
 */
@Composable
fun KinetixMarquee(
    modifier: Modifier = Modifier,
    durationMillis: Int = 32000,
    content: @Composable () -> Unit,
) {
    var trackWidthPx by remember { mutableIntStateOf(0) }
    val transition = rememberInfiniteTransition(label = "kinetix-marquee")
    val progress by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(animation = tween(durationMillis, easing = LinearEasing)),
        label = "kinetix-marquee-progress",
    )

    Box(modifier = modifier.clipToBounds()) {
        Row(
            modifier = Modifier
                .onSizeChanged { trackWidthPx = it.width }
                .graphicsLayer { translationX = -(trackWidthPx / 2f) * progress },
        ) {
            Row { content() }
            Row(modifier = Modifier.clearAndSetSemantics {}) { content() }
        }
    }
}
