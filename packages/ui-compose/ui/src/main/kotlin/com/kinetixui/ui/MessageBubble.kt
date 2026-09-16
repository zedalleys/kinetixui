package com.kinetixui.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixMessageBubble / KinetixTypingIndicator — mirrors
 * `packages/ui/src/components/message-bubble.tsx`: a sent/received chat
 * bubble with grouping, timestamp, and a status tick, plus a typing
 * indicator. `grouped` reduces the outer top corner's radius as a
 * lightweight consecutive-run cue, same call as the web source. No icon
 * library wired in yet (same gap as [KinetixInform]) — the status ticks
 * are plain "✓"/"✓✓" glyphs.
 */
enum class KinetixMessageVariant { Sent, Received }
enum class KinetixMessageStatus { Sent, Delivered, Read }

@Composable
fun KinetixMessageBubble(
    text: String,
    modifier: Modifier = Modifier,
    variant: KinetixMessageVariant = KinetixMessageVariant.Received,
    timestamp: String? = null,
    status: KinetixMessageStatus? = null,
    grouped: Boolean = false,
    avatar: (@Composable () -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val sent = variant == KinetixMessageVariant.Sent

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = if (sent) Arrangement.End else Arrangement.Start,
    ) {
        if (!sent && avatar != null) {
            Box(modifier = Modifier.padding(end = dimensionResource(R.dimen.spacing_2))) { avatar() }
        }
        Column(horizontalAlignment = if (sent) Alignment.End else Alignment.Start) {
            val shape = RoundedCornerShape(
                topStart = if (!sent && grouped) 8.dp else 16.dp,
                topEnd = if (sent && grouped) 8.dp else 16.dp,
                bottomStart = 16.dp,
                bottomEnd = 16.dp,
            )
            Text(
                text = text,
                color = if (sent) colors.primaryForeground else colors.foreground,
                fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                modifier = Modifier
                    .widthIn(max = 280.dp)
                    .clip(shape)
                    .background(if (sent) colors.primary else colors.muted, shape)
                    .padding(
                        horizontal = dimensionResource(R.dimen.spacing_3),
                        vertical = dimensionResource(R.dimen.spacing_2),
                    ),
            )
            if (timestamp != null || (sent && status != null)) {
                Row(
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (timestamp != null) {
                        Text(
                            text = timestamp,
                            color = colors.mutedForeground,
                            fontSize = dimensionResource(R.dimen.font_size_label_sm).value.sp,
                        )
                    }
                    if (sent && status != null) {
                        val tickColor = if (status == KinetixMessageStatus.Read) colors.primary else colors.mutedForeground
                        Text(
                            text = if (status == KinetixMessageStatus.Sent) "✓" else "✓✓",
                            color = tickColor,
                            fontSize = dimensionResource(R.dimen.font_size_label_sm).value.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun KinetixTypingIndicator(modifier: Modifier = Modifier) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(16.dp)

    Row(
        modifier = modifier
            .clip(shape)
            .background(colors.muted, shape)
            .padding(horizontal = dimensionResource(R.dimen.spacing_3), vertical = dimensionResource(R.dimen.spacing_2)),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        repeat(3) { i ->
            val transition = rememberInfiniteTransition(label = "kinetix-typing-dot-$i")
            val offset by transition.animateFloat(
                initialValue = 0f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = 1200, delayMillis = i * 150, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart,
                ),
                label = "kinetix-typing-dot-offset-$i",
            )
            // 0 -> 3dp up -> back down, matching the web's typing-dot keyframe
            val bounce = if (offset < 0.3f) offset / 0.3f else (1f - offset) / 0.7f
            Box(
                modifier = Modifier
                    .padding(top = (3 * (1 - bounce)).dp)
                    .size(6.dp)
                    .background(colors.mutedForeground, CircleShape),
            )
        }
    }
}
