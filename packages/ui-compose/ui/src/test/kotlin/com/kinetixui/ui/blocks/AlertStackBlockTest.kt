package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixAlert
import com.kinetixui.ui.KinetixAlertDescription
import com.kinetixui.ui.KinetixAlertTitle
import com.kinetixui.ui.KinetixAlertVariant
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Alert stack" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// kx-block:start
@Composable
fun AlertStackBlock() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        KinetixAlert {
            KinetixAlertTitle("Heads up")
            KinetixAlertDescription("You can add components to your app using the CLI.")
        }
        KinetixAlert(variant = KinetixAlertVariant.Destructive) {
            KinetixAlertTitle("Payment failed")
            KinetixAlertDescription("Update your billing details to keep your subscription active.")
        }
        KinetixAlert(variant = KinetixAlertVariant.Success) {
            KinetixAlertTitle("Changes saved")
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AlertStackBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_every_variant_with_its_own_copy() {
        rule.setContent { KinetixTheme(darkTheme = false) { AlertStackBlock() } }
        rule.onNodeWithText("Heads up").assertExists()
        rule.onNodeWithText("Payment failed").assertExists()
        rule.onNodeWithText("Changes saved").assertExists()
    }
}
