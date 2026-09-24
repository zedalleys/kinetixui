package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixAvatar
import com.kinetixui.ui.KinetixAvatarFallback
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonSize
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardDescription
import com.kinetixui.ui.KinetixCardFooter
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixField
import com.kinetixui.ui.KinetixFieldDescription
import com.kinetixui.ui.KinetixFieldLabel
import com.kinetixui.ui.KinetixInput
import com.kinetixui.ui.KinetixRadioButton
import com.kinetixui.ui.KinetixSeparator
import com.kinetixui.ui.KinetixTextarea
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Profile form" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// A radio group rather than a picker: three mutually exclusive choices whose consequences differ should be
// readable at once, not hidden behind a menu.
//
// kx-block:start
private data class VisibilityOption(val id: String, val label: String, val hint: String)

private val VISIBILITY = listOf(
    VisibilityOption("everyone", "Everyone", "Anyone with the link can see your profile."),
    VisibilityOption("team", "Only my team", "People in your workspace."),
    VisibilityOption("nobody", "Nobody", "Your profile stays hidden."),
)

@Composable
fun ProfileFormBlock() {
    var name by remember { mutableStateOf("Ziad Fteha") }
    var bio by remember { mutableStateOf("Building a five-platform design system.") }
    var visibility by remember { mutableStateOf("team") }

    KinetixCard(Modifier.width(400.dp)) {
        KinetixCardHeader {
            KinetixCardTitle("Profile")
            KinetixCardDescription("This is how you appear to other people.")
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    KinetixAvatar { KinetixAvatarFallback("ZF") }
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        KinetixButton(
                            onClick = {},
                            variant = KinetixButtonVariant.Outline,
                            size = KinetixButtonSize.Sm,
                        ) { Text("Change photo") }
                        Text("JPG or PNG, up to 2 MB.")
                    }
                }

                KinetixField {
                    KinetixFieldLabel("Display name")
                    KinetixInput(name, { name = it })
                }

                KinetixField {
                    KinetixFieldLabel("Bio")
                    KinetixTextarea(bio, { bio = it })
                    KinetixFieldDescription("Shown under your name. Plain text.")
                }

                KinetixSeparator()

                Column(Modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Who can see your profile")
                    VISIBILITY.forEach { option ->
                        // selectable() on the ROW, onClick = null on the button: one target, one announcement.
                        // Two tap targets for one choice is the usual way a radio list becomes unusable.
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .selectable(
                                    selected = visibility == option.id,
                                    role = Role.RadioButton,
                                    onClick = { visibility = option.id },
                                ),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            KinetixRadioButton(selected = visibility == option.id, onClick = null)
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(option.label)
                                Text(option.hint)
                            }
                        }
                    }
                }
            }
        }
        KinetixCardFooter(Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
            ) {
                KinetixButton(onClick = {}, variant = KinetixButtonVariant.Ghost) { Text("Cancel") }
                KinetixButton(onClick = {}) { Text("Save changes") }
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ProfileFormBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun the_whole_row_selects_the_option_and_the_state_is_announced() {
        rule.setContent { KinetixTheme(darkTheme = false) { ProfileFormBlock() } }
        rule.onNodeWithText("Only my team").assertIsSelected()

        // Driving the semantics action rather than tapping a coordinate: the third row sits below
        // Robolectric's fixed window, and a clipped tap lands somewhere else. It also states the claim more
        // directly — the node that OWNS the click action is the row, found by its hint text, not the dot.
        rule.onNodeWithText("Your profile stays hidden.").performSemanticsAction(SemanticsActions.OnClick)
        rule.onNodeWithText("Nobody").assertIsSelected()
    }
}
