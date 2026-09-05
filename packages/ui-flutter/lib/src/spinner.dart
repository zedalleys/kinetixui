import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import 'theme.dart';

enum KinetixSpinnerSize { sm, md, lg }

enum KinetixSpinnerVariant { primary, muted, onColor }

/// Mirrors `packages/ui/src/components/spinner.tsx` (a `border-2
/// border-current border-t-transparent` ring, `animate-spin`). Drawn as a
/// 270°-sweep stroked arc (one quadrant open = `border-t-transparent`),
/// rotating continuously — same approach as the Compose / SwiftUI ports.
class KinetixSpinner extends StatefulWidget {
  const KinetixSpinner({
    super.key,
    this.size = KinetixSpinnerSize.md,
    this.variant = KinetixSpinnerVariant.primary,
  });

  final KinetixSpinnerSize size;
  final KinetixSpinnerVariant variant;

  @override
  State<KinetixSpinner> createState() => _KinetixSpinnerState();
}

class _KinetixSpinnerState extends State<KinetixSpinner> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 800))..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final double d = switch (widget.size) {
      KinetixSpinnerSize.sm => 16,
      KinetixSpinnerSize.md => 24,
      KinetixSpinnerSize.lg => 32,
    };
    final Color color = switch (widget.variant) {
      KinetixSpinnerVariant.primary => c.primary,
      KinetixSpinnerVariant.muted => c.mutedForeground,
      KinetixSpinnerVariant.onColor => c.primaryForeground,
    };

    return SizedBox(
      width: d,
      height: d,
      child: RotationTransition(
        turns: _controller,
        child: CustomPaint(painter: _ArcPainter(color)),
      ),
    );
  }
}

class _ArcPainter extends CustomPainter {
  _ArcPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = color;
    final rect = Offset.zero & size;
    canvas.drawArc(rect.deflate(1), -math.pi / 2, math.pi * 1.5, false, paint);
  }

  @override
  bool shouldRepaint(_ArcPainter oldDelegate) => oldDelegate.color != color;
}
