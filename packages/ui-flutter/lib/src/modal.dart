import 'package:flutter/widgets.dart';

import 'dialog.dart';

/// Mirrors `packages/ui/src/components/modal.tsx`, a Dialog recipe with a
/// required title. Built from KinetixDialog + the KinetixDialog* header
/// parts (same call as the other ports).
class KinetixModal extends StatelessWidget {
  const KinetixModal({
    super.key,
    required this.visible,
    required this.onDismiss,
    required this.title,
    required this.child,
  });

  final bool visible;
  final VoidCallback onDismiss;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return KinetixDialog(
      visible: visible,
      onDismiss: onDismiss,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          KinetixDialogHeader(children: [KinetixDialogTitle(title)]),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
