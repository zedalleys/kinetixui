import 'package:flutter/widgets.dart';

import 'theme.dart';

enum KinetixDescriptionListLayout { row, stacked }

/// Mirrors `packages/ui/src/components/description-list.tsx`: term/detail
/// rows with the site's own spec-sheet skin (mono, uppercase, tracked term
/// labels; a divided rounded shell). Gap-fill addition (not in the
/// original Figma source). Same divider call as [KinetixList]: each row
/// draws its own bottom divider (`showDivider`) rather than a shared
/// `divide-y` — Flutter has no single-property equivalent for "border
/// between children, not around them."
class KinetixDescriptionList extends StatelessWidget {
  const KinetixDescriptionList({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.muted.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12), // radius/lg
        border: Border.all(color: c.border, width: 1),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Column(mainAxisSize: MainAxisSize.min, children: children),
      ),
    );
  }
}

class KinetixDescriptionListItem extends StatelessWidget {
  const KinetixDescriptionListItem({
    super.key,
    required this.term,
    required this.child,
    this.layout = KinetixDescriptionListLayout.row,
    this.showDivider = true,
  });

  final String term;
  final Widget child;
  final KinetixDescriptionListLayout layout;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final termLabel = Text(
      term.toUpperCase(),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      // font-mono text-[10px] tracking-[0.14em], off the named type scale —
      // same call as the React source.
      style: TextStyle(
        fontSize: 10,
        fontFamily: 'monospace',
        letterSpacing: 1.4,
        color: c.mutedForeground,
      ),
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        border: showDivider ? Border(bottom: BorderSide(color: c.border, width: 1)) : null,
      ),
      child: Padding(
        // px-3.5 py-2.5, off the shared spacing scale — same call as KinetixBadge.
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: layout == KinetixDescriptionListLayout.row
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(width: 96, child: termLabel), // w-24, off-scale
                  const SizedBox(width: 12),
                  Expanded(child: child),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [termLabel, const SizedBox(height: 4), child],
              ),
      ),
    );
  }
}
