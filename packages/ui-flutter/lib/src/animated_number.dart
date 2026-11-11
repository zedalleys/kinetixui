import 'package:flutter/widgets.dart';
import 'kinetix_number_motion.dart';

/// Visual tracking with an exact accessible target. Initial values do not count up.
class KinetixAnimatedNumber extends StatelessWidget {
  final double value;
  final String Function(double) format;
  final TextStyle? style;
  const KinetixAnimatedNumber(
      {super.key, required this.value, required this.format, this.style});

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    return Semantics(
      label: format(value),
      excludeSemantics: true,
      child: reduced || !value.isFinite
          ? Text(format(value), style: style)
          : _FiniteNumber(value: value, format: format, style: style),
    );
  }
}

class _FiniteNumber extends ImplicitlyAnimatedWidget {
  final double value;
  final String Function(double) format;
  final TextStyle? style;
  _FiniteNumber({required this.value, required this.format, this.style})
      : super(
            duration: KinetixNumberMotion.duration,
            curve: KinetixNumberMotion.curve);
  @override
  AnimatedWidgetBaseState<_FiniteNumber> createState() => _NumberState();
}

class _NumberState extends AnimatedWidgetBaseState<_FiniteNumber> {
  Tween<double>? _value;
  @override
  void forEachTween(TweenVisitor<dynamic> visitor) {
    _value = visitor(_value, widget.value,
        (dynamic v) => Tween<double>(begin: v as double)) as Tween<double>?;
  }

  @override
  Widget build(BuildContext context) =>
      Text(widget.format(_value?.evaluate(animation) ?? widget.value),
          style: widget.style);
}
