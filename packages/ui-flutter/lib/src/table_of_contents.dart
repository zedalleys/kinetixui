import 'package:flutter/widgets.dart';

import 'theme.dart';

class KinetixTocItem {
  const KinetixTocItem({required this.id, required this.label, this.level = 1});

  final String id;
  final String label;
  final int level;
}

/// Mirrors `packages/ui/src/components/table-of-contents.tsx`: an
/// anchor-link nav list with indent levels and an active-item state
/// (drive `active` from your own scroll-spy). The `<a href="#id">`
/// navigation becomes an `onSelect(id)` callback.
class KinetixTableOfContents extends StatelessWidget {
  const KinetixTableOfContents({
    super.key,
    required this.items,
    required this.onSelect,
    this.active,
  });

  final List<KinetixTocItem> items;
  final ValueChanged<String> onSelect;
  final String? active;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final item in items)
          GestureDetector(
            onTap: () => onSelect(item.id),
            behavior: HitTestBehavior.opaque,
            child: Container(
              decoration: BoxDecoration(
                border: Border(
                  left: BorderSide(
                    color: item.id == active ? c.primary : const Color(0x00000000),
                    width: 1,
                  ),
                ),
              ),
              padding: EdgeInsets.only(left: (item.level - 1) * 12 + 12, top: 6, bottom: 6),
              child: Text(
                item.label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: item.id == active ? FontWeight.w500 : FontWeight.w400,
                  color: item.id == active ? c.primary : c.mutedForeground,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
