import 'package:flutter/material.dart';

import 'dialog.dart';
import 'separator.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/command.tsx` (a themed wrapper over
/// `cmdk` shown inside a Dialog). Composes KinetixDialog + a search field
/// over a scrolling list. cmdk's fuzzy filtering isn't reimplemented — the
/// caller filters its own items against `controller.text` and this renders
/// whatever list results. `KinetixCommandSeparator` is `KinetixSeparator`.
class KinetixCommandDialog extends StatelessWidget {
  const KinetixCommandDialog({
    super.key,
    required this.visible,
    required this.onDismiss,
    required this.controller,
    required this.children,
    this.onQueryChanged,
    this.placeholder = 'Type a command or search…',
  });

  final bool visible;
  final VoidCallback onDismiss;
  final TextEditingController controller;
  final List<Widget> children;
  final ValueChanged<String>? onQueryChanged;
  final String placeholder;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return KinetixDialog(
      visible: visible,
      onDismiss: onDismiss,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.search, size: 16, color: c.mutedForeground),
              const SizedBox(width: 8),
              Expanded(
                child: Material(
                  type: MaterialType.transparency,
                  child: TextField(
                    controller: controller,
                    onChanged: onQueryChanged,
                    autofocus: true,
                    cursorColor: c.primary,
                    style: TextStyle(fontSize: 14, color: c.foreground),
                    decoration: InputDecoration(
                      isCollapsed: true,
                      border: InputBorder.none,
                      hintText: placeholder,
                      hintStyle: TextStyle(fontSize: 14, color: c.mutedForeground),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const KinetixSeparator(),
          const SizedBox(height: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 320),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: children,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class KinetixCommandGroup extends StatelessWidget {
  const KinetixCommandGroup(this.heading, {super.key, required this.children});

  final String heading;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 4, 8, 2),
          child: Text(
            heading,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: c.mutedForeground),
          ),
        ),
        ...children,
      ],
    );
  }
}

class KinetixCommandItem extends StatelessWidget {
  const KinetixCommandItem(this.label, {super.key, this.icon, required this.onPressed});

  final String label;
  final IconData? icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onPressed,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 16, color: c.mutedForeground),
              const SizedBox(width: 8),
            ],
            Expanded(child: Text(label, style: TextStyle(fontSize: 14, color: c.foreground))),
          ],
        ),
      ),
    );
  }
}

typedef KinetixCommandSeparator = KinetixSeparator;
