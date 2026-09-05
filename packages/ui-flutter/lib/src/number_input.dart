import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/number-input.tsx`: a numeric value
/// flanked by decrement / increment buttons. Modeled on `int` (the common
/// case, same as the other ports). `h-10` / `w-9` (40 / 36) are off the
/// shared spacing scale. Free-text entry isn't ported — the value is
/// display-only between the steppers.
class KinetixNumberInput extends StatelessWidget {
  const KinetixNumberInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.min,
    this.max,
    this.step = 1,
  });

  final int value;
  final ValueChanged<int>? onChanged;
  final int? min;
  final int? max;
  final int step;

  int _clamp(int n) {
    var v = n;
    if (min != null && v < min!) v = min!;
    if (max != null && v > max!) v = max!;
    return v;
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final bool enabled = onChanged != null;
    final bool canDec = min == null || value > min!;
    final bool canInc = max == null || value < max!;

    Widget button(IconData icon, bool active, VoidCallback onTap) => Opacity(
          opacity: active ? 1 : 0.4,
          child: GestureDetector(
            onTap: active ? onTap : null,
            behavior: HitTestBehavior.opaque,
            child: SizedBox(
              width: 36,
              height: 40,
              child: Icon(icon, size: 16, color: c.mutedForeground),
            ),
          ),
        );

    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8), // radius/md
        child: Container(
          height: 40, // h-10
          decoration: BoxDecoration(
            color: c.background,
            border: Border.all(color: c.input, width: 1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              button(Icons.remove, enabled && canDec, () => onChanged!(_clamp(value - step))),
              Container(width: 1, color: c.input),
              Expanded(
                child: Center(
                  child: Text('$value', style: TextStyle(fontSize: 14, color: c.foreground)),
                ),
              ),
              Container(width: 1, color: c.input),
              button(Icons.add, enabled && canInc, () => onChanged!(_clamp(value + step))),
            ],
          ),
        ),
      ),
    );
  }
}
