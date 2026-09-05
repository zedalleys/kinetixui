import 'package:flutter/widgets.dart';

import 'button.dart';
import 'dialog.dart';

/// Mirrors `packages/ui/src/components/alert-dialog.tsx`: a KinetixDialog
/// with no dismiss affordance — the user must pick an explicit action.
/// Content chrome reuses the KinetixDialog* header parts.
class KinetixAlertDialog extends StatelessWidget {
  const KinetixAlertDialog({
    super.key,
    required this.visible,
    required this.child,
  });

  final bool visible;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return KinetixDialog(
      visible: visible,
      onDismiss: () {},
      dismissible: false,
      child: child,
    );
  }
}

class KinetixAlertDialogAction extends StatelessWidget {
  const KinetixAlertDialogAction(this.label, {super.key, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return KinetixButton(onPressed: onPressed, child: Text(label));
  }
}

class KinetixAlertDialogCancel extends StatelessWidget {
  const KinetixAlertDialogCancel({super.key, this.label = 'Cancel', required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return KinetixButton(
      variant: KinetixButtonVariant.outline,
      onPressed: onPressed,
      child: Text(label),
    );
  }
}
