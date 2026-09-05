import 'package:flutter/widgets.dart';

import 'toggle.dart';

/// Mirrors `packages/ui/src/components/toggle-group.tsx`. `variant` /
/// `size` are shared from the group to each item through an
/// `InheritedWidget` (the React Context analogue). `KinetixToggleGroupItem`
/// is a thin pass-through to [KinetixToggle] with those injected. Single-
/// vs multi-select is the caller's to enforce via the per-item callbacks.
class _ToggleGroupScope extends InheritedWidget {
  const _ToggleGroupScope({
    required this.variant,
    required this.size,
    required super.child,
  });

  final KinetixToggleVariant variant;
  final KinetixToggleSize size;

  static _ToggleGroupScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_ToggleGroupScope>();

  @override
  bool updateShouldNotify(_ToggleGroupScope oldWidget) =>
      oldWidget.variant != variant || oldWidget.size != size;
}

class KinetixToggleGroup extends StatelessWidget {
  const KinetixToggleGroup({
    super.key,
    required this.children,
    this.variant = KinetixToggleVariant.standard,
    this.size = KinetixToggleSize.md,
  });

  final List<Widget> children;
  final KinetixToggleVariant variant;
  final KinetixToggleSize size;

  @override
  Widget build(BuildContext context) {
    return _ToggleGroupScope(
      variant: variant,
      size: size,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const SizedBox(width: 4),
            children[i],
          ],
        ],
      ),
    );
  }
}

class KinetixToggleGroupItem extends StatelessWidget {
  const KinetixToggleGroupItem({
    super.key,
    required this.pressed,
    required this.onChanged,
    required this.child,
  });

  final bool pressed;
  final ValueChanged<bool>? onChanged;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scope = _ToggleGroupScope.maybeOf(context);
    return KinetixToggle(
      pressed: pressed,
      onChanged: onChanged,
      variant: scope?.variant ?? KinetixToggleVariant.standard,
      size: scope?.size ?? KinetixToggleSize.md,
      child: child,
    );
  }
}
