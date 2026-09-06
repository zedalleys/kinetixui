import 'package:flutter/widgets.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirror `packages/ui/src/components/avatar.tsx`'s `Avatar` /
/// `AvatarFallback` (`size-10 rounded-full` container, `bg-muted text-sm`
/// fallback). Pass an `Image(...)` as the `child` for a photo;
/// `AvatarGroup` isn't ported — use `Row` with negative spacing via
/// `Transform`/`Stack`.
class KinetixAvatar extends StatelessWidget {
  const KinetixAvatar({super.key, required this.child, this.size = 40});

  final Widget child;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: SizedBox(width: size, height: size, child: child),
    );
  }
}

class KinetixAvatarFallback extends StatelessWidget {
  const KinetixAvatarFallback(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return ColoredBox(
      color: c.muted,
      child: Center(
        child: Text(text, style: AppText.bodyMd.copyWith(color: c.mutedForeground)),
      ),
    );
  }
}
