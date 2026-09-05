import 'package:flutter/widgets.dart';

/// Mirrors `packages/ui/src/components/collapsible.tsx` — a bare re-export
/// of Radix's Collapsible whose only contribution is the show/hide
/// animation. The caller owns its toggle control and passes state through
/// as `expanded`.
class KinetixCollapsible extends StatelessWidget {
  const KinetixCollapsible({super.key, required this.expanded, required this.child});

  final bool expanded;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedSize(
      duration: const Duration(milliseconds: 200),
      alignment: Alignment.topCenter,
      child: expanded ? child : const SizedBox(width: double.infinity, height: 0),
    );
  }
}
