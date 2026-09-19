import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/sidebar.tsx` — a **scoped** port, the
/// same scope cut the SwiftUI and Compose ports made. The React component is
/// a 390-line desktop dashboard shell (provider context, cookie persistence,
/// a keyboard shortcut, responsive mobile/desktop switching, collapse-to-icon
/// rail mode, `SidebarInset`); none of that transfers to a phone-first
/// package. What ports is the nav drawer itself: a leading-edge slide-in
/// panel with a scrim, driven by `visible` and dismissed with `onDismiss`.
/// Place it in a top-level `Stack`, like [KinetixSheet].
///
/// The panel sits on the *start* edge, so it mirrors under RTL.
class KinetixSidebar extends StatelessWidget {
  const KinetixSidebar({
    super.key,
    required this.visible,
    required this.onDismiss,
    required this.child,
    this.header,
    this.footer,
    this.width = 280,
  });

  final bool visible;
  final VoidCallback onDismiss;

  /// The menu — typically [KinetixSidebarGroup]s of [KinetixSidebarMenuItem]s.
  final Widget child;
  final Widget? header;
  final Widget? footer;
  final double width;

  @override
  Widget build(BuildContext context) {
    if (!visible) return const SizedBox.shrink();
    final c = KinetixTheme.of(context);

    return Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            onTap: onDismiss,
            behavior: HitTestBehavior.opaque,
            child: const ColoredBox(color: Color(0x66000000)),
          ),
        ),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: Semantics(
            container: true,
            label: 'Sidebar',
            child: Material(
              color: c.background,
              elevation: 8,
              child: Container(
                width: width,
                height: double.infinity,
                padding: const EdgeInsets.all(8), // p-2
                decoration: BoxDecoration(
                  border: BorderDirectional(end: BorderSide(color: c.border, width: 1)),
                ),
                child: SafeArea(
                  child: DefaultTextStyle.merge(
                    style: AppText.bodyMd.copyWith(color: c.foreground),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (header != null) header!,
                        Expanded(child: SingleChildScrollView(child: child)),
                        if (footer != null) footer!,
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// A labelled group of menu items inside a [KinetixSidebar].
class KinetixSidebarGroup extends StatelessWidget {
  const KinetixSidebarGroup({super.key, this.title, required this.children});

  final String? title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (title != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Text(
              title!,
              style: AppText.labelSm.copyWith(color: c.mutedForeground),
            ),
          ),
        ...children,
      ],
    );
  }
}

/// A single navigation row. The active row uses the accent fill and
/// `accentForeground` text, matching the other ports.
class KinetixSidebarMenuItem extends StatelessWidget {
  const KinetixSidebarMenuItem({
    super.key,
    required this.label,
    required this.onTap,
    this.selected = false,
    this.icon,
    this.badge,
  });

  final String label;
  final VoidCallback onTap;
  final bool selected;
  final Widget? icon;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final fg = selected ? c.accentForeground : c.foreground;

    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: selected ? c.accent : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Row(
            children: [
              if (icon != null) ...[
                IconTheme.merge(
                  data: IconThemeData(size: 18, color: selected ? c.accentForeground : c.mutedForeground),
                  child: icon!,
                ),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppText.labelLg.copyWith(color: fg),
                ),
              ),
              if (badge != null)
                Text(badge!, style: AppText.labelSm.copyWith(color: selected ? c.accentForeground : c.mutedForeground)),
            ],
          ),
        ),
      ),
    );
  }
}
