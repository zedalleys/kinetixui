package com.kinetixui.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Compose Preview gallery for Inform / Command / Carousel / Resizable /
 * CodeBlock — same verification aid as the earlier `ComponentPreviews*.kt`
 * files, with the same `ComponentPreviews7.kt` caveat for the
 * `Dialog`-based `KinetixCommandDialog`. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery12LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery12() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery12DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery12() }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ComponentGallery12() {
    var commandVisible by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    val pagerState = rememberPagerState(pageCount = { 3 })

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixInform(
            text = "Your plan will renew on March 1st.",
            variant = KinetixInformVariant.Information,
            actionLabel = "Manage plan",
            onAction = {},
            onDismiss = {},
            modifier = Modifier.width(280.dp),
        )

        KinetixButton(onClick = { commandVisible = true }) { Text("Open command palette") }
        KinetixCommandDialog(
            visible = commandVisible,
            onDismissRequest = { commandVisible = false },
            query = query,
            onQueryChange = { query = it },
        ) {
            val items = listOf("Profile", "Billing", "Settings").filter { it.contains(query, ignoreCase = true) }
            if (items.isEmpty()) {
                KinetixCommandEmpty()
            } else {
                KinetixCommandGroup(heading = "Suggestions") {
                    items.forEach { item ->
                        KinetixCommandItem(text = item, onClick = { commandVisible = false })
                    }
                }
            }
        }

        Box(modifier = Modifier.width(240.dp).height(120.dp)) {
            KinetixCarousel(pagerState = pagerState) { page ->
                Box(modifier = Modifier.fillMaxSize().background(KinetixColorScheme.current.muted)) {
                    Text(text = "Slide $page", modifier = Modifier.align(Alignment.Center))
                }
            }
            Row(modifier = Modifier.align(Alignment.BottomCenter)) {
                KinetixCarouselPrevious(pagerState = pagerState)
                KinetixCarouselNext(pagerState = pagerState)
            }
        }

        KinetixResizablePanels(
            modifier = Modifier.width(240.dp).height(120.dp),
            first = {
                Box(modifier = Modifier.fillMaxSize().background(KinetixColorScheme.current.muted)) {
                    Text(text = "Left", modifier = Modifier.align(Alignment.Center))
                }
            },
        ) {
            Box(modifier = Modifier.fillMaxSize().background(KinetixColorScheme.current.accent)) {
                Text(text = "Right", modifier = Modifier.align(Alignment.Center))
            }
        }

        KinetixCodeBlock(
            code = "KinetixButton(onClick = {}) {\n    Text(\"Get started\")\n}",
            filename = "Example.kt",
            modifier = Modifier.width(280.dp),
        )
    }
}
