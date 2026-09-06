import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/accordion.tsx`. Expand/collapse
/// state is caller-owned (`expanded` passed straight through). `border-b`
/// on each item; chevron rotates 180° when open.
class KinetixAccordion extends StatelessWidget {
  const KinetixAccordion({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }
}

class KinetixAccordionItem extends StatelessWidget {
  const KinetixAccordionItem({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.border, width: 1)),
      ),
      child: child,
    );
  }
}

class KinetixAccordionTrigger extends StatelessWidget {
  const KinetixAccordionTrigger(this.text, {super.key, required this.expanded, required this.onTap});

  final String text;
  final bool expanded;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16), // py-4
        child: Row(
          children: [
            Expanded(
              child: Text(
                text,
                style: AppText.labelLg.copyWith(color: c.foreground),
              ),
            ),
            AnimatedRotation(
              turns: expanded ? 0.5 : 0,
              duration: const Duration(milliseconds: 200),
              child: Icon(Icons.keyboard_arrow_down, size: 18, color: c.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }
}

class KinetixAccordionContent extends StatelessWidget {
  const KinetixAccordionContent({super.key, required this.expanded, required this.child});

  final bool expanded;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedCrossFade(
      firstChild: const SizedBox(width: double.infinity),
      secondChild: Padding(
        padding: const EdgeInsets.only(bottom: 16), // pb-4
        child: child,
      ),
      crossFadeState: expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
      duration: const Duration(milliseconds: 200),
    );
  }
}
