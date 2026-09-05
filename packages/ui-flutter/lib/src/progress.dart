import 'package:flutter/widgets.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/progress.tsx` (`h-2 w-full
/// rounded-full bg-muted` track, `bg-primary` indicator). The indicator
/// is sized as a fraction of the track — the idiomatic, RTL-safe form,
/// same as the other ports.
class KinetixProgress extends StatelessWidget {
  const KinetixProgress({super.key, required this.value});

  /// 0…100, same scale as the React `value` prop.
  final double value;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final double fraction = (value / 100).clamp(0.0, 1.0);

    return ClipRRect(
      borderRadius: BorderRadius.circular(9999),
      child: SizedBox(
        height: 8, // h-2
        child: Stack(
          children: [
            Positioned.fill(child: ColoredBox(color: c.muted)),
            Positioned.fill(
              child: Align(
                alignment: Alignment.centerLeft,
                child: FractionallySizedBox(
                  widthFactor: fraction,
                  heightFactor: 1,
                  child: ColoredBox(color: c.primary),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
