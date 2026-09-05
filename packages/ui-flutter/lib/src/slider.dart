import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/slider.tsx`. Wraps Flutter's
/// `Slider` re-themed onto the token contract — the "reuse the platform
/// control" call, same as the Compose / SwiftUI ports. The thumb uses the
/// system size/shape, not the source's exact `size-4` circle (a
/// documented gap).
class KinetixSlider extends StatelessWidget {
  const KinetixSlider({
    super.key,
    required this.value,
    required this.onChanged,
    this.min = 0,
    this.max = 1,
  });

  final double value;
  final ValueChanged<double>? onChanged;
  final double min;
  final double max;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return SliderTheme(
      data: SliderThemeData(
        activeTrackColor: c.primary,
        inactiveTrackColor: c.muted,
        thumbColor: c.background,
        overlayColor: c.primary.withValues(alpha: 0.12),
      ),
      child: Slider(
        value: value.clamp(min, max),
        min: min,
        max: max,
        onChanged: onChanged,
      ),
    );
  }
}
