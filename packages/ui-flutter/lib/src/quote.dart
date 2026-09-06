import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/quote.tsx`: a blockquote with an
/// optional attributed author (name, title, avatar slot). Curly quotes
/// are added around the text here, same as the React source.
class KinetixQuote extends StatelessWidget {
  const KinetixQuote(this.text, {super.key, this.author, this.authorTitle, this.avatar});

  final String text;
  final String? author;
  final String? authorTitle;
  final Widget? avatar;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '“$text”',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: c.foreground),
        ),
        if (author != null || authorTitle != null) ...[
          const SizedBox(height: 16),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (avatar != null) ...[avatar!, const SizedBox(width: 12)],
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (author != null)
                    Text(
                      author!,
                      style: AppText.labelLg.copyWith(color: c.foreground),
                    ),
                  if (authorTitle != null)
                    Text(authorTitle!, style: TextStyle(fontSize: 13, color: c.mutedForeground)),
                ],
              ),
            ],
          ),
        ],
      ],
    );
  }
}
