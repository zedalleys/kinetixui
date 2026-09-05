import 'package:flutter/material.dart';

import 'dialog.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/sheet.tsx`. Collapsed to **bottom
/// only** — the idiomatic mobile pattern and the only edge with a clean
/// primitive, the same scope cut the other ports made. Place it in a
/// top-level `Stack`, driven by `visible`.
///
/// Header / Title / Description / Footer are the KinetixDialog* parts.
class KinetixSheet extends StatelessWidget {
  const KinetixSheet({
    super.key,
    required this.visible,
    required this.onDismiss,
    required this.child,
  });

  final bool visible;
  final VoidCallback onDismiss;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!visible) return const SizedBox.shrink();
    final c = KinetixTheme.of(context);

    return Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            onTap: onDismiss,
            child: const ColoredBox(color: Color(0x66000000)),
          ),
        ),
        Align(
          alignment: Alignment.bottomCenter,
          child: Material(
            color: c.background,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            elevation: 8,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24), // p-6
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: c.border,
                        borderRadius: BorderRadius.circular(9999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  DefaultTextStyle.merge(
                    style: TextStyle(color: c.foreground, fontSize: 14),
                    child: child,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// The Dialog header parts double as the Sheet header parts (identical on the web).
typedef KinetixSheetHeader = KinetixDialogHeader;
typedef KinetixSheetFooter = KinetixDialogFooter;
typedef KinetixSheetTitle = KinetixDialogTitle;
typedef KinetixSheetDescription = KinetixDialogDescription;
