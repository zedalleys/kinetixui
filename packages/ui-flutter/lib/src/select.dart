import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

class KinetixSelectOption<T> {
  const KinetixSelectOption(this.value, this.label);

  final T value;
  final String label;
}

/// Mirrors `packages/ui/src/components/select.tsx`. The Radix trigger +
/// portalled listbox collapses onto a `MenuAnchor` with a styled trigger
/// (border / chevron like KinetixInput) — the "reuse the platform
/// machinery" call. `min-h-[44px]` is Figma-literal.
class KinetixSelect<T> extends StatelessWidget {
  const KinetixSelect({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
    this.placeholder = 'Select…',
    this.isError = false,
  });

  final T? value;
  final List<KinetixSelectOption<T>> options;
  final ValueChanged<T> onChanged;
  final String placeholder;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);

    var current = placeholder;
    for (final o in options) {
      if (o.value == value) current = o.label;
    }

    return MenuAnchor(
      style: MenuStyle(
        backgroundColor: WidgetStatePropertyAll(c.popover),
        surfaceTintColor: const WidgetStatePropertyAll(Color(0x00000000)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: c.border),
          ),
        ),
      ),
      menuChildren: [
        for (final o in options)
          MenuItemButton(
            onPressed: () => onChanged(o.value),
            leadingIcon: o.value == value
                ? Icon(Icons.check, size: 16, color: c.foreground)
                : const SizedBox(width: 16),
            child: Text(o.label, style: AppText.bodyMd.copyWith(color: c.foreground)),
          ),
      ],
      builder: (context, controller, _) => GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => controller.isOpen ? controller.close() : controller.open(),
        child: Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: c.background,
            borderRadius: BorderRadius.circular(4), // radius/sm
            border: Border.all(color: isError ? c.destructive : c.input, width: 1),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  current,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppText.bodyMd.copyWith(color: value == null ? c.mutedForeground : c.foreground),
                ),
              ),
              Icon(Icons.keyboard_arrow_down, size: 18, color: c.mutedForeground),
            ],
          ),
        ),
      ),
    );
  }
}
