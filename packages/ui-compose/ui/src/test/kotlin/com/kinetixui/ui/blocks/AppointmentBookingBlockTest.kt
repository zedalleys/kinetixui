package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.isNotEnabled
import androidx.compose.ui.test.onAllNodes
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardDescription
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixDescriptionList
import com.kinetixui.ui.KinetixDescriptionListItem
import com.kinetixui.ui.KinetixDescriptionListLayout
import com.kinetixui.ui.KinetixRadioButton
import com.kinetixui.ui.KinetixRadioGroup
import com.kinetixui.ui.KinetixTag
import com.kinetixui.ui.KinetixTagVariant
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * The "Appointment booking" block — see SignInBlockTest.kt for how block fixtures work.
 *
 * Compose has no TimeSlotPicker, so the slots are a `KinetixRadioGroup` (which applies
 * `Modifier.selectableGroup()`) of `KinetixRadioButton`s. That is the same contract as the React version's
 * Radix RadioGroup and the Angular version's native radios: one selection group, one choice.
 *
 * What this platform states for itself:
 *
 *   one node per slot   `Modifier.selectable(...)` on the row with the radio's own semantics cleared, so
 *                       TalkBack reads "09:00, selected" as one node rather than a radio and a label that
 *                       happen to be adjacent. `selectable` also carries the selected state, so it is in
 *                       the semantics tree rather than only in the tint.
 *   unavailable         `enabled = false` AND the word "Unavailable" in the row's state description. A
 *                       disabled row with no word is announced only as "disabled".
 *   announcement        the outcome is a `liveRegion` that is ALWAYS composed, holding text only once there
 *                       is an outcome. A live region composed at the same moment as its first text often
 *                       announces nothing, which is the same trap handled in the React and Angular versions.
 *
 * Times are shown exactly as supplied with the zone named; nothing here converts a time zone.
 *
 * Everything below is fictional: no real clinician, patient, facility or price.
 */
// kx-block:start
internal data class AppointmentSlot(
    val value: String,
    val label: String,
    val unavailable: Boolean = false,
    val note: String? = null,
)

internal data class AppointmentPeriod(val label: String, val slots: List<AppointmentSlot>)

internal val APPOINTMENT_PERIODS = listOf(
    AppointmentPeriod(
        "Morning",
        listOf(
            AppointmentSlot("2026-04-07T09:00", "09:00"),
            AppointmentSlot("2026-04-07T09:30", "09:30", unavailable = true),
            AppointmentSlot("2026-04-07T10:15", "10:15"),
            AppointmentSlot("2026-04-07T11:00", "11:00", note = "Last morning slot"),
        ),
    ),
    AppointmentPeriod(
        "Afternoon",
        listOf(
            AppointmentSlot("2026-04-07T13:30", "13:30", unavailable = true),
            AppointmentSlot("2026-04-07T14:00", "14:00"),
            AppointmentSlot("2026-04-07T15:45", "15:45"),
        ),
    ),
)

private val APPOINTMENT_FACTS = listOf(
    Triple("Date", "Tuesday 7 April 2026", false),
    Triple("Length", "25 minutes", false),
    Triple("Joining", "Video link, sent after confirmation", false),
    Triple(
        "Changes",
        "Free to move or cancel up to 24 hours before. After that a missed-visit fee applies.",
        true,
    ),
)

@Composable
fun AppointmentBookingBlock() {
    var selected by remember { mutableStateOf<String?>(null) }
    var booked by remember { mutableStateOf<String?>(null) }

    val bookedLabel = APPOINTMENT_PERIODS
        .flatMap { it.slots }
        .firstOrNull { it.value == booked }
        ?.label

    KinetixCard {
        KinetixCardHeader {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    KinetixCardTitle("Book an appointment")
                    KinetixCardDescription("Dr Lina Okafor · Cardiology review")
                }
                // A word, not a colour.
                KinetixTag("Telehealth", variant = KinetixTagVariant.Secondary)
            }
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                KinetixDescriptionList {
                    APPOINTMENT_FACTS.forEach { (term, value, stacked) ->
                        KinetixDescriptionListItem(
                            term = term,
                            layout = if (stacked) {
                                KinetixDescriptionListLayout.Stacked
                            } else {
                                KinetixDescriptionListLayout.Row
                            },
                        ) {
                            Text(value)
                        }
                    }
                }

                // Always composed, so the region exists before the text arrives. Empty until then, so
                // nothing is announced on first composition.
                Text(
                    text = bookedLabel?.let {
                        "Appointment confirmed for Tuesday 7 April 2026 at $it, with Dr Lina Okafor."
                    } ?: "",
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                )

                if (bookedLabel != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Appointment confirmed", fontWeight = FontWeight.SemiBold)
                        Text(
                            "Tuesday 7 April 2026 at $bookedLabel, with Dr Lina Okafor. " +
                                "The video link is on its way.",
                        )
                        Text("Booking reference KX-4C19B")
                        KinetixButton(
                            onClick = {
                                booked = null
                                selected = null
                            },
                            variant = KinetixButtonVariant.Outline,
                        ) {
                            Text("Choose another time")
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Available times", fontWeight = FontWeight.Medium)
                        // Shown, never converted.
                        Text("Times in Riyadh (GMT+3)")
                        KinetixRadioGroup {
                            APPOINTMENT_PERIODS.forEach { period ->
                                Text(period.label)
                                period.slots.forEach { slot ->
                                    SlotRow(
                                        slot = slot,
                                        selected = selected == slot.value,
                                        onSelect = { selected = slot.value },
                                    )
                                }
                            }
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            KinetixButton(
                                onClick = { booked = selected },
                                enabled = selected != null,
                            ) {
                                Text("Confirm appointment")
                            }
                            if (selected == null) {
                                // The reason beside the disabled control, not left to be guessed.
                                Text("Choose a time to continue.")
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * One slot as a single selectable node, the same way KinetixTabsTrigger does it: `Modifier.selectable` on
 * the row (which merges its descendants, so the time and its note are read with it) and the radio passed
 * `onClick = null`, which makes the radio's own `selectable` inert — see RadioGroup.kt, where it is enabled
 * only `enabled && onClick != null`. The radio is therefore the visual affordance and the row is the
 * control, rather than both being controls.
 */
@Composable
private fun SlotRow(slot: AppointmentSlot, selected: Boolean, onSelect: () -> Unit) {
    val state = buildList {
        if (slot.unavailable) add("Unavailable")
        slot.note?.let { add(it) }
    }.joinToString(", ")

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(
                selected = selected,
                enabled = !slot.unavailable,
                onClick = onSelect,
                // The ROLE belongs to the control, and the control is this row. Without it the row was
                // selectable with no role at all, so TalkBack announced a selected thing of no known kind.
                role = Role.RadioButton,
            )
            .semantics { if (state.isNotEmpty()) stateDescription = state }
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        KinetixRadioButton(
            selected = selected,
            // null, so the radio is drawn but is not a second control: the row above is the control.
            onClick = null,
            enabled = !slot.unavailable,
            // `onClick = null` is NOT the same as semantics-free. KinetixRadioButton installs
            // `.selectable(role = Role.RadioButton, enabled = enabled && onClick != null)`
            // unconditionally, so a null onClick leaves behind an unnamed, permanently disabled radio
            // beside the row — even for an available slot. TalkBack then meets two nodes per time: a
            // roleless selectable row and a dead radio. Clearing the semantics leaves the dot as the
            // drawing it is. Found by Codex's exact-head review of e28bb73, not by the gate.
            modifier = Modifier.clearAndSetSemantics {},
        )
        Column {
            Text(slot.label)
            slot.note?.let { Text(it) }
            // The WORD, not only the dimming.
            if (slot.unavailable) Text("Unavailable")
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
// Pinned like every other block fixture here: the default SDK 37 needs Java 21 and CI runs Java 17.
@Config(sdk = [34])
class AppointmentBookingBlockTest {
    @get:Rule
    val rule = createComposeRule()

    // kx-verify-block: accessibility
    @Test
    fun an_unavailable_slot_says_so_in_words_and_confirm_explains_why_it_is_disabled() {
        rule.setContent { KinetixTheme(darkTheme = false) { AppointmentBookingBlock() } }
        // assertExists, not assertIsDisplayed: Robolectric lays the card out in a fixed window and anything
        // below the fold is clipped. Presence and semantics are what this test is about.
        rule.onNodeWithText("Available times").assertExists()
        // The zone is stated, not converted.
        rule.onNodeWithText("Times in Riyadh (GMT+3)").assertExists()
        // EVERY unavailable slot carries the word, so the state is never conveyed by dimming alone — and
        // the expected count is derived from the fixture rather than typed, so it cannot drift from the
        // data. A single `onNodeWithText` here asserted that exactly ONE node says "Unavailable", which is
        // false: this fixture has two unavailable slots on purpose, and CI is what said so.
        val unavailable = APPOINTMENT_PERIODS.sumOf { period -> period.slots.count { it.unavailable } }
        rule.onAllNodesWithText("Unavailable").assertCountEquals(unavailable)
        // ONE radio per time, and it is the row. The decorative dot used to leave a second node behind —
        // an unnamed, permanently disabled radio beside each row, available slots included — because
        // `onClick = null` silences the callback and not the semantics. Counting the role is what catches
        // that: the words alone cannot see it, which is how it shipped past the first review.
        val slots = APPOINTMENT_PERIODS.sumOf { period -> period.slots.size }
        val isRadio = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.RadioButton)
        rule.onAllNodes(isRadio).assertCountEquals(slots)
        // Disabled means exactly the unavailable ones, no more: a count that matched the slot total would
        // also pass with every radio dead.
        rule.onAllNodes(isRadio and isNotEnabled()).assertCountEquals(unavailable)
        // The disabled action and the sentence that explains it are both present.
        rule.onNodeWithText("Confirm appointment").assertIsNotEnabled()
        rule.onNodeWithText("Choose a time to continue.").assertExists()
    }

    // kx-verify-block: interaction
    @Test
    fun choosing_a_time_enables_confirm_and_confirming_reports_the_time_that_was_taken() {
        rule.setContent { KinetixTheme(darkTheme = false) { AppointmentBookingBlock() } }
        // Invoke the node's own action rather than a tap: the fixed Robolectric window puts later slots
        // below the fold, and this is the same action an accessibility service fires.
        rule.onNodeWithText("10:15").performSemanticsAction(SemanticsActions.OnClick)
        rule.onNodeWithText("Confirm appointment").performSemanticsAction(SemanticsActions.OnClick)
        // The outcome names the time that was chosen, not a slot id.
        rule.onNodeWithText("Appointment confirmed").assertExists()
        rule.onNodeWithText(
            "Tuesday 7 April 2026 at 10:15, with Dr Lina Okafor. The video link is on its way.",
        ).assertExists()
        // Returning to the picker clears the choice, so the block cannot show a stale confirmation.
        rule.onNodeWithText("Choose another time").performSemanticsAction(SemanticsActions.OnClick)
        rule.onNodeWithText("Confirm appointment").assertIsNotEnabled()
    }
}
