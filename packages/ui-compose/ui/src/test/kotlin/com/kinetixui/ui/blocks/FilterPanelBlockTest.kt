package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonSize
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixCheckbox
import com.kinetixui.ui.KinetixLabel
import com.kinetixui.ui.KinetixSeparator
import com.kinetixui.ui.KinetixSlider
import com.kinetixui.ui.KinetixTag
import com.kinetixui.ui.KinetixTagVariant
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Filter panel" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// The active filters appear as tags AND as ticked rows: the tags are the fast way to undo one thing, the
// rows are the full set. Both drive ONE piece of state — two lists that can disagree is the classic bug in
// this pattern, so the block does not have two.
//
// kx-block:start
private data class FilterOption(val id: String, val label: String)

private val FILTER_OPTIONS = listOf(
    FilterOption("stock", "In stock"),
    FilterOption("sale", "On sale"),
    FilterOption("shipping", "Free shipping"),
)

@Composable
fun FilterPanelBlock() {
    var price by remember { mutableStateOf(250f) }
    val active = remember { mutableStateListOf("stock") }

    KinetixCard(Modifier.width(320.dp)) {
        KinetixCardHeader {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                KinetixCardTitle("Filters")
                KinetixButton(
                    onClick = { active.clear() },
                    variant = KinetixButtonVariant.Ghost,
                    size = KinetixButtonSize.Sm,
                    enabled = active.isNotEmpty(),
                ) { Text("Clear all") }
            }
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                if (active.isNotEmpty()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FILTER_OPTIONS.filter { it.id in active }.forEach { option ->
                            KinetixTag(
                                option.label,
                                variant = KinetixTagVariant.Secondary,
                                onRemove = { active.remove(option.id) },
                            )
                        }
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        KinetixLabel("Maximum price")
                        // Visible, not a bubble on the thumb: a value that only exists while dragging cannot
                        // be read by anyone who is not dragging.
                        Text("$${price.toInt()}")
                    }
                    KinetixSlider(
                        value = price,
                        onValueChange = { price = it },
                        modifier = Modifier.fillMaxWidth(),
                        valueRange = 0f..500f,
                    )
                }

                KinetixSeparator()

                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    KinetixLabel("Availability")
                    FILTER_OPTIONS.forEach { option ->
                        val on = option.id in active
                        // toggleable() on the ROW, onClick = null on the box: one target, one announcement.
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .toggleable(
                                    value = on,
                                    role = Role.Checkbox,
                                    onValueChange = { if (on) active.remove(option.id) else active.add(option.id) },
                                ),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            KinetixCheckbox(
                                state = if (on) ToggleableState.On else ToggleableState.Off,
                                onClick = null,
                            )
                            Text(option.label)
                        }
                    }
                }
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class FilterPanelBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun a_tag_says_what_it_removes_and_removing_it_unticks_the_row() {
        rule.setContent { KinetixTheme(darkTheme = false) { FilterPanelBlock() } }
        rule.onNodeWithContentDescription("Remove In stock").assertIsDisplayed()

        rule.onNodeWithContentDescription("Remove In stock").performClick()
        // One piece of state: dismissing the tag is the same operation as unticking the row, so the tag is
        // gone and the row is off. Two lists would have left one of these stale.
        rule.onNodeWithContentDescription("Remove In stock").assertDoesNotExist()
        rule.onNodeWithText("In stock").assertIsOff()
    }
}
