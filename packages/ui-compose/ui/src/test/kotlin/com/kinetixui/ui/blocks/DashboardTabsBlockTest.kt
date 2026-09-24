package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixAspectRatio
import com.kinetixui.ui.KinetixMetric
import com.kinetixui.ui.KinetixMetricTrend
import com.kinetixui.ui.KinetixTabsContent
import com.kinetixui.ui.KinetixTabsList
import com.kinetixui.ui.KinetixTabsTrigger
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Dashboard tabs" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// The chart's box is reserved with KinetixAspectRatio before the chart exists. Without it the panel is
// short, then grows when the data lands, and everything under it jumps — worst on a phone, where the jump is
// most of the screen. That is a layout-stability bug, not a styling preference.
//
// kx-block:start
private data class DashboardMetric(
    val label: String,
    val value: String,
    val trend: KinetixMetricTrend,
    val change: String,
)

private data class DashboardPanel(
    val id: String,
    val label: String,
    val caption: String,
    val metrics: List<DashboardMetric>,
)

private val DASHBOARD_PANELS = listOf(
    DashboardPanel(
        "overview", "Overview", "Sessions, last 30 days",
        listOf(
            DashboardMetric("Sessions", "48,271", KinetixMetricTrend.Up, "+12.4%"),
            DashboardMetric("Sign-ups", "1,204", KinetixMetricTrend.Up, "+3.1%"),
            DashboardMetric("Churn", "1.8%", KinetixMetricTrend.Down, "-0.4%"),
        ),
    ),
    DashboardPanel(
        "traffic", "Traffic", "Sources, last 30 days",
        listOf(
            DashboardMetric("Direct", "21,904", KinetixMetricTrend.Up, "+8.0%"),
            DashboardMetric("Search", "18,442", KinetixMetricTrend.Up, "+15.2%"),
            DashboardMetric("Referral", "7,925", KinetixMetricTrend.Neutral, "0.0%"),
        ),
    ),
)

@Composable
fun DashboardTabsBlock() {
    var tab by remember { mutableStateOf("overview") }
    val panel = DASHBOARD_PANELS.first { it.id == tab }

    Column(
        modifier = Modifier.width(400.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        KinetixTabsList {
            DASHBOARD_PANELS.forEach { p ->
                KinetixTabsTrigger(p.label, selected = tab == p.id, onClick = { tab = p.id })
            }
        }

        KinetixTabsContent {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // One column, not three: three metric cards side by side on a phone is three unreadable
                // columns. The web version's grid is the same information, not the same geometry.
                panel.metrics.forEach { metric ->
                    KinetixMetric(
                        label = metric.label,
                        value = metric.value,
                        modifier = Modifier.fillMaxWidth(),
                        trend = metric.trend,
                        change = metric.change,
                    )
                }

                KinetixAspectRatio(16f / 9f, Modifier.fillMaxWidth()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(panel.caption)
                    }
                }
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class DashboardTabsBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun switching_tab_swaps_the_panel_and_its_reserved_chart_caption() {
        rule.setContent { KinetixTheme(darkTheme = false) { DashboardTabsBlock() } }
        rule.onNodeWithText("Sessions, last 30 days").assertIsDisplayed()

        rule.onNodeWithText("Traffic").performClick()
        rule.onNodeWithText("Sources, last 30 days").assertIsDisplayed()
    }
}
