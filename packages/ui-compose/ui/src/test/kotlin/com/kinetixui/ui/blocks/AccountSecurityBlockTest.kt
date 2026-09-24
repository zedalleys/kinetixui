package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixBadge
import com.kinetixui.ui.KinetixBadgeVariant
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonSize
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardDescription
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

// The "Account security" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// Each row states its consequence, not just its name. "Revoke" keeps a short visible word but announces
// which session it ends — two identical Revoke buttons are otherwise indistinguishable to TalkBack.
//
// kx-block:start
private data class SecuritySession(val id: String, val device: String, val detail: String, val isCurrent: Boolean)

private val SESSIONS = listOf(
    SecuritySession("mbp", "MacBook Pro", "Chrome · Berlin · now", isCurrent = true),
    SecuritySession("iphone", "iPhone 15", "Safari · Berlin · 2 hours ago", isCurrent = false),
)

@Composable
fun AccountSecurityBlock() {
    var twoFactor by remember { mutableStateOf(true) }

    KinetixCard(Modifier.width(400.dp)) {
        KinetixCardHeader {
            KinetixCardTitle("Security")
            KinetixCardDescription("Keep your account safe.")
        }
        KinetixSeparator()
        KinetixList {
            KinetixListItem(
                title = "Two-factor authentication",
                description = "Required for every new sign-in.",
                trailing = { KinetixSwitch(twoFactor, { twoFactor = it }) },
            )
            KinetixListItem(
                title = "Recovery codes",
                description = "Single-use codes for when you lose your phone.",
                trailing = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        KinetixBadge("8 unused", variant = KinetixBadgeVariant.Secondary)
                        KinetixButton(
                            onClick = {},
                            variant = KinetixButtonVariant.Outline,
                            size = KinetixButtonSize.Sm,
                        ) { Text("Regenerate") }
                    }
                },
            )
        }
        KinetixSeparator()
        Column {
            Text("Active sessions", modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp))
            KinetixList {
                SESSIONS.forEach { session ->
                    KinetixListItem(
                        title = session.device,
                        description = session.detail,
                        trailing = {
                            if (session.isCurrent) {
                                KinetixBadge("This device")
                            } else {
                                KinetixButton(
                                    onClick = {},
                                    modifier = Modifier.semantics {
                                        contentDescription = "Revoke ${session.device}"
                                    },
                                    variant = KinetixButtonVariant.Ghost,
                                    size = KinetixButtonSize.Sm,
                                ) { Text("Revoke") }
                            }
                        },
                    )
                }
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AccountSecurityBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun the_revoke_action_says_which_session_it_ends() {
        rule.setContent { KinetixTheme(darkTheme = false) { AccountSecurityBlock() } }
        rule.onNodeWithText("Two-factor authentication").assertIsDisplayed()
        rule.onNodeWithContentDescription("Revoke iPhone 15").assertIsDisplayed()
    }
}
