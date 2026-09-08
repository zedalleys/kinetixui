package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Compose Preview for KinetixAppBar — same verification aid as the earlier
 * `ComponentPreviews*.kt` files. Not part of the public API.
 */
@Preview(name = "Light", showBackground = true)
@Composable
private fun ComponentGallery15LightPreview() {
    KinetixTheme(darkTheme = false) { ComponentGallery15() }
}

@Preview(name = "Dark", showBackground = true, backgroundColor = 0xFF000000L)
@Composable
private fun ComponentGallery15DarkPreview() {
    KinetixTheme(darkTheme = true) { ComponentGallery15() }
}

@Composable
private fun ComponentGallery15() {
    var active by remember { mutableStateOf("overview") }
    val colors = KinetixColorScheme.current

    KinetixAppBar(
        brand = {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(colors.primary),
                contentAlignment = Alignment.Center,
            ) { Text("A", color = colors.primaryForeground, fontSize = 11.sp) }
        },
        nav = {
            KinetixAppBarLink("Overview", active = active == "overview", onClick = { active = "overview" })
            KinetixAppBarLink("Reports", active = active == "reports", onClick = { active = "reports" })
            KinetixAppBarLink("Team", active = active == "team", onClick = { active = "team" })
        },
        actions = {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(colors.muted),
                contentAlignment = Alignment.Center,
            ) { Text("KZ", color = colors.foreground, fontSize = 11.sp) }
        },
    )
}
