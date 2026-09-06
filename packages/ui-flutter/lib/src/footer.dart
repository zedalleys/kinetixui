import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';
import 'util.dart';

/// Mirrors `packages/ui/src/components/footer.tsx`: a page-footer shell —
/// columns of nav links plus a bottom bar. Compose `KinetixFooterColumn` /
/// `KinetixFooterLink` / `KinetixFooterBottom` inside it.
class KinetixFooter extends StatelessWidget {
  const KinetixFooter({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40), // px-6 py-10
      decoration: BoxDecoration(
        color: c.background,
        border: Border(top: BorderSide(color: c.border, width: 1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: gapAll(children, 32),
      ),
    );
  }
}

class KinetixFooterColumn extends StatelessWidget {
  const KinetixFooterColumn(this.title, {super.key, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          title,
          style: AppText.labelMd.copyWith(color: c.foreground),
        ),
        const SizedBox(height: 12),
        ...gapAll(children, 8),
      ],
    );
  }
}

class KinetixFooterLink extends StatelessWidget {
  const KinetixFooterLink(this.text, {super.key, required this.onTap});

  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Text(text, style: TextStyle(fontSize: 13, color: c.mutedForeground)),
    );
  }
}

class KinetixFooterBottom extends StatelessWidget {
  const KinetixFooterBottom({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.only(top: 24),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: c.border, width: 1)),
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(fontSize: 13, color: c.mutedForeground),
        child: Row(children: children),
      ),
    );
  }
}
