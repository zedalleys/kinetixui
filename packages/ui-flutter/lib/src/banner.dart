import 'package:flutter/material.dart';

import 'app_text.dart';
import 'icon_control.dart';
import 'theme.dart';

enum KinetixBannerVariant { information, warning, success, error, action }

/// Mirrors `packages/ui/src/components/banner.tsx`: a full-bleed,
/// page-level notice, optionally dismissible. Distinct from [KinetixAlert]
/// (in-flow, static) and the transient toast: persistent, edge-to-edge, no
/// rounded corners (compare `KinetixInform`'s rounded inline card). No
/// icon library wired in yet, same gap as
/// [KinetixAlert]. The web version's `sticky` prop has no component-level
/// Flutter equivalent — pin it to the top by placement instead (outside a
/// scroll view, or as a `Scaffold`'s persistent header), same as
/// `KinetixAppBar`.
class KinetixBanner extends StatelessWidget {
  const KinetixBanner(
    this.text, {
    super.key,
    this.variant = KinetixBannerVariant.information,
    this.actionLabel,
    this.onAction,
    this.onDismiss,
    this.dismissIcon,
  });

  final String text;
  final KinetixBannerVariant variant;
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
      KinetixBannerVariant.information => (c.info.withValues(alpha: 0.1), c.onInfoContainer),
      KinetixBannerVariant.warning => (c.warning.withValues(alpha: 0.15), c.warning),
      KinetixBannerVariant.success => (c.success.withValues(alpha: 0.15), c.success),
      KinetixBannerVariant.error => (c.destructive.withValues(alpha: 0.1), c.destructive),
      KinetixBannerVariant.action => (c.foreground, c.background),
    };

    return DecoratedBox(
      decoration: BoxDecoration(color: container),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Text(
                text,
                textAlign: TextAlign.center,
                style: AppText.bodySm.copyWith(color: content),
              ),
            ),
            if (actionLabel != null) ...[
              const SizedBox(width: 12),
              GestureDetector(
                onTap: onAction,
                child: Text(
                  actionLabel!,
                  style: AppText.labelMd.copyWith(color: content, fontWeight: FontWeight.w500),
                ),
              ),
            ],
            if (onDismiss != null) ...[
              const SizedBox(width: 12),
              IconControl(
                label: 'Dismiss',
                onTap: onDismiss,
                size: 14,
                color: content,
                child: dismissIcon ?? const Icon(Icons.close),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
