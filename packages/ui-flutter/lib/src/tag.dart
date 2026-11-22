import 'package:flutter/material.dart';

import 'app_text.dart';
import 'icon_control.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/tag.tsx` (`tagVariants`). A
/// container-tinted, dismissible chip — `rounded-sm`, optional close
/// button. `destructive` / `warning` use the soft swapped treatment, same
/// as the other ports. Figma source: node 54855:14021.
enum KinetixTagVariant { primary, secondary, destructive, warning, outline }

class KinetixTag extends StatelessWidget {
  const KinetixTag(
    this.label, {
    super.key,
    this.variant = KinetixTagVariant.primary,
    this.onRemove,
    this.removeLabel,
  });

  final String label;
  final KinetixTagVariant variant;
  final VoidCallback? onRemove;

  /// Accessible name for the dismiss control. Defaults to `Remove <label>`, so a row of tags does not become
  /// a row of identically-named controls.
  final String? removeLabel;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final (Color bg, Color fg, Color? border) = switch (variant) {
      KinetixTagVariant.primary => (c.accent, c.accentForeground, null),
      KinetixTagVariant.secondary => (c.secondary, c.secondaryForeground, null),
      KinetixTagVariant.destructive => (c.destructiveForeground, c.destructive, null),
      KinetixTagVariant.warning => (c.warningForeground, c.warning, null),
      KinetixTagVariant.outline => (Colors.transparent, c.foreground, c.border),
    };

    final Widget text = Text(
      label,
      style: AppText.labelMd.copyWith(color: fg),
      // `longestLine`, not the default `parent`. A `Text` given a BOUNDED width reports that width as
      // its size, not the width of the words in it — so making the label flexible below, which is what
      // lets it wrap, also made every tag inside any bounded container stretch to that container's
      // width. Measured: a `Paid` tag that hugs at 66px became 146px inside a 146px box, and in
      // `KinetixMultiSelect`'s `Wrap` each chip would have taken a whole row. `longestLine` makes the
      // paragraph report the words instead, so the tag hugs its label exactly as it always did while
      // still wrapping when there is not room for one line. Found by `test/tag_wrapping_test.dart`'s
      // short-label case, which exists for precisely this: proving the wrapping fix is not a layout
      // rewrite of every tag in the system.
      textWidthBasis: TextWidthBasis.longestLine,
    );

    // The label must WRAP inside the tag rather than run past it. A Row hands an inflexible child
    // unbounded width, so the label measured at its full single-line length: at 200% text a two-word tag
    // overflowed its container and the word was clipped, leaving a status that reads as absent. That is
    // worse than a tag on two lines. WCAG 1.4.4. Found by M5.26's phone-width 200%-text gate on the vitals
    // block, once the block's own two overflows were fixed and the next one surfaced in here.
    //
    // The LayoutBuilder is load-bearing, not decoration. `Flexible` asserts when the incoming width is
    // unbounded, and a tag legitimately sits in unconstrained places — a bare Row, a horizontal list — so
    // the flexible form is chosen only where there is a bound to wrap to. With no bound the previous
    // behaviour stands, which is the correct answer there: there is nothing to wrap against. `Flexible`
    // also has to be a DIRECT child of the Row, which is why the builder wraps the whole tag rather than
    // just the label.
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(4),
          border: border != null ? Border.all(color: border, width: 1) : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (constraints.hasBoundedWidth) Flexible(child: text) else text,
            if (onRemove != null) ...[
              const SizedBox(width: 4),
              // A named button, not a bare GestureDetector: without a name and a role a screen reader
              // cannot find the control or say what it does — and without a semantics tap action (which
              // the `excludeSemantics` this used to carry dropped), it cannot activate it either.
              IconControl(
                label: removeLabel ?? 'Remove $label',
                onTap: onRemove,
                size: 14,
                color: fg,
                child: const Icon(Icons.close),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
