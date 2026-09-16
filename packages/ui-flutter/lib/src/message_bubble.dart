import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';

enum KinetixMessageVariant { sent, received }

enum KinetixMessageStatus { sent, delivered, read }

/// Mirrors `packages/ui/src/components/message-bubble.tsx`: a
/// sent/received chat bubble with grouping, timestamp, and a status
/// tick, plus a typing indicator. `grouped` reduces the outer top
/// corner's radius via [BorderRadius.only] — the same precise
/// single-corner treatment as the web/Compose ports (unlike the SwiftUI
/// port, which falls back to a uniform radius since this package
/// couldn't verify `UnevenRoundedRectangle`'s OS-version floor without a
/// local toolchain). No icon library wired in — the status ticks are
/// plain "✓"/"✓✓" glyphs.
class KinetixMessageBubble extends StatelessWidget {
  const KinetixMessageBubble(
    this.text, {
    super.key,
    this.variant = KinetixMessageVariant.received,
    this.timestamp,
    this.status,
    this.grouped = false,
    this.avatar,
  });

  final String text;
  final KinetixMessageVariant variant;
  final String? timestamp;
  final KinetixMessageStatus? status;
  final bool grouped;
  final Widget? avatar;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final sent = variant == KinetixMessageVariant.sent;

    const radius = Radius.circular(16);
    const smallRadius = Radius.circular(8);
    final borderRadius = BorderRadius.only(
      topLeft: !sent && grouped ? smallRadius : radius,
      topRight: sent && grouped ? smallRadius : radius,
      bottomLeft: radius,
      bottomRight: radius,
    );

    final bubble = Container(
      constraints: const BoxConstraints(maxWidth: 280),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8), // px-3.5/spacing-2, off-scale
      decoration: BoxDecoration(color: sent ? c.primary : c.muted, borderRadius: borderRadius),
      child: Text(text, style: AppText.bodySm.copyWith(color: sent ? c.primaryForeground : c.foreground)),
    );

    final Widget? meta = (timestamp != null || (sent && status != null))
        ? Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (timestamp != null) Text(timestamp!, style: AppText.labelSm.copyWith(color: c.mutedForeground)),
                if (sent && status != null) ...[
                  if (timestamp != null) const SizedBox(width: 4),
                  Text(
                    status == KinetixMessageStatus.sent ? '✓' : '✓✓',
                    style: AppText.labelSm.copyWith(
                      color: status == KinetixMessageStatus.read ? c.primary : c.mutedForeground,
                    ),
                  ),
                ],
              ],
            ),
          )
        : null;

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (!sent && avatar != null) Padding(padding: const EdgeInsets.only(right: 8), child: avatar),
        Flexible(
          child: Column(
            crossAxisAlignment: sent ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              bubble,
              if (meta != null) ...[const SizedBox(height: 4), meta],
            ],
          ),
        ),
      ],
    );
  }
}

class KinetixTypingIndicator extends StatefulWidget {
  const KinetixTypingIndicator({super.key});

  @override
  State<KinetixTypingIndicator> createState() => _KinetixTypingIndicatorState();
}

class _KinetixTypingIndicatorState extends State<KinetixTypingIndicator> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(color: c.muted, borderRadius: BorderRadius.circular(16)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < 3; i++) ...[
            if (i > 0) const SizedBox(width: 4),
            AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                final phase = (i * 150) / 1200;
                final t = (_controller.value + phase) % 1.0;
                final bounce = t < 0.3 ? t / 0.3 : (1 - t) / 0.7;
                return Transform.translate(
                  offset: Offset(0, -3 * bounce),
                  child: Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: c.mutedForeground),
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}
