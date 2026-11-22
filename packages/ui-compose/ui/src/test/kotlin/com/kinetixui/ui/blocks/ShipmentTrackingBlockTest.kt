package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonSize
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardDescription
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixDescriptionList
import com.kinetixui.ui.KinetixDescriptionListItem
import com.kinetixui.ui.KinetixInform
import com.kinetixui.ui.KinetixInformVariant
import com.kinetixui.ui.KinetixTag
import com.kinetixui.ui.KinetixTagVariant
import com.kinetixui.ui.KinetixTheme
import com.kinetixui.ui.KinetixTimeline
import com.kinetixui.ui.KinetixTimelineItem
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * The "Shipment tracking" block — see SignInBlockTest.kt for how block fixtures work.
 *
 * The same contract as the web versions: the consignment's facts, the tracking number the reader will
 * quote, the ask stated once, and a history whose exception is visible as an exception.
 *
 * TWO REAL DIVERGENCES, written down rather than papered over. Both are limits of this platform's
 * Timeline, not of the block, and both are recorded in M5.26's five-platform matrix:
 *
 *   no status      `KinetixTimelineItem` is `title`, `time` and `content` and nothing else — there is no
 *                  status rung here, where React's Timeline has six. Each event's state is therefore
 *                  carried by WORDS in its own content ("Needs attention"), which is what WCAG 1.4.1 asks
 *                  for anyway and what the web versions also do on top of their markers.
 *   no per-event   `KinetixTimeline` takes value types, not composables, so nothing can be placed inside
 *   action         one event. React puts "Choose a new date" on the attempt that needs it; here the action
 *                  sits directly under the Inform that states the ask, keeping it with its reason.
 *
 * Neither is fixed here: widening a published component's API is a change of its own.
 *
 * Every time is shown exactly as supplied with its zone named. Nothing here converts a time zone.
 *
 * No real carrier, consignment, address or person. Events arrive as data; the block tracks nothing.
 */
// kx-block:start
internal const val TRACKING_NUMBER = "KXF-7731-2048"

internal val SHIPMENT_EVENTS = listOf(
    KinetixTimelineItem(
        title = "Collected",
        time = "2 Apr, 09:04",
        content = "Kinetix Freight depot, Jeddah",
    ),
    KinetixTimelineItem(
        title = "In transit",
        time = "3 Apr, 21:17",
        content = "Departed sorting hub, Riyadh",
    ),
    KinetixTimelineItem(
        title = "Out for delivery",
        time = "5 Apr, 07:52",
        content = "On vehicle KX-418",
    ),
    // The state is in the words, because this platform's timeline has no status — see the note above.
    KinetixTimelineItem(
        title = "Delivery attempted",
        time = "5 Apr, 18:40",
        content = "Needs attention. Nobody available to sign. The parcel is back at the Riyadh depot.",
    ),
    KinetixTimelineItem(
        title = "Delivery",
        time = "Awaiting a date",
        content = "Signature required on arrival.",
    ),
)

private val SHIPMENT_FACTS = listOf(
    "To" to "Rahma Suleiman, Al Olaya, Riyadh",
    "Service" to "Next day, signature required",
    "Times" to "Shown in Riyadh time (GMT+3)",
)

@Composable
fun ShipmentTrackingBlock(onChooseDate: () -> Unit = {}) {
    KinetixCard {
        KinetixCardHeader {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    KinetixCardTitle("Track consignment")
                    KinetixCardDescription("Kinetix Freight · 2 parcels, 4.6 kg")
                }
                // A word. The tone is the second channel.
                KinetixTag("Delayed", variant = KinetixTagVariant.Warning)
            }
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                KinetixDescriptionList {
                    SHIPMENT_FACTS.forEach { (term, value) ->
                        KinetixDescriptionListItem(term = term) { Text(value) }
                    }
                }

                Column(
                    modifier = Modifier.semantics {
                        contentDescription = "Tracking number $TRACKING_NUMBER"
                    },
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text("Tracking number")
                    // The one thing a person reads out to support, so it is selectable rather than
                    // something to transcribe off the screen.
                    SelectionContainer {
                        Text(
                            TRACKING_NUMBER,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // The ask, once. Not a restatement of the status tag: that says what the consignment
                    // is, this says what the reader has to do.
                    KinetixInform(
                        text = "Delivery needs a new date. The depot holds the parcels for 5 working days.",
                        variant = KinetixInformVariant.Warning,
                    )
                    // Kept with its reason, because it cannot be placed inside the event itself.
                    KinetixButton(onClick = onChooseDate, size = KinetixButtonSize.Sm) {
                        Text("Choose a new date")
                    }
                }

                KinetixTimeline(items = SHIPMENT_EVENTS)
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
class ShipmentTrackingBlockTest {
    @get:Rule
    val rule = createComposeRule()

    // kx-verify-block: accessibility
    @Test
    fun the_exception_states_its_state_in_words_and_the_ask_is_separate_from_the_status() {
        rule.setContent { KinetixTheme(darkTheme = false) { ShipmentTrackingBlock() } }

        // assertExists, not assertIsDisplayed: Robolectric lays the card out in a fixed window and events
        // below the fold are clipped. Presence and semantics are what this test is about.
        // The status is a word, so it does not depend on the tag's colour.
        rule.onNodeWithText("Delayed").assertExists()
        // The exception carries its state in its own content, since this platform's timeline has no status.
        rule.onNodeWithText(
            "Needs attention. Nobody available to sign. The parcel is back at the Riyadh depot.",
        ).assertExists()
        // The ask is its own sentence, not a second copy of the status.
        rule.onNodeWithText(
            "Delivery needs a new date. The depot holds the parcels for 5 working days.",
        ).assertExists()
        // The tracking number is named with its value, so it is announced as a pair.
        rule.onNodeWithContentDescription("Tracking number $TRACKING_NUMBER").assertExists()
        // The undelivered step is still present: nothing has been cancelled.
        rule.onNodeWithText("Signature required on arrival.").assertExists()
    }
}
