import 'package:flutter/material.dart';

import 'theme.dart';

enum KinetixRatingSize { sm, md, lg }

/// Mirrors `packages/ui/src/components/rating.tsx`: a row of `max` stars,
/// filled up to `value` (`--warning`) or outlined
/// (`--muted-foreground`). `sm`/`md`/`lg` = 16/20/24. A `null` `onChanged`
/// renders a static display.
class KinetixRating extends StatelessWidget {
  const KinetixRating({
    super.key,
    required this.value,
    this.max = 5,
    this.size = KinetixRatingSize.md,
    this.onChanged,
  });

  final int value;
  final int max;
  final KinetixRatingSize size;
  final ValueChanged<int>? onChanged;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final double starSize = switch (size) {
      KinetixRatingSize.sm => 16,
      KinetixRatingSize.md => 20,
      KinetixRatingSize.lg => 24,
    };

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= max; i++)
          GestureDetector(
            onTap: onChanged == null ? null : () => onChanged!(i),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1),
              child: Icon(
                i <= value ? Icons.star : Icons.star_border,
                size: starSize,
                color: i <= value ? c.warning : c.mutedForeground,
              ),
            ),
          ),
      ],
    );
  }
}
