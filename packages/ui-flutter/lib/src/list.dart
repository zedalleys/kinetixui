import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirror `packages/ui/src/components/list.tsx`: single-column rows
/// (leading slot, title, optional description, trailing slot). Each row
/// draws its own bottom divider. `onTap` makes the row pressable.
class KinetixList extends StatelessWidget {
  const KinetixList({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }
}

class KinetixListItem extends StatelessWidget {
  const KinetixListItem({
    super.key,
    required this.title,
    this.description,
    this.leading,
    this.trailing,
    this.onTap,
  });

  final String title;
  final String? description;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);

    final Widget row = DecoratedBox(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.border, width: 1)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Row(
          children: [
            if (leading != null) ...[leading!, const SizedBox(width: 12)],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.bodyMd.copyWith(color: c.foreground),
                  ),
                  if (description != null)
                    Text(
                      description!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: c.mutedForeground),
                    ),
                ],
              ),
            ),
            if (trailing != null) ...[const SizedBox(width: 12), trailing!],
          ],
        ),
      ),
    );

    if (onTap == null) return row;
    return GestureDetector(onTap: onTap, behavior: HitTestBehavior.opaque, child: row);
  }
}
