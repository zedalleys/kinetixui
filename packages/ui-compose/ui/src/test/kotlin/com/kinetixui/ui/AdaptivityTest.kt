package com.kinetixui.ui

import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.test.getBoundsInRoot
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.height
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Adaptivity — the components hold up under right-to-left layout and large system text, the two settings
 * that most often break a hand-built component. Compile checks only ever saw left-to-right at 1x text.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AdaptivityTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun tabs_mirror_under_rtl() {
        rule.setContent {
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                KinetixTheme(darkTheme = false) {
                    Row {
                        KinetixTabsTrigger(text = "One", selected = true, onClick = {})
                        KinetixTabsTrigger(text = "Two", selected = false, onClick = {})
                    }
                }
            }
        }
        val one = rule.onNodeWithText("One").getBoundsInRoot()
        val two = rule.onNodeWithText("Two").getBoundsInRoot()
        assertTrue("under RTL the first tab sits to the right of the second", one.left > two.left)
    }

    @Test
    fun tabs_keep_reading_order_under_ltr() {
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                Row {
                    KinetixTabsTrigger(text = "One", selected = true, onClick = {})
                    KinetixTabsTrigger(text = "Two", selected = false, onClick = {})
                }
            }
        }
        val one = rule.onNodeWithText("One").getBoundsInRoot()
        val two = rule.onNodeWithText("Two").getBoundsInRoot()
        assertTrue(one.left < two.left)
    }
}
