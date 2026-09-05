package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Compose Preview gallery for Field / Fab / Quote / Slider / PasswordInput
 * — same verification aid as the earlier `ComponentPreviews*.kt` files.
 * Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery5LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery5() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery5DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery5() }
}

@Composable
private fun ComponentGallery5() {
    var sliderValue by remember { mutableFloatStateOf(0.4f) }
    var password by remember { mutableStateOf("") }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixField(invalid = true, modifier = Modifier.width(240.dp)) {
            KinetixFieldLabel(text = "Email")
            KinetixInput(value = "", onValueChange = {}, placeholder = "you@example.com", isError = true)
            KinetixFieldMessage(text = "Enter a valid email address")
        }

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            KinetixFab(onClick = {}) { Text("+") }
            KinetixFab(onClick = {}, variant = KinetixFabVariant.Secondary, size = KinetixFabSize.Sm) { Text("+") }
            KinetixFab(onClick = {}, extended = true) { Text("Create") }
        }

        KinetixQuote(
            text = "Good design is as little design as possible.",
            author = "Dieter Rams",
            authorTitle = "Industrial Designer",
            modifier = Modifier.width(280.dp),
        )

        KinetixSlider(value = sliderValue, onValueChange = { sliderValue = it }, modifier = Modifier.width(240.dp))

        KinetixPasswordInput(
            value = password,
            onValueChange = { password = it },
            placeholder = "Password",
            modifier = Modifier.width(240.dp),
        )
    }
}
