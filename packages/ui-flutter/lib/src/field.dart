import 'package:flutter/material.dart';

import 'label.dart';
import 'theme.dart';
import 'util.dart';

/// Mirrors `packages/ui/src/components/field.tsx`'s label + control +
/// description + feedback composition. `invalid` is threaded to
/// [KinetixFieldLabel] / [KinetixFieldMessage] through an
/// `InheritedWidget` (Compose's `compositionLocalOf` / SwiftUI's
/// EnvironmentKey analogue). Place your control (KinetixInput, …) directly
/// in `children`.
class _FieldScope extends InheritedWidget {
  const _FieldScope({required this.invalid, required super.child});

  final bool invalid;

  static bool of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_FieldScope>()?.invalid ?? false;

  @override
  bool updateShouldNotify(_FieldScope oldWidget) => oldWidget.invalid != invalid;
}

class KinetixField extends StatelessWidget {
  const KinetixField({super.key, this.invalid = false, required this.children});

  final bool invalid;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return _FieldScope(
      invalid: invalid,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: gapAll(children, 6),
      ),
    );
  }
}

class KinetixFieldLabel extends StatelessWidget {
  const KinetixFieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return KinetixLabel(text, color: _FieldScope.of(context) ? c.destructive : null);
  }
}

class KinetixFieldDescription extends StatelessWidget {
  const KinetixFieldDescription(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Text(text, style: TextStyle(fontSize: 13, color: c.mutedForeground));
  }
}

enum KinetixFieldMessageIntent { error, warning, success, info }

class KinetixFieldMessage extends StatelessWidget {
  const KinetixFieldMessage(
    this.text, {
    super.key,
    this.intent = KinetixFieldMessageIntent.error,
    this.hideIcon = false,
  });

  final String text;
  final KinetixFieldMessageIntent intent;
  final bool hideIcon;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final (Color color, IconData icon) = switch (intent) {
      KinetixFieldMessageIntent.error => (c.destructive, Icons.error_outline),
      KinetixFieldMessageIntent.warning => (c.warning, Icons.warning_amber_outlined),
      KinetixFieldMessageIntent.success => (c.success, Icons.check_circle_outline),
      KinetixFieldMessageIntent.info => (c.info, Icons.info_outline),
    };

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!hideIcon) ...[
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
        ],
        Flexible(child: Text(text, style: TextStyle(fontSize: 13, color: color))),
      ],
    );
  }
}
