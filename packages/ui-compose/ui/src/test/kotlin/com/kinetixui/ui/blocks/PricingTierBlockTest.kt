package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kinetixui.ui.KinetixBadge
import com.kinetixui.ui.KinetixBadgeVariant
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardDescription
import com.kinetixui.ui.KinetixCardFooter
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixColorScheme
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Pricing tier" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// The tick is a text glyph, not an Icon: androidx.compose.material.icons is not on this package's classpath
// (material3 stopped bringing icons-core transitively), and pulling in material-icons-extended to draw one
// check mark would be a real dependency added for an example.
//
// kx-block:start
@Composable
fun PricingTierBlock(onUpgrade: () -> Unit = {}) {
    val colors = KinetixColorScheme.current
    val features = listOf("Unlimited projects", "Priority support", "Custom domains", "Analytics")

    KinetixCard(Modifier.width(300.dp)) {
        KinetixCardHeader {
            KinetixBadge("Most popular", KinetixBadgeVariant.Subtle)
            KinetixCardTitle("Pro")
            KinetixCardDescription("For growing teams.")
            Text("$29", fontSize = 30.sp, fontWeight = FontWeight.SemiBold, color = colors.foreground)
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                features.forEach { feature ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("✓", color = colors.primary)
                        Spacer(Modifier.width(8.dp))
                        Text(feature, color = colors.foreground)
                    }
                }
            }
        }
        KinetixCardFooter {
            KinetixButton(onUpgrade, Modifier.fillMaxWidth()) { Text("Upgrade to Pro") }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class PricingTierBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_the_tier_its_features_and_the_call_to_action() {
        rule.setContent { KinetixTheme(darkTheme = false) { PricingTierBlock() } }
        rule.onNodeWithText("Most popular").assertExists()
        rule.onNodeWithText("Pro").assertExists()
        rule.onNodeWithText("Unlimited projects").assertExists()
        rule.onNodeWithText("Analytics").assertExists()
        rule.onNodeWithText("Upgrade to Pro").assertExists()
    }
}
