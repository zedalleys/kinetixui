package com.kinetixui.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.isToggleable
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Interaction tests — the core controls do what their API says when a user acts on them. `assembleDebug` proves
 * they compile; these prove they behave: a press calls back once, a disabled control ignores input, a toggle
 * reports the new value.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class InteractionTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun button_click_invokes_onClick_once() {
        var clicks = 0
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixButton(onClick = { clicks++ }) { Text("Save") } } }
        rule.onNodeWithText("Save").performClick()
        assertEquals(1, clicks)
    }

    @Test
    fun disabled_button_ignores_clicks() {
        var clicks = 0
        rule.setContent {
            KinetixTheme(darkTheme = false) { KinetixButton(onClick = { clicks++ }, enabled = false) { Text("Save") } }
        }
        rule.onNodeWithText("Save").performClick()
        assertEquals(0, clicks)
    }

    @Test
    fun every_button_variant_is_clickable() {
        val clicks = mutableMapOf<String, Int>()
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                Column {
                    for (variant in KinetixButtonVariant.values()) {
                        KinetixButton(onClick = { clicks[variant.name] = (clicks[variant.name] ?: 0) + 1 }, variant = variant) {
                            Text(variant.name)
                        }
                    }
                }
            }
        }
        for (variant in KinetixButtonVariant.values()) {
            rule.onNodeWithText(variant.name).performClick()
            assertEquals("variant ${variant.name}", 1, clicks[variant.name])
        }
    }

    @Test
    fun checkbox_click_invokes_onClick() {
        var clicks = 0
        rule.setContent {
            KinetixTheme(darkTheme = false) { KinetixCheckbox(state = ToggleableState.Off, onClick = { clicks++ }) }
        }
        rule.onNode(isToggleable()).performClick()
        assertEquals(1, clicks)
    }

    @Test
    fun switch_reports_the_opposite_of_its_current_value() {
        var reported: Boolean? = null
        rule.setContent {
            KinetixTheme(darkTheme = false) { KinetixSwitch(checked = false, onCheckedChange = { reported = it }) }
        }
        rule.onNode(isToggleable()).performClick()
        assertEquals(true, reported)
    }

    @Test
    fun disabled_switch_ignores_clicks() {
        var reported: Boolean? = null
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixSwitch(checked = false, onCheckedChange = { reported = it }, enabled = false)
            }
        }
        rule.onNode(isToggleable()).performClick()
        assertEquals(null, reported)
    }

    @Test
    fun toggle_reports_the_opposite_of_its_current_value() {
        var reported: Boolean? = null
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixToggle(pressed = false, onPressedChange = { reported = it }) { Text("B") }
            }
        }
        rule.onNodeWithText("B").performClick()
        assertTrue(reported == true)
    }

    @Test
    fun tab_click_invokes_onClick() {
        var clicks = 0
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                Row { KinetixTabsTrigger(text = "One", selected = false, onClick = { clicks++ }) }
            }
        }
        rule.onNodeWithText("One").performClick()
        assertEquals(1, clicks)
        assertFalse(clicks == 0)
    }
}
