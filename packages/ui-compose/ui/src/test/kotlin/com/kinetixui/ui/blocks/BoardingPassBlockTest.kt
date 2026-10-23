package com.kinetixui.ui.blocks

import android.content.ClipData
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ClipEntry
import androidx.compose.ui.platform.LocalClipboard
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonSize
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardDescription
import com.kinetixui.ui.KinetixCardFooter
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixSeparator
import com.kinetixui.ui.KinetixTag
import com.kinetixui.ui.KinetixTagVariant
import com.kinetixui.ui.KinetixTheme
import kotlinx.coroutines.launch
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Boarding pass" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// Compose has no PassCard, so this is the same anatomy composed from the primitives it does have: a card, a
// fact grid, a dashed tear line, the supplied code and a footer. The shared contract is the anatomy and the
// semantics, not the component names.
//
// Every value is supplied: the block looks nothing up, converts no time zone and encodes nothing. The code
// is a fixed placeholder pattern on its own opaque white quiet zone — a real pass passes in the image the
// product or the issuer generated, and the block never inverts it for a dark theme because a scanner needs
// dark modules on light. The readable confirmation code is printed beneath it, so the pass still works when
// the code will not scan.
//
// The route is words ("Riyadh (RUH) to Cairo (CAI)"), not an arrow, so it reads correctly in both
// directions. Gate, seat and group are emphasised because they are what a traveller looks for at a glance.
// Each field is merged into one node, so "Gate, C21" is announced together rather than as two unrelated
// strings. The copy result goes into a polite live region — including when the clipboard refuses, so the
// block never claims a copy that did not happen. The host clipboard itself is a parameter, so a unit
// test can exercise the button and the announcement without a real clipboard to wait on.
//
// All data here is fictional, Kinetix Air included.
//
// kx-block:start
private data class BoardingField(val label: String, val value: String, val emphasised: Boolean = false)

private val BOARDING_FIELDS = listOf(
    BoardingField("Passenger", "Amira Haddad"),
    BoardingField("Flight", "KX 1180"),
    BoardingField("Boards", "2 Apr, 06:15"),
    BoardingField("Gate", "C21", emphasised = true),
    BoardingField("Seat", "9A", emphasised = true),
    BoardingField("Group", "3", emphasised = true),
)

private const val CONFIRMATION_CODE = "KX7F2Q9"

/** A stand-in for the code the product supplies: a fixed pattern, not an encoding of anything. */
private val CODE_PATTERN = listOf(
    "###.#.###",
    "#.#...#.#",
    "###.#.###",
    "...#.#...",
    "#.##..##.",
    "..#.#.#..",
    "###.##.#.",
    "#.#..#.##",
    "###.#.#..",
)

@Composable
fun BoardingPassBlock(
    /**
     * How the confirmation code reaches the clipboard. Null uses the host clipboard, which is what a real
     * app wants; a unit test has no host clipboard to wait on, so it passes its own.
     */
    onCopyCode: (suspend (String) -> Unit)? = null,
) {
    val clipboard = LocalClipboard.current
    val scope = rememberCoroutineScope()
    var feedback by remember { mutableStateOf("") }

    fun copy() {
        scope.launch {
            feedback = try {
                if (onCopyCode != null) {
                    onCopyCode(CONFIRMATION_CODE)
                } else {
                    clipboard.setClipEntry(
                        ClipEntry(ClipData.newPlainText("Confirmation code", CONFIRMATION_CODE)),
                    )
                }
                "Copied"
            } catch (e: Exception) {
                "Couldn't copy automatically. Press and hold the code to select it."
            }
        }
    }

    KinetixCard(Modifier.width(340.dp)) {
        KinetixCardHeader {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    KinetixCardTitle("Boarding pass")
                    KinetixCardDescription("Kinetix Air · Riyadh (RUH) to Cairo (CAI)")
                }
                // A word, not a colour.
                KinetixTag("Boarding", variant = KinetixTagVariant.Secondary)
            }
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Two columns of three: the fields wrap rather than truncate when the text scales.
                BOARDING_FIELDS.chunked(3).forEach { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        row.forEach { field ->
                            FieldCell(field, Modifier.weight(1f))
                        }
                    }
                }

                // The tear line between the pass and its stub.
                KinetixSeparator()

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    CodeImage()
                    Text("Confirmation code")
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SelectionContainer(Modifier.weight(1f, fill = false)) {
                            Text(CONFIRMATION_CODE, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold)
                        }
                        KinetixButton(
                            onClick = { copy() },
                            modifier = Modifier.semantics { contentDescription = "Copy confirmation code" },
                            variant = KinetixButtonVariant.Outline,
                            size = KinetixButtonSize.Sm,
                        ) { Text("Copy") }
                    }
                    // Always composed, so the result is announced when it arrives.
                    Text(feedback, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                }
            }
        }
        KinetixCardFooter {
            Text("The gate closes 20 minutes before departure.")
        }
    }
}

@Composable
private fun FieldCell(field: BoardingField, modifier: Modifier = Modifier) {
    // One node: "Gate, C21".
    Column(
        modifier = modifier.semantics(mergeDescendants = true) {},
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(field.label)
        Text(
            field.value,
            style = LocalTextStyle.current.copy(fontFeatureSettings = "tnum"),
            fontWeight = if (field.emphasised) FontWeight.SemiBold else FontWeight.Medium,
        )
    }
}

@Composable
private fun CodeImage() {
    // Named once, as one element: the modules themselves carry no meaning.
    Column(
        modifier = Modifier
            .background(Color.White)
            .padding(8.dp)
            .clearAndSetSemantics { contentDescription = "Boarding pass QR code" },
    ) {
        CODE_PATTERN.forEach { row ->
            Row {
                row.forEach { cell ->
                    Column(
                        Modifier
                            .size(12.dp)
                            .background(if (cell == '#') Color.Black else Color.White),
                    ) {}
                }
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class BoardingPassBlockTest {
    @get:Rule
    val rule = createComposeRule()

    // kx-verify-block: accessibility
    @Test
    fun the_status_is_a_word_each_field_is_one_node_and_the_code_image_is_named() {
        rule.setContent { KinetixTheme(darkTheme = false) { BoardingPassBlock() } }
        // assertExists, not assertIsDisplayed: Robolectric lays the card out in a fixed window and anything
        // below the fold is clipped. Presence and semantics are what this test is about.
        rule.onNodeWithText("Boarding").assertExists()
        rule.onNodeWithContentDescription("Boarding pass QR code").assertExists()
        rule.onNodeWithContentDescription("Copy confirmation code").assertExists()
        rule.onNodeWithText(CONFIRMATION_CODE).assertExists()
        // The label and its value are one merged node, so they are announced together.
        rule.onNodeWithText("Gate").assertTextContains("C21")
        rule.onNodeWithText("Seat").assertTextContains("9A")
    }

    // kx-verify-block: interaction
    @Test
    fun copying_the_confirmation_code_hands_over_the_code_and_announces_the_result() {
        var handedOver: String? = null
        rule.setContent {
            KinetixTheme(darkTheme = false) { BoardingPassBlock(onCopyCode = { handedOver = it }) }
        }
        rule.onNodeWithContentDescription("Copy confirmation code").performClick()
        // The copy is a coroutine, so wait for the live region rather than assuming the click and the
        // announcement land in the same frame.
        rule.waitUntil(5_000) {
            rule.onAllNodesWithText("Copied").fetchSemanticsNodes().isNotEmpty()
        }
        // The code the button hands over is the code printed on the pass, and the block says it happened.
        assertEquals(CONFIRMATION_CODE, handedOver)
    }
}
