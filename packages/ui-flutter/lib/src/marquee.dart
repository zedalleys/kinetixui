import 'package:flutter/material.dart';

/// Mirrors `packages/ui/src/components/marquee.tsx`: an auto-scrolling
/// horizontal ticker (logo strip, testimonials). Measures `child`'s width
/// after the first frame, then drives a repeating [AnimationController]
/// translating a duplicated row by exactly `-width` per loop — the same
/// "duplicate + shift by one content-width" technique as the web version,
/// since Flutter has no CSS keyframe to lean on. The duplicate copy is
/// wrapped in `Semantics(excludeSemantics: true)`, same accessibility fix
/// as the web port. `pauseOnHover` isn't ported — hover isn't a primary
/// mobile interaction, unlike the web (and desktop-pointer) case it's
/// built for.
class KinetixMarquee extends StatefulWidget {
  const KinetixMarquee({super.key, required this.child, this.duration = const Duration(seconds: 32)});

  final Widget child;
  final Duration duration;

  @override
  State<KinetixMarquee> createState() => _KinetixMarqueeState();
}

class _KinetixMarqueeState extends State<KinetixMarquee> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  final GlobalKey _contentKey = GlobalKey();
  double _contentWidth = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration)..repeat();
    WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
  }

  void _measure() {
    final box = _contentKey.currentContext?.findRenderObject() as RenderBox?;
    if (box != null && mounted && box.size.width != _contentWidth) {
      setState(() => _contentWidth = box.size.width);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: ShaderMask(
        shaderCallback: (bounds) => const LinearGradient(
          colors: [Colors.transparent, Colors.black, Colors.black, Colors.transparent],
          stops: [0, 0.08, 0.92, 1],
        ).createShader(bounds),
        blendMode: BlendMode.dstIn,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            final dx = _contentWidth == 0 ? 0.0 : -_controller.value * _contentWidth;
            return Transform.translate(
              offset: Offset(dx, 0),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  KeyedSubtree(key: _contentKey, child: widget.child),
                  Semantics(excludeSemantics: true, child: widget.child),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
