import 'package:flutter/material.dart';

import 'theme.dart';

String _fmt(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Mirrors `packages/ui/src/components/date-picker.tsx` (a Popover +
/// Calendar recipe). A field-style trigger (border / icon like
/// KinetixInput) that opens the platform `showDatePicker` and reports via
/// `onChanged` — the "reuse the platform control" call.
class KinetixDatePicker extends StatelessWidget {
  KinetixDatePicker({
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
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: selectedDate,
          firstDate: firstDate,
          lastDate: lastDate,
        );
        if (picked != null) onChanged(picked);
      },
      child: Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: c.background,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: c.input, width: 1),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(_fmt(selectedDate), style: TextStyle(fontSize: 14, color: c.foreground)),
            ),
            Icon(Icons.calendar_today, size: 16, color: c.mutedForeground),
          ],
        ),
      ),
    );
  }
}
