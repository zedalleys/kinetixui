package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Compose Preview gallery for Metric / NumberInput / Stepper / Breadcrumb /
 * Pagination — same verification aid as the earlier `ComponentPreviews*.kt`
 * files. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery6LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery6() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery6DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery6() }
}

@Composable
private fun ComponentGallery6() {
    var count by remember { mutableIntStateOf(3) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixMetric(
            label = "Revenue",
            value = "$12,480",
            trend = KinetixMetricTrend.Up,
            change = "12%",
            modifier = Modifier.width(200.dp),
        )

        KinetixNumberInput(value = count, onValueChange = { count = it }, min = 0, max = 10, modifier = Modifier.width(160.dp))

        KinetixStepper(
            steps = listOf(
                KinetixStep(label = "Account", description = "Create your login"),
                KinetixStep(label = "Profile"),
                KinetixStep(label = "Confirm"),
            ),
            current = 1,
        )

        KinetixBreadcrumb {
            KinetixBreadcrumbLink(text = "Home", onClick = {})
            KinetixBreadcrumbSeparator()
            KinetixBreadcrumbLink(text = "Docs", onClick = {})
            KinetixBreadcrumbSeparator()
            KinetixBreadcrumbPage(text = "Components")
        }

        KinetixPagination {
            KinetixPaginationContent {
                KinetixPaginationPrevious(onClick = {})
                KinetixPaginationLink(text = "1", onClick = {}, isActive = true)
                KinetixPaginationLink(text = "2", onClick = {})
                KinetixPaginationLink(text = "3", onClick = {})
                KinetixPaginationNext(onClick = {})
            }
        }
    }
}
