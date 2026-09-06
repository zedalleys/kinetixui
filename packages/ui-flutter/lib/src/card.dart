import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';
import 'util.dart';

/// Mirrors `packages/ui/src/components/card.tsx`'s Card / CardHeader /
/// CardTitle / CardDescription / CardContent / CardFooter — thin styled
/// slots. `p-6` (24) and `radius-xl` (16) are on the shared token scale;
/// the `space-y-1.5` header gap (6) isn't. `shadow-sm` has no token — a
/// small literal shadow, same as the other ports.
class KinetixCard extends StatelessWidget {
  const KinetixCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border, width: 1),
        boxShadow: const [
          BoxShadow(color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: DefaultTextStyle.merge(
        style: AppText.bodyMd.copyWith(color: c.cardForeground),
        child: child,
      ),
    );
  }
}

class KinetixCardHeader extends StatelessWidget {
  const KinetixCardHeader({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: gapAll(children, 6),
      ),
    );
  }
}

class KinetixCardTitle extends StatelessWidget {
  const KinetixCardTitle(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Text(
      text,
      // titleMd size/family from the token scale; w600 + tight tracking are the
      // component's own (M3 titleMd is medium / +0.15).
      style: AppText.titleMd.copyWith(
        fontWeight: FontWeight.w600,
        letterSpacing: -0.4,
        color: c.foreground,
      ),
    );
  }
}

class KinetixCardDescription extends StatelessWidget {
  const KinetixCardDescription(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Text(text, style: AppText.bodyMd.copyWith(color: c.mutedForeground));
  }
}

class KinetixCardContent extends StatelessWidget {
  const KinetixCardContent({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24), // p-6 pt-0
      child: child,
    );
  }
}

class KinetixCardFooter extends StatelessWidget {
  const KinetixCardFooter({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      child: Row(mainAxisSize: MainAxisSize.min, children: gapAll(children, 8, axis: Axis.horizontal)),
    );
  }
}
