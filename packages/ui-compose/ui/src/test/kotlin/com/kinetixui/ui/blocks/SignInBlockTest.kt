package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardDescription
import com.kinetixui.ui.KinetixCardFooter
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixCheckbox
import com.kinetixui.ui.KinetixInput
import com.kinetixui.ui.KinetixLabel
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Sign in" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// kx-block:start
@Composable
fun SignInBlock(onSignIn: () -> Unit = {}, onGithub: () -> Unit = {}) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var rememberMe by remember { mutableStateOf(true) }

    KinetixCard(Modifier.width(360.dp)) {
        KinetixCardHeader {
            KinetixCardTitle("Sign in")
            KinetixCardDescription("Enter your email to sign in to your account.")
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                KinetixLabel("Email")
                KinetixInput(email, { email = it }, placeholder = "you@example.com", keyboardType = KeyboardType.Email)
                KinetixLabel("Password")
                KinetixInput(password, { password = it }, visualTransformation = PasswordVisualTransformation())
                Row(verticalAlignment = Alignment.CenterVertically) {
                    KinetixCheckbox(rememberMe, { rememberMe = it })
                    Spacer(Modifier.width(8.dp))
                    Text("Remember me")
                }
            }
        }
        KinetixCardFooter {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                KinetixButton(onSignIn, Modifier.fillMaxWidth()) { Text("Sign in") }
                KinetixButton(onGithub, Modifier.fillMaxWidth(), variant = KinetixButtonVariant.Outline) {
                    Text("Continue with GitHub")
                }
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SignInBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_the_whole_form() {
        rule.setContent { KinetixTheme(darkTheme = false) { SignInBlock() } }

        rule.onNodeWithText("Enter your email to sign in to your account.").assertExists()
        rule.onNodeWithText("Email").assertExists()
        rule.onNodeWithText("Remember me").assertExists()
        rule.onNodeWithText("Continue with GitHub").assertExists()
        // "Sign in" is deliberately not asserted: it is both the card title and the submit button, so a
        // single-node matcher would be ambiguous and an index-based one would be testing layout order
    }
}
