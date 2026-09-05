package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.SnackbarHostState
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
 * Compose Preview gallery for Tabs / Accordion / ToggleGroup / ScrollArea
 * / Sonner — same verification aid as the earlier `ComponentPreviews*.kt`
 * files. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery10LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery10() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery10DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery10() }
}

@Composable
private fun ComponentGallery10() {
    var tab by remember { mutableIntStateOf(0) }
    var accordionOpen by remember { mutableStateOf(true) }
    var boldPressed by remember { mutableStateOf(false) }
    var italicPressed by remember { mutableStateOf(true) }
    val toastHostState = remember { SnackbarHostState() }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixTabsList {
            KinetixTabsTrigger(text = "Account", selected = tab == 0, onClick = { tab = 0 })
            KinetixTabsTrigger(text = "Password", selected = tab == 1, onClick = { tab = 1 })
        }
        KinetixTabsContent {
            KinetixLabel(text = if (tab == 0) "Account settings" else "Password settings")
        }

        KinetixAccordion(modifier = Modifier.width(240.dp)) {
            KinetixAccordionItem {
                KinetixAccordionTrigger(text = "Is it accessible?", expanded = accordionOpen, onClick = { accordionOpen = !accordionOpen })
                KinetixAccordionContent(expanded = accordionOpen) {
                    KinetixLabel(text = "Yes, it adheres to the WAI-ARIA design pattern.")
                }
            }
        }

        KinetixToggleGroup {
            KinetixToggleGroupItem(pressed = boldPressed, onPressedChange = { boldPressed = it }) { Text("B") }
            KinetixToggleGroupItem(pressed = italicPressed, onPressedChange = { italicPressed = it }) { Text("I") }
        }

        KinetixScrollArea(modifier = Modifier.width(200.dp).height(80.dp)) {
            Column {
                repeat(10) { i -> KinetixLabel(text = "Row $i") }
            }
        }

        KinetixToaster(hostState = toastHostState)
    }
}
