package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp

/**
 * KinetixImage — mirrors `packages/ui/src/components/image.tsx`'s
 * container (`bg-muted` placeholder, ratio lock, optional rounding). The
 * source's real image loading/error state and its `ImageOff` fallback
 * icon aren't reproduced: this package has no image-loading library wired
 * in (same "no icon library" gap noted for [KinetixRating]/
 * [KinetixCheckbox]/[KinetixTag]) — an actual network image needs
 * something like Coil's `AsyncImage`, a real dependency decision out of
 * scope for a design-system primitive. `content` is where the caller
 * places whatever image solution they use (a `painterResource`, an
 * `AsyncImage`, or their own placeholder/error composable); this
 * composable only supplies the ratio-locked, muted, optionally-rounded
 * container around it — the fade-in transition on load is the caller's
 * image-loading library's job too.
 */
enum class KinetixImageRatio(val value: Float) {
    Square(1f),
    Landscape3To2(3f / 2f),
    Landscape4To3(4f / 3f),
    Portrait3To4(3f / 4f),
    Wide3To1(3f),
    Widescreen16To9(16f / 9f),
}

@Composable
fun KinetixImage(
    modifier: Modifier = Modifier,
    ratio: KinetixImageRatio = KinetixImageRatio.Square,
    rounded: Boolean = true,
    content: @Composable BoxScope.() -> Unit,
) {
    val colors = KinetixColorScheme.current
    val shape = if (rounded) RoundedCornerShape(dimensionResource(R.dimen.radius_md)) else RoundedCornerShape(0.dp)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(ratio.value)
            .clip(shape)
            .background(colors.muted),
        content = content,
    )
}
