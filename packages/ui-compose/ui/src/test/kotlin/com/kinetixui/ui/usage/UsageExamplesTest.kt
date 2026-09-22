package com.kinetixui.ui.usage

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixBadge
import com.kinetixui.ui.KinetixBadgeVariant
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixSwitch
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The Jetpack Compose usage snippets shown on kinetixui.com's component pages.
//
// Each kx-usage:<demo-key> region is extracted by `pnpm gen:usage` into the website's generated module, and
// `pnpm check:platform-code` fails if what the site shows drifts from what is here. Gradle compiles this file,
// so a snippet cannot name an API that does not exist — which had happened: the Chart page advertised a
// Compose KinetixChart with no source file behind it.
@Composable
fun UsageExamples(save: () -> Unit = {}) {
    var airplane by remember { mutableStateOf(true) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // kx-usage:button-demo
        KinetixButton(onClick = save) {
            Text("Button")
        }
        // kx-usage:end

        // kx-usage:badge-demo
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixBadge("Default")
            KinetixBadge("Secondary", variant = KinetixBadgeVariant.Secondary)
        }
        // kx-usage:end

        // kx-usage:switch-demo
        Row(verticalAlignment = Alignment.CenterVertically) {
            KinetixSwitch(checked = airplane, onCheckedChange = { airplane = it })
            Text("  Airplane mode")
        }
        // kx-usage:end
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class UsageExamplesTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun every_usage_snippet_composes() {
        rule.setContent { KinetixTheme(darkTheme = false) { UsageExamples() } }
        rule.onNodeWithText("Button").assertExists()
        rule.onNodeWithText("Default").assertExists()
        rule.onNodeWithText("Airplane mode", substring = true).assertExists()
    }
}
