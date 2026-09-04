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
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Compose Preview gallery for Avatar / Alert / Checkbox / Textarea / Card —
 * same verification aid as the earlier `ComponentPreviews*.kt` files. Not
 * part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery3LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery3() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery3DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery3() }
}

@Composable
private fun ComponentGallery3() {
    var checkedState by remember { mutableStateOf(ToggleableState.On) }
    var textareaValue by remember { mutableStateOf("") }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixAvatar { KinetixAvatarFallback(text = "ZF") }
            KinetixAvatar { KinetixAvatarFallback(text = "+3") }
        }

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixAlert(modifier = Modifier.width(280.dp)) {
                KinetixAlertTitle(text = "Heads up")
                KinetixAlertDescription(text = "This is a default alert.")
            }
            KinetixAlert(modifier = Modifier.width(280.dp), variant = KinetixAlertVariant.Destructive) {
                KinetixAlertTitle(text = "Error")
                KinetixAlertDescription(text = "Something went wrong.")
            }
            KinetixAlert(modifier = Modifier.width(280.dp), variant = KinetixAlertVariant.Success) {
                KinetixAlertTitle(text = "Saved")
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixCheckbox(
                state = checkedState,
                onClick = {
                    checkedState = when (checkedState) {
                        ToggleableState.On -> ToggleableState.Off
                        ToggleableState.Off -> ToggleableState.Indeterminate
                        ToggleableState.Indeterminate -> ToggleableState.On
                    }
                },
            )
            KinetixCheckbox(checked = false, onCheckedChange = {})
            KinetixCheckbox(checked = true, onCheckedChange = {}, isError = true)
        }

        KinetixTextarea(
            value = textareaValue,
            onValueChange = { textareaValue = it },
            placeholder = "Leave a comment",
            modifier = Modifier.width(240.dp),
        )

        KinetixCard(modifier = Modifier.width(280.dp)) {
            KinetixCardHeader {
                KinetixCardTitle(text = "Notifications")
                KinetixCardDescription(text = "Manage your preferences.")
            }
            KinetixCardContent { KinetixLabel(text = "Email alerts") }
            KinetixCardFooter { KinetixTag(text = "Beta") }
        }
    }
}
