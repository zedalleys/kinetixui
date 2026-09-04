package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Compose Preview gallery for Badge / Switch / Input / Separator — same
 * verification aid as ButtonPreviews.kt. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentsLightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentsDarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery() }
}

@Composable
private fun ComponentGallery() {
    var switchOn by remember { mutableStateOf(true) }
    var text by remember { mutableStateOf("") }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixBadge(text = "Default")
            KinetixBadge(text = "Secondary", variant = KinetixBadgeVariant.Secondary)
            KinetixBadge(text = "Destructive", variant = KinetixBadgeVariant.Destructive)
            KinetixBadge(text = "Outline", variant = KinetixBadgeVariant.Outline)
            KinetixBadge(text = "Subtle", variant = KinetixBadgeVariant.Subtle)
        }

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            KinetixSwitch(checked = switchOn, onCheckedChange = { switchOn = it })
            KinetixSwitch(checked = false, onCheckedChange = {})
            KinetixSwitch(checked = true, onCheckedChange = null, enabled = false)
        }

        KinetixInput(
            value = text,
            onValueChange = { text = it },
            placeholder = "you@example.com",
            modifier = Modifier.width(240.dp),
        )
        KinetixInput(
            value = "",
            onValueChange = {},
            placeholder = "Invalid",
            isError = true,
            modifier = Modifier.width(240.dp),
        )
        KinetixInput(
            value = "Disabled",
            onValueChange = {},
            enabled = false,
            modifier = Modifier.width(240.dp),
        )

        KinetixSeparator(modifier = Modifier.width(240.dp))
    }
}
