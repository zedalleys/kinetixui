package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardDescription
import com.kinetixui.ui.KinetixCardFooter
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixCheckbox
import com.kinetixui.ui.KinetixField
import com.kinetixui.ui.KinetixFieldDescription
import com.kinetixui.ui.KinetixFieldLabel
import com.kinetixui.ui.KinetixInput
import com.kinetixui.ui.KinetixPasswordInput
import com.kinetixui.ui.KinetixProgress
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Create account" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// Four independent rules rather than one length check, so the meter rewards variety instead of rewarding a
// long common word. Because the rules are data, the hint names what is still missing.
//
// kx-block:start
private val RULES: List<Pair<String, (String) -> Boolean>> = listOf(
    "12 characters" to { p: String -> p.length >= 12 },
    "an upper and a lower case letter" to { p: String -> p.any { it.isLowerCase() } && p.any { it.isUpperCase() } },
    "a number" to { p: String -> p.any { it.isDigit() } },
    "a symbol" to { p: String -> p.any { !it.isLetterOrDigit() } },
)
private val STRENGTH = listOf("Too weak", "Weak", "Fair", "Good", "Strong")

@Composable
fun CreateAccountBlock() {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var accepted by remember { mutableStateOf(false) }

    val missing = RULES.filterNot { it.second(password) }.map { it.first }
    val met = RULES.size - missing.size

    KinetixCard(Modifier.width(360.dp)) {
        KinetixCardHeader {
            KinetixCardTitle("Create your account")
            KinetixCardDescription("Free for 14 days. No card required.")
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                KinetixField {
                    KinetixFieldLabel("Email")
                    KinetixInput(email, { email = it }, placeholder = "you@example.com")
                }
                KinetixField {
                    KinetixFieldLabel("Password")
                    KinetixPasswordInput(password, { password = it })
                    // The meter announces the WORD, not the percentage: "Fair" is actionable, "50" is not.
                    KinetixProgress(
                        value = met.toFloat() / RULES.size * 100f,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(4.dp)
                            .clearAndSetSemantics { contentDescription = "Password strength: ${STRENGTH[met]}" },
                    )
                    KinetixFieldDescription(
                        if (missing.isEmpty()) "Strong password." else "Still needs ${missing.joinToString(", ")}.",
                    )
                }
                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KinetixCheckbox(
                        state = if (accepted) ToggleableState.On else ToggleableState.Off,
                        onClick = { accepted = !accepted },
                    )
                    Text("I agree to the terms of service and the privacy policy.")
                }
            }
        }
        KinetixCardFooter {
            KinetixButton(
                onClick = {},
                modifier = Modifier.fillMaxWidth(),
                enabled = accepted && missing.isEmpty(),
            ) { Text("Create account") }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CreateAccountBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun names_the_rules_that_are_not_met_yet() {
        rule.setContent { KinetixTheme(darkTheme = false) { CreateAccountBlock() } }
        rule.onNodeWithText("Create your account").assertExists()
        // An empty password fails every rule, so the hint lists them rather than saying "weak".
        rule.onNodeWithText("Still needs 12 characters, an upper and a lower case letter, a number, a symbol.").assertExists()
    }
}
