package com.kinetixui.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * KinetixAspectRatio — mirrors `packages/ui/src/components/aspect-ratio.tsx`,
 * itself a bare re-export of Radix's `AspectRatio.Root` with no styling of
 * its own. Compose has a direct built-in equivalent (`Modifier.aspectRatio`)
 * — this just gives it a `Kinetix`-prefixed, `content`-slot-shaped API
 * consistent with the rest of the package.
 */
@Composable
fun KinetixAspectRatio(
    ratio: Float,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Box(modifier = modifier.aspectRatio(ratio)) {
        content()
    }
}
