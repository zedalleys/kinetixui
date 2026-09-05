package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/**
 * Compose Preview gallery for AudioPlayer / Footer / TableOfContents /
 * Sidebar — same verification aid as the earlier `ComponentPreviews*.kt`
 * files. `KinetixSidebar`'s drawer only renders on interaction (open the
 * gallery in a running app), same caveat as the overlay galleries. Not
 * part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery14LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery14() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery14DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery14() }
}

@Composable
private fun ComponentGallery14() {
    var playing by remember { mutableStateOf(false) }
    var section by remember { mutableStateOf("intro") }
    var navItem by remember { mutableIntStateOf(0) }
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    KinetixSidebar(
        drawerState = drawerState,
        content = {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                KinetixButton(onClick = { scope.launch { drawerState.open() } }) { Text("Open sidebar") }

                KinetixAudioPlayer(
                    isPlaying = playing,
                    positionMs = 42_000,
                    durationMs = 210_000,
                    onPlayPause = { playing = !playing },
                    onSeek = {},
                    title = "Nightcall",
                    artist = "Kavinsky",
                    modifier = Modifier.width(320.dp),
                )
                KinetixAudioPlayer(
                    isPlaying = playing,
                    positionMs = 42_000,
                    durationMs = 210_000,
                    onPlayPause = { playing = !playing },
                    onSeek = {},
                    variant = KinetixAudioPlayerVariant.Mini,
                    title = "Nightcall",
                    artist = "Kavinsky",
                    modifier = Modifier.width(320.dp),
                )

                KinetixTableOfContents(
                    items = listOf(
                        KinetixTocItem("intro", "Introduction"),
                        KinetixTocItem("setup", "Setup", level = 2),
                        KinetixTocItem("usage", "Usage"),
                    ),
                    activeId = section,
                    onItemClick = { section = it },
                )

                KinetixFooter(modifier = Modifier.width(320.dp)) {
                    KinetixFooterColumn(title = "Product") {
                        KinetixFooterLink(text = "Docs", onClick = {})
                        KinetixFooterLink(text = "Changelog", onClick = {})
                    }
                    KinetixFooterBottom {
                        Text("© 2026 KinetixUI")
                        Text("MIT")
                    }
                }
            }
        },
    ) {
        KinetixSidebarGroup(title = "Navigation") {
            KinetixSidebarMenuItem(label = "Home", selected = navItem == 0, onClick = { navItem = 0 })
            KinetixSidebarMenuItem(label = "Inbox", selected = navItem == 1, onClick = { navItem = 1 }, badge = "3")
        }
    }
}
