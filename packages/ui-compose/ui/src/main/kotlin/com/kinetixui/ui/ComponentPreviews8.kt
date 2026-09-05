package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
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
 * Compose Preview gallery for AlertDialog / HoverCard / ContextMenu /
 * Menubar — same verification aid as the earlier `ComponentPreviews*.kt`
 * files, with the same caveat `ComponentPreviews7.kt` already documents:
 * `Dialog`/`Popup`-based overlay content doesn't reliably render inside
 * the static Preview renderer. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery8LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery8() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery8DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery8() }
}

@Composable
private fun ComponentGallery8() {
    var alertDialogVisible by remember { mutableStateOf(false) }
    var hoverCardVisible by remember { mutableStateOf(false) }
    var fileMenuVisible by remember { mutableStateOf(false) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixButton(onClick = { alertDialogVisible = true }, variant = KinetixButtonVariant.Destructive) {
            Text("Delete account")
        }
        KinetixAlertDialog(visible = alertDialogVisible, onDismissRequest = { alertDialogVisible = false }) {
            KinetixDialogHeader {
                KinetixDialogTitle(text = "Are you absolutely sure?")
                KinetixDialogDescription(text = "This will permanently delete your account.")
            }
            KinetixDialogFooter {
                KinetixAlertDialogCancel(text = "Cancel", onClick = { alertDialogVisible = false })
                KinetixAlertDialogAction(text = "Continue", onClick = { alertDialogVisible = false })
            }
        }

        KinetixHoverCard(
            visible = hoverCardVisible,
            onDismissRequest = { hoverCardVisible = false },
            anchor = { KinetixButton(onClick = { hoverCardVisible = true }) { Text("@kinetixui") } },
        ) {
            KinetixLabel(text = "KinetixUI")
        }

        KinetixContextMenu(
            content = { KinetixCard { KinetixLabel(text = "Long-press me") } },
            menuContent = {
                KinetixDropdownMenuItem(text = "Copy", onClick = {})
                KinetixDropdownMenuItem(text = "Delete", onClick = {})
            },
        )

        KinetixMenubar {
            KinetixMenubarMenu(
                text = "File",
                visible = fileMenuVisible,
                onDismissRequest = { fileMenuVisible = false },
                onTriggerClick = { fileMenuVisible = true },
                menuContent = {
                    KinetixDropdownMenuItem(text = "New file", onClick = { fileMenuVisible = false })
                    KinetixDropdownMenuItem(text = "Open…", onClick = { fileMenuVisible = false })
                },
            )
        }
    }
}
