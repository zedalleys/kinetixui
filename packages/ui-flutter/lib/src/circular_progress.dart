import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/circular-progress.tsx`: a ring,
/// `--muted` track / `--primary` round-capped indicator, optional centred
/// value label. `size` / `strokeWidth` default to the React defaults.
class KinetixCircularProgress extends StatelessWidget {
  const KinetixCircularProgress({
    super.key,
    required this.value,
    this.size = 48,
    this.strokeWidth = 4,
    this.showValue = false,
    this.label,
  });

  final double value;
  final double size;
  final double strokeWidth;
  final bool showValue;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final double fraction = (value / 100).clamp(0.0, 1.0);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size.square(size),
            painter: _RingPainter(
              track: c.muted,
              indicator: c.primary,
              fraction: fraction,
              strokeWidth: strokeWidth,
            ),
          ),
          if (showValue || label != null)
            Text(
              label ?? '${(fraction * 100).round()}%',
              style: AppText.labelMd.copyWith(color: c.foreground),
            ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.track,
    required this.indicator,
    required this.fraction,
    required this.strokeWidth,
  });

  final Color track;
  final Color indicator;
  final double fraction;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final Rect inset = (Offset.zero & size).deflate(strokeWidth / 2);
    final Paint base = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    canvas.drawArc(inset, 0, math.pi * 2, false, base..color = track);
    canvas.drawArc(
      inset,
      -math.pi / 2,
      math.pi * 2 * fraction,
      false,
      base
        ..color = indicator
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) =>
      oldDelegate.fraction != fraction ||
      oldDelegate.indicator != indicator ||
      oldDelegate.track != track;
}
