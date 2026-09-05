import 'package:flutter/widgets.dart';

import 'dialog.dart';
import 'sheet.dart';

/// Mirrors `packages/ui/src/components/drawer.tsx` (a vaul bottom drawer).
/// Functionally identical to [KinetixSheet] here — a thin pass-through,
/// the same call the other ports made.
class KinetixDrawer extends StatelessWidget {
  const KinetixDrawer({
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
    return KinetixSheet(visible: visible, onDismiss: onDismiss, child: child);
  }
}

typedef KinetixDrawerHeader = KinetixDialogHeader;
typedef KinetixDrawerFooter = KinetixDialogFooter;
typedef KinetixDrawerTitle = KinetixDialogTitle;
typedef KinetixDrawerDescription = KinetixDialogDescription;
