import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'theme.dart';

// -- color math (kept identical, formula-for-formula, across all four platforms) --

List<double> kinetixHexToRgba(String hex) {
  final h = hex.replaceFirst('#', '');
  if (h.length == 8) {
    final n = int.parse(h, radix: 16);
    return [
      ((n >> 24) & 0xFF).toDouble(),
      ((n >> 16) & 0xFF).toDouble(),
      ((n >> 8) & 0xFF).toDouble(),
      (n & 0xFF) / 255,
    ];
  }
  final full = h.length == 3 ? h.split('').map((c) => '$c$c').join() : h;
  final n = int.parse(full, radix: 16);
  return [((n >> 16) & 0xFF).toDouble(), ((n >> 8) & 0xFF).toDouble(), (n & 0xFF).toDouble(), 1.0];
}

String kinetixRgbaToHex(double r, double g, double b, double a, {required bool includeAlpha}) {
  String ch(double v) => v.round().clamp(0, 255).toRadixString(16).padLeft(2, '0');
  final base = '#${ch(r)}${ch(g)}${ch(b)}';
  return includeAlpha ? '$base${ch(a * 255)}' : base;
}

List<double> kinetixHsvToRgb(double h, double s, double v) {
  final sN = s / 100;
  final vN = v / 100;
  final c = vN * sN;
  final hh = h / 60;
  final x = c * (1 - (hh % 2 - 1).abs());
  double r = 0, g = 0, b = 0;
  if (hh < 1) {
    r = c;
    g = x;
  } else if (hh < 2) {
    r = x;
    g = c;
  } else if (hh < 3) {
    g = c;
    b = x;
  } else if (hh < 4) {
    g = x;
    b = c;
  } else if (hh < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  final m = vN - c;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

List<double> kinetixRgbToHsv(double r, double g, double b) {
  final rN = r / 255, gN = g / 255, bN = b / 255;
  final maxV = math.max(rN, math.max(gN, bN));
  final minV = math.min(rN, math.min(gN, bN));
  final d = maxV - minV;
  double h = 0;
  if (d != 0) {
    if (maxV == rN) {
      h = (gN - bN) / d;
    } else if (maxV == gN) {
      h = (bN - rN) / d + 2;
    } else {
      h = (rN - gN) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  final s = maxV == 0 ? 0.0 : d / maxV;
  return [h, s * 100, maxV * 100];
}

/// Mirrors `packages/ui/src/components/color-picker.tsx`: a saturation/value
/// square, hue and (optional) alpha rails, a hex field, and swatches.
/// Internal HSV state (not derived from `value` on every build) for the same
/// reason as the web version: saturation 0 or value 0 erase hue information,
/// and re-deriving it every time would make the hue thumb jump to red
/// whenever a drag crosses either edge. `value` only resyncs the internal
/// state when it changes from something other than this widget's own last
/// emission.
///
/// The square and rails are hand-rolled with `GestureDetector` rather than
/// reused from a `Slider` — a 2D gesture has no single-axis primitive to
/// build on, and the rails need per-instance gradient track painting a
/// stock `Slider` doesn't expose. No eyedropper: Flutter has no built-in
/// "sample a pixel anywhere on screen" API the way the web's `EyeDropper`
/// does — a web-only enhancement, same as `KinetixTour`.
class KinetixColorPicker extends StatefulWidget {
  const KinetixColorPicker({
    super.key,
    required this.value,
    required this.onChanged,
    this.alpha = false,
    this.swatches = const [],
  });

  final String value;
  final ValueChanged<String> onChanged;
  final bool alpha;
  final List<String> swatches;

  @override
  State<KinetixColorPicker> createState() => _KinetixColorPickerState();
}

class _KinetixColorPickerState extends State<KinetixColorPicker> {
  late double _h, _s, _v, _a;
  late String _lastEmitted;
  late final TextEditingController _hexController;

  @override
  void initState() {
    super.initState();
    final rgba = kinetixHexToRgba(widget.value);
    final hsv = kinetixRgbToHsv(rgba[0], rgba[1], rgba[2]);
    _h = hsv[0];
    _s = hsv[1];
    _v = hsv[2];
    _a = rgba[3];
    _lastEmitted = widget.value;
    _hexController = TextEditingController(text: widget.value.replaceFirst('#', '').toUpperCase());
  }

  @override
  void didUpdateWidget(covariant KinetixColorPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != oldWidget.value && widget.value != _lastEmitted) {
      final rgba = kinetixHexToRgba(widget.value);
      final hsv = kinetixRgbToHsv(rgba[0], rgba[1], rgba[2]);
      setState(() {
        _h = hsv[0];
        _s = hsv[1];
        _v = hsv[2];
        _a = rgba[3];
        _lastEmitted = widget.value;
      });
      _hexController.text = widget.value.replaceFirst('#', '').toUpperCase();
    }
  }

  @override
  void dispose() {
    _hexController.dispose();
    super.dispose();
  }

  void _commit(double h, double s, double v, double a) {
    final rgb = kinetixHsvToRgb(h, s, v);
    final hex = kinetixRgbaToHex(rgb[0], rgb[1], rgb[2], a, includeAlpha: widget.alpha);
    setState(() {
      _h = h;
      _s = s;
      _v = v;
      _a = a;
      _lastEmitted = hex;
    });
    _hexController.text = hex.replaceFirst('#', '').toUpperCase();
    widget.onChanged(hex);
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final currentColor = HSVColor.fromAHSV(1, _h, (_s / 100).clamp(0, 1).toDouble(), (_v / 100).clamp(0, 1).toDouble()).toColor();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        LayoutBuilder(
          builder: (context, constraints) {
            void update(Offset local) {
              final ns = (local.dx / constraints.maxWidth * 100).clamp(0, 100).toDouble();
              final nv = (100 - local.dy / constraints.maxHeight * 100).clamp(0, 100).toDouble();
              _commit(_h, ns, nv, _a);
            }

            return GestureDetector(
              onPanDown: (d) => update(d.localPosition),
              onPanUpdate: (d) => update(d.localPosition),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  height: 160,
                  width: double.infinity,
                  child: Stack(
                    children: [
                      ColoredBox(color: HSVColor.fromAHSV(1, _h, 1, 1).toColor()),
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [Colors.white, Colors.transparent]),
                        ),
                      ),
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Colors.transparent, Colors.black],
                          ),
                        ),
                      ),
                      Positioned(
                        left: constraints.maxWidth * _s / 100 - 7,
                        top: constraints.maxHeight * (1 - _v / 100) - 7,
                        child: Container(
                          width: 14,
                          height: 14,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: currentColor,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 12),
        _GradientRail(
          fraction: _h / 360,
          gradient: const LinearGradient(
            colors: [
              Color(0xFFFF0000),
              Color(0xFFFFFF00),
              Color(0xFF00FF00),
              Color(0xFF00FFFF),
              Color(0xFF0000FF),
              Color(0xFFFF00FF),
              Color(0xFFFF0000),
            ],
          ),
          onChanged: (f) => _commit(f * 360, _s, _v, _a),
        ),
        if (widget.alpha) ...[
          const SizedBox(height: 12),
          _GradientRail(
            fraction: _a,
            backgroundColor: const Color(0xFFE5E5E5),
            gradient: LinearGradient(colors: [Colors.transparent, currentColor]),
            onChanged: (f) => _commit(_h, _s, _v, f),
          ),
        ],
        const SizedBox(height: 12),
        Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: currentColor.withValues(alpha: _a),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: c.border),
              ),
            ),
            const SizedBox(width: 8),
            Text('#', style: TextStyle(color: c.mutedForeground)),
            Expanded(
              child: TextField(
                controller: _hexController,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                decoration: const InputDecoration(border: InputBorder.none, isDense: true),
                onSubmitted: (draft) {
                  final pattern = widget.alpha ? RegExp(r'^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$') : RegExp(r'^[0-9a-fA-F]{6}$');
                  if (pattern.hasMatch(draft)) {
                    widget.onChanged('#${draft.toLowerCase()}');
                  } else {
                    _hexController.text = widget.value.replaceFirst('#', '').toUpperCase();
                  }
                },
              ),
            ),
          ],
        ),
        if (widget.swatches.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final sw in widget.swatches)
                GestureDetector(
                  onTap: () {
                    final rgba = kinetixHexToRgba(sw);
                    final hsv = kinetixRgbToHsv(rgba[0], rgba[1], rgba[2]);
                    _commit(hsv[0], hsv[1], hsv[2], _a);
                  },
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: Color(int.parse('FF${sw.replaceFirst('#', '')}', radix: 16)),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _GradientRail extends StatelessWidget {
  const _GradientRail({
    required this.fraction,
    required this.gradient,
    required this.onChanged,
    this.backgroundColor,
  });

  final double fraction;
  final Gradient gradient;
  final Color? backgroundColor;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        void update(Offset local) {
          onChanged((local.dx / constraints.maxWidth).clamp(0, 1).toDouble());
        }

        return GestureDetector(
          onPanDown: (d) => update(d.localPosition),
          onPanUpdate: (d) => update(d.localPosition),
          child: SizedBox(
            width: constraints.maxWidth,
            height: 20,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned(
                  left: 0,
                  right: 0,
                  top: 4,
                  height: 12,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: backgroundColor,
                      gradient: gradient,
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                ),
                Positioned(
                  left: constraints.maxWidth * fraction - 7,
                  top: 3,
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 2)],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
