package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixList
import com.kinetixui.ui.KinetixListItem
import com.kinetixui.ui.KinetixSeparator
import com.kinetixui.ui.KinetixSwitch
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Settings list" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// kx-block:start
@Composable
fun SettingsListBlock() {
    var email by remember { mutableStateOf(true) }
    var push by remember { mutableStateOf(true) }
    var sms by remember { mutableStateOf(false) }

    KinetixCard(Modifier.width(360.dp)) {
        KinetixCardHeader { KinetixCardTitle("Notifications") }
        KinetixSeparator()
        KinetixList {
            KinetixListItem(
                title = "Email",
                description = "Product news and receipts",
                trailing = { KinetixSwitch(email, { email = it }) },
            )
            KinetixListItem(
                title = "Push",
                description = "Activity on your projects",
                trailing = { KinetixSwitch(push, { push = it }) },
            )
            KinetixListItem(
                title = "SMS",
                description = "Only critical alerts",
                trailing = { KinetixSwitch(sms, { sms = it }) },
            )
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SettingsListBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_every_row_with_its_description() {
        rule.setContent { KinetixTheme(darkTheme = false) { SettingsListBlock() } }
        rule.onNodeWithText("Notifications").assertExists()
        rule.onNodeWithText("Email").assertExists()
        rule.onNodeWithText("Only critical alerts").assertExists()
    }
}
