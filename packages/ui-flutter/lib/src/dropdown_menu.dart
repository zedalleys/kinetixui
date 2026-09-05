import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/dropdown-menu.tsx`. Wraps Flutter's
/// `MenuAnchor`, which renders items / separators / submenus and handles
/// dismissal — the "reuse the platform machinery" call. Put
/// `KinetixMenuItem` / `KinetixMenuSeparator` / `KinetixMenuLabel` (and
/// nested `SubmenuButton`s) in `menuChildren`; these row parts are shared
/// by KinetixContextMenu / KinetixMenubarMenu too.
class KinetixDropdownMenu extends StatelessWidget {
  const KinetixDropdownMenu({super.key, required this.menuChildren, required this.child});

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
        onTap: () => controller.isOpen ? controller.close() : controller.open(),
        child: child,
      ),
    );
  }
}

class KinetixMenuItem extends StatelessWidget {
  const KinetixMenuItem(
    this.label, {
    super.key,
    this.icon,
    this.destructive = false,
    required this.onPressed,
  });

  final String label;
  final IconData? icon;
  final bool destructive;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final Color color = destructive ? c.destructive : c.foreground;
    return MenuItemButton(
      onPressed: onPressed,
      leadingIcon: icon != null ? Icon(icon, size: 16, color: color) : null,
      child: Text(label, style: TextStyle(fontSize: 14, color: color)),
    );
  }
}

class KinetixMenuSeparator extends StatelessWidget {
  const KinetixMenuSeparator({super.key});

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Divider(height: 9, thickness: 1, color: c.border);
  }
}

class KinetixMenuLabel extends StatelessWidget {
  const KinetixMenuLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
      child: Text(
        text,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: c.mutedForeground),
      ),
    );
  }
}
