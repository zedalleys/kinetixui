import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/kbd.tsx`. A single keyboard key
/// glyph; wrap several in [KinetixKbdGroup] for a shortcut combo. Gap-fill
/// addition (not in the original Figma source) — matches the shadcn/ui
/// Kbd/KbdGroup API shape.
class KinetixKbd extends StatelessWidget {
  const KinetixKbd(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
      alignment: Alignment.center,
      // px-1.5 isn't on the shared spacing scale — 6 mirrors the React
      // literal, same "off-scale, documented" call as KinetixBadge's 10.
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        color: c.muted,
        borderRadius: BorderRadius.circular(4), // radius/sm
        border: Border.all(color: c.border, width: 1),
      ),
      child: Text(
        label,
        textAlign: TextAlign.center,
        style: AppText.labelSm.copyWith(color: c.mutedForeground),
      ),
    );
  }
}

/// Lays out multiple [KinetixKbd] for a shortcut combo.
class KinetixKbdGroup extends StatelessWidget {
  const KinetixKbdGroup({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int i = 0; i < children.length; i++) ...[
          if (i > 0) const SizedBox(width: 4), // spacing/1
          children[i],
        ],
      ],
    );
  }
}
