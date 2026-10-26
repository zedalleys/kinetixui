import 'package:flutter/material.dart';

import 'app_text.dart';
import 'label.dart';
import 'theme.dart';

String _fmt(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Mirrors `packages/ui/src/components/date-picker.tsx` (a Popover +
/// Calendar recipe). A field-style trigger (border / icon like
/// KinetixInput) that opens the platform `showDatePicker` and reports via
/// `onChanged` — the "reuse the platform control" call.
///
/// `label` renders a visible [KinetixLabel] above the trigger and names the
/// trigger as the label PLUS the shown date, which is the contract the React
/// source states: a name of the label alone would drop the selected date out
/// of it. React spells it `aria-labelledby="{labelId} {valueId}"`.
///
/// The [Semantics] wrapper is applied only when there is a label, because
/// `excludeSemantics` drops everything the subtree declares — the date [Text]
/// and the [GestureDetector]'s tap among them, the trap recorded in
/// `icon_control.dart` and `number_input.dart`. With a label the name and the
/// tap are both re-declared here; without one, wrapping would replace a node
/// named by its date with a node named by nothing, so it is left alone.
class KinetixDatePicker extends StatelessWidget {
  KinetixDatePicker({
    super.key,
    required this.selectedDate,
    required this.onChanged,
    DateTime? firstDate,
    DateTime? lastDate,
    this.label,
  })  : firstDate = firstDate ?? DateTime(1900),
        lastDate = lastDate ?? DateTime(2100);

  final DateTime selectedDate;
  final ValueChanged<DateTime> onChanged;
  final DateTime firstDate;
  final DateTime lastDate;
  final String? label;

  Future<void> _open(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: firstDate,
      lastDate: lastDate,
    );
    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final trigger = GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _open(context),
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
              child: Text(_fmt(selectedDate), style: AppText.bodyMd.copyWith(color: c.foreground)),
            ),
            Icon(Icons.calendar_today, size: 16, color: c.mutedForeground),
          ],
        ),
      ),
    );

    // Blank is treated as absent, as the Compose port does: a name of ", 2026-03-09" is
    // worse than the bare date it would replace.
    final name = label?.trim();
    if (name == null || name.isEmpty) return trigger;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        KinetixLabel(name),
        const SizedBox(height: 6),
        Semantics(
          label: '$name, ${_fmt(selectedDate)}',
          button: true,
          onTap: () => _open(context),
          excludeSemantics: true,
          child: trigger,
        ),
      ],
    );
  }
}
