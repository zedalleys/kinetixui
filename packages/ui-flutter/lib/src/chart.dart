import 'package:flutter/widgets.dart';

import 'theme.dart';

class KinetixChartPoint {
  const KinetixChartPoint({required this.label, required this.value, this.seriesIndex = 0});

  final String label;
  final double value;
  final int seriesIndex;
}

/// Mirrors `packages/ui/src/components/chart.tsx` (a recharts theming
/// shell). Flutter has no system charting framework and this package
/// takes no charting dependency, so `KinetixChart` hand-draws a **bar
/// chart** with `CustomPaint` — bars scaled to the max value, coloured
/// from the `--chart-1…5` token palette (`KinetixColors.chart`). Line /
/// area kinds are a follow-up (a real charting library is the call there,
/// same as the Compose port deferred).
class KinetixChart extends StatelessWidget {
  const KinetixChart(this.points, {super.key, this.height = 200});

  final List<KinetixChartPoint> points;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: _BarChartPainter(
          points: points,
          palette: c.chart,
          axis: c.border,
          labelColor: c.mutedForeground,
        ),
      ),
    );
  }
}

class _BarChartPainter extends CustomPainter {
  _BarChartPainter({
    required this.points,
    required this.palette,
    required this.axis,
    required this.labelColor,
  });

  final List<KinetixChartPoint> points;
  final List<Color> palette;
  final Color axis;
  final Color labelColor;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    const double labelHeight = 18;
    final double chartHeight = size.height - labelHeight;
    final double maxValue = points.map((p) => p.value).fold<double>(0, (a, b) => a > b ? a : b);
    if (maxValue <= 0) return;

    // baseline
    final axisPaint = Paint()
      ..color = axis
      ..strokeWidth = 1;
    canvas.drawLine(Offset(0, chartHeight), Offset(size.width, chartHeight), axisPaint);

    final double slot = size.width / points.length;
    final double barWidth = slot * 0.6;

    for (var i = 0; i < points.length; i++) {
      final p = points[i];
      final double h = (p.value / maxValue) * (chartHeight - 4);
      final double left = i * slot + (slot - barWidth) / 2;
      final rect = Rect.fromLTWH(left, chartHeight - h, barWidth, h);
      final barPaint = Paint()..color = palette[p.seriesIndex % palette.length];
      canvas.drawRRect(
        RRect.fromRectAndCorners(rect, topLeft: const Radius.circular(3), topRight: const Radius.circular(3)),
        barPaint,
      );

      final tp = TextPainter(
        text: TextSpan(text: p.label, style: TextStyle(fontSize: 10, color: labelColor)),
        textDirection: TextDirection.ltr,
        maxLines: 1,
        ellipsis: '…',
      )..layout(maxWidth: slot);
      tp.paint(canvas, Offset(i * slot + (slot - tp.width) / 2, chartHeight + 4));
    }
  }

  @override
  bool shouldRepaint(_BarChartPainter oldDelegate) =>
      oldDelegate.points != points || oldDelegate.palette != palette;
}
