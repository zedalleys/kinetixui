import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/button.tsx`'s `buttonVariants` CVA
/// 1:1 (variant × size × corners). Figma source: "KinetixUI" › UI
/// Components › 02. Controls & Actions › Button (node 54863:351). Same
/// contract as `KinetixButton` in the Compose / SwiftUI ports.
///
/// Not ported: the `state` CVA axis (Hover/Focus/Active — docs-only on the
/// web; `InkWell` gives real press feedback) and the `sr-only` label
/// treatment on the `icon` size. Padding / radii / type are hardcoded
/// from the Figma scale, annotated with the token each maps to.
enum KinetixButtonVariant { primary, secondary, outline, destructive, ghost, link }

enum KinetixButtonSize { sm, md, lg, icon }

/// The design source's Corners property. `standard` == React's default
/// (`rounded-md`).
enum KinetixCorners { sharp, standard, pill }

/// The default status wording for [KinetixButton.pending]. English, like the rest of this package.
const String kKinetixButtonPendingLabel = 'Working…';

class KinetixButton extends StatefulWidget {
  const KinetixButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.variant = KinetixButtonVariant.primary,
    this.size = KinetixButtonSize.md,
    this.corners = KinetixCorners.standard,
    this.pending,
    this.pendingLabel = kKinetixButtonPendingLabel,
  });

  /// `null` renders the disabled treatment (`--border` fill / `--muted-foreground` text).
  final VoidCallback? onPressed;
  final Widget child;
  final KinetixButtonVariant variant;
  final KinetixButtonSize size;
  final KinetixCorners corners;

  /// The action this button started is in flight.
  ///
  /// Deliberately NOT expressed by passing `onPressed: null`. In Flutter a null `onPressed` IS
  /// disabled semantics — `Semantics(enabled: false)` below is derived from it — and a disabled
  /// control is reported as unavailable rather than busy, and loses focus. While pending, [onPressed]
  /// stays non-null and the tap callback is gated instead, so the node keeps its enabled semantics,
  /// its label and the focus the user put on it.
  ///
  /// Three-valued on purpose: `null` means this call site never mentioned `pending`, and the widget
  /// builds exactly what it did before this field existed — no indicator slot, no extra semantics.
  ///
  /// NOT VERIFIED AT RUNTIME. No TalkBack or VoiceOver run stands behind this; the widget tests read
  /// the semantics tree, which is a claim about the properties set, not a measurement of what an
  /// assistive technology says.
  final bool? pending;

  /// What a screen reader hears while [pending], carried separately from the button's own label.
  final String pendingLabel;

  @override
  State<KinetixButton> createState() => _KinetixButtonState();
}

class _KinetixButtonState extends State<KinetixButton> {
  bool _hovered = false;
  bool _pressed = false;

  /// Opted in at all — see [KinetixButton.pending].
  bool get _pendingAware => widget.pending != null;
  bool get _isPending => widget.pending == true;

  @override
  Widget build(BuildContext context) {
    // InkWell alone gives a screen reader the label but no "button" role and no enabled/disabled state.
    return Semantics(
      container: true,
      button: true,
      enabled: widget.onPressed != null,
      // The status, separate from the label, which stays whatever `child` renders. `liveRegion` is
      // what makes a CHANGE announced rather than only read when the node is focused. Both are left
      // off entirely for a call site that never mentions `pending`.
      value: _isPending ? widget.pendingLabel : null,
      liveRegion: _pendingAware ? _isPending : null,
      child: _buildControl(context),
    );
  }

  Widget _buildControl(BuildContext context) {
    final KinetixColors c = KinetixTheme.of(context);
    final VoidCallback? onPressed = widget.onPressed;
    final KinetixButtonVariant variant = widget.variant;
    final KinetixButtonSize size = widget.size;
    final KinetixCorners corners = widget.corners;
    final Widget child = widget.child;
    final bool enabled = onPressed != null;
    final bool isLink = variant == KinetixButtonVariant.link;

    // horizontal + vertical padding (Figma spacing) + the type-scale style
    final (double hPad, double vPad, TextStyle textStyle) = switch (size) {
      KinetixButtonSize.sm => (12, 8, AppText.labelSm), // spacing/3 + spacing/2
      KinetixButtonSize.md => (16, 12, AppText.labelMd), // spacing/4 + spacing/3
      KinetixButtonSize.lg => (24, 12, AppText.labelLg), // spacing/6 + spacing/3
      KinetixButtonSize.icon => (12, 12, AppText.labelMd), // spacing/3 all round
    };

    final double radius = switch (corners) {
      KinetixCorners.sharp => 0, // radius/none
      KinetixCorners.standard => 8, // radius/md
      KinetixCorners.pill => 9999, // radius/full
    };

    late final Color bg;
    late final Color fg;
    Color? borderColor;

    if (!enabled) {
      fg = c.mutedForeground;
      bg = switch (variant) {
        KinetixButtonVariant.outline ||
        KinetixButtonVariant.ghost ||
        KinetixButtonVariant.link =>
          Colors.transparent,
        _ => c.border,
      };
      if (variant == KinetixButtonVariant.outline) borderColor = c.input;
    } else {
      switch (variant) {
        case KinetixButtonVariant.primary:
          // hover:bg-action/90 and active:bg-action/85 in React → explicit tokens
          bg = _pressed ? c.actionPressed : (_hovered ? c.actionHover : c.action);
          fg = c.actionForeground;
        case KinetixButtonVariant.secondary:
          bg = c.secondary;
          fg = c.secondaryForeground;
        case KinetixButtonVariant.outline:
          bg = Colors.transparent;
          fg = c.foreground;
          borderColor = c.input; // border/width/default
        case KinetixButtonVariant.destructive:
          bg = c.destructive;
          fg = c.destructiveForeground;
        case KinetixButtonVariant.ghost:
          bg = Colors.transparent;
          fg = c.foreground;
        case KinetixButtonVariant.link:
          bg = Colors.transparent;
          fg = c.link;
      }
    }

    final BorderRadius borderRadius = BorderRadius.circular(isLink ? 0 : radius);

    return Material(
      color: Colors.transparent,
      borderRadius: borderRadius,
      child: InkWell(
        // Gated, not nulled: `onTap: null` would make InkWell itself inert and unfocusable, which is
        // the disabled behaviour this state exists to avoid. Read back off the widget rather than
        // through the promoted local, so the closure needs no type promotion to compile.
        onTap: onPressed == null
            ? null
            : () {
                if (_isPending) return;
                widget.onPressed?.call();
              },
        onHover: (bool v) => setState(() => _hovered = v),
        onHighlightChanged: (bool v) => setState(() => _pressed = v),
        borderRadius: borderRadius,
        child: Container(
          padding: EdgeInsets.symmetric(
            horizontal: isLink ? 0 : hPad,
            vertical: isLink ? 0 : vPad,
          ),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: borderRadius,
            border: borderColor != null ? Border.all(color: borderColor, width: 1) : null,
          ),
          child: DefaultTextStyle.merge(
            style: textStyle.copyWith(color: fg),
            child: IconTheme.merge(
              data: IconThemeData(color: fg, size: 18),
              child: _pendingAware
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        // The slot is 18px in both states — matching the icon slot and React's
                        // `[&_svg]:size-[18px]` — so the label does not shift when the ring appears.
                        // `ExcludeSemantics`: the status is on the button's node, and a second source
                        // would have it announced twice.
                        SizedBox(
                          width: 18,
                          height: 18,
                          child: _isPending
                              ? ExcludeSemantics(
                                  child: CircularProgressIndicator(strokeWidth: 2, color: fg),
                                )
                              : null,
                        ),
                        const SizedBox(width: 4),
                        child,
                      ],
                    )
                  : child,
            ),
          ),
        ),
      ),
    );
  }
}
