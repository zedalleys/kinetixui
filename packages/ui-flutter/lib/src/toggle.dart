import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/toggle.tsx` (`toggleVariants`).
/// Sizes 32/36/40 + padding 6/8/10 (hardcoded where off-scale). Pressed =
/// `bg-accent` + `text-accent-foreground` + inset ring; unpressed =
/// transparent + `foreground`. `standard` == the React default variant.
enum KinetixToggleVariant { standard, outline }

enum KinetixToggleSize { sm, md, lg }

class KinetixToggle extends StatelessWidget {
  const KinetixToggle({
    super.key,
    required this.pressed,
    required this.onChanged,
    required this.child,
    this.variant = KinetixToggleVariant.standard,
    this.size = KinetixToggleSize.md,
  });

  final bool pressed;
  final ValueChanged<bool>? onChanged;
  final Widget child;
  final KinetixToggleVariant variant;
  final KinetixToggleSize size;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final bool enabled = onChanged != null;
    final (double dim, double hPad) = switch (size) {
      KinetixToggleSize.sm => (32, 6),
      KinetixToggleSize.md => (36, 8),
      KinetixToggleSize.lg => (40, 10),
    };
    final bool showBorder = pressed || variant == KinetixToggleVariant.outline;
    final Color contentColor = pressed ? c.accentForeground : c.foreground;

    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: GestureDetector(
        onTap: enabled ? () => onChanged!(!pressed) : null,
        child: Container(
          height: dim,
          constraints: BoxConstraints(minWidth: dim),
          padding: EdgeInsets.symmetric(horizontal: hPad),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: pressed ? c.accent : const Color(0x00000000),
            borderRadius: BorderRadius.circular(8),
            border: showBorder ? Border.all(color: pressed ? c.ring : c.input, width: 1) : null,
          ),
          child: DefaultTextStyle.merge(
            style: AppText.labelLg.copyWith(color: contentColor),
            child: IconTheme.merge(
              data: IconThemeData(color: contentColor, size: 16),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
