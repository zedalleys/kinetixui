import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/label.tsx` (`text-sm font-medium`).
/// `color` defaults to the theme `foreground`; a field wrapper overrides
/// it to `destructive` on an invalid control, same as the other ports.
class KinetixLabel extends StatelessWidget {
  const KinetixLabel(this.text, {super.key, this.color});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Text(
      text,
      style: AppText.labelLg.copyWith(color: color ?? c.foreground),
    );
  }
}
