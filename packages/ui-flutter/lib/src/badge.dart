import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/badge.tsx`'s `badgeVariants` CVA.
/// Solid pill status marker. Figma source: node 54855:13995. The
/// `secondary` variant swaps container/content (the design's sage is
/// `--secondary-foreground`), same as the other ports.
enum KinetixBadgeVariant { primary, secondary, destructive, outline, subtle }

class KinetixBadge extends StatelessWidget {
  const KinetixBadge(this.label, {super.key, this.variant = KinetixBadgeVariant.primary});

  final String label;
  final KinetixBadgeVariant variant;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final (Color bg, Color fg, Color? border) = switch (variant) {
      KinetixBadgeVariant.primary => (c.primary, c.primaryForeground, null),
      KinetixBadgeVariant.secondary => (c.secondaryForeground, c.secondary, null),
      KinetixBadgeVariant.destructive => (c.destructive, c.destructiveForeground, null),
      KinetixBadgeVariant.outline => (const Color(0x00000000), c.foreground, c.border),
      KinetixBadgeVariant.subtle => (c.accent, c.accentForeground, null),
    };

    return Container(
      // px-2.5 isn't on the shared spacing scale — 10 mirrors the React literal.
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(9999),
        border: border != null ? Border.all(color: border, width: 1) : null,
      ),
      child: Text(
        label,
        style: AppText.labelMd.copyWith(color: fg),
      ),
    );
  }
}
