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
 * Compose Preview gallery for Select / Table / Modal / NavigationBar /
 * TabBar — same verification aid as the earlier `ComponentPreviews*.kt`
 * files, with the same `ComponentPreviews7.kt` caveat for the
 * `Dialog`-based `KinetixModal`. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery11LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery11() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery11DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery11() }
}

@Composable
private fun ComponentGallery11() {
    var selectOpen by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<String?>(null) }
    var modalVisible by remember { mutableStateOf(false) }
    var activeTab by remember { mutableStateOf("home") }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixDropdownMenu(
            visible = selectOpen,
            onDismissRequest = { selectOpen = false },
            anchor = {
                KinetixSelectTrigger(
                    text = selected,
                    onClick = { selectOpen = true },
                    placeholder = "Select a fruit",
                    modifier = Modifier.width(200.dp),
                )
            },
        ) {
            listOf("Apple", "Banana", "Cherry").forEach { option ->
                KinetixSelectItem(
                    text = option,
                    selected = option == selected,
                    onClick = { selected = option; selectOpen = false },
                )
            }
        }

        KinetixTable(modifier = Modifier.width(240.dp)) {
            KinetixTableHeader {
                KinetixTableRow {
                    KinetixTableHead(text = "Invoice")
                    KinetixTableHead(text = "Status")
                }
            }
            KinetixTableBody {
                KinetixTableRow {
                    KinetixTableCell(text = "INV-001")
                    KinetixTableCell(text = "Paid")
                }
                KinetixTableRow(showDivider = false) {
                    KinetixTableCell(text = "INV-002")
                    KinetixTableCell(text = "Pending")
                }
            }
        }

        KinetixButton(onClick = { modalVisible = true }) { Text("Delete account") }
        KinetixModal(
            visible = modalVisible,
            onDismissRequest = { modalVisible = false },
            title = "Delete account?",
            description = "This action cannot be undone.",
            type = KinetixModalType.Destructive,
        )

        KinetixNavigationBar(title = "Settings", infoText = "3 updates", onBack = {})

        KinetixTabBar {
            KinetixTabBarItem(
                icon = { Text("⌂") },
                label = "Home",
                active = activeTab == "home",
                onClick = { activeTab = "home" },
            )
            KinetixTabBarItem(
                icon = { Text("✉") },
                label = "Inbox",
                active = activeTab == "inbox",
                onClick = { activeTab = "inbox" },
                badge = "3",
            )
        }
    }
}
