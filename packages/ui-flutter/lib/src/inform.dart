import 'package:flutter/material.dart';

import 'app_text.dart';
import 'icon_control.dart';
import 'theme.dart';

enum KinetixInformVariant { information, warning, success, error, action }

/// Mirrors `packages/ui/src/components/inform.tsx`: a persistent,
/// dismissible, intent-tinted inline notice with an optional action.
/// Distinct from [KinetixAlert] (border-only, static): filled, closable,
/// can carry a CTA. Distinct from `KinetixBanner` (full-bleed, no rounded
/// corners): a contained, rounded inline card. No icon library wired in
/// yet for the leading intent icon, same gap as [KinetixAlert]/
/// `KinetixBanner` — the dismiss glyph uses `Icons.close` directly since
/// that's a fixed choice, not a per-intent one.
class KinetixInform extends StatelessWidget {
  const KinetixInform(
    this.text, {
    super.key,
    this.variant = KinetixInformVariant.information,
    this.actionLabel,
    this.onAction,
    this.onDismiss,
    this.dismissIcon,
  });

  final String text;
  final KinetixInformVariant variant;
  final String? actionLabel;
  final VoidCallback? onAction;
  final VoidCallback? onDismiss;

  /// Replaces the default dismiss mark (`Icons.close`). Pass any widget: an `Icon` from Material or
  /// Cupertino icons, an SVG widget, your company's icon widget. The control sizes it to 14 logical pixels,
  /// tints an `Icon` with the banner's content colour through [IconTheme], and keeps the "Dismiss" name and
  /// button role, so the widget needs no size, colour or semantics of its own. See /docs/icons.
  final Widget? dismissIcon;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final (Color container, Color content) = switch (variant) {
      KinetixInformVariant.information => (c.info.withValues(alpha: 0.1), c.info),
      KinetixInformVariant.warning => (c.warning.withValues(alpha: 0.15), c.warning),
      KinetixInformVariant.success => (c.success.withValues(alpha: 0.15), c.success),
      KinetixInformVariant.error => (c.destructive.withValues(alpha: 0.1), c.destructive),
      KinetixInformVariant.action => (c.foreground, c.background),
    };

    return DecoratedBox(
      decoration: BoxDecoration(
        color: container,
        borderRadius: BorderRadius.circular(8), // radius/md
      ),
      child: Padding(
        padding: const EdgeInsets.all(12), // spacing/3
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(text, style: AppText.bodySm.copyWith(color: content)),
                  if (actionLabel != null) ...[
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: onAction,
                      child: Text(
                        actionLabel!,
                        style: AppText.labelMd.copyWith(
                          color: content,
                          fontWeight: FontWeight.w500,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (onDismiss != null) ...[
              const SizedBox(width: 10),
              IconControl(
                label: 'Dismiss',
                onTap: onDismiss,
                size: 14,
                color: content.withValues(alpha: 0.7),
                child: dismissIcon ?? const Icon(Icons.close),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
