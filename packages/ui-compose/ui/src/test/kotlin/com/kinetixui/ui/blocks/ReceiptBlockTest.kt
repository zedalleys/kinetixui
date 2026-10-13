package com.kinetixui.ui.blocks

import android.content.ClipData
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.platform.ClipEntry
import androidx.compose.ui.platform.LocalClipboard
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonSize
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardDescription
import com.kinetixui.ui.KinetixCardFooter
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixDescriptionList
import com.kinetixui.ui.KinetixDescriptionListItem
import com.kinetixui.ui.KinetixSeparator
import com.kinetixui.ui.KinetixTag
import com.kinetixui.ui.KinetixTheme
import kotlinx.coroutines.launch
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Receipt" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// One business-neutral receipt. A payment, booking, transfer, order or refund receipt is this block with
// different words. Amounts arrive formatted — the block computes nothing — and Download, Print and Share are
// callbacks: generating a PDF, printing and sharing are the product's, not the block's.
//
// The status is a word ("Paid"), not a colour. The amount is spoken as "162.75 Saudi riyals" rather than
// letter by letter. The receipt number is selectable, and the copy result goes into a polite live region —
// including when the clipboard refuses, so the block never claims a copy that did not happen.
//
// Each breakdown row is merged into one node, so a label and its amount are announced together. Amounts sit
// at the end of the row (SpaceBetween follows the layout direction) in tabular figures, and the discount's
// minus sign is in the text.
//
// kx-block:start
private data class ReceiptLine(val label: String, val note: String?, val amount: String)

private val RECEIPT_LINES = listOf(
    ReceiptLine("Single-origin beans", "2 × SAR 62.00", "SAR 124.00"),
    ReceiptLine("Pour-over filters", null, "SAR 18.00"),
    ReceiptLine("Member discount", "10% on beans", "−SAR 12.40"),
    ReceiptLine("VAT", "15%", "SAR 19.29"),
    ReceiptLine("Rounding", null, "+SAR 0.01"),
)

private const val RECEIPT_NUMBER = "RCP-2026-004817"

@Composable
fun ReceiptBlock(
    onDownload: () -> Unit = {},
    onPrint: () -> Unit = {},
    onShare: () -> Unit = {},
) {
    val clipboard = LocalClipboard.current
    val scope = rememberCoroutineScope()
    var feedback by remember { mutableStateOf("") }

    fun copy() {
        scope.launch {
            feedback = try {
                clipboard.setClipEntry(ClipEntry(ClipData.newPlainText("Receipt number", RECEIPT_NUMBER)))
                "Copied"
            } catch (e: Exception) {
                "Couldn't copy automatically. Press and hold the code to select it."
            }
        }
    }

    KinetixCard(Modifier.width(360.dp)) {
        KinetixCardHeader {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    KinetixCardTitle("Harbour Coffee Roasters")
                    KinetixCardDescription("Payment receipt")
                }
                // The status is a word, not a colour.
                KinetixTag("Paid")
            }
        }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Amount paid")
                    Text(
                        "SAR 162.75",
                        modifier = Modifier.clearAndSetSemantics { contentDescription = "162.75 Saudi riyals" },
                        style = LocalTextStyle.current.copy(fontFeatureSettings = "tnum"),
                        fontWeight = FontWeight.SemiBold,
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Receipt number")
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SelectionContainer(Modifier.weight(1f, fill = false)) {
                            Text(RECEIPT_NUMBER, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold)
                        }
                        KinetixButton(
                            onClick = { copy() },
                            modifier = Modifier.semantics { contentDescription = "Copy receipt number" },
                            variant = KinetixButtonVariant.Outline,
                            size = KinetixButtonSize.Sm,
                        ) { Text("Copy") }
                    }
                    // Always composed, so the result is announced when it arrives.
                    Text(feedback, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                }

                KinetixDescriptionList {
                    KinetixDescriptionListItem(term = "Date") { Text("14 Mar 2026, 09:42") }
                    KinetixDescriptionListItem(term = "Paid with") { Text("Visa ending 4242") }
                    KinetixDescriptionListItem(term = "Paid to", showDivider = false) {
                        Text("Harbour Coffee Roasters, Riyadh")
                    }
                }

                KinetixSeparator()

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    RECEIPT_LINES.forEach { line -> BreakdownRow(line.label, line.note, line.amount, emphasised = false) }
                    KinetixSeparator()
                    BreakdownRow("Total paid", null, "SAR 162.75", emphasised = true)
                }
            }
        }
        KinetixCardFooter {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KinetixButton(onClick = onDownload, variant = KinetixButtonVariant.Outline) { Text("Download") }
                KinetixButton(onClick = onPrint, variant = KinetixButtonVariant.Outline) { Text("Print") }
                KinetixButton(onClick = onShare, variant = KinetixButtonVariant.Ghost) { Text("Share") }
            }
        }
    }
}

@Composable
private fun BreakdownRow(label: String, note: String?, amount: String, emphasised: Boolean) {
    val weight = if (emphasised) FontWeight.SemiBold else FontWeight.Normal
    // One element: "Member discount, 10% on beans, −SAR 12.40", not unrelated strings at opposite ends.
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics(mergeDescendants = true) {},
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, fontWeight = weight)
            if (note != null) Text(note)
        }
        Text(amount, style = LocalTextStyle.current.copy(fontFeatureSettings = "tnum"), fontWeight = weight)
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ReceiptBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun the_status_is_a_word_the_amount_is_spoken_and_each_total_row_is_one_node() {
        rule.setContent { KinetixTheme(darkTheme = false) { ReceiptBlock() } }
        // assertExists, not assertIsDisplayed: Robolectric lays the card out in a fixed window and
        // anything below the fold is clipped. Presence and semantics are what this test is about.
        rule.onNodeWithText("Paid").assertExists()
        rule.onNodeWithContentDescription("162.75 Saudi riyals").assertExists()
        rule.onNodeWithText(RECEIPT_NUMBER).assertExists()
        rule.onNodeWithContentDescription("Copy receipt number").assertExists()
        // The label and its amount are one merged node, so they are announced together.
        rule.onNodeWithText("Total paid").assertTextContains("SAR 162.75")
        rule.onNodeWithText("Member discount").assertTextContains("−SAR 12.40")
    }
}
