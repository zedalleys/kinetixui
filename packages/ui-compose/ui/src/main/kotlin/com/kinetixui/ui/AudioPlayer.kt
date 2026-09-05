package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

/**
 * KinetixAudioPlayer — mirrors `packages/ui/src/components/audio-player.tsx`
 * (`variant="full" | "mini"` transport UI over a native `<audio>`).
 * **Presentational only** — same call [KinetixFileUpload] made: playback
 * itself (a `MediaPlayer` / Media3 `ExoPlayer`) is the caller's, wired to
 * `isPlaying` / `positionMs` / `durationMs` in and `onPlayPause` /
 * `onSeek` / `onSkip` / `onPrev` / `onNext` out — no media-playback
 * library is pulled into this package. The scrubber reuses [KinetixSlider]
 * outright. `44dp`/`36dp`/`32dp` control sizes are Figma-literal, off the
 * shared `spacing_*` scale — hardcoded, same reasoning as `KinetixFab`.
 * Transport glyphs are plain text ("▶"/"⏸"/"⏮"/"⏭") — no icon library.
 */
enum class KinetixAudioPlayerVariant { Full, Mini }

private fun formatTime(millis: Long): String {
    if (millis < 0L) return "0:00"
    val totalSeconds = millis / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}

@Composable
fun KinetixAudioPlayer(
    isPlaying: Boolean,
    positionMs: Long,
    durationMs: Long,
    onPlayPause: () -> Unit,
    onSeek: (Long) -> Unit,
    modifier: Modifier = Modifier,
    variant: KinetixAudioPlayerVariant = KinetixAudioPlayerVariant.Full,
    title: String? = null,
    artist: String? = null,
    skipByMs: Long = 10_000,
    onPrev: (() -> Unit)? = null,
    onNext: (() -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val fraction = if (durationMs > 0L) (positionMs.toFloat() / durationMs).coerceIn(0f, 1f) else 0f

    if (variant == KinetixAudioPlayerVariant.Mini) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(dimensionResource(R.dimen.radius_full)))
                .background(colors.background)
                .border(dimensionResource(R.dimen.border_width_default), colors.border, RoundedCornerShape(dimensionResource(R.dimen.radius_full))),
        ) {
            Row(
                modifier = Modifier.padding(dimensionResource(R.dimen.spacing_2)),
                horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(modifier = Modifier.size(40.dp).clip(CircleShape).background(colors.muted))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = title ?: "Audio",
                        color = colors.foreground,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
                        maxLines = 1,
                    )
                    if (artist != null) {
                        Text(
                            text = artist,
                            color = colors.mutedForeground,
                            fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                            maxLines = 1,
                        )
                    }
                }
                TransportGlyph(text = "⏭", onClick = { onSeek((positionMs + skipByMs).coerceAtMost(durationMs)) })
                PlayPauseButton(isPlaying = isPlaying, onClick = onPlayPause, diameter = 36.dp)
            }
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .height(4.dp)
                    .background(colors.muted),
            ) {
                Box(modifier = Modifier.fillMaxWidth(fraction).height(4.dp).background(colors.primary))
            }
        }
        return
    }

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2))) {
        KinetixSlider(
            value = fraction,
            onValueChange = { onSeek((it * durationMs).roundToInt().toLong()) },
            enabled = durationMs > 0L,
        )
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(text = formatTime(positionMs), color = colors.mutedForeground, fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp)
            Text(text = formatTime(durationMs), color = colors.mutedForeground, fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp)
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = dimensionResource(R.dimen.spacing_1)),
            horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3), Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TransportGlyph(text = "⏮", onClick = { onPrev?.invoke() }, enabled = onPrev != null)
            TransportGlyph(text = "⏪", onClick = { onSeek((positionMs - skipByMs).coerceAtLeast(0L)) })
            PlayPauseButton(isPlaying = isPlaying, onClick = onPlayPause, diameter = 44.dp)
            TransportGlyph(text = "⏩", onClick = { onSeek((positionMs + skipByMs).coerceAtMost(durationMs)) })
            TransportGlyph(text = "⏭", onClick = { onNext?.invoke() }, enabled = onNext != null)
        }
    }
}

@Composable
private fun PlayPauseButton(isPlaying: Boolean, onClick: () -> Unit, diameter: Dp) {
    val colors = KinetixColorScheme.current
    Box(
        modifier = Modifier
            .size(diameter)
            .clip(CircleShape)
            .background(colors.primary)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = if (isPlaying) "⏸" else "▶", color = colors.primaryForeground)
    }
}

@Composable
private fun RowScope.TransportGlyph(text: String, onClick: () -> Unit, enabled: Boolean = true) {
    val colors = KinetixColorScheme.current
    Box(
        modifier = Modifier
            .size(32.dp)
            .clip(CircleShape)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            color = if (enabled) colors.mutedForeground else colors.mutedForeground.copy(alpha = 0.4f),
            fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        )
    }
}
