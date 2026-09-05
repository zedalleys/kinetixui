import 'package:flutter/widgets.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/tabs.tsx`. No root — the caller
/// owns the selected value; `KinetixTabsTrigger` takes `selected` /
/// `onTap` directly. `h-9` (36) is off the shared spacing scale.
class KinetixTabsList extends StatelessWidget {
  const KinetixTabsList({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      height: 36,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: c.muted, borderRadius: BorderRadius.circular(12)),
      child: Row(mainAxisSize: MainAxisSize.min, children: children),
    );
  }
}

class KinetixTabsTrigger extends StatelessWidget {
  const KinetixTabsTrigger(this.text, {super.key, required this.selected, required this.onTap});

  final String text;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? c.background : const Color(0x00000000),
          borderRadius: BorderRadius.circular(8),
          boxShadow: selected
              ? const [BoxShadow(color: Color(0x14000000), blurRadius: 2, offset: Offset(0, 1))]
              : null,
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: selected ? c.foreground : c.mutedForeground,
          ),
        ),
      ),
    );
  }
}

class KinetixTabsContent extends StatelessWidget {
  const KinetixTabsContent({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(padding: const EdgeInsets.only(top: 8), child: child); // mt-2
  }
}
