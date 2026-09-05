import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/input-otp.tsx`: a segmented
/// one-character-per-box code field. A hidden `TextField` holds the real
/// value (digits only, capped at `length`); the boxes render each
/// character with the next empty box marked as the cursor position.
class KinetixInputOtp extends StatefulWidget {
  const KinetixInputOtp({
    super.key,
    required this.value,
    required this.onChanged,
    this.length = 6,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final int length;

  @override
  State<KinetixInputOtp> createState() => _KinetixInputOtpState();
}

class _KinetixInputOtpState extends State<KinetixInputOtp> {
  late final TextEditingController _controller = TextEditingController(text: widget.value);
  final FocusNode _focus = FocusNode();

  @override
  void didUpdateWidget(covariant KinetixInputOtp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _controller.text) {
      _controller.value = TextEditingValue(
        text: widget.value,
        selection: TextSelection.collapsed(offset: widget.value.length),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onChanged(String raw) {
    final filtered = raw.replaceAll(RegExp('[^0-9]'), '');
    final capped = filtered.length > widget.length ? filtered.substring(0, widget.length) : filtered;
    if (capped != raw) {
      _controller.value = TextEditingValue(
        text: capped,
        selection: TextSelection.collapsed(offset: capped.length),
      );
    }
    widget.onChanged(capped);
  }

  Widget _box(BuildContext context, int i) {
    final c = KinetixTheme.of(context);
    final chars = widget.value.split('');
    final bool isCursor = i == chars.length && _focus.hasFocus;
    return Container(
      width: 40,
      height: 48,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: c.background,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: isCursor ? c.primary : c.input, width: isCursor ? 2 : 1),
      ),
      child: Text(
        i < chars.length ? chars[i] : '',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w500,
          fontFamily: 'monospace',
          color: c.foreground,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        SizedBox(
          width: 1,
          height: 1,
          child: Opacity(
            opacity: 0,
            child: Material(
              type: MaterialType.transparency,
              child: TextField(
                controller: _controller,
                focusNode: _focus,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                maxLength: widget.length,
                onChanged: _onChanged,
                decoration: const InputDecoration(counterText: '', border: InputBorder.none),
              ),
            ),
          ),
        ),
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => _focus.requestFocus(),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < widget.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                _box(context, i),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
