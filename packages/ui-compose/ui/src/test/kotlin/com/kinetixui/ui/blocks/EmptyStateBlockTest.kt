package com.kinetixui.ui.blocks

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixColorScheme
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Empty state" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// No illustration glyph: androidx.compose.material.icons is not on this package's classpath, and an empty
// state reads perfectly well from its heading and explanation. The web version's inbox icon is decorative.
//
// The web version draws a dashed rule; Compose has no dashed-border modifier, so this uses a solid one. A
// dashed edge needs drawBehind { drawRoundRect(pathEffect = dashPathEffect(...)) }, which is a lot of drawing
// code for an example about layout — named here rather than silently omitted.
//
// kx-block:start
@Composable
fun EmptyStateBlock(onStart: () -> Unit = {}) {
    val colors = KinetixColorScheme.current

    Column(
        Modifier
            .fillMaxWidth()
            .border(1.dp, colors.border, RoundedCornerShape(12.dp))
            .padding(vertical = 64.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text("No messages yet", fontWeight = FontWeight.Medium, color = colors.foreground)
        Text(
            "When someone messages you, it'll show up here.",
            fontSize = 14.sp,
            color = colors.mutedForeground,
        )
        KinetixButton(onStart, Modifier.padding(top = 16.dp)) { Text("Start a conversation") }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class EmptyStateBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_the_explanation_and_the_way_out_of_it() {
        rule.setContent { KinetixTheme(darkTheme = false) { EmptyStateBlock() } }
        rule.onNodeWithText("No messages yet").assertExists()
        rule.onNodeWithText("When someone messages you, it'll show up here.").assertExists()
        rule.onNodeWithText("Start a conversation").assertExists()
    }
}
