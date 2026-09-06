import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';
import 'util.dart';

/// Mirrors `packages/ui/src/components/pagination.tsx`, itself
/// `buttonVariants` recipes. `size-9` (36) is off the shared spacing
/// scale. Chevrons are `chevron_left` / `chevron_right`; the ellipsis is
/// `more_horiz`.
class KinetixPagination extends StatelessWidget {
  const KinetixPagination({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: gapAll(children, 4, axis: Axis.horizontal),
    );
  }
}

class KinetixPaginationItem extends StatelessWidget {
  const KinetixPaginationItem(this.label, {super.key, this.isActive = false, required this.onTap});

  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 36,
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isActive ? c.accent : const Color(0x00000000),
          borderRadius: BorderRadius.circular(8),
          border: isActive ? Border.all(color: c.input, width: 1) : null,
        ),
        child: Text(
          label,
          style: AppText.labelLg.copyWith(color: isActive ? c.foreground : c.mutedForeground),
        ),
      ),
    );
  }
}

class KinetixPaginationPrevious extends StatelessWidget {
  const KinetixPaginationPrevious({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        alignment: Alignment.center,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chevron_left, size: 16, color: c.foreground),
            const SizedBox(width: 4),
            Text(
              'Previous',
              style: AppText.labelLg.copyWith(color: c.foreground),
            ),
          ],
        ),
      ),
    );
  }
}

class KinetixPaginationNext extends StatelessWidget {
  const KinetixPaginationNext({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        alignment: Alignment.center,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Next',
              style: AppText.labelLg.copyWith(color: c.foreground),
            ),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right, size: 16, color: c.foreground),
          ],
        ),
      ),
    );
  }
}

class KinetixPaginationEllipsis extends StatelessWidget {
  const KinetixPaginationEllipsis({super.key});

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return SizedBox(
      width: 36,
      height: 36,
      child: Icon(Icons.more_horiz, size: 16, color: c.mutedForeground),
    );
  }
}
