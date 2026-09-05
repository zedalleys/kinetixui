import 'package:flutter/widgets.dart';

/// Mirrors `packages/ui/src/components/aspect-ratio.tsx`, a bare
/// re-export of Radix's `AspectRatio.Root`. Flutter has `AspectRatio`
/// built in — this just gives it a `Kinetix`-prefixed name for
/// consistency with the rest of the package.
class KinetixAspectRatio extends StatelessWidget {
  const KinetixAspectRatio({super.key, required this.ratio, required this.child});

  /// width / height.
  final double ratio;
  final Widget child;

  @override
  Widget build(BuildContext context) => AspectRatio(aspectRatio: ratio, child: child);
}
