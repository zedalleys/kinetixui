import 'package:flutter/widgets.dart';

import 'theme.dart';
import 'util.dart';

/// Mirror `packages/ui/src/components/radio-group.tsx` (`grid gap-3`
/// group, 18pt / 2pt-border circle items, 10pt dot). Selection state is
/// the caller's (`selected` + `onTap`) — the group only supplies layout.
class KinetixRadioGroup extends StatelessWidget {
  const KinetixRadioGroup({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: gapAll(children, 12),
    );
  }
}

class KinetixRadioButton extends StatelessWidget {
  const KinetixRadioButton({
    super.key,
    required this.selected,
    required this.onTap,
    this.isError = false,
  });

  final bool selected;
  final VoidCallback? onTap;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final bool enabled = onTap != null;
    final Color borderColor = isError ? c.destructive : (selected ? c.primary : c.input);

    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 18,
          height: 18,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: borderColor, width: 2),
          ),
          child: selected
              ? Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isError ? c.destructive : c.primary,
                  ),
                )
              : null,
        ),
      ),
    );
  }
}
