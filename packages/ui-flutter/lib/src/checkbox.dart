import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/checkbox.tsx`. 18pt box, radius/sm,
/// 2pt border. Unchecked border = `--input`; checked / indeterminate =
/// `--primary` fill + `--primary-foreground` glyph; `isError` →
/// `--destructive`. A `null` `onChanged` renders the disabled treatment.
class KinetixCheckbox extends StatelessWidget {
  const KinetixCheckbox({
    super.key,
    required this.value,
    required this.onChanged,
    this.indeterminate = false,
    this.isError = false,
  });

  final bool value;
  final ValueChanged<bool>? onChanged;
  final bool indeterminate;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final bool enabled = onChanged != null;
    final bool checkedLike = value || indeterminate;
    final Color borderColor = isError ? c.destructive : (checkedLike ? c.primary : c.input);
    final Color fill = checkedLike ? (isError ? c.destructive : c.primary) : Colors.transparent;

    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: GestureDetector(
        onTap: enabled ? () => onChanged!(!value) : null,
        child: Container(
          width: 18,
          height: 18,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: fill,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: borderColor, width: 2),
          ),
          child: checkedLike
              ? Icon(indeterminate ? Icons.remove : Icons.check, size: 12, color: c.primaryForeground)
              : null,
        ),
      ),
    );
  }
}
