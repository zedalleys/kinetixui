import 'package:flutter/material.dart';

import 'app_text.dart';
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
    this.semanticsLabel,
  });

  final int value;
  final ValueChanged<int>? onChanged;
  final int? min;
  final int? max;
  final int step;

  /// Accessible name for the control — the counterpart of the React component's `aria-label` on its
  /// `<input type="number">`. Without it the stepper announces a bare number, which tells a screen-reader
  /// user what the value is but never what it counts. Two steppers on one screen are then indistinguishable.
  final String? semanticsLabel;

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

    // Named buttons, as on React (`aria-label="Decrease"` / `"Increase"`). A bare GestureDetector round an
    // Icon is a tap target with no name and no role: a screen reader can neither find it by role nor say
    // what it does, and the bound state was carried only by opacity.
    Widget button(IconData icon, String label, bool active, VoidCallback onTap) => Semantics(
          button: true,
          label: label,
          enabled: active,
          excludeSemantics: true,
          child: Opacity(
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
          ),
        );

    final Widget control = Opacity(
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
              button(Icons.remove, 'Decrease', enabled && canDec, () => onChanged!(_clamp(value - step))),
              Container(width: 1, color: c.input),
              Expanded(
                child: Center(
                  // Excluded: the container below announces the number as this control's `value`, so
                  // reading it again as loose text would say it twice and tie it to nothing.
                  child: ExcludeSemantics(
                    child: Text('$value', style: AppText.bodyMd.copyWith(color: c.foreground)),
                  ),
                ),
              ),
              Container(width: 1, color: c.input),
              button(Icons.add, 'Increase', enabled && canInc, () => onChanged!(_clamp(value + step))),
            ],
          ),
        ),
      ),
    );

    // explicitChildNodes keeps the two buttons as their own nodes while this one carries the name, the
    // current value and the enabled state — the same split React gets from a labelled <input type="number">
    // sitting between two labelled <button>s.
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: semanticsLabel,
      value: '$value',
      enabled: enabled,
      child: control,
    );
  }
}
