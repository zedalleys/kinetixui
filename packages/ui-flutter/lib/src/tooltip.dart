import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/tooltip.tsx`. Wraps Flutter's
/// built-in `Tooltip` re-themed onto the token contract (`--primary`
/// background, `--primary-foreground` text) — the "reuse the platform
/// machinery" call, same as the other ports.
class KinetixTooltip extends StatelessWidget {
  const KinetixTooltip({super.key, required this.message, required this.child});

  final String message;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Tooltip(
      message: message,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: c.primary,
        borderRadius: BorderRadius.circular(8),
      ),
      textStyle: TextStyle(fontSize: 13, color: c.primaryForeground),
      child: child,
    );
  }
}
