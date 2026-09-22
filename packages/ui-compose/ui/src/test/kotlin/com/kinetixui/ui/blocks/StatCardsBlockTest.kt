package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixMetric
import com.kinetixui.ui.KinetixMetricTrend
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Stat cards" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// No `icon` slot here, unlike the React block: KinetixMetric draws the trend arrow itself, and the decorative
// icons the web version uses (TrendingUp, Users) live in material-icons-extended, which this package
// deliberately does not depend on. Idiomatic per platform beats a matching prop list.
//
// kx-block:start
@Composable
fun StatCardsBlock() {
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        KinetixMetric(
            label = "Revenue",
            value = "$45,231",
            modifier = Modifier.weight(1f),
            trend = KinetixMetricTrend.Up,
            change = "12.5%",
        )
        KinetixMetric(
            label = "Active users",
            value = "2,420",
            modifier = Modifier.weight(1f),
            trend = KinetixMetricTrend.Up,
            change = "8.1%",
        )
        KinetixMetric(
            label = "Churn",
            value = "1.2%",
            modifier = Modifier.weight(1f),
            trend = KinetixMetricTrend.Down,
            change = "0.3%",
        )
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class StatCardsBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_every_metric_with_its_value_and_trend() {
        rule.setContent { KinetixTheme(darkTheme = false) { StatCardsBlock() } }
        rule.onNodeWithText("Revenue").assertExists()
        rule.onNodeWithText("2,420").assertExists()
        rule.onNodeWithText("Churn").assertExists()
        // the change is rendered with the trend arrow prepended ("↓ 0.3%"), so match on a substring
        rule.onNodeWithText("0.3%", substring = true).assertExists()
    }
}
