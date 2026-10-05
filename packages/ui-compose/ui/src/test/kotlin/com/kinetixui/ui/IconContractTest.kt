package com.kinetixui.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * The icon contract (/docs/icons) on Compose: a component-owned icon-only control is a named button, its
 * icon is decorative (no Unicode character for TalkBack to read aloud), and where the component offers a
 * slot, the application's composable replaces the default and is laid out in the slot's box.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class IconContractTest {
    @get:Rule
    val rule = createComposeRule()

    private fun hasRole(role: Role) = SemanticsMatcher.expectValue(SemanticsProperties.Role, role)

    @Test
    fun banner_dismiss_is_a_named_button_with_no_glyph_to_read() {
        var dismissed = 0
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixBanner("Saved", onDismiss = { dismissed++ }) } }
        rule.onNodeWithContentDescription("Dismiss").assert(hasRole(Role.Button)).assertHasClickAction().performClick()
        assertEquals(1, dismissed)
        rule.onNodeWithText("×").assertDoesNotExist()
    }

    @Test
    fun banner_dismiss_icon_takes_any_composable_in_a_14dp_box() {
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixBanner("Saved", onDismiss = {}, dismissIcon = { Box(Modifier.testTag("company-close")) })
            }
        }
        rule.onNodeWithTag("company-close", useUnmergedTree = true).assertWidthIsEqualTo(14.dp).assertHeightIsEqualTo(14.dp)
        rule.onNodeWithContentDescription("Dismiss").assert(hasRole(Role.Button))
    }

    @Test
    fun inform_dismiss_icon_takes_any_composable_and_keeps_the_name() {
        var dismissed = 0
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixInform("Saved", onDismiss = { dismissed++ }, dismissIcon = { Box(Modifier.testTag("company-close")) })
            }
        }
        rule.onNodeWithTag("company-close", useUnmergedTree = true).assertWidthIsEqualTo(14.dp)
        rule.onNodeWithContentDescription("Dismiss").assert(hasRole(Role.Button)).performClick()
        assertEquals(1, dismissed)
    }

    @Test
    fun dialog_close_is_a_named_button() {
        rule.setContent {
            KinetixTheme(darkTheme = false) { KinetixDialog(visible = true, onDismissRequest = {}) { Text("Body") } }
        }
        rule.onNodeWithContentDescription("Close").assert(hasRole(Role.Button)).assertHasClickAction()
        rule.onNodeWithText("×").assertDoesNotExist()
    }

    @Test
    fun navigation_back_is_a_named_button() {
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixNavigationBar(title = "Settings", onBack = {}) } }
        rule.onNodeWithContentDescription("Back").assert(hasRole(Role.Button)).assertHasClickAction()
        rule.onNodeWithText("‹").assertDoesNotExist()
    }

    @Test
    fun notification_trigger_is_named_with_its_unread_count() {
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixNotificationCenterTrigger(onClick = {}, unreadCount = 3) } }
        rule.onNodeWithContentDescription("Notifications, 3 unread").assertExists()
        rule.onNodeWithText("🔔").assertDoesNotExist()
    }

    @Test
    fun audio_transport_controls_are_named_and_a_missing_track_is_disabled() {
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixAudioPlayer(isPlaying = false, positionMs = 0, durationMs = 60_000, onPlayPause = {}, onSeek = {})
            }
        }
        rule.onNodeWithContentDescription("Play").assert(hasRole(Role.Button))
        rule.onNodeWithContentDescription("Back 10s").assert(hasRole(Role.Button))
        rule.onNodeWithContentDescription("Forward 10s").assert(hasRole(Role.Button))
        rule.onNodeWithContentDescription("Previous track").assertIsNotEnabled()
        rule.onNodeWithText("⏪").assertDoesNotExist()
    }

    @Test
    fun accordion_chevron_is_decorative() {
        rule.setContent {
            KinetixTheme(darkTheme = false) { KinetixAccordionTrigger(text = "Details", expanded = false, onClick = {}) }
        }
        rule.onNodeWithText("Details").assertExists()
        rule.onNodeWithText("▾").assertDoesNotExist()
    }

    @Test
    fun only_directional_defaults_mirror_in_rtl() {
        assertTrue(KinetixIcons.ChevronStart.autoMirror)
        assertTrue(KinetixIcons.ChevronEnd.autoMirror)
        assertFalse(KinetixIcons.ExpandMore.autoMirror)
        assertFalse(KinetixIcons.Close.autoMirror)
        // Transport controls name a time direction, not a reading direction.
        assertFalse(KinetixIcons.SkipNext.autoMirror)
        assertFalse(KinetixIcons.FastForward.autoMirror)
    }
}
