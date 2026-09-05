import 'package:flutter/widgets.dart';

import 'popover.dart';

/// Mirrors `packages/ui/src/components/hover-card.tsx`. On the web it
/// opens on hover; here it's the same anchored overlay as [KinetixPopover]
/// with a caller-driven `visible` (wire it to a `MouseRegion` on
/// desktop). The other ports likewise built HoverCard on their Popover.
class KinetixHoverCard extends StatelessWidget {
  const KinetixHoverCard({
    super.key,
    required this.visible,
    required this.onDismiss,
    required this.anchor,
    required this.child,
  });

  final bool visible;
  final VoidCallback onDismiss;
  final Widget anchor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return KinetixPopover(
      visible: visible,
      onDismiss: onDismiss,
      anchor: anchor,
      child: child,
    );
  }
}
