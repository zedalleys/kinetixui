package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Icon
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
            icon = { Icon(Icons.Default.TrendingUp, contentDescription = null) },
        )
        KinetixMetric(
            label = "Active users",
            value = "2,420",
            modifier = Modifier.weight(1f),
            trend = KinetixMetricTrend.Up,
            change = "8.1%",
            icon = { Icon(Icons.Default.TrendingUp, contentDescription = null) },
        )
        KinetixMetric(
            label = "Churn",
            value = "1.2%",
            modifier = Modifier.weight(1f),
            trend = KinetixMetricTrend.Down,
            change = "0.3%",
            icon = { Icon(Icons.Default.TrendingDown, contentDescription = null) },
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
    fun renders_every_metric_with_its_value_and_change() {
        rule.setContent { KinetixTheme(darkTheme = false) { StatCardsBlock() } }
        rule.onNodeWithText("Revenue").assertExists()
        rule.onNodeWithText("2,420").assertExists()
        rule.onNodeWithText("Churn").assertExists()
        rule.onNodeWithText("0.3%").assertExists()
    }
}
