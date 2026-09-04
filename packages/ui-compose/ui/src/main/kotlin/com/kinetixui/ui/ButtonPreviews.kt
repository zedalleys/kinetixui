package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Compose Preview gallery for KinetixButton — open this file in Android
 * Studio and use the Split/Design view (or Build & Refresh in the Preview
 * pane) to see every variant rendered in both themes. Not part of the
 * public API — a verification aid only.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun KinetixButtonLightPreview() {
    KinetixTheme(darkTheme = false) { ButtonGallery() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun KinetixButtonDarkPreview() {
    KinetixTheme(darkTheme = true) { ButtonGallery() }
}

@Composable
private fun ButtonGallery() {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixButton(onClick = {}, variant = KinetixButtonVariant.Primary) { Text("Primary") }
            KinetixButton(onClick = {}, variant = KinetixButtonVariant.Secondary) { Text("Secondary") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixButton(onClick = {}, variant = KinetixButtonVariant.Outline) { Text("Outline") }
            KinetixButton(onClick = {}, variant = KinetixButtonVariant.Destructive) { Text("Destructive") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixButton(onClick = {}, variant = KinetixButtonVariant.Ghost) { Text("Ghost") }
            KinetixButton(onClick = {}, variant = KinetixButtonVariant.Link) { Text("Link") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixButton(onClick = {}, size = KinetixButtonSize.Sm) { Text("Small") }
            KinetixButton(onClick = {}, size = KinetixButtonSize.Lg) { Text("Large") }
            KinetixButton(onClick = {}, enabled = false) { Text("Disabled") }
        }
    }
}
