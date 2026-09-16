import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';
import 'util.dart';

/// Mirrors `packages/ui/src/components/empty.tsx`. A placeholder for a
/// zero-results state — thin styled slots, same "no fixed schema" approach
/// as [KinetixCard]. [KinetixEmpty] itself carries no border/background
/// (composes cleanly inside whatever already has one). Gap-fill addition
/// (not in the original Figma source) — matches the shadcn/ui Empty API
/// shape.
class KinetixEmpty extends StatelessWidget {
  const KinetixEmpty({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      // p-10, not on the shared spacing scale
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: gapAll(children, 24), // spacing/6
      ),
    );
  }
}

class KinetixEmptyHeader extends StatelessWidget {
  const KinetixEmptyHeader({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: gapAll(children, 8), // spacing/2
    );
  }
}

enum KinetixEmptyMediaVariant { standard, icon }

class KinetixEmptyMedia extends StatelessWidget {
  const KinetixEmptyMedia({super.key, this.variant = KinetixEmptyMediaVariant.standard, required this.child});

  final KinetixEmptyMediaVariant variant;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (variant != KinetixEmptyMediaVariant.icon) return child;
    final c = KinetixTheme.of(context);
    return Container(
      padding: const EdgeInsets.all(8), // spacing/2
      decoration: BoxDecoration(color: c.muted, shape: BoxShape.circle),
      child: IconTheme.merge(data: IconThemeData(color: c.mutedForeground), child: child),
    );
  }
}

class KinetixEmptyTitle extends StatelessWidget {
  const KinetixEmptyTitle(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Text(
      text,
      textAlign: TextAlign.center,
      style: AppText.titleSm.copyWith(fontWeight: FontWeight.w500, color: c.foreground),
    );
  }
}

class KinetixEmptyDescription extends StatelessWidget {
  const KinetixEmptyDescription(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Text(
      text,
      textAlign: TextAlign.center,
      style: AppText.bodySm.copyWith(color: c.mutedForeground),
    );
  }
}

class KinetixEmptyContent extends StatelessWidget {
  const KinetixEmptyContent({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: gapAll(children, 12), // spacing/3
    );
  }
}
