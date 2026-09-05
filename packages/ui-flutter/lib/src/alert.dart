import 'package:flutter/widgets.dart';

import 'theme.dart';
import 'util.dart';

/// Mirror `packages/ui/src/components/alert.tsx` (`alertVariants`). Every
/// variant but `normal` uses a 50%-alpha border. Text colour cascades to
/// the title/description via `DefaultTextStyle`. Leading-icon slot not
/// ported (no icon set wired in), same as the other ports.
enum KinetixAlertVariant { normal, destructive, success, warning, info }

class KinetixAlert extends StatelessWidget {
  const KinetixAlert({super.key, required this.children, this.variant = KinetixAlertVariant.normal});

  final List<Widget> children;
  final KinetixAlertVariant variant;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final (Color border, Color fg) = switch (variant) {
      KinetixAlertVariant.normal => (c.border, c.foreground),
      KinetixAlertVariant.destructive => (c.destructive.withValues(alpha: 0.5), c.destructive),
      KinetixAlertVariant.success => (c.success.withValues(alpha: 0.5), c.success),
      KinetixAlertVariant.warning => (c.warning.withValues(alpha: 0.5), c.warning),
      KinetixAlertVariant.info => (c.info.withValues(alpha: 0.5), c.info),
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: c.background,
        borderRadius: BorderRadius.circular(12), // radius/lg
        border: Border.all(color: border, width: 1),
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: fg, fontSize: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: gapAll(children, 4),
        ),
      ),
    );
  }
}

class KinetixAlertTitle extends StatelessWidget {
  const KinetixAlertTitle(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: -0.4),
    );
  }
}

class KinetixAlertDescription extends StatelessWidget {
  const KinetixAlertDescription(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: const TextStyle(fontSize: 14));
  }
}
