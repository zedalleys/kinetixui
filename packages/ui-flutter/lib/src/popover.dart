import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/popover.tsx`. Wraps Flutter's
/// `MenuAnchor` with arbitrary content — anchor-relative positioning and
/// outside-tap dismissal for free, the "reuse the platform machinery"
/// call the other ports made. `w-72` (288) is off the shared spacing
/// scale. Driven by `visible`; `onDismiss` fires on outside-tap.
class KinetixPopover extends StatefulWidget {
  const KinetixPopover({
    super.key,
    required this.visible,
    required this.onDismiss,
    required this.anchor,
    required this.child,
  });

  final bool visible;
  final VoidCallback onDismiss;
  final Widget anchor;
  final Widget child;

  @override
  State<KinetixPopover> createState() => _KinetixPopoverState();
}

class _KinetixPopoverState extends State<KinetixPopover> {
  final MenuController _controller = MenuController();

  @override
  void didUpdateWidget(covariant KinetixPopover oldWidget) {
    super.didUpdateWidget(oldWidget);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (widget.visible && !_controller.isOpen) _controller.open();
      if (!widget.visible && _controller.isOpen) _controller.close();
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return MenuAnchor(
      controller: _controller,
      onClose: widget.onDismiss,
      style: MenuStyle(
        backgroundColor: WidgetStatePropertyAll(c.popover),
        surfaceTintColor: const WidgetStatePropertyAll(Color(0x00000000)),
        elevation: const WidgetStatePropertyAll(4),
        padding: const WidgetStatePropertyAll(EdgeInsets.all(16)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: c.border),
          ),
        ),
      ),
      menuChildren: [
        ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 288),
          child: widget.child,
        ),
      ],
      child: widget.anchor,
    );
  }
}
