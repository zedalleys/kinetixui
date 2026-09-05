package com.kinetixui.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.sp

/**
 * KinetixDataTable — mirrors `packages/ui/src/components/data-table.tsx`
 * (a `@tanstack/react-table` wrapper over the KinetixUI `Table`). No
 * `@tanstack` equivalent exists for Compose, so the sort + pagination
 * state is hand-held here (a few `remember`d values), but the rendering
 * reuses [KinetixTable]/[KinetixTableRow]/[KinetixTableHead]/
 * [KinetixTableCell] and [KinetixButton] outright — nothing about the
 * table chrome is re-derived. A `KinetixColumn` gives a header, a
 * `String` cell mapper, and an optional `sortKey` (null ⇒ that column
 * isn't sortable); tapping a sortable header cycles asc → desc.
 */
class KinetixColumn<T>(
    val header: String,
    val cell: (T) -> String,
    val sortKey: ((T) -> Comparable<*>)? = null,
    val weight: Float = 1f,
)

@Composable
fun <T> KinetixDataTable(
    columns: List<KinetixColumn<T>>,
    data: List<T>,
    modifier: Modifier = Modifier,
    pageSize: Int = 10,
) {
    val colors = KinetixColorScheme.current
    var sortColumn by remember { mutableStateOf<Int?>(null) }
    var sortAscending by remember { mutableStateOf(true) }
    var page by remember { mutableIntStateOf(0) }

    val sorted = remember(data, sortColumn, sortAscending) {
        val key = sortColumn?.let { columns[it].sortKey }
        if (key == null) {
            data
        } else {
            val cmp = compareBy(key)
            if (sortAscending) data.sortedWith(cmp) else data.sortedWith(cmp.reversed())
        }
    }
    val pageCount = if (sorted.isEmpty()) 1 else (sorted.size + pageSize - 1) / pageSize
    val safePage = page.coerceIn(0, pageCount - 1)
    val pageRows = sorted.drop(safePage * pageSize).take(pageSize)

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3))) {
        val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))
        KinetixTable(modifier = Modifier.clip(shape)) {
            KinetixTableHeader {
                KinetixTableRow {
                    columns.forEachIndexed { i, column ->
                        val sortable = column.sortKey != null
                        val indicator = when {
                            sortColumn != i -> ""
                            sortAscending -> " ↑"
                            else -> " ↓"
                        }
                        KinetixTableHead(
                            text = column.header + indicator,
                            weight = column.weight,
                            modifier = if (sortable) {
                                Modifier.clickable {
                                    if (sortColumn == i) sortAscending = !sortAscending else { sortColumn = i; sortAscending = true }
                                    page = 0
                                }
                            } else {
                                Modifier
                            },
                        )
                    }
                }
            }
            KinetixTableBody {
                if (pageRows.isEmpty()) {
                    KinetixTableRow(showDivider = false) {
                        KinetixTableCell(text = "No results.", weight = columns.size.toFloat())
                    }
                } else {
                    pageRows.forEachIndexed { rowIndex, row ->
                        KinetixTableRow(showDivider = rowIndex < pageRows.lastIndex) {
                            columns.forEach { column ->
                                KinetixTableCell(text = column.cell(row), weight = column.weight)
                            }
                        }
                    }
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = dimensionResource(R.dimen.spacing_1)),
            horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2), Alignment.End),
        ) {
            KinetixButton(
                onClick = { page = (safePage - 1).coerceAtLeast(0) },
                variant = KinetixButtonVariant.Outline,
                size = KinetixButtonSize.Sm,
                enabled = safePage > 0,
            ) { Text("Previous") }
            KinetixButton(
                onClick = { page = (safePage + 1).coerceAtMost(pageCount - 1) },
                variant = KinetixButtonVariant.Outline,
                size = KinetixButtonSize.Sm,
                enabled = safePage < pageCount - 1,
            ) { Text("Next") }
        }
        Text(
            text = "Page ${safePage + 1} of $pageCount",
            color = colors.mutedForeground,
            fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
            modifier = Modifier.padding(start = dimensionResource(R.dimen.spacing_1)),
        )
    }
}
