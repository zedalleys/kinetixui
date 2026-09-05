import 'package:flutter/material.dart';

import 'theme.dart';

enum KinetixInputGroupAddonAlign { start, end }

/// Mirrors `packages/ui/src/components/input-group.tsx`: one bordered
/// shell hosting an input plus fixed add-ons on either side. Place
/// `KinetixInputGroupText` / `Addon` / `Input` / `Button` in order in
/// `children`.
class KinetixInputGroup extends StatelessWidget {
  const KinetixInputGroup({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(4), // radius/sm
      child: Container(
        decoration: BoxDecoration(
          color: c.background,
          border: Border.all(color: c.input, width: 1),
          borderRadius: BorderRadius.circular(4),
        ),
        child: IntrinsicHeight(
          child: Row(children: children),
        ),
      ),
    );
  }
}

class KinetixInputGroupField extends StatelessWidget {
  const KinetixInputGroupField({
    super.key,
    this.controller,
    this.onChanged,
    this.placeholder = '',
    this.obscureText = false,
  });

  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final String placeholder;
  final bool obscureText;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Material(
          type: MaterialType.transparency,
          child: TextField(
            controller: controller,
            onChanged: onChanged,
            obscureText: obscureText,
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
    );
  }
}

class KinetixInputGroupText extends StatelessWidget {
  const KinetixInputGroupText(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Center(
        child: Text(text, style: TextStyle(fontSize: 14, color: c.mutedForeground)),
      ),
    );
  }
}

class KinetixInputGroupAddon extends StatelessWidget {
  const KinetixInputGroupAddon({
    super.key,
    required this.child,
    this.align = KinetixInputGroupAddonAlign.start,
  });

  final Widget child;
  final KinetixInputGroupAddonAlign align;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Padding(
      padding: EdgeInsets.only(
        left: align == KinetixInputGroupAddonAlign.start ? 12 : 0,
        right: align == KinetixInputGroupAddonAlign.end ? 12 : 0,
      ),
      child: Center(
        child: IconTheme.merge(
          data: IconThemeData(color: c.mutedForeground, size: 16),
          child: child,
        ),
      ),
    );
  }
}

class KinetixInputGroupButton extends StatelessWidget {
  const KinetixInputGroupButton(this.label, {super.key, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.muted,
          border: Border(left: BorderSide(color: c.input, width: 1)),
        ),
        child: Text(
          label,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: c.foreground),
        ),
      ),
    );
  }
}
