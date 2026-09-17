package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * A single DataGrid column: [id] identifies it for edit callbacks, [cellText]
 * both renders the cell and (when [sortable]) drives the sort compare and
 * seeds the edit field — a simpler, single-accessor shape than the web
 * version's separate `cell`/`value`, since there's no rendered-vs-raw split
 * to preserve here.
 */
class KinetixDataGridColumn<T>(
    val id: String,
    val header: String,
    val width: Dp = 120.dp,
    val sortable: Boolean = false,
    val editable: Boolean = false,
    val cellText: (T) -> String,
    val onCellEdit: ((T, Int, String) -> Unit)? = null,
)

/**
 * KinetixDataGrid — mirrors `packages/ui/src/components/data-grid.tsx`'s
 * row-virtualized grid. Column resize, drag-to-reorder, and column pin are
 * web-only: there's no touch-friendly drag-a-column-border convention on
 * Android, and a sticky column needs a custom layout no scroll container
 * gives for free. Ships the three features that map directly onto Compose
 * primitives instead — `LazyColumn` already only composes visible rows
 * (bound its height via `modifier`, same as [KinetixVirtualList]), headers
 * are tap-to-sort, and editable cells are tap-to-edit, committing on the
 * IME "Done" action (unlike the web's edit box, there's no blur-to-commit —
 * verifying that timing without a device felt riskier than just documenting
 * the gap). The header row and each body row bind the same `ScrollState` to
 * `horizontalScroll` so they scroll in lockstep — `LazyColumn` has no
 * built-in cross-axis scroll of its own.
 */
@Composable
fun <T> KinetixDataGrid(
    columns: List<KinetixDataGridColumn<T>>,
    data: List<T>,
    modifier: Modifier = Modifier,
    key: ((T) -> Any)? = null,
    rowHeight: Dp = 40.dp,
) {
    val colors = KinetixColorScheme.current
    var sortColumnId by remember { mutableStateOf<String?>(null) }
    var sortAscending by remember { mutableStateOf(true) }
    var editing by remember { mutableStateOf<Triple<Int, String, String>?>(null) }
    val scrollState = rememberScrollState()

    val sorted = remember(data, sortColumnId, sortAscending) {
        val column = columns.find { it.id == sortColumnId }
        if (column == null) {
            data
        } else {
            val cmp = compareBy<T> { column.cellText(it) }
            if (sortAscending) data.sortedWith(cmp) else data.sortedWith(cmp.reversed())
        }
    }

    val headerTextStyle = TextStyle(
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
    )
    val cellTextStyle = TextStyle(
        color = colors.foreground,
        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
    )

    Column(
        modifier = modifier.border(
            dimensionResource(R.dimen.border_width_default),
            colors.border,
            RoundedCornerShape(dimensionResource(R.dimen.radius_md)),
        ),
    ) {
        Row(modifier = Modifier.horizontalScroll(scrollState).background(colors.background)) {
            columns.forEach { column ->
                val isSorted = sortColumnId == column.id
                Row(
                    modifier = Modifier
                        .width(column.width)
                        .height(rowHeight)
                        .then(
                            if (column.sortable) {
                                Modifier.clickable {
                                    if (sortColumnId != column.id) {
                                        sortColumnId = column.id
                                        sortAscending = true
                                    } else if (sortAscending) {
                                        sortAscending = false
                                    } else {
                                        sortColumnId = null
                                    }
                                }
                            } else {
                                Modifier
                            },
                        )
                        .padding(horizontal = dimensionResource(R.dimen.spacing_2)),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(column.header, style = headerTextStyle, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (isSorted) {
                        Text(if (sortAscending) " ▲" else " ▼", style = headerTextStyle)
                    }
                }
            }
        }
        LazyColumn {
            itemsIndexed(
                items = sorted,
                key = if (key != null) { _, row -> key(row) } else null,
            ) { rowIndex, row ->
                Row(modifier = Modifier.horizontalScroll(scrollState).height(rowHeight)) {
                    columns.forEach { column ->
                        val isEditing = editing?.first == rowIndex && editing?.second == column.id
                        Box(
                            modifier = Modifier
                                .width(column.width)
                                .fillMaxHeight()
                                .then(
                                    if (column.editable && !isEditing) {
                                        Modifier.clickable {
                                            editing = Triple(rowIndex, column.id, column.cellText(row))
                                        }
                                    } else {
                                        Modifier
                                    },
                                )
                                .padding(horizontal = dimensionResource(R.dimen.spacing_2)),
                            contentAlignment = Alignment.CenterStart,
                        ) {
                            if (isEditing) {
                                var text by remember(editing) { mutableStateOf(editing!!.third) }
                                BasicTextField(
                                    value = text,
                                    onValueChange = { text = it },
                                    textStyle = cellTextStyle,
                                    singleLine = true,
                                    cursorBrush = SolidColor(colors.primary),
                                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                                    keyboardActions = KeyboardActions(onDone = {
                                        column.onCellEdit?.invoke(row, rowIndex, text)
                                        editing = null
                                    }),
                                    modifier = Modifier.fillMaxHeight(),
                                )
                            } else {
                                Text(column.cellText(row), style = cellTextStyle, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
        }
    }
}
