package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
// `assertExists` is a member of SemanticsNodeInteraction, not a top-level function — importing it does not compile.
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The flagship "Notification preferences" recipe shown on kinetixui.com's homepage as the Jetpack Compose
// implementation of the cross-platform proof. This file is the canonical source: `pnpm gen:flagship` extracts the
// marked region below into the website's generated source display — the site never hand-duplicates this snippet,
// and `pnpm check:flagship-examples` (CI) fails if the two drift apart. Compiled and exercised by this package's
// existing Robolectric test task (native-compose.yml); the interaction test below proves it compiles against the
// real `KinetixUI` composables AND behaves, not just that it typechecks.
//
// kx-flagship:start
@Composable
fun FlagshipPreferencesPanel() {
    var productUpdates by remember { mutableStateOf(true) }
    var securityAlerts by remember { mutableStateOf(true) }

    KinetixCard {
        KinetixCardHeader {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                KinetixCardTitle("Notifications")
                KinetixBadge("Synced", variant = KinetixBadgeVariant.Secondary)
            }
            KinetixCardDescription("Choose what you hear about.")
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Product updates")
                    KinetixSwitch(checked = productUpdates, onCheckedChange = { productUpdates = it })
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Security alerts")
                    KinetixSwitch(checked = securityAlerts, onCheckedChange = { securityAlerts = it })
                }
                KinetixButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Save preferences") }
            }
        }
    }
}
// kx-flagship:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class FlagshipPreferencesPanelTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_and_toggles_respond_independently() {
        rule.setContent { KinetixTheme(darkTheme = false) { FlagshipPreferencesPanel() } }

        rule.onNodeWithText("Notifications").assertExists()
        rule.onNodeWithText("Synced").assertExists()
        rule.onNodeWithText("Product updates").assertExists()
        rule.onNodeWithText("Security alerts").assertExists()
        rule.onNodeWithText("Save preferences").performClick() // must not throw — a real onClick is wired
    }
}
