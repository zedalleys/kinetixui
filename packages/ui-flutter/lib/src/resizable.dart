import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/resizable.tsx`. Scoped to exactly
/// **two** horizontal panels — the same deliberately narrowed scope the
/// other ports took. The split fraction is a `GestureDetector` drag on
/// the handle, clamped by `minFraction` / `maxFraction`.
class KinetixResizablePanels extends StatefulWidget {
  const KinetixResizablePanels({
    super.key,
    required this.first,
    required this.second,
    this.initialFraction = 0.5,
    this.minFraction = 0.15,
    this.maxFraction = 0.85,
  });

  final Widget first;
  final Widget second;
  final double initialFraction;
  final double minFraction;
  final double maxFraction;

  @override
  State<KinetixResizablePanels> createState() => _KinetixResizablePanelsState();
}

class _KinetixResizablePanelsState extends State<KinetixResizablePanels> {
  late double _fraction = widget.initialFraction;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    const double handleWidth = 12;

    return LayoutBuilder(
      builder: (context, constraints) {
        final double available = (constraints.maxWidth - handleWidth).clamp(1, double.infinity);
        final double firstWidth = available * _fraction;

        return Row(
          children: [
            SizedBox(width: firstWidth, child: widget.first),
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onHorizontalDragUpdate: (details) {
                setState(() {
                  _fraction = (_fraction + details.delta.dx / available)
                      .clamp(widget.minFraction, widget.maxFraction);
                });
              },
              child: MouseRegion(
                cursor: SystemMouseCursors.resizeLeftRight,
                child: SizedBox(
                  width: handleWidth,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(width: 1, color: c.border),
                      Container(
                        color: c.background,
                        child: RotatedBox(
                          quarterTurns: 1,
                          child: Icon(Icons.more_horiz, size: 12, color: c.mutedForeground),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SizedBox(width: available - firstWidth, child: widget.second),
          ],
        );
      },
    );
  }
}
