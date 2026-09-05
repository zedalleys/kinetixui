import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/navigation-bar.tsx`: a mobile top
/// app bar — leading slot, title with optional info text, trailing
/// actions. The React `onBack` shortcut becomes
/// [KinetixNavigationBackButton], placed in `leading`.
class KinetixNavigationBar extends StatelessWidget {
  const KinetixNavigationBar({
    super.key,
    required this.title,
    this.infoText,
    this.leading,
    this.actions,
  });

  final String title;
  final String? infoText;
  final Widget? leading;
  final Widget? actions;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      height: 56, // h-14
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: c.background,
        border: Border(bottom: BorderSide(color: c.border, width: 1)),
      ),
      child: Row(
        children: [
          SizedBox(width: 36, child: leading),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: c.foreground),
                ),
                if (infoText != null)
                  Text(
                    infoText!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, color: c.mutedForeground),
                  ),
              ],
            ),
          ),
          if (actions != null) actions!,
        ],
      ),
    );
  }
}

class KinetixNavigationBackButton extends StatelessWidget {
  const KinetixNavigationBackButton({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 36,
        height: 36,
        child: Icon(Icons.chevron_left, size: 24, color: c.foreground),
      ),
    );
  }
}
