@file:OptIn(ExperimentalMaterial3Api::class)

package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.DatePickerState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * KinetixDatePicker — mirrors `packages/ui/src/components/date-picker.tsx`:
 * an outline-button trigger + a calendar in a popover, with optional
 * label / helper text / error framing. Composed straight out of
 * [KinetixPopover] + [KinetixCalendar] + [KinetixLabel] + [KinetixButton]
 * — the same Popover + Calendar composition the React source is, nothing
 * re-implemented. Formatting uses `java.text.SimpleDateFormat` (works on
 * every API level, unlike `java.time` below `minSdk` 26) rather than
 * pulling in a date library like the source's `date-fns`.
 */
@Composable
fun KinetixDatePicker(
    state: DatePickerState = rememberDatePickerState(),
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "Select date",
    helperText: String? = null,
    isError: Boolean = false,
    enabled: Boolean = true,
    dateFormat: String = "MMM d, yyyy",
) {
    val colors = KinetixColorScheme.current
    var open by remember { mutableStateOf(false) }

    val selectedMillis = state.selectedDateMillis
    val display = if (selectedMillis != null) {
        SimpleDateFormat(dateFormat, Locale.getDefault()).format(Date(selectedMillis))
    } else {
        placeholder
    }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) { // gap-1.5, off the shared scale
        if (label != null) {
            KinetixLabel(text = label)
        }
        KinetixPopover(
            visible = open,
            onDismissRequest = { open = false },
            anchor = {
                KinetixButton(
                    onClick = { open = true },
                    variant = KinetixButtonVariant.Outline,
                    enabled = enabled,
                ) {
                    Text(if (selectedMillis != null) display else placeholder)
                }
            },
        ) {
            KinetixCalendar(state = state)
        }
        if (helperText != null) {
            Text(
                text = helperText,
                color = if (isError) colors.destructive else colors.mutedForeground,
                fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                lineHeight = dimensionResource(R.dimen.line_height_body_sm).value.sp,
            )
        }
    }
}
