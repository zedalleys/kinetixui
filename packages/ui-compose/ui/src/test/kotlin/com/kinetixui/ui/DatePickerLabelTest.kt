@file:OptIn(ExperimentalMaterial3Api::class)

package com.kinetixui.ui

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * A date field's visible label has to name the field. The React source states the contract: the
 * trigger's accessible name is the label PLUS the shown date, because a name of the label alone
 * would drop the date out of it. Before this, the visible [KinetixLabel] sat beside the trigger
 * associated with nothing and the trigger was announced as a bare date.
 *
 * No assertion here spells a formatted date. `SimpleDateFormat` uses the default time zone, so
 * one millisecond value formats as 2026-03-08 under UTC and 2026-03-07 under UTC-08:00 — an exact
 * string would pass or fail on the runner's zone rather than on the behaviour. The exact name is
 * pinned on the placeholder, which has no zone, and the chosen-date case is pinned on the prefix.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
// kx-verify: accessibility
class DatePickerLabelTest {
    @get:Rule
    val rule = createComposeRule()

    private val millis = 1_772_928_000_000L

    @Test
    fun `with nothing chosen the name is the label and the placeholder, exactly`() {
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixDatePicker(
                    state = rememberDatePickerState(),
                    label = "Due date",
                    placeholder = "Select date",
                )
            }
        }
        rule.onNodeWithContentDescription("Due date, Select date").assertIsDisplayed()
    }

    @Test
    fun `with a date chosen the name still opens with the label`() {
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixDatePicker(
                    state = rememberDatePickerState(initialSelectedDateMillis = millis),
                    label = "Due date",
                    placeholder = "Select date",
                )
            }
        }
        rule.onNodeWithContentDescription("Due date, ", substring = true).assertIsDisplayed()
        // and the date is not all there is: the placeholder is gone, so the name carries a real date
        rule.onNodeWithContentDescription("Due date, Select date").assertDoesNotExist()
    }

    @Test
    fun `the label stays visible as well as naming the trigger`() {
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixDatePicker(
                    state = rememberDatePickerState(),
                    label = "Due date",
                )
            }
        }
        rule.onNodeWithText("Due date").assertIsDisplayed()
    }

    @Test
    fun `a blank label is treated as absent rather than as an empty name`() {
        // The guard is `takeIf { it.isNotBlank() }`: a name of ", Select date" would be worse than
        // the bare text it replaced. The Flutter port carries the same rule, and this is the
        // control that keeps it honest.
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixDatePicker(
                    state = rememberDatePickerState(),
                    label = "   ",
                    placeholder = "Select date",
                )
            }
        }
        rule.onNodeWithContentDescription(", Select date", substring = true).assertDoesNotExist()
        rule.onNodeWithText("Select date").assertIsDisplayed()
    }
}
