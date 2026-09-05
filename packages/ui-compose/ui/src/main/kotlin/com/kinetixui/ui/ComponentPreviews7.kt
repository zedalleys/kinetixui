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
 * Compose Preview gallery for Dialog / Popover / Tooltip / DropdownMenu /
 * Sheet — same verification aid as the earlier `ComponentPreviews*.kt`
 * files, with one caveat worth flagging: `Dialog`/`Popup`-based overlays
 * (everything in this file) don't reliably render their overlay content
 * inside Android Studio's static `@Preview` renderer the way inline
 * composables do — a known, long-standing Compose Preview limitation, not
 * a bug in this package. This gallery still verifies the trigger buttons
 * and toggle wiring compile and lay out correctly; real visual
 * verification of the overlay content itself routes through a running app
 * (or the emulator's Interactive Preview mode), same as every
 * interaction-driven component in this package already relies on the
 * user's own Android Studio for. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery7LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery7() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery7DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery7() }
}

@Composable
private fun ComponentGallery7() {
    var dialogVisible by remember { mutableStateOf(false) }
    var popoverVisible by remember { mutableStateOf(false) }
    var menuVisible by remember { mutableStateOf(false) }
    var sheetVisible by remember { mutableStateOf(false) }
    var menuChecked by remember { mutableStateOf(true) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixButton(onClick = { dialogVisible = true }) { Text("Open dialog") }
        KinetixDialog(visible = dialogVisible, onDismissRequest = { dialogVisible = false }) {
            KinetixDialogHeader {
                KinetixDialogTitle(text = "Delete item?")
                KinetixDialogDescription(text = "This action cannot be undone.")
            }
            KinetixDialogFooter {
                KinetixButton(onClick = { dialogVisible = false }, variant = KinetixButtonVariant.Ghost) { Text("Cancel") }
                KinetixButton(onClick = { dialogVisible = false }, variant = KinetixButtonVariant.Destructive) { Text("Delete") }
            }
        }

        KinetixPopover(
            visible = popoverVisible,
            onDismissRequest = { popoverVisible = false },
            anchor = { KinetixButton(onClick = { popoverVisible = true }) { Text("Open popover") } },
        ) {
            KinetixLabel(text = "Settings")
        }

        KinetixTooltip(text = "Saved to your library") {
            KinetixButton(onClick = {}) { Text("Hover me") }
        }

        KinetixDropdownMenu(
            visible = menuVisible,
            onDismissRequest = { menuVisible = false },
            anchor = { KinetixButton(onClick = { menuVisible = true }) { Text("Open menu") } },
        ) {
            KinetixDropdownMenuLabel(text = "My Account")
            KinetixDropdownMenuSeparator()
            KinetixDropdownMenuItem(text = "Profile", onClick = { menuVisible = false })
            KinetixDropdownMenuCheckboxItem(
                text = "Show archived",
                checked = menuChecked,
                onCheckedChange = { menuChecked = it },
            )
        }

        KinetixButton(onClick = { sheetVisible = true }) { Text("Open sheet") }
        KinetixSheet(visible = sheetVisible, onDismissRequest = { sheetVisible = false }) {
            KinetixSheetHeader {
                KinetixSheetTitle(text = "Edit profile")
                KinetixSheetDescription(text = "Make changes to your profile here.")
            }
        }
    }
}
