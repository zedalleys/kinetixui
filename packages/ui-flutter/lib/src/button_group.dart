import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';

enum KinetixButtonGroupOrientation { horizontal, vertical }

/// Mirrors `packages/ui/src/components/button-group.tsx`. Visually joins a
/// row (or column) of independent buttons into a connected cluster. The web
/// port uses CSS arbitrary-child-selectors to override each `<Button>`'s
/// own border/radius; Flutter has no equivalent cross-child override
/// without changing the button widget's own API, so this port takes the
/// same documented simplification as the Compose/SwiftUI ports: a shared
/// outer clip + border around the whole group (squares off the group's
/// *outer* corners), while each child keeps drawing its own full corner
/// radius at the internal seams — subtle in practice for the icon-toolbar
/// use case this is built for. Gap-fill addition (not in the original
/// Figma source) — matches the shadcn/ui Button Group API shape.
class KinetixButtonGroup extends StatelessWidget {
  const KinetixButtonGroup({
    super.key,
    required this.children,
    this.orientation = KinetixButtonGroupOrientation.horizontal,
  });

  final List<Widget> children;
  final KinetixButtonGroupOrientation orientation;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final isHorizontal = orientation == KinetixButtonGroupOrientation.horizontal;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8), // radius/md
        border: Border.all(color: c.border, width: 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: isHorizontal
          ? Row(mainAxisSize: MainAxisSize.min, children: children)
          : Column(mainAxisSize: MainAxisSize.min, children: children),
    );
  }
}

/// A thin divider between segments.
class KinetixButtonGroupSeparator extends StatelessWidget {
  const KinetixButtonGroupSeparator({
    super.key,
    this.orientation = KinetixButtonGroupOrientation.vertical,
  });

  final KinetixButtonGroupOrientation orientation;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    if (orientation == KinetixButtonGroupOrientation.vertical) {
      return Container(
        width: 1,
        margin: const EdgeInsets.symmetric(vertical: 4), // spacing/1
        color: c.border,
      );
    }
    return Container(
      height: 1,
      margin: const EdgeInsets.symmetric(horizontal: 4), // spacing/1
      color: c.border,
    );
  }
}

/// A static, non-interactive label segment inside a group — e.g. a unit or
/// a prefix next to steppers.
class KinetixButtonGroupText extends StatelessWidget {
  const KinetixButtonGroupText({super.key, required this.child});

  KinetixButtonGroupText.text(String label, {super.key})
      : child = Builder(
          builder: (context) => Text(
            label,
            style: AppText.labelMd.copyWith(color: KinetixTheme.of(context).foreground),
          ),
        );

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12), // spacing/3
      decoration: BoxDecoration(
        color: c.muted,
        borderRadius: BorderRadius.circular(8), // radius/md
        border: Border.all(color: c.border, width: 1),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [child]),
    );
  }
}
