package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardDescription
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixSeparator
import com.kinetixui.ui.KinetixTag
import com.kinetixui.ui.KinetixTagVariant
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * The "Observations summary" block — see SignInBlockTest.kt for how block fixtures work.
 *
 * The same contract as the web versions: each reading's name bound to its value, the status as a WORD, the
 * reference range printed in full, and freshness plus source stated in the header before the values.
 *
 * Two platform-specific obligations:
 *
 *   spoken units   "mmHg" and "°C" are read as letters by TalkBack, so each reading is one node whose
 *                  `contentDescription` spells the unit while the visible text keeps the symbol. A nurse
 *                  reading wants the symbol; a nurse listening wants the word. `clearAndSetSemantics` is
 *                  what makes the node one node AND replaces the symbol text, which is exactly the case it
 *                  is for — the visible strings must NOT be what is spoken here.
 *   not a table    this is a reading panel, not a data table, so it is not KinetixTable. A table would
 *                  promise row and column navigation that means nothing where every row is the same pair.
 *
 * The block never decides what is abnormal. Ranges and the status word arrive as data.
 *
 * Every reading, person, device and facility below is invented. No real patient record and no clinical
 * advice; the block fetches nothing.
 */
// kx-block:start
internal data class VitalReading(
    val label: String,
    val value: String,
    /** The symbol, as it is shown. */
    val unit: String,
    /** The same unit in words, for TalkBack. */
    val spokenUnit: String,
    val range: String,
    /** Empty when the reading is inside its range and needs no tag. */
    val status: String = "",
)

internal val VITAL_READINGS = listOf(
    VitalReading("Blood pressure", "148/92", "mmHg", "millimetres of mercury", "90/60 to 120/80", "High"),
    VitalReading("Heart rate", "76", "bpm", "beats per minute", "60 to 100"),
    VitalReading("Temperature", "37.1", "°C", "degrees Celsius", "36.1 to 37.2"),
    VitalReading("Oxygen saturation", "94", "%", "percent", "95 to 100", "Low"),
    VitalReading("Respiratory rate", "18", "breaths/min", "breaths per minute", "12 to 20"),
    VitalReading("Weight", "81.4", "kg", "kilograms", "Recorded, not ranged"),
)

@Composable
fun VitalsSummaryBlock() {
    val outside = VITAL_READINGS.count { it.status.isNotEmpty() }

    KinetixCard {
        KinetixCardHeader {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    KinetixCardTitle("Observations")
                    // Freshness and source before the values: a panel of stale numbers looks exactly like
                    // a live one.
                    KinetixCardDescription("Recorded 7 Apr 2026, 08:12 · Ward round, bedside monitor")
                }
                KinetixTag("Nurse-recorded", variant = KinetixTagVariant.Secondary)
            }
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                VITAL_READINGS.forEach { reading ->
                    ReadingRow(reading)
                }
                Text(
                    "$outside of ${VITAL_READINGS.size} outside their reference range. " +
                        "Ranges are set by the care team.",
                )
            }
        }
    }
}

@Composable
private fun ReadingRow(reading: VitalReading) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            // One node, and the spoken form is not the visible form — the unit is spelled here and kept
            // as a symbol on screen.
            .clearAndSetSemantics { contentDescription = spokenReading(reading) },
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(reading.label)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("${reading.value} ${reading.unit}", fontWeight = FontWeight.Medium)
            // A word first. The tag's tone is the second channel, never the only one.
            if (reading.status.isNotEmpty()) {
                KinetixTag(reading.status, variant = KinetixTagVariant.Warning)
            }
        }
        // Printed in full, so the judgement can be checked rather than trusted.
        Text("Reference: ${reading.range}")
        KinetixSeparator()
    }
}

/** The reading as it should be heard: spelled unit, the status word, then the range. */
internal fun spokenReading(reading: VitalReading): String = buildList {
    add("${reading.value} ${reading.spokenUnit}")
    if (reading.status.isNotEmpty()) add(reading.status)
    add("reference ${reading.range}")
}.joinToString(", ").let { "${reading.label}, $it" }
// kx-block:end

@RunWith(RobolectricTestRunner::class)
// Pinned like every other block fixture here: the default SDK 37 needs Java 21 and CI runs Java 17.
@Config(sdk = [34])
class VitalsSummaryBlockTest {
    @get:Rule
    val rule = createComposeRule()

    // kx-verify-block: accessibility
    @Test
    fun each_reading_is_one_node_whose_unit_is_spoken_in_words_and_whose_status_is_a_word() {
        rule.setContent { KinetixTheme(darkTheme = false) { VitalsSummaryBlock() } }

        // assertExists, not assertIsDisplayed: Robolectric lays the card out in a fixed window and rows
        // below the fold are clipped. Presence and semantics are what this test is about.
        // The spoken form spells the unit rather than leaving "mmHg" to be read as letters, and carries the
        // status word and the range with it — one node, not six loose strings.
        rule.onNodeWithContentDescription(
            "Blood pressure, 148/92 millimetres of mercury, High, reference 90/60 to 120/80",
        ).assertExists()
        // A reading inside its range carries no status word, and still spells its unit.
        rule.onNodeWithContentDescription(
            "Temperature, 37.1 degrees Celsius, reference 36.1 to 37.2",
        ).assertExists()
        // The count of readings outside range is derived, not typed: two of these six carry a status.
        rule.onNodeWithText(
            "2 of 6 outside their reference range. Ranges are set by the care team.",
        ).assertExists()
    }

    // kx-verify-block: accessibility
    @Test
    fun the_header_states_freshness_and_source_before_any_value() {
        rule.setContent { KinetixTheme(darkTheme = false) { VitalsSummaryBlock() } }
        rule.onNodeWithText("Observations").assertExists()
        rule.onNodeWithText("Recorded 7 Apr 2026, 08:12 · Ward round, bedside monitor").assertExists()
        rule.onNodeWithText("Nurse-recorded").assertExists()
    }
}
