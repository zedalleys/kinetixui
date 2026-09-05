import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/context-menu.tsx`. Wraps a
/// `MenuAnchor` opened by long-press (mobile) or secondary-tap (desktop).
/// Put `KinetixMenuItem` / `KinetixMenuSeparator` / `KinetixMenuLabel`
/// (from dropdown_menu.dart) in `menuChildren`.
class KinetixContextMenu extends StatelessWidget {
  const KinetixContextMenu({super.key, required this.menuChildren, required this.child});

  final List<Widget> menuChildren;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return MenuAnchor(
      style: MenuStyle(
        backgroundColor: WidgetStatePropertyAll(c.popover),
        surfaceTintColor: const WidgetStatePropertyAll(Color(0x00000000)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: c.border),
          ),
        ),
      ),
      menuChildren: menuChildren,
      builder: (context, controller, _) => GestureDetector(
        behavior: HitTestBehavior.opaque,
        onLongPress: controller.open,
        onSecondaryTapDown: (_) => controller.open(),
        child: child,
      ),
    );
  }
}
