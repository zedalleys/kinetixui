import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'kinetix_selection_indicator.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/segmented-control.tsx`: an
/// iOS-style single-select strip. Same visual treatment as
/// [KinetixTabsList]/[KinetixTabsTrigger] (filled track, raised selected
/// segment) and the same caller-owns-the-selected-value shape — no root
/// holds shared state, [KinetixSegmentedControlItem] takes `selected`/
/// `onTap` directly, same as `KinetixTabs`.
class KinetixSegmentedControl extends StatelessWidget {
  const KinetixSegmentedControl({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final selected = <int>[];
    final builtIn =
        children.every((child) => child is KinetixSegmentedControlItem);
    if (builtIn) {
      for (var index = 0; index < children.length; index++) {
        if ((children[index] as KinetixSegmentedControlItem).selected) {
          selected.add(index);
        }
      }
    }
    final sharesSurface = builtIn && selected.length < 2;
    return Container(
      padding: const EdgeInsets.all(4), // spacing/1
      decoration: BoxDecoration(
          color: c.muted, borderRadius: BorderRadius.circular(12)), // radius/lg
      child: KinetixSelectionIndicator(
        selectedIndex:
            sharesSurface && selected.isNotEmpty ? selected.single : -1,
        sharesSurface: sharesSurface,
        children: [for (final child in children) Expanded(child: child)],
      ),
    );
  }
}

class KinetixSegmentedControlItem extends StatelessWidget {
  const KinetixSegmentedControlItem(this.text,
      {super.key, required this.selected, required this.onTap});

  final String text;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final paintSelection =
        selected && !KinetixSelectionSurfaceScope.of(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: 12, vertical: 4), // px-3 py-1
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: paintSelection ? c.background : const Color(0x00000000),
          borderRadius: BorderRadius.circular(8), // radius/md
          boxShadow: paintSelection
              ? const [
                  BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 2,
                      offset: Offset(0, 1))
                ]
              : null,
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: AppText.labelMd
              .copyWith(color: selected ? c.foreground : c.mutedForeground),
        ),
      ),
    );
  }
}
