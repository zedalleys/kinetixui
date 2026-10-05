import 'package:flutter/widgets.dart';

/// The one shape every component-owned, icon-only control in this package takes — a dismiss mark, a dialog's
/// close, a back chevron. Internal: not exported from `kinetix_ui.dart`.
///
/// It owns what the icon contract (/docs/icons) says the component owns, so the icon inside it — the default,
/// or one the application passes in — only has to draw itself:
///
/// * the accessible name and button role, with the icon itself excluded from semantics, so a screen reader
///   says "Dismiss, button" rather than nothing (a bare `GestureDetector` exposes a tap action with no name);
/// * the icon's box: an [IconTheme] carrying [size] and [color], inside a square of [size] that passes tight
///   constraints down, so an `Icon` of any icon font inherits both and any other widget (an SVG, an image)
///   is laid out at exactly the same size.
class IconControl extends StatelessWidget {
  const IconControl({
    super.key,
    required this.label,
    required this.onTap,
    required this.size,
    required this.color,
    required this.child,
    this.padding = EdgeInsets.zero,
  });

  final String label;
  final VoidCallback? onTap;
  final double size;
  final Color color;
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      button: true,
      enabled: onTap != null,
      // The tap action is declared here, not left to the GestureDetector below: excludeSemantics drops every
      // descendant's semantics — the icon's, and the detector's tap action with it — so without `onTap` the
      // node has a name and a role but nothing for a screen reader's activate gesture to do.
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: padding,
          child: SizedBox.square(
            dimension: size,
            child: IconTheme.merge(
              data: IconThemeData(size: size, color: color),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
