import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'separator.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/page-header.tsx`: title + optional
/// breadcrumb + description + action cluster + optional tabs row, closed
/// off with a [KinetixSeparator]. `breadcrumb`/`actions`/`tabs` are plain
/// widget slots so callers compose their own navigation/button/tab
/// widgets into them.
class KinetixPageHeader extends StatelessWidget {
  const KinetixPageHeader(
    this.title, {
    super.key,
    this.description,
    this.breadcrumb,
    this.actions,
    this.tabs,
  });

  final String title;
  final String? description;
  final Widget? breadcrumb;
  final List<Widget>? actions;
  final Widget? tabs;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 24), // spacing/6
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (breadcrumb != null) breadcrumb!,
              if (breadcrumb != null) const SizedBox(height: 16), // spacing/4
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          title,
                          style: AppText.headlineSm.copyWith(color: c.foreground, fontWeight: FontWeight.w500),
                        ),
                        if (description != null) ...[
                          const SizedBox(height: 2),
                          Text(description!, style: AppText.bodyMd.copyWith(color: c.mutedForeground)),
                        ],
                      ],
                    ),
                  ),
                  if (actions != null) ...[
                    const SizedBox(width: 16),
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      for (final action in actions!) ...[action, const SizedBox(width: 8)],
                    ]),
                  ],
                ],
              ),
              if (tabs != null) ...[const SizedBox(height: 16), tabs!],
            ],
          ),
        ),
        const KinetixSeparator(),
      ],
    );
  }
}
