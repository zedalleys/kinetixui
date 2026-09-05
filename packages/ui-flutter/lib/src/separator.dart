import 'package:flutter/widgets.dart';

import 'theme.dart';

enum KinetixSeparatorAxis { horizontal, vertical }

/// Mirrors `packages/ui/src/components/separator.tsx` (`bg-border`, 1px
/// thick, full-length on its own axis). Place a horizontal one in a
/// `Column`, a vertical one in a `Row` — it stretches to fill the cross
/// axis.
class KinetixSeparator extends StatelessWidget {
  const KinetixSeparator({super.key, this.axis = KinetixSeparatorAxis.horizontal});

  final KinetixSeparatorAxis axis;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return axis == KinetixSeparatorAxis.horizontal
        ? Container(height: 1, color: c.border)
        : Container(width: 1, color: c.border);
  }
}
