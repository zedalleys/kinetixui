package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixMultiSelect — mirrors
 * `packages/ui/src/components/multi-select.tsx`: a `Combobox`-like field
 * that keeps multiple [KinetixTag] chips, with a `creatable` free-entry
 * mode. Built directly on [KinetixDropdownMenu] (the same anchored-popover
 * reuse [KinetixNotificationCenter] and [KinetixSelect] make) with
 * [KinetixInput] as the search field inside — no new text-entry
 * mechanism. Tap-to-select only; the web version's search is driven by
 * `cmdk`'s own filtering, which has no Compose equivalent, so filtering
 * here is a plain `contains` check.
 */
data class KinetixMultiSelectOption(val value: String, val label: String)

@Composable
fun KinetixMultiSelect(
    options: List<KinetixMultiSelectOption>,
    selected: Set<String>,
    onSelectedChange: (Set<String>) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Select…",
    creatable: Boolean = false,
) {
    var expanded by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_sm))

    fun toggle(v: String) {
        onSelectedChange(if (v in selected) selected - v else selected + v)
    }

    val trimmed = query.trim()
    val canCreate = creatable && trimmed.isNotEmpty() && options.none { it.label.equals(trimmed, ignoreCase = true) }
    val visibleOptions = if (creatable) options.filter { it.label.contains(trimmed, ignoreCase = true) } else options

    KinetixDropdownMenu(
        visible = expanded,
        onDismissRequest = { expanded = false },
        modifier = modifier,
        anchor = {
            FlowRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(shape)
                    .border(dimensionResource(R.dimen.border_width_default), colors.border, shape)
                    .clickable { expanded = true }
                    .padding(dimensionResource(R.dimen.spacing_3)),
                horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1)),
                verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1)),
            ) {
                if (selected.isEmpty()) {
                    Text(
                        text = placeholder,
                        color = colors.mutedForeground,
                        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                    )
                }
                selected.forEach { v ->
                    val label = options.find { it.value == v }?.label ?: v
                    KinetixTag(text = label, variant = KinetixTagVariant.Secondary, onRemove = { toggle(v) })
                }
            }
        },
    ) {
        Column(modifier = Modifier.widthIn(min = 240.dp)) {
            KinetixInput(
                value = query,
                onValueChange = { query = it },
                placeholder = "Search…",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(dimensionResource(R.dimen.spacing_2)),
            )
            Column(modifier = Modifier.heightIn(max = 240.dp)) {
                if (visibleOptions.isEmpty()) {
                    if (canCreate) {
                        Text(
                            text = "Create “$trimmed”",
                            color = colors.foreground,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    toggle(trimmed)
                                    query = ""
                                }
                                .padding(dimensionResource(R.dimen.spacing_3)),
                        )
                    } else {
                        Text(
                            text = "No results.",
                            color = colors.mutedForeground,
                            modifier = Modifier.padding(dimensionResource(R.dimen.spacing_3)),
                        )
                    }
                }
                visibleOptions.forEach { option ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { toggle(option.value) }
                            .padding(
                                horizontal = dimensionResource(R.dimen.spacing_3),
                                vertical = dimensionResource(R.dimen.spacing_2),
                            ),
                        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2)),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = if (option.value in selected) "✓" else "",
                            color = colors.primary,
                            modifier = Modifier.width(16.dp),
                        )
                        Text(text = option.label, color = colors.foreground)
                    }
                }
            }
        }
    }
}
