import 'package:flutter/widgets.dart';

import 'kinetix_disclosure_motion.dart';

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
    // Duration and curve come from the tokens, and collapse to zero when the reader has asked the
    // platform for no animation — the content still appears and disappears, it just stops growing.
    return AnimatedSize(
      duration: KinetixDisclosureMotion.durationOf(context),
      curve: expanded ? KinetixDisclosureMotion.enterCurve : KinetixDisclosureMotion.exitCurve,
      alignment: Alignment.topCenter,
      child: expanded ? child : const SizedBox(width: double.infinity, height: 0),
    );
  }
}
