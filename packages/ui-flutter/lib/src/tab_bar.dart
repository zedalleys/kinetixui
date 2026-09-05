import 'package:flutter/widgets.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/tab-bar.tsx`: a mobile bottom
/// navigation bar — a fixed row of icon + label destinations, active item
/// driven by `isActive`, optional `badge`.
class KinetixTabBar extends StatelessWidget {
  const KinetixTabBar({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: c.background,
        border: Border(top: BorderSide(color: c.border, width: 1)),
      ),
      child: Row(children: [for (final item in children) Expanded(child: item)]),
    );
  }
}

class KinetixTabBarItem extends StatelessWidget {
  const KinetixTabBarItem({
    super.key,
    required this.label,
    required this.icon,
    required this.onTap,
    this.isActive = false,
    this.badge,
  });

  final String label;
  final Widget icon;
  final VoidCallback onTap;
  final bool isActive;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final Color color = isActive ? c.primary : c.mutedForeground;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                IconTheme.merge(
                  data: IconThemeData(color: color, size: 20),
                  child: icon,
                ),
                if (badge != null)
                  Positioned(
                    right: -8,
                    top: -6,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: c.destructive,
                        borderRadius: BorderRadius.circular(9999),
                      ),
                      child: Text(
                        badge!,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          color: c.destructiveForeground,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: color)),
          ],
        ),
      ),
    );
  }
}
