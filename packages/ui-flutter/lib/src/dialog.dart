import 'package:flutter/material.dart';

import 'theme.dart';
import 'util.dart';

/// Mirrors `packages/ui/src/components/dialog.tsx`. A centred modal:
/// place it in a top-level `Stack` and drive it with a `visible` flag
/// (Radix's controlled `open` shape, no Trigger/Portal graph — same call
/// as the other ports). `max-w-lg` (448) is off the shared spacing scale.
/// `dismissible: false` (used by KinetixAlertDialog) drops the close
/// affordance and the scrim tap.
class KinetixDialog extends StatelessWidget {
  const KinetixDialog({
    super.key,
    required this.visible,
    required this.onDismiss,
    required this.child,
    this.dismissible = true,
  });

  final bool visible;
  final VoidCallback onDismiss;
  final Widget child;
  final bool dismissible;

  @override
  Widget build(BuildContext context) {
    if (!visible) return const SizedBox.shrink();
    final c = KinetixTheme.of(context);

    return Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            onTap: dismissible ? onDismiss : null,
            child: const ColoredBox(color: Color(0x66000000)),
          ),
        ),
        Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 448),
              child: Material(
                color: c.background,
                borderRadius: BorderRadius.circular(16),
                elevation: 8,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: c.border, width: 1),
                  ),
                  child: Stack(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(24), // p-6
                        child: DefaultTextStyle.merge(
                          style: TextStyle(color: c.foreground, fontSize: 14),
                          child: child,
                        ),
                      ),
                      if (dismissible)
                        Positioned(
                          right: 8,
                          top: 8,
                          child: GestureDetector(
                            onTap: onDismiss,
                            child: Padding(
                              padding: const EdgeInsets.all(8),
                              child: Icon(Icons.close, size: 18, color: c.mutedForeground),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class KinetixDialogHeader extends StatelessWidget {
  const KinetixDialogHeader({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: gapAll(children, 6),
    );
  }
}

class KinetixDialogFooter extends StatelessWidget {
  const KinetixDialogFooter({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: gapAll(children, 8, axis: Axis.horizontal),
    );
  }
}

class KinetixDialogTitle extends StatelessWidget {
  const KinetixDialogTitle(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Text(
      text,
      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: -0.4, color: c.foreground),
    );
  }
}

class KinetixDialogDescription extends StatelessWidget {
  const KinetixDialogDescription(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Text(text, style: TextStyle(fontSize: 14, color: c.mutedForeground));
  }
}
