package com.kinetixui.ui.blocks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixDropdownMenu
import com.kinetixui.ui.KinetixInput
import com.kinetixui.ui.KinetixSelectItem
import com.kinetixui.ui.KinetixSelectTrigger
import com.kinetixui.ui.KinetixTable
import com.kinetixui.ui.KinetixTableBody
import com.kinetixui.ui.KinetixTableCell
import com.kinetixui.ui.KinetixTableHead
import com.kinetixui.ui.KinetixTableHeader
import com.kinetixui.ui.KinetixTableRow
import com.kinetixui.ui.KinetixTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// The "Table + toolbar" block — see TestimonialBlockTest.kt for how block fixtures work.
//
// The filter is a KinetixSelectTrigger opening a KinetixDropdownMenu, which is how a select is composed on
// Compose — there is no single KinetixSelect composable, because the platform's own anchored-menu mechanism
// already provides one. The status cell is plain text rather than the web version's Badge: KinetixTableCell
// takes a String, not a content slot.
//
// kx-block:start
data class Invoice(val id: String, val status: String, val amount: String)

@Composable
fun TableToolbarBlock(
    invoices: List<Invoice> = listOf(
        Invoice("INV-001", "Paid", "$250.00"),
        Invoice("INV-002", "Pending", "$150.00"),
        Invoice("INV-003", "Paid", "$350.00"),
    ),
    onAdd: () -> Unit = {},
) {
    var query by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("All statuses") }
    var open by remember { mutableStateOf(false) }
    val statuses = listOf("All statuses", "Paid", "Pending")

    Column {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            KinetixInput(query, { query = it }, Modifier.weight(1f), placeholder = "Search invoices…")
            KinetixDropdownMenu(
                visible = open,
                onDismissRequest = { open = false },
                anchor = { KinetixSelectTrigger(status, { open = true }, Modifier.width(144.dp)) },
            ) {
                statuses.forEach { option ->
                    KinetixSelectItem(option, option == status, { status = option; open = false })
                }
            }
            KinetixButton(onAdd) { Text("Add invoice") }
        }
        KinetixTable(Modifier.padding(top = 16.dp)) {
            KinetixTableHeader {
                KinetixTableRow {
                    KinetixTableHead("Invoice")
                    KinetixTableHead("Status")
                    KinetixTableHead("Amount")
                }
            }
            KinetixTableBody {
                invoices.forEach { invoice ->
                    KinetixTableRow {
                        KinetixTableCell(invoice.id)
                        KinetixTableCell(invoice.status)
                        KinetixTableCell(invoice.amount)
                    }
                }
            }
        }
    }
}
// kx-block:end

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TableToolbarBlockTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun renders_the_toolbar_and_every_row() {
        rule.setContent { KinetixTheme(darkTheme = false) { TableToolbarBlock() } }
        rule.onNodeWithText("Search invoices…").assertExists()
        rule.onNodeWithText("Add invoice").assertExists()
        rule.onNodeWithText("Invoice").assertExists()
        rule.onNodeWithText("INV-002").assertExists()
        rule.onNodeWithText("$350.00").assertExists()
    }
}
