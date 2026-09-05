import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/button.tsx`'s `buttonVariants` CVA
/// 1:1 (variant × size × corners). Figma source: "KinetixUI" › UI
/// Components › 02. Controls & Actions › Button (node 54863:351). Same
/// contract as `KinetixButton` in the Compose / SwiftUI ports.
///
/// Not ported: the `state` CVA axis (Hover/Focus/Active — docs-only on the
/// web; `InkWell` gives real press feedback) and the `sr-only` label
/// treatment on the `icon` size. Padding / radii / type are hardcoded
/// from the Figma scale, annotated with the token each maps to.
enum KinetixButtonVariant { primary, secondary, outline, destructive, ghost, link }

enum KinetixButtonSize { sm, md, lg, icon }

/// The design source's Corners property. `standard` == React's default
/// (`rounded-md`).
enum KinetixCorners { sharp, standard, pill }

class KinetixButton extends StatelessWidget {
  const KinetixButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.variant = KinetixButtonVariant.primary,
    this.size = KinetixButtonSize.md,
    this.corners = KinetixCorners.standard,
  });

  /// `null` renders the disabled treatment (`--border` fill / `--muted-foreground` text).
  final VoidCallback? onPressed;
  final Widget child;
  final KinetixButtonVariant variant;
  final KinetixButtonSize size;
  final KinetixCorners corners;

  @override
  Widget build(BuildContext context) {
    final KinetixColors c = KinetixTheme.of(context);
    final bool enabled = onPressed != null;
    final bool isLink = variant == KinetixButtonVariant.link;

    // horizontal, vertical, fontSize, letterSpacing — Figma spacing + type scale
    final (double hPad, double vPad, double fontSize, double tracking) = switch (size) {
      KinetixButtonSize.sm => (12, 8, 11, 0.5), // spacing/3 + spacing/2 ; Label Small
      KinetixButtonSize.md => (16, 12, 12, 0.5), // spacing/4 + spacing/3 ; Label Medium
      KinetixButtonSize.lg => (24, 12, 14, 0.1), // spacing/6 + spacing/3 ; Label Large
      KinetixButtonSize.icon => (12, 12, 12, 0.5), // spacing/3 all round
    };

    final double radius = switch (corners) {
      KinetixCorners.sharp => 0, // radius/none
      KinetixCorners.standard => 8, // radius/md
      KinetixCorners.pill => 9999, // radius/full
    };

    late final Color bg;
    late final Color fg;
    Color? borderColor;

    if (!enabled) {
      fg = c.mutedForeground;
      bg = switch (variant) {
        KinetixButtonVariant.outline ||
        KinetixButtonVariant.ghost ||
        KinetixButtonVariant.link =>
          Colors.transparent,
        _ => c.border,
      };
      if (variant == KinetixButtonVariant.outline) borderColor = c.input;
    } else {
      switch (variant) {
        case KinetixButtonVariant.primary:
          bg = c.primary;
          fg = c.primaryForeground;
        case KinetixButtonVariant.secondary:
          bg = c.secondary;
          fg = c.secondaryForeground;
        case KinetixButtonVariant.outline:
          bg = Colors.transparent;
          fg = c.foreground;
          borderColor = c.input; // border/width/default
        case KinetixButtonVariant.destructive:
          bg = c.destructive;
          fg = c.destructiveForeground;
        case KinetixButtonVariant.ghost:
          bg = Colors.transparent;
          fg = c.foreground;
        case KinetixButtonVariant.link:
          bg = Colors.transparent;
          fg = c.primary;
      }
    }

    final BorderRadius borderRadius = BorderRadius.circular(isLink ? 0 : radius);

    return Material(
      color: Colors.transparent,
      borderRadius: borderRadius,
      child: InkWell(
        onTap: onPressed,
        borderRadius: borderRadius,
        child: Container(
          padding: EdgeInsets.symmetric(
            horizontal: isLink ? 0 : hPad,
            vertical: isLink ? 0 : vPad,
          ),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: borderRadius,
            border: borderColor != null ? Border.all(color: borderColor, width: 1) : null,
          ),
          child: DefaultTextStyle.merge(
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w500,
              letterSpacing: tracking,
              color: fg,
            ),
            child: IconTheme.merge(
              data: IconThemeData(color: fg, size: 18),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
