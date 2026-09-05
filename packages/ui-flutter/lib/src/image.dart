import 'package:flutter/material.dart';

import 'theme.dart';

enum KinetixImageRatio { square, threeToTwo, fourToThree, threeToFour, threeToOne, sixteenToNine }

/// Mirrors `packages/ui/src/components/image.tsx`: a ratio-locked network
/// image with a muted placeholder while loading and a fallback on error
/// (presets 1:1 / 3:2 / 4:3 / 3:4 / 3:1 / 16:9, or `customRatio`).
class KinetixImage extends StatelessWidget {
  const KinetixImage({
    super.key,
    required this.url,
    this.ratio = KinetixImageRatio.square,
    this.rounded = true,
    this.customRatio,
  });

  final String url;
  final KinetixImageRatio ratio;
  final bool rounded;
  final double? customRatio;

  double get _ratio =>
      customRatio ??
      switch (ratio) {
        KinetixImageRatio.square => 1,
        KinetixImageRatio.threeToTwo => 3 / 2,
        KinetixImageRatio.fourToThree => 4 / 3,
        KinetixImageRatio.threeToFour => 3 / 4,
        KinetixImageRatio.threeToOne => 3,
        KinetixImageRatio.sixteenToNine => 16 / 9,
      };

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(rounded ? 8 : 0),
      child: AspectRatio(
        aspectRatio: _ratio,
        child: Image.network(
          url,
          fit: BoxFit.cover,
          loadingBuilder: (ctx, child, progress) => progress == null ? child : ColoredBox(color: c.muted),
          errorBuilder: (ctx, error, stackTrace) => ColoredBox(
            color: c.muted,
            child: Center(
              child: Icon(Icons.broken_image_outlined, size: 24, color: c.mutedForeground),
            ),
          ),
        ),
      ),
    );
  }
}
