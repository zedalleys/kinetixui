package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Compose Preview gallery for Label / Spinner / Skeleton / Tag / Progress —
 * same verification aid as ButtonPreviews.kt / ComponentPreviews.kt. Not
 * part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery2LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery2() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery2DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery2() }
}

@Composable
private fun ComponentGallery2() {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixLabel(text = "Email address")

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            KinetixSpinner(size = KinetixSpinnerSize.Sm)
            KinetixSpinner(size = KinetixSpinnerSize.Md)
            KinetixSpinner(size = KinetixSpinnerSize.Lg)
            KinetixSpinner(variant = KinetixSpinnerVariant.Muted)
        }

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixSkeleton(modifier = Modifier.width(240.dp).height(16.dp))
            KinetixSkeleton(modifier = Modifier.width(160.dp).height(16.dp))
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixTag(text = "Default")
            KinetixTag(text = "Secondary", variant = KinetixTagVariant.Secondary)
            KinetixTag(text = "Destructive", variant = KinetixTagVariant.Destructive)
            KinetixTag(text = "Warning", variant = KinetixTagVariant.Warning)
            KinetixTag(text = "Outline", variant = KinetixTagVariant.Outline)
            KinetixTag(text = "Removable", onRemove = {})
        }

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixProgress(value = 25f, modifier = Modifier.width(240.dp))
            KinetixProgress(value = 66f, modifier = Modifier.width(240.dp))
            KinetixProgress(value = 100f, modifier = Modifier.width(240.dp))
        }
    }
}
