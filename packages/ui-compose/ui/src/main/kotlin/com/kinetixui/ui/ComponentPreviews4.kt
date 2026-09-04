package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Compose Preview gallery for RadioGroup / Toggle / AspectRatio /
 * CircularProgress / Rating — same verification aid as the earlier
 * `ComponentPreviews*.kt` files. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery4LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery4() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery4DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery4() }
}

@Composable
private fun ComponentGallery4() {
    var selected by remember { mutableStateOf("a") }
    var toggled by remember { mutableStateOf(false) }
    var rating by remember { mutableIntStateOf(3) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixRadioGroup {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KinetixRadioButton(selected = selected == "a", onClick = { selected = "a" })
                KinetixRadioButton(selected = selected == "b", onClick = { selected = "b" })
                KinetixRadioButton(selected = false, onClick = null, enabled = false)
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixToggle(pressed = toggled, onPressedChange = { toggled = it }) {
                Text("B")
            }
            KinetixToggle(pressed = true, onPressedChange = {}, variant = KinetixToggleVariant.Outline) {
                Text("I")
            }
        }

        KinetixAspectRatio(ratio = 16f / 9f, modifier = Modifier.width(160.dp)) {
            KinetixSkeleton(modifier = Modifier.fillMaxSize())
        }

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            KinetixCircularProgress(value = 40f)
            KinetixCircularProgress(value = 75f, showValue = true)
        }

        KinetixRating(value = rating, onValueChange = { rating = it })
        KinetixRating(value = 4, size = KinetixRatingSize.Sm)
    }
}
