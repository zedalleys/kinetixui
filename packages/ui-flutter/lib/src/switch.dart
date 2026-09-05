import 'package:flutter/widgets.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/switch.tsx`. 48×24 track, 20pt
/// `--background` thumb, 24pt travel (Figma-literal). Off = `--tertiary`,
/// on = `--primary`. A `null` `onChanged` renders disabled.
class KinetixSwitch extends StatelessWidget {
  const KinetixSwitch({super.key, required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final bool enabled = onChanged != null;

    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: GestureDetector(
        onTap: enabled ? () => onChanged!(!value) : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeInOut,
          width: 48,
          height: 24,
          padding: const EdgeInsets.all(2),
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          decoration: BoxDecoration(
            color: value ? c.primary : c.tertiary,
            borderRadius: BorderRadius.circular(9999),
          ),
          child: Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: c.background,
              shape: BoxShape.circle,
              boxShadow: const [
                BoxShadow(color: Color(0x33000000), blurRadius: 2, offset: Offset(0, 1)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
