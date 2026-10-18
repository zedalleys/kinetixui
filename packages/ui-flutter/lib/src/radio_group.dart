import 'package:flutter/widgets.dart';

import 'kinetix_selection_motion.dart';
import 'theme.dart';
import 'util.dart';

/// Mirror `packages/ui/src/components/radio-group.tsx` (`grid gap-3`
/// group, 18pt / 2pt-border circle items, 10pt dot). Selection state is
/// the caller's (`selected` + `onTap`) — the group only supplies layout.
///
/// `label` is optional and defaulted, so every existing call site compiles
/// unchanged. It exists because an unnamed group of radios can be navigated but
/// not understood: a screen reader can say "selected, 1 of 3" and never say what
/// the three are choosing between. The web port takes that name from the
/// `<fieldset>`'s legend; there is nothing here to infer it from.
///
/// `explicitChildNodes` keeps the items as their own nodes: without it, naming a
/// container invites the framework to merge its descendants, and a merged group
/// is announceable but not choosable.
class KinetixRadioGroup extends StatelessWidget {
  const KinetixRadioGroup({super.key, required this.children, this.label});

  final List<Widget> children;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final Widget column = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: gapAll(children, 12),
    );
    if (label == null) return column;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: label,
      child: column,
    );
  }
}

class KinetixRadioButton extends StatelessWidget {
  const KinetixRadioButton({
    super.key,
    required this.selected,
    required this.onTap,
    this.isError = false,
    this.label,
  });

  final bool selected;
  final VoidCallback? onTap;
  final bool isError;

  /// The option's own name, optional and defaulted.
  ///
  /// An 18pt circle has no text of its own, and the `Semantics` below is a container, so a sibling
  /// `Text` in the same `Row` is a separate node and CANNOT name this control. A caller with a visible
  /// label should pass it here and wrap the visible copy in `ExcludeSemantics` (what the demo on the
  /// component page does), or wrap the whole row in `MergeSemantics`. Left null, the radio is announced
  /// with its state and no name — which is what every caller got before MX1d, state included.
  final String? label;

  @override
  Widget build(BuildContext context) {
    // A bare GestureDetector exposes nothing: before MX1d this widget declared no
    // `Semantics` at all, so a selected radio was indistinguishable from an unselected
    // one to a screen reader and neither was announced as a radio. `checked` carries the
    // state and `inMutuallyExclusiveGroup` is what makes it a radio rather than a
    // checkbox — it is the property that tells the reader choosing this one unchooses
    // another. The sibling controls (Switch, Checkbox, Toggle) already declared theirs;
    // this one was the gap.
    // `container: true` matches Switch and Checkbox, which already declared theirs this way. It makes
    // this control its own node, so the name has to come from `label` rather than from a neighbour.
    return Semantics(
      container: true,
      checked: selected,
      inMutuallyExclusiveGroup: true,
      enabled: onTap != null,
      label: label,
      child: _buildControl(context),
    );
  }

  Widget _buildControl(BuildContext context) {
    final c = KinetixTheme.of(context);
    final bool enabled = onTap != null;
    final Color borderColor = isError ? c.destructive : (selected ? c.action : c.input);
    final Duration duration = KinetixSelectionMotion.durationOf(context);

    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: GestureDetector(
        onTap: onTap,
        // `selection-state` (fast, standard) on the edge, and on the dot's opacity. The dot
        // is in the tree either way now rather than appearing from nothing: a radio whose
        // only animated property is its border reads as not animating at all. Matches the
        // React port, where the dot fades in and out on `fast`.
        child: AnimatedContainer(
          duration: duration,
          curve: KinetixSelectionMotion.curve,
          width: 18,
          height: 18,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: borderColor, width: 2),
          ),
          child: AnimatedOpacity(
            duration: duration,
            curve: KinetixSelectionMotion.curve,
            opacity: selected ? 1 : 0,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isError ? c.destructive : c.action,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
