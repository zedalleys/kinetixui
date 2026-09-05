import 'package:flutter/widgets.dart';

/// Mirrors `packages/ui/src/components/carousel.tsx` (a themed wrapper
/// over embla-carousel). Wraps Flutter's `PageView` — swipe paging, snap
/// and programmatic scroll (via the optional `controller`) for free, the
/// "reuse the platform's gesture/paging machinery" call. Wrap it in a
/// `SizedBox` / `AspectRatio` for a bounded height.
class KinetixCarousel extends StatelessWidget {
  const KinetixCarousel({
    super.key,
    required this.itemCount,
    required this.itemBuilder,
    this.controller,
    this.onPageChanged,
  });

  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final PageController? controller;
  final ValueChanged<int>? onPageChanged;

  @override
  Widget build(BuildContext context) {
    return PageView.builder(
      controller: controller,
      itemCount: itemCount,
      onPageChanged: onPageChanged,
      itemBuilder: itemBuilder,
    );
  }
}
