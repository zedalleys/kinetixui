package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixAvatar
import com.kinetixui.ui.KinetixAvatarFallback
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixTextarea
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Comment box" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// kx-block:start
@Composable
fun CommentBoxBlock(onSubmit: (String) -> Unit = {}) {
    var body by remember { mutableStateOf("") }

    KinetixCard(Modifier.width(420.dp)) {
        KinetixCardContent {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KinetixAvatar { KinetixAvatarFallback("ZF") }
                Column(
                    Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalAlignment = Alignment.End,
                ) {
                    KinetixTextarea(body, { body = it }, placeholder = "Add a comment…")
                    KinetixButton({ onSubmit(body) }) { Text("Comment") }
                }
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CommentBoxBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_the_avatar_placeholder_and_the_submit_action() {
        rule.setContent { KinetixTheme(darkTheme = false) { CommentBoxBlock() } }
        rule.onNodeWithText("ZF").assertExists()
        rule.onNodeWithText("Add a comment…").assertExists()
        rule.onNodeWithText("Comment").assertExists()
    }
}
