import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

/// The design source's Corners property (`standard` == React's default,
/// `rounded-sm`).
enum KinetixInputCorners { sharp, standard, rounded, pill }

/// Mirrors `packages/ui/src/components/input.tsx`'s bare control (label /
/// helper text live in a field composition). Border `--input`, focus
/// `--primary`, error `--destructive`, radius `--radius-sm`, padding
/// `--spacing-3`, Body Medium type. `trailing` is a single end slot (the
/// stand-in for the web `InputGroup` addon system).
class KinetixInput extends StatefulWidget {
  const KinetixInput({
    super.key,
    this.controller,
    this.onChanged,
    this.placeholder = '',
    this.obscureText = false,
    this.isError = false,
    this.enabled = true,
    this.corners = KinetixInputCorners.standard,
    this.trailing,
  });

  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final String placeholder;
  final bool obscureText;
  final bool isError;
  final bool enabled;
  final KinetixInputCorners corners;
  final Widget? trailing;

  @override
  State<KinetixInput> createState() => _KinetixInputState();
}

class _KinetixInputState extends State<KinetixInput> {
  final FocusNode _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(_onFocusChange);
  }

  void _onFocusChange() => setState(() {});

  @override
  void dispose() {
    _focus.removeListener(_onFocusChange);
    _focus.dispose();
    super.dispose();
  }

  double get _radius => switch (widget.corners) {
        KinetixInputCorners.sharp => 0,
        KinetixInputCorners.standard => 4, // radius/sm
        KinetixInputCorners.rounded => 8, // radius/md
        KinetixInputCorners.pill => 9999, // radius/full
      };

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final Color borderColor =
        widget.isError ? c.destructive : (_focus.hasFocus ? c.primary : c.input);

    return Opacity(
      opacity: widget.enabled ? 1 : 0.5,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: widget.corners == KinetixInputCorners.pill ? 16 : 12,
          vertical: 12,
        ),
        decoration: BoxDecoration(
          color: c.background,
          borderRadius: BorderRadius.circular(_radius),
          border: Border.all(color: borderColor, width: 1),
        ),
        child: Material(
          type: MaterialType.transparency,
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: widget.controller,
                  focusNode: _focus,
                  onChanged: widget.onChanged,
                  enabled: widget.enabled,
                  obscureText: widget.obscureText,
                  cursorColor: c.primary,
                  style: AppText.bodyMd.copyWith(color: c.foreground),
                  decoration: InputDecoration(
                    isCollapsed: true,
                    border: InputBorder.none,
                    hintText: widget.placeholder,
                    hintStyle: AppText.bodyMd.copyWith(color: c.mutedForeground),
                  ),
                ),
              ),
              if (widget.trailing != null) ...[
                const SizedBox(width: 8),
                widget.trailing!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}
