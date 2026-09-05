import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/menubar.tsx`: a bordered bar of
/// top-level menus. Wraps Flutter's `MenuBar` / `SubmenuButton`; fill
/// each menu with the shared `KinetixMenuItem` / `KinetixMenuSeparator` /
/// `KinetixMenuLabel` parts from dropdown_menu.dart.
class KinetixMenubar extends StatelessWidget {
  const KinetixMenubar({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return MenuBar(
      style: MenuStyle(
        backgroundColor: WidgetStatePropertyAll(c.background),
        surfaceTintColor: const WidgetStatePropertyAll(Color(0x00000000)),
        elevation: const WidgetStatePropertyAll(0),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: c.border),
          ),
        ),
      ),
      children: children,
    );
  }
}

class KinetixMenubarMenu extends StatelessWidget {
  const KinetixMenubarMenu(this.title, {super.key, required this.menuChildren});

  final String title;
  final List<Widget> menuChildren;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return SubmenuButton(
      menuChildren: menuChildren,
      child: Text(
        title,
        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: c.foreground),
      ),
    );
  }
}
