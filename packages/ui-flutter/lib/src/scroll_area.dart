import 'package:flutter/widgets.dart';

/// Mirrors `packages/ui/src/components/scroll-area.tsx`. Wraps
/// `SingleChildScrollView` — the custom Radix scrollbar isn't reproduced
/// (the platform's own indicators take its place), same as the other
/// ports.
class KinetixScrollArea extends StatelessWidget {
  const KinetixScrollArea({super.key, required this.child, this.axis = Axis.vertical});

  final Widget child;
  final Axis axis;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(scrollDirection: axis, child: child);
  }
}
