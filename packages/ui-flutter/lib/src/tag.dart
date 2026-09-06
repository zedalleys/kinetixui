import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/tag.tsx` (`tagVariants`). A
/// container-tinted, dismissible chip — `rounded-sm`, optional close
/// button. `destructive` / `warning` use the soft swapped treatment, same
/// as the other ports. Figma source: node 54855:14021.
enum KinetixTagVariant { primary, secondary, destructive, warning, outline }

class KinetixTag extends StatelessWidget {
  const KinetixTag(this.label, {super.key, this.variant = KinetixTagVariant.primary, this.onRemove});

  final String label;
  final KinetixTagVariant variant;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final (Color bg, Color fg, Color? border) = switch (variant) {
      KinetixTagVariant.primary => (c.accent, c.accentForeground, null),
      KinetixTagVariant.secondary => (c.secondary, c.secondaryForeground, null),
      KinetixTagVariant.destructive => (c.destructiveForeground, c.destructive, null),
      KinetixTagVariant.warning => (c.warningForeground, c.warning, null),
      KinetixTagVariant.outline => (Colors.transparent, c.foreground, c.border),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
        border: border != null ? Border.all(color: border, width: 1) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: AppText.labelMd.copyWith(color: fg),
          ),
          if (onRemove != null) ...[
            const SizedBox(width: 4),
            GestureDetector(
              onTap: onRemove,
              child: Icon(Icons.close, size: 14, color: fg),
            ),
          ],
        ],
      ),
    );
  }
}
