import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';
import 'util.dart';

/// Mirrors `packages/ui/src/components/breadcrumb.tsx`. Slot-shaped;
/// `gap-1.5` (6) is off the shared spacing scale. Ellipsis not ported;
/// the separator is the `chevron_right` icon.
class KinetixBreadcrumb extends StatelessWidget {
  const KinetixBreadcrumb({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: gapAll(children, 6, axis: Axis.horizontal));
  }
}

class KinetixBreadcrumbLink extends StatelessWidget {
  const KinetixBreadcrumbLink(this.text, {super.key, required this.onTap});

  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Text(text, style: AppText.bodyMd.copyWith(color: c.mutedForeground)),
    );
  }
}

class KinetixBreadcrumbPage extends StatelessWidget {
  const KinetixBreadcrumbPage(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Text(text, style: AppText.bodyMd.copyWith(color: c.foreground));
  }
}

class KinetixBreadcrumbSeparator extends StatelessWidget {
  const KinetixBreadcrumbSeparator({super.key});

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Icon(Icons.chevron_right, size: 14, color: c.mutedForeground);
  }
}
