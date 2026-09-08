import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/app-bar.tsx`: a top application bar
/// — a `brand` slot, a row of primary nav links ([KinetixAppBarLink],
/// `active` marks the current one) and a trailing `actions` slot, in a
/// bordered header. The React component's `md`-breakpoint
/// collapse-to-menu-toggle is dropped — a native top bar keeps the nav
/// visible, horizontally scrollable if it overflows; same kind of
/// scope-down as `KinetixSheet` (bottom-only). `KinetixNavigationBar`
/// remains the mobile back-button bar.
class KinetixAppBar extends StatelessWidget {
  const KinetixAppBar({
    super.key,
    this.brand,
    this.nav = const <Widget>[],
    this.actions = const <Widget>[],
  });

  final Widget? brand;
  final List<Widget> nav;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      height: 56, // h-14
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: c.background,
        border: Border(bottom: BorderSide(color: c.border, width: 1)),
      ),
      child: Row(
        children: [
          if (brand != null) ...[brand!, const SizedBox(width: 16)],
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final item in nav)
                    Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: item,
                    ),
                ],
              ),
            ),
          ),
          for (final action in actions)
            Padding(padding: const EdgeInsets.only(left: 8), child: action),
        ],
      ),
    );
  }
}

/// A primary nav link inside a [KinetixAppBar]. `active` = the current destination.
class KinetixAppBarLink extends StatelessWidget {
  const KinetixAppBarLink(
    this.label, {
    super.key,
    required this.onTap,
    this.active = false,
  });

  final String label;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6), // px-3 py-1.5
        decoration: BoxDecoration(
          color: active ? c.accent : Colors.transparent,
          borderRadius: BorderRadius.circular(6), // rounded-md
        ),
        child: Text(
          label,
          style: AppText.labelMd.copyWith(
            color: active ? c.foreground : c.mutedForeground,
          ),
        ),
      ),
    );
  }
}
