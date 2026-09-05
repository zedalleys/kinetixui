import 'package:flutter/material.dart';

import 'input.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/password-input.tsx`: a
/// [KinetixInput] with a show / hide toggle in the trailing slot
/// (`visibility` / `visibility_off` icons).
class KinetixPasswordInput extends StatefulWidget {
  const KinetixPasswordInput({
    super.key,
    this.controller,
    this.onChanged,
    this.placeholder = '',
    this.isError = false,
    this.enabled = true,
  });

  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final String placeholder;
  final bool isError;
  final bool enabled;

  @override
  State<KinetixPasswordInput> createState() => _KinetixPasswordInputState();
}

class _KinetixPasswordInputState extends State<KinetixPasswordInput> {
  bool _visible = false;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return KinetixInput(
      controller: widget.controller,
      onChanged: widget.onChanged,
      placeholder: widget.placeholder,
      isError: widget.isError,
      enabled: widget.enabled,
      obscureText: !_visible,
      trailing: GestureDetector(
        onTap: () => setState(() => _visible = !_visible),
        child: Icon(
          _visible ? Icons.visibility_off : Icons.visibility,
          size: 18,
          color: c.mutedForeground,
        ),
      ),
    );
  }
}
