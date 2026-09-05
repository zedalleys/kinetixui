@file:OptIn(ExperimentalMaterial3Api::class)

package com.kinetixui.ui

import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.DatePickerState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * KinetixCalendar — mirrors `packages/ui/src/components/calendar.tsx`
 * (a themed `react-day-picker` `DayPicker`). Compose's own Material3
 * `DatePicker` composable (`@ExperimentalMaterial3Api` at this project's
 * Material3 version — stable behavior, an opt-in) already renders exactly
 * that: a month grid with prev/next nav, day selection, today marker,
 * outside-day dimming — so this wraps it and only re-maps the colors onto
 * the KinetixUI token contract, the same "reuse the platform's widget,
 * restyle it" call `KinetixSlider`/`KinetixToaster`/`KinetixCarousel` made.
 * Range selection (`mode="range"` in the source) isn't exposed here —
 * Material3's own `DateRangePicker` would be a separate wrapper.
 */
@Composable
fun KinetixCalendar(
    state: DatePickerState = rememberDatePickerState(),
    modifier: Modifier = Modifier,
    showModeToggle: Boolean = false,
) {
    val colors = KinetixColorScheme.current
    DatePicker(
        state = state,
        modifier = modifier,
        showModeToggle = showModeToggle,
        colors = DatePickerDefaults.colors(
            containerColor = colors.background,
            titleContentColor = colors.mutedForeground,
            headlineContentColor = colors.foreground,
            weekdayContentColor = colors.mutedForeground,
            subheadContentColor = colors.mutedForeground,
            yearContentColor = colors.foreground,
            currentYearContentColor = colors.primary,
            selectedYearContentColor = colors.primaryForeground,
            selectedYearContainerColor = colors.primary,
            dayContentColor = colors.foreground,
            disabledDayContentColor = colors.mutedForeground,
            selectedDayContentColor = colors.primaryForeground,
            selectedDayContainerColor = colors.primary,
            todayContentColor = colors.primary,
            todayDateBorderColor = colors.primary,
        ),
    )
}
