package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixButtonVariant
import com.kinetixui.ui.KinetixCard
import com.kinetixui.ui.KinetixCardContent
import com.kinetixui.ui.KinetixCardFooter
import com.kinetixui.ui.KinetixCardHeader
import com.kinetixui.ui.KinetixCardTitle
import com.kinetixui.ui.KinetixField
import com.kinetixui.ui.KinetixFieldLabel
import com.kinetixui.ui.KinetixInput
import com.kinetixui.ui.KinetixNumberInput
import com.kinetixui.ui.KinetixSeparator
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Order summary" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// Each quantity stepper is named after its own line item. Two steppers that both announce "Quantity" leave a
// TalkBack user changing the count of something they cannot identify — the most common defect in a cart.
//
// "Free" is a word, so shipping says "Free" rather than leaving $0.00 to be inferred.
//
// kx-block:start
private data class OrderItem(val id: String, val name: String, val unit: Double)

private val ORDER_ITEMS = listOf(
    OrderItem("tee", "Kinetix T-shirt", 28.0),
    OrderItem("stickers", "Sticker pack", 6.0),
)

/** Locale-free on purpose: a price in a fixture must not change shape with the device's locale. */
private fun money(amount: Double): String {
    val cents = kotlin.math.round(amount * 100).toInt()
    return "$" + (cents / 100) + "." + (cents % 100).toString().padStart(2, '0')
}

@Composable
fun OrderSummaryBlock() {
    val quantities = remember { mutableStateMapOf("tee" to 2, "stickers" to 1) }
    var promo by remember { mutableStateOf("") }

    val subtotal = ORDER_ITEMS.sumOf { it.unit * (quantities[it.id] ?: 0) }
    val shipping = if (subtotal > 50 || subtotal == 0.0) 0.0 else 5.0

    KinetixCard(Modifier.width(360.dp)) {
        KinetixCardHeader { KinetixCardTitle("Order summary") }
        KinetixCardContent {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                ORDER_ITEMS.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column {
                            Text(item.name)
                            Text("${money(item.unit)} each")
                        }
                        KinetixNumberInput(
                            value = quantities[item.id] ?: 0,
                            onValueChange = { quantities[item.id] = it },
                            modifier = Modifier.semantics { contentDescription = "Quantity, ${item.name}" },
                            min = 0,
                            max = 99,
                        )
                    }
                }

                KinetixSeparator()

                KinetixField {
                    KinetixFieldLabel("Promo code")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        KinetixInput(promo, { promo = it }, Modifier.weight(1f), placeholder = "KINETIX10")
                        KinetixButton(onClick = {}, variant = KinetixButtonVariant.Outline) { Text("Apply") }
                    }
                }

                KinetixSeparator()

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    TotalRow("Subtotal", money(subtotal))
                    TotalRow("Shipping", if (shipping == 0.0) "Free" else money(shipping))
                    TotalRow("Total", money(subtotal + shipping))
                }
            }
        }
        KinetixCardFooter {
            KinetixButton(
                onClick = {},
                modifier = Modifier.fillMaxWidth(),
                enabled = subtotal > 0,
            ) { Text("Place order") }
        }
    }
}

@Composable
private fun TotalRow(label: String, amount: String) {
    // One element: "Total, $62.00", not two unrelated strings at opposite ends of a row.
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics(mergeDescendants = true) {},
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label)
        Text(amount)
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class OrderSummaryBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun each_stepper_says_which_item_it_counts_and_free_shipping_is_a_word() {
        rule.setContent { KinetixTheme(darkTheme = false) { OrderSummaryBlock() } }
        // assertExists, not assertIsDisplayed: Robolectric lays the card out in a fixed window and
        // anything below the fold is clipped. Presence and semantics are what this test is about.
        rule.onNodeWithContentDescription("Quantity, Kinetix T-shirt").assertExists()
        rule.onNodeWithContentDescription("Quantity, Sticker pack").assertExists()
        // 2 x $28 + 1 x $6 = $62, which is over the $50 threshold.
        rule.onNodeWithText("Free").assertExists()
    }
}
