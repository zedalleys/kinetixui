import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/textarea.tsx` — identical to
/// [KinetixInput] except multi-line, `min-h-[100px]`.
class KinetixTextarea extends StatefulWidget {
  const KinetixTextarea({
    super.key,
    this.controller,
    this.onChanged,
    this.placeholder = '',
    this.isError = false,
    this.enabled = true,
    this.minLines = 4,
  });

  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final String placeholder;
  final bool isError;
  final bool enabled;
  final int minLines;

  @override
  State<KinetixTextarea> createState() => _KinetixTextareaState();
}

class _KinetixTextareaState extends State<KinetixTextarea> {
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

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final Color borderColor =
        widget.isError ? c.destructive : (_focus.hasFocus ? c.primary : c.input);

    return Opacity(
      opacity: widget.enabled ? 1 : 0.5,
      child: Container(
        constraints: const BoxConstraints(minHeight: 100), // min-h-[100px]
        padding: const EdgeInsets.all(12), // spacing/3
        decoration: BoxDecoration(
          color: c.background,
          borderRadius: BorderRadius.circular(4), // radius/sm
          border: Border.all(color: borderColor, width: 1),
        ),
        child: Material(
          type: MaterialType.transparency,
          child: TextField(
            controller: widget.controller,
            focusNode: _focus,
            onChanged: widget.onChanged,
            enabled: widget.enabled,
            minLines: widget.minLines,
            maxLines: null,
            cursorColor: c.primary,
            style: TextStyle(fontSize: 14, letterSpacing: 0.25, color: c.foreground),
            decoration: InputDecoration(
              isCollapsed: true,
              border: InputBorder.none,
              hintText: widget.placeholder,
              hintStyle: TextStyle(fontSize: 14, color: c.mutedForeground),
            ),
          ),
        ),
      ),
    );
  }
}
