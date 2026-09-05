@file:OptIn(ExperimentalMaterial3Api::class)

package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Compose Preview gallery for Calendar / DatePicker / DataTable /
 * FileUpload / Drawer — same verification aid as the earlier
 * `ComponentPreviews*.kt` files, with the same `ComponentPreviews7.kt`
 * caveat for the popover/sheet-backed `KinetixDatePicker` and
 * `KinetixDrawer`. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery13LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery13() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery13DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery13() }
}

private data class Person(val name: String, val role: String, val age: Int)

@Composable
private fun ComponentGallery13() {
    val calendarState = rememberDatePickerState()
    val datePickerState = rememberDatePickerState()
    var drawerVisible by remember { mutableStateOf(false) }

    val people = listOf(
        Person("Ada Lovelace", "Owner", 36),
        Person("Grace Hopper", "Admin", 45),
        Person("Alan Turing", "Member", 41),
    )
    val columns = listOf(
        KinetixColumn<Person>(header = "Name", cell = { it.name }, sortKey = { it.name }, weight = 2f),
        KinetixColumn<Person>(header = "Role", cell = { it.role }),
        KinetixColumn<Person>(header = "Age", cell = { it.age.toString() }, sortKey = { it.age }),
    )

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixCalendar(state = calendarState)

        KinetixDatePicker(
            state = datePickerState,
            label = "Start date",
            helperText = "Pick any day",
            modifier = Modifier.width(280.dp),
        )

        KinetixDataTable(columns = columns, data = people, pageSize = 2, modifier = Modifier.width(300.dp))

        KinetixFileUpload(
            onBrowse = {},
            multiple = true,
            helperText = "PNG or JPG, up to 5 MB",
            modifier = Modifier.width(300.dp),
            files = listOf(
                KinetixUploadFile(id = "1", name = "hero.png", size = 1_480_000, status = KinetixUploadStatus.Uploaded),
                KinetixUploadFile(id = "2", name = "clip.mov", size = 42_000_000, status = KinetixUploadStatus.Loading, progress = 63f),
                KinetixUploadFile(id = "3", name = "bad.zip", status = KinetixUploadStatus.Error, error = "Unsupported type"),
            ),
            onRemove = {},
            onRetry = {},
        )

        KinetixButton(onClick = { drawerVisible = true }) { Text("Open drawer") }
        KinetixDrawer(visible = drawerVisible, onDismissRequest = { drawerVisible = false }) {
            KinetixDrawerHeader {
                KinetixDrawerTitle(text = "Filters")
                KinetixDrawerDescription(text = "Narrow the results.")
            }
        }
    }
}
