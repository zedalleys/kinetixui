import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import 'kinetix_disclosure_motion.dart';
import 'kinetix_motion.dart';
import 'kinetix_shadow.dart';
import 'theme.dart';

/// Shares one painted surface across a row of built-in selection items.
class KinetixSelectionIndicator extends StatefulWidget {
  const KinetixSelectionIndicator({
    super.key,
    required this.selectedIndex,
    required this.children,
    required this.sharesSurface,
  });

  final int selectedIndex;
  final List<Widget> children;
  final bool sharesSurface;

  @override
  State<KinetixSelectionIndicator> createState() =>
      _KinetixSelectionIndicatorState();
}

class _KinetixSelectionIndicatorState extends State<KinetixSelectionIndicator>
    with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(
    vsync: this,
    duration: KinetixDuration.base,
  );

  @override
  Widget build(BuildContext context) => KinetixSelectionSurfaceScope(
        enabled: widget.sharesSurface,
        child: _IndicatorRow(
          controller: _controller,
          selectedIndex: widget.selectedIndex,
          reduceMotion: KinetixDisclosureMotion.reduceMotionOf(context),
          color: KinetixTheme.of(context).background,
          children: widget.children,
        ),
      );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}

class _IndicatorRow extends Row {
  const _IndicatorRow({
    required this.controller,
    required this.selectedIndex,
    required this.reduceMotion,
    required this.color,
    required super.children,
  }) : super(mainAxisSize: MainAxisSize.min);

  final AnimationController controller;
  final int selectedIndex;
  final bool reduceMotion;
  final Color color;

  @override
  KinetixSelectionIndicatorRender createRenderObject(BuildContext context) {
    final render = KinetixSelectionIndicatorRender(controller);
    updateRenderObject(context, render);
    return render;
  }

  @override
  void updateRenderObject(
      BuildContext context, KinetixSelectionIndicatorRender renderObject) {
    super.updateRenderObject(context, renderObject);
    renderObject.configure(selectedIndex, reduceMotion, color);
  }
}

class KinetixSelectionIndicatorRender extends RenderFlex {
  KinetixSelectionIndicatorRender(this._controller)
      : super(direction: Axis.horizontal);

  final AnimationController _controller;
  int _selectedIndex = -1;
  int _laidOutIndex = -1;
  bool _reduceMotion = false;
  TextDirection? _laidOutDirection;
  late Color _color;
  List<Rect> _geometry = const [];
  Rect? _from;
  Rect? _target;

  Rect? get presentation => Rect.lerp(
        _from,
        _target,
        KinetixEasing.emphasized.transform(_controller.value),
      );

  void configure(int selectedIndex, bool reduceMotion, Color color) {
    if (_selectedIndex != selectedIndex || _reduceMotion != reduceMotion) {
      _selectedIndex = selectedIndex;
      _reduceMotion = reduceMotion;
      markNeedsLayout();
    }
    _color = color;
    markNeedsPaint();
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _controller.addListener(markNeedsPaint);
  }

  @override
  void detach() {
    _controller.removeListener(markNeedsPaint);
    super.detach();
  }

  @override
  void performLayout() {
    super.performLayout();
    final geometry = <Rect>[];
    for (var item = firstChild; item != null; item = childAfter(item)) {
      final data = item.parentData! as FlexParentData;
      geometry.add(data.offset & item.size);
    }
    final stableLayout = _laidOutDirection == textDirection &&
        geometry.length == _geometry.length &&
        Iterable<int>.generate(geometry.length)
            .every((i) => geometry[i] == _geometry[i]);
    final target = _selectedIndex >= 0 && _selectedIndex < geometry.length
        ? geometry[_selectedIndex]
        : null;
    final canTravel = !_reduceMotion &&
        stableLayout &&
        _selectedIndex != _laidOutIndex &&
        target != null &&
        _target != null;
    if (canTravel) {
      _from = presentation;
      _target = target;
      _controller.forward(from: 0);
    } else if (_reduceMotion || !stableLayout || _target != target) {
      _controller.stop();
      _from = _target = target;
    }
    _geometry = geometry;
    _laidOutIndex = _selectedIndex;
    _laidOutDirection = textDirection;
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final rect = presentation;
    if (rect != null && !rect.isEmpty) {
      final shape = RRect.fromRectAndRadius(
        rect.shift(offset),
        const Radius.circular(KinetixRadius.control),
      );
      for (final shadow in KinetixShadow.sm) {
        context.canvas.drawRRect(
          shape.shift(shadow.offset).inflate(shadow.spreadRadius),
          shadow.toPaint(),
        );
      }
      context.canvas.drawRRect(shape, Paint()..color = _color);
    }
    super.paint(context, offset);
  }
}

/// The row can share paint when every immediate child is a built-in item.
/// Wrapped/custom children and multiple selections keep their own surfaces.
class KinetixSelectionSurfaceScope extends InheritedWidget {
  const KinetixSelectionSurfaceScope(
      {super.key, required this.enabled, required super.child});

  final bool enabled;

  static bool of(BuildContext context) =>
      context
          .dependOnInheritedWidgetOfExactType<KinetixSelectionSurfaceScope>()
          ?.enabled ??
      false;

  @override
  bool updateShouldNotify(KinetixSelectionSurfaceScope oldWidget) =>
      oldWidget.enabled != enabled;
}
