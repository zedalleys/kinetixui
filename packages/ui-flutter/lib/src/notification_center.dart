import 'package:flutter/material.dart';

import 'app_text.dart';
import 'popover.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/notification-center.tsx`: a bell
/// trigger opening a popover list of read/unread items with a "mark all
/// read" action. Built directly on [KinetixPopover] (same "reuse the
/// platform machinery" call every port makes) — its 16px shell padding
/// applies uniformly to the header + list here rather than a distinct
/// un-padded header band, a documented simplification versus the other
/// two ports.
class KinetixNotificationCenterTrigger extends StatelessWidget {
  const KinetixNotificationCenterTrigger({super.key, required this.onPressed, this.unreadCount = 0});

  final VoidCallback onPressed;
  final int unreadCount;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          onPressed: onPressed,
          icon: Icon(Icons.notifications_outlined, color: c.foreground),
        ),
        if (unreadCount > 0)
          Positioned(
            right: 6,
            top: 6,
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: c.destructive,
                border: Border.all(color: c.background, width: 2),
              ),
            ),
          ),
      ],
    );
  }
}

class KinetixNotificationCenter extends StatelessWidget {
  const KinetixNotificationCenter({
    super.key,
    required this.visible,
    required this.onDismiss,
    required this.anchor,
    required this.children,
    this.onMarkAllRead,
  });

  final bool visible;
  final VoidCallback onDismiss;
  final Widget anchor;
  final List<Widget> children;
  final VoidCallback? onMarkAllRead;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return KinetixPopover(
      visible: visible,
      onDismiss: onDismiss,
      anchor: anchor,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 320, maxHeight: 360),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Notifications',
                    style: AppText.titleSm.copyWith(color: c.foreground, fontWeight: FontWeight.w500),
                  ),
                  if (onMarkAllRead != null)
                    GestureDetector(
                      onTap: onMarkAllRead,
                      child: Text(
                        'Mark all read',
                        style: AppText.labelMd.copyWith(color: c.action, fontWeight: FontWeight.w500),
                      ),
                    ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, children: children),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class KinetixNotificationItem extends StatelessWidget {
  const KinetixNotificationItem(
    this.title, {
    super.key,
    this.description,
    this.time,
    this.unread = false,
    this.onSelect,
  });

  final String title;
  final String? description;
  final String? time;
  final bool unread;
  final VoidCallback? onSelect;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return InkWell(
      onTap: onSelect,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: unread ? c.action : Colors.transparent,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.bodySm.copyWith(
                      color: c.foreground,
                      fontWeight: unread ? FontWeight.w500 : FontWeight.w400,
                    ),
                  ),
                  if (description != null)
                    Text(
                      description!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppText.bodySm.copyWith(color: c.mutedForeground),
                    ),
                  if (time != null)
                    Text(time!, style: AppText.labelSm.copyWith(color: c.mutedForeground)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
