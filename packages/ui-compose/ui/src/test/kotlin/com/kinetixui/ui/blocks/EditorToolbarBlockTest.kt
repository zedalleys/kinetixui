package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixKbd
import com.kinetixui.ui.KinetixSegmentedControl
import com.kinetixui.ui.KinetixSegmentedControlItem
import com.kinetixui.ui.KinetixTheme
import com.kinetixui.ui.KinetixToggleGroup
import com.kinetixui.ui.KinetixToggleGroupItem
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Editor toolbar" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// Two kinds of choice, two controls: the mode is one-of-two and swaps the surface, so it is a segmented
// control; the marks combine, so they are a toggle group. The marks disable in Preview, because offering a
// formatting action when there is nothing to format is offering an action that cannot happen.
//
// kx-block:start
private data class EditorFormat(val id: String, val name: String, val glyph: String, val shortcut: String)

private val EDITOR_FORMATS = listOf(
    EditorFormat("bold", "Bold", "B", "B"),
    EditorFormat("italic", "Italic", "I", "I"),
    EditorFormat("code", "Code", "</>", "E"),
)

@Composable
fun EditorToolbarBlock() {
    var mode by remember { mutableStateOf("write") }
    val marks = remember { mutableStateListOf("bold") }

    Column(
        modifier = Modifier.width(400.dp).padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            KinetixSegmentedControl {
                KinetixSegmentedControlItem("Write", selected = mode == "write", onClick = { mode = "write" })
                KinetixSegmentedControlItem("Preview", selected = mode == "preview", onClick = { mode = "preview" })
            }
            KinetixToggleGroup {
                EDITOR_FORMATS.forEach { format ->
                    KinetixToggleGroupItem(
                        pressed = format.id in marks,
                        onPressedChange = { on -> if (on) marks.add(format.id) else marks.remove(format.id) },
                        // The name is the announcement; the glyph is decoration. Without this TalkBack reads
                        // the letter "B", which is not the name of anything.
                        modifier = Modifier.semantics { contentDescription = format.name },
                        enabled = mode != "preview",
                    ) { Text(format.glyph) }
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            EDITOR_FORMATS.forEach { format ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(format.name)
                    KinetixKbd("⌘")
                    KinetixKbd(format.shortcut)
                }
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class EditorToolbarBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun formatting_is_named_and_switches_off_with_the_editor() {
        rule.setContent { KinetixTheme(darkTheme = false) { EditorToolbarBlock() } }
        rule.onNodeWithContentDescription("Bold").assertIsOn()

        rule.onNodeWithText("Preview").performClick()
        rule.onNodeWithContentDescription("Bold").assertIsNotEnabled()
    }
}
