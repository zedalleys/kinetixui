package com.kinetixui.ui

import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTextReplacement
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.isToggleable
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Accessibility semantics — what TalkBack is told about the core controls: a role, an on / off / selected
 * state, and whether the control is enabled. A bare `clickable` exposes none of the role or state.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
// kx-verify: accessibility
class SemanticsTest {
    @get:Rule
    val rule = createComposeRule()

    private fun hasRole(role: Role) = SemanticsMatcher.expectValue(SemanticsProperties.Role, role)

    @Test
    fun input_label_stays_on_the_editable_node_after_typing() {
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                val value = remember { mutableStateOf("") }
                KinetixInput(value = value.value, onValueChange = { value.value = it }, accessibleLabel = "Email")
            }
        }
        val input = rule.onNode(hasSetTextAction() and hasContentDescription("Email"))
        input.assertIsEnabled().performTextInput("ada@example.com")
        input.assertTextEquals("ada@example.com")
    }

    // Inside a KinetixField, the error message reaches the editable node itself (the Compose equivalent of
    // aria-describedby for errors), so TalkBack reads it on the input, not only as loose text below it.
    private fun emailField(value: MutableState<String>, submitted: MutableState<Boolean>) {
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                val error = if (submitted.value && "@" !in value.value) "Enter an email address." else null
                KinetixField(invalid = error != null) {
                    KinetixFieldLabel(text = "Email", modifier = Modifier.clearAndSetSemantics { })
                    KinetixInput(value = value.value, onValueChange = { value.value = it }, isError = error != null, accessibleLabel = "Email")
                    KinetixFieldDescription(text = "We only use it to sign you in.")
                    error?.let { KinetixFieldMessage(text = it) }
                }
            }
        }
    }

    private val editableEmail = hasSetTextAction() and hasContentDescription("Email")

    @Test
    fun field_error_is_exposed_on_the_editable_node_and_cleared_when_corrected() {
        val value = mutableStateOf("ada")
        val submitted = mutableStateOf(false)
        emailField(value, submitted)
        rule.onNode(editableEmail).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Error))

        submitted.value = true
        rule.onNode(editableEmail).assert(SemanticsMatcher.expectValue(SemanticsProperties.Error, "Enter an email address."))

        // Correcting the value through the editable node itself clears the error, and the label survives.
        rule.onNode(editableEmail).performTextReplacement("ada@example.com")
        rule.onNode(editableEmail)
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Error))
            .assertTextEquals("ada@example.com")
        rule.onNodeWithText("Enter an email address.").assertDoesNotExist()
    }

    @Test
    fun button_is_announced_as_an_enabled_button_with_a_click_action() {
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixButton(onClick = {}) { Text("Save") } } }
        rule.onNodeWithText("Save").assert(hasRole(Role.Button)).assertHasClickAction().assertIsEnabled()
    }

    @Test
    fun disabled_button_is_announced_as_disabled() {
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixButton(onClick = {}, enabled = false) { Text("Save") } } }
        rule.onNodeWithText("Save").assertIsNotEnabled()
    }

    @Test
    fun checkbox_is_a_checkbox_that_announces_its_state() {
        rule.setContent {
            KinetixTheme(darkTheme = false) { KinetixCheckbox(state = ToggleableState.On, onClick = {}) }
        }
        rule.onNode(isToggleable()).assert(hasRole(Role.Checkbox)).assertIsOn()
    }

    @Test
    fun unchecked_checkbox_is_announced_as_off() {
        rule.setContent {
            KinetixTheme(darkTheme = false) { KinetixCheckbox(state = ToggleableState.Off, onClick = {}) }
        }
        rule.onNode(isToggleable()).assertIsOff()
    }

    @Test
    fun indeterminate_checkbox_is_announced_as_mixed() {
        rule.setContent {
            KinetixTheme(darkTheme = false) { KinetixCheckbox(state = ToggleableState.Indeterminate, onClick = {}) }
        }
        rule.onNode(isToggleable()).assert(
            SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Indeterminate),
        )
    }

    @Test
    fun switch_is_a_switch_that_announces_on_and_off() {
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixSwitch(checked = true, onCheckedChange = {}) } }
        rule.onNode(isToggleable()).assert(hasRole(Role.Switch)).assertIsOn()
    }

    @Test
    fun tab_is_announced_as_a_tab_with_its_selected_state() {
        rule.setContent {
            KinetixTheme(darkTheme = false) { KinetixTabsTrigger(text = "One", selected = true, onClick = {}) }
        }
        rule.onNodeWithText("One").assert(hasRole(Role.Tab)).assertIsSelected()
    }
}
