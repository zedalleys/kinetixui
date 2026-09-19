import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

class KinetixTimelineItem {
  const KinetixTimelineItem(this.title, {this.time, this.content});

  final String title;
  final String? time;
  final String? content;
}

/// Mirrors `packages/ui/src/components/timeline.tsx`: ordered events down
/// a rail (dot, connector, time, content). `alternating` lays content
/// left/right of a centered rail with two equal-`Expanded` columns; the
/// default is a single left-aligned rail. Unlike `KinetixStepper`'s
/// SwiftUI/Compose ports, `IntrinsicHeight` + `Expanded` lets the
/// connector genuinely stretch to fill the row here — no fixed-height
/// fallback needed.
class KinetixTimeline extends StatelessWidget {
  const KinetixTimeline({super.key, required this.items, this.alternating = false});

  final List<KinetixTimelineItem> items;
  final bool alternating;

  Widget _rail(BuildContext context, bool isLast) {
    final c = KinetixTheme.of(context);
    return Column(
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: c.action)),
        if (!isLast)
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 4),
              width: 1,
              color: c.border,
            ),
          ),
      ],
    );
  }

  Widget _body(BuildContext context, KinetixTimelineItem item, CrossAxisAlignment align, TextAlign textAlign) {
    final c = KinetixTheme.of(context);
    return Column(
      crossAxisAlignment: align,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (item.time != null)
          Text(item.time!, textAlign: textAlign, style: AppText.labelSm.copyWith(color: c.mutedForeground)),
        Text(
          item.title,
          textAlign: textAlign,
          style: AppText.labelMd.copyWith(color: c.foreground, fontWeight: FontWeight.w500),
        ),
        if (item.content != null)
          Text(item.content!, textAlign: textAlign, style: AppText.bodySm.copyWith(color: c.mutedForeground)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < items.length; i++)
          IntrinsicHeight(
            child: !alternating
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _rail(context, i == items.length - 1),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(bottom: i == items.length - 1 ? 0 : 24),
                          child: _body(context, items[i], CrossAxisAlignment.start, TextAlign.left),
                        ),
                      ),
                    ],
                  )
                : Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: i.isEven
                            ? const SizedBox.shrink()
                            : Align(
                                alignment: Alignment.topRight,
                                child: _body(context, items[i], CrossAxisAlignment.end, TextAlign.right),
                              ),
                      ),
                      const SizedBox(width: 16),
                      _rail(context, i == items.length - 1),
                      const SizedBox(width: 16),
                      Expanded(
                        child: i.isEven
                            ? _body(context, items[i], CrossAxisAlignment.start, TextAlign.left)
                            : const SizedBox.shrink(),
                      ),
                    ],
                  ),
          ),
      ],
    );
  }
}
