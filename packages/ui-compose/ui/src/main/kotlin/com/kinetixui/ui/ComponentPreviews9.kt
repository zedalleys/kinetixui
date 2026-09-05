package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Compose Preview gallery for List / Image / InputOtp / InputGroup /
 * Collapsible — same verification aid as the earlier
 * `ComponentPreviews*.kt` files. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery9LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery9() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery9DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery9() }
}

@Composable
private fun ComponentGallery9() {
    var otpValue by remember { mutableStateOf("12") }
    var groupValue by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(true) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixList(modifier = Modifier.width(240.dp)) {
            KinetixListItem(
                title = "Email",
                description = "Product news and receipts",
                trailing = { KinetixSwitch(checked = true, onCheckedChange = {}) },
            )
            KinetixListItem(
                title = "Push",
                description = "Activity on your projects",
                trailing = { KinetixSwitch(checked = false, onCheckedChange = {}) },
                showDivider = false,
            )
        }

        KinetixImage(modifier = Modifier.width(160.dp), ratio = KinetixImageRatio.Widescreen16To9) {}

        KinetixInputOtp(value = otpValue, onValueChange = { otpValue = it }, length = 6)

        KinetixInputGroup(modifier = Modifier.width(240.dp)) {
            KinetixInputGroupText(text = "https://")
            KinetixInputGroupInput(value = groupValue, onValueChange = { groupValue = it }, placeholder = "kinetixui.com")
        }

        KinetixButton(onClick = { expanded = !expanded }) {
            Text(if (expanded) "Hide details" else "Show details")
        }
        KinetixCollapsible(expanded = expanded) {
            KinetixLabel(text = "Extra details go here.")
        }
    }
}
