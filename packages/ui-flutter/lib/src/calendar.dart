import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/calendar.tsx` (a react-day-picker
/// month grid). Wraps Flutter's `CalendarDatePicker` re-tinted onto the
/// token contract — the "reuse the platform widget, restyle it" call, same
/// as the other ports. Single-date only; no range select (a documented
/// gap, same as the Compose port).
class KinetixCalendar extends StatelessWidget {
  KinetixCalendar({
    super.key,
    required this.selectedDate,
    required this.onChanged,
    DateTime? firstDate,
    DateTime? lastDate,
  })  : firstDate = firstDate ?? DateTime(1900),
        lastDate = lastDate ?? DateTime(2100);

  final DateTime selectedDate;
  final ValueChanged<DateTime> onChanged;
  final DateTime firstDate;
  final DateTime lastDate;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final base = Theme.of(context);
    return Theme(
      data: base.copyWith(
        colorScheme: base.colorScheme.copyWith(primary: c.primary, onPrimary: c.primaryForeground),
      ),
      child: CalendarDatePicker(
        initialDate: selectedDate,
        firstDate: firstDate,
        lastDate: lastDate,
        onDateChanged: onChanged,
      ),
    );
  }
}
