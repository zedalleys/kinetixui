package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonSize
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardDescription
import com.kinetixui.ui.KinetixCardFooter
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixCheckbox
import com.kinetixui.ui.KinetixProgress
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Onboarding checklist" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// Counted, not measured: the bar reports "2 of 5 complete" rather than "40". The strike-through is the
// sighted rendering of that fact, never the only carrier of it.
//
// kx-block:start
private val ONBOARDING_STEPS = listOf(
    "account" to "Create your account",
    "workspace" to "Name your workspace",
    "invite" to "Invite a teammate",
    "connect" to "Connect a repository",
    "deploy" to "Ship your first change",
)

@Composable
fun OnboardingChecklistBlock() {
    val done = remember { mutableStateListOf("account", "workspace") }

    KinetixCard(Modifier.width(360.dp)) {
        KinetixCardHeader {
            KinetixCardTitle("Get started")
            KinetixCardDescription("${done.size} of ${ONBOARDING_STEPS.size} done")
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                KinetixProgress(
                    value = done.size.toFloat() / ONBOARDING_STEPS.size * 100f,
                    modifier = Modifier
                        .fillMaxWidth()
                        .semantics { stateDescription = "${done.size} of ${ONBOARDING_STEPS.size} complete" },
                )
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    ONBOARDING_STEPS.forEach { (id, label) ->
                        val isDone = id in done
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            KinetixCheckbox(
                                state = if (isDone) ToggleableState.On else ToggleableState.Off,
                                onClick = { if (isDone) done.remove(id) else done.add(id) },
                            )
                            Text(label, textDecoration = if (isDone) TextDecoration.LineThrough else null)
                        }
                    }
                }
            }
        }
        KinetixCardFooter {
            KinetixButton(
                onClick = {},
                variant = KinetixButtonVariant.Ghost,
                size = KinetixButtonSize.Sm,
            ) { Text("Skip setup") }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class OnboardingChecklistBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun the_progress_is_counted_in_steps_not_in_percent() {
        rule.setContent { KinetixTheme(darkTheme = false) { OnboardingChecklistBlock() } }
        rule.onNodeWithText("2 of 5 done").assertIsDisplayed()
        rule.onNodeWithText("Invite a teammate").assertIsDisplayed()
    }
}
