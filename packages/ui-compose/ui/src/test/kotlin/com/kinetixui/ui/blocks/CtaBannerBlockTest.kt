package com.kinetixui.ui.blocks

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixColorScheme
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "CTA banner" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// kx-block:start
@Composable
fun CtaBannerBlock(onStart: () -> Unit = {}, onDocs: () -> Unit = {}) {
    val colors = KinetixColorScheme.current

    Row(
        Modifier
            .fillMaxWidth()
            .border(1.dp, colors.border, RoundedCornerShape(12.dp))
            .background(colors.muted.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
            .padding(32.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text(
                "Ship with one token architecture",
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = colors.foreground,
            )
            Text(
                "Built from the same design-token contract on every supported platform.",
                fontSize = 14.sp,
                color = colors.mutedForeground,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KinetixButton(onStart) { Text("Get started") }
            KinetixButton(onDocs, variant = KinetixButtonVariant.Outline) { Text("Read the docs") }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CtaBannerBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_the_pitch_and_both_actions() {
        rule.setContent { KinetixTheme(darkTheme = false) { CtaBannerBlock() } }
        rule.onNodeWithText("Ship with one token architecture").assertExists()
        rule.onNodeWithText("Built from the same design-token contract on every supported platform.").assertExists()
        rule.onNodeWithText("Get started").assertExists()
        rule.onNodeWithText("Read the docs").assertExists()
    }
}
