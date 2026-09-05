import 'package:flutter/widgets.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/skeleton.tsx` (`animate-pulse
/// rounded-md bg-muted`). Sized by the caller — pass `width` / `height`
/// (or wrap in a `SizedBox`).
class KinetixSkeleton extends StatefulWidget {
  const KinetixSkeleton({super.key, this.width, this.height, this.borderRadius = 8});

  final double? width;
  final double? height;
  final double borderRadius;

  @override
  State<KinetixSkeleton> createState() => _KinetixSkeletonState();
}

class _KinetixSkeletonState extends State<KinetixSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(seconds: 1))..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return FadeTransition(
      opacity: Tween<double>(begin: 1, end: 0.5).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
      ),
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: c.muted,
          borderRadius: BorderRadius.circular(widget.borderRadius),
        ),
      ),
    );
  }
}
