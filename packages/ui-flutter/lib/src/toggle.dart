import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'kinetix_selection_motion.dart';
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
    // A pressable toggle button: announce button role, pressed state and disabled.
    return Semantics(
      container: true,
      button: true,
      toggled: pressed,
      enabled: onChanged != null,
      child: _buildControl(context),
    );
  }

  Widget _buildControl(BuildContext context) {
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
        // `selection-state` (fast, standard) on the background and the border, and on the
        // content colour through one ColorTween that feeds both the text style and the icon
        // theme. `DefaultTextStyle.merge` is kept rather than swapped for
        // `AnimatedDefaultTextStyle`, which SETS a style instead of merging one: that would
        // have dropped whatever the surrounding app contributes, a visual change nobody asked
        // for in a motion slice.
        // The geometry that `size` decides — height, minimum width and the horizontal padding —
        // stays OUTSIDE the animated box on purpose. Inside it, a caller moving `size` at a
        // breakpoint would interpolate all three over `fast`, and `selection-state` is a colour and
        // surface role: it sanctions no layout movement, which is the one thing Reduce Motion exists
        // to remove. Only the decoration settles.
        child: SizedBox(
          height: dim,
          child: ConstrainedBox(
            constraints: BoxConstraints(minWidth: dim),
            child: AnimatedContainer(
              duration: KinetixSelectionMotion.durationOf(context),
              curve: KinetixSelectionMotion.curve,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: pressed ? c.accent : const Color(0x00000000),
                borderRadius: BorderRadius.circular(8),
                border: showBorder ? Border.all(color: pressed ? c.focus : c.input, width: 1) : null,
              ),
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: hPad),
                child: TweenAnimationBuilder<Color?>(
                  tween: ColorTween(end: contentColor),
                  duration: KinetixSelectionMotion.durationOf(context),
                  curve: KinetixSelectionMotion.curve,
                  builder: (context, color, child) => DefaultTextStyle.merge(
                    style: AppText.labelLg.copyWith(color: color),
                    child: IconTheme.merge(
                      data: IconThemeData(color: color, size: 16),
                      child: child!,
                    ),
                  ),
                  child: child,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
