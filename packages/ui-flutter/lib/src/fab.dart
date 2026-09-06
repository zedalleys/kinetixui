import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

enum KinetixFabVariant { primary, secondary }

enum KinetixFabSize { standard, sm }

/// Mirrors `packages/ui/src/components/fab.tsx` (`fabVariants`): a
/// floating action button, circular by default or an extended pill.
/// `size-14` / `size-11` (56 / 44) are off the shared spacing scale.
/// Hover/active colour shifts not ported.
class KinetixFab extends StatelessWidget {
  const KinetixFab({
    super.key,
    required this.onPressed,
    required this.child,
    this.variant = KinetixFabVariant.primary,
    this.size = KinetixFabSize.standard,
    this.extended = false,
  });

  final VoidCallback? onPressed;
  final Widget child;
  final KinetixFabVariant variant;
  final KinetixFabSize size;
  final bool extended;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final double d = size == KinetixFabSize.standard ? 56 : 44;
    final Color bg = variant == KinetixFabVariant.primary ? c.primary : c.secondary;
    final Color fg = variant == KinetixFabVariant.primary ? c.primaryForeground : c.secondaryForeground;

    final Widget label = DefaultTextStyle.merge(
      style: (size == KinetixFabSize.standard ? AppText.titleMd : AppText.labelLg).copyWith(color: fg),
      child: IconTheme.merge(
        data: IconThemeData(color: fg, size: size == KinetixFabSize.standard ? 24 : 20),
        child: child,
      ),
    );

    return Opacity(
      opacity: onPressed == null ? 0.5 : 1,
      child: Material(
        color: bg,
        elevation: 6,
        shape: const StadiumBorder(),
        child: InkWell(
          onTap: onPressed,
          customBorder: const StadiumBorder(),
          child: extended
              ? Container(
                  height: d,
                  constraints: BoxConstraints(minWidth: d),
                  padding: const EdgeInsets.symmetric(horizontal: 20), // px-5
                  alignment: Alignment.center,
                  child: label,
                )
              : SizedBox(width: d, height: d, child: Center(child: label)),
        ),
      ),
    );
  }
}
