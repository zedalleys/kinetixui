import 'package:flutter/material.dart';

import 'theme.dart';

enum KinetixMetricTrend { up, down, neutral }

/// Mirrors `packages/ui/src/components/metric.tsx`: a stat / KPI card
/// (label, value, optional trend + change, optional icon slot). Trend
/// arrows are `arrow_upward` / `arrow_downward`. The chart slot isn't
/// ported — compose your own below the metric.
class KinetixMetric extends StatelessWidget {
  const KinetixMetric({
    super.key,
    required this.label,
    required this.value,
    this.trend,
    this.change,
    this.icon,
  });

  final String label;
  final String value;
  final KinetixMetricTrend? trend;
  final String? change;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final Color trendColor = switch (trend) {
      KinetixMetricTrend.up => c.success,
      KinetixMetricTrend.down => c.destructive,
      _ => c.mutedForeground,
    };

    return Container(
      padding: const EdgeInsets.all(16), // p-4
      decoration: BoxDecoration(
        color: c.background,
        borderRadius: BorderRadius.circular(8), // radius/md
        border: Border.all(color: c.input, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(label, style: TextStyle(fontSize: 13, color: c.mutedForeground)),
              ),
              if (icon != null)
                IconTheme.merge(
                  data: IconThemeData(color: c.mutedForeground, size: 20),
                  child: icon!,
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                value,
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w500, color: c.foreground),
              ),
              const Spacer(),
              if (trend != null)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (trend != KinetixMetricTrend.neutral)
                      Icon(
                        trend == KinetixMetricTrend.up ? Icons.arrow_upward : Icons.arrow_downward,
                        size: 14,
                        color: trendColor,
                      ),
                    if (change != null)
                      Text(
                        change!,
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: trendColor),
                      ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }
}
