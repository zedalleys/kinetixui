import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/comparison-slider.tsx`: a drag
/// handle wiping between two stacked layers. Unlike [KinetixSlider]
/// (which wraps the system `Slider`), this needs a fully custom visual,
/// so it's built on a plain `GestureDetector` + a `CustomClipper<Rect>`
/// revealing the `after` layer from the handle position onward — the
/// same "duplicate the layers, clip one of them" technique as the other
/// two native ports and the web's CSS `clip-path`. Both dragging the
/// handle and tapping anywhere on the track jump the position (Flutter's
/// gesture layer makes both cheap here, unlike the Compose/SwiftUI ports
/// which only drag the handle).
class KinetixComparisonSlider extends StatefulWidget {
  const KinetixComparisonSlider({
    super.key,
    required this.before,
    required this.after,
    this.value,
    this.defaultValue = 50,
    this.onValueChanged,
    this.beforeLabel,
    this.afterLabel,
  });

  final Widget before;
  final Widget after;
  final double? value;
  final double defaultValue;
  final ValueChanged<double>? onValueChanged;
  final String? beforeLabel;
  final String? afterLabel;

  @override
  State<KinetixComparisonSlider> createState() => _KinetixComparisonSliderState();
}

class _KinetixComparisonSliderState extends State<KinetixComparisonSlider> {
  late double _internal = widget.value ?? widget.defaultValue;

  double get _current => widget.value ?? _internal;

  void _setCurrent(double v) {
    final clamped = v.clamp(0.0, 100.0);
    setState(() => _internal = clamped);
    widget.onValueChanged?.call(clamped);
  }

  Widget _labelChip(BuildContext context, String text) {
    final c = KinetixTheme.of(context);
    return Container(
      margin: const EdgeInsets.all(8),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: c.background.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(text, style: AppText.labelSm.copyWith(color: c.foreground)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);

    return AspectRatio(
      aspectRatio: 16 / 9,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final handleX = width * _current / 100;

            return GestureDetector(
              onHorizontalDragUpdate: (details) => _setCurrent((details.localPosition.dx / width) * 100),
              onTapDown: (details) => _setCurrent((details.localPosition.dx / width) * 100),
              child: Container(
                color: c.muted,
                child: Stack(
                  children: [
                    Positioned.fill(child: widget.before),
                    ClipRect(
                      clipper: _RevealClipper(handleX),
                      child: SizedBox.expand(child: widget.after),
                    ),
                    Positioned(
                      left: handleX - 1,
                      top: 0,
                      bottom: 0,
                      child: Container(width: 2, color: c.background),
                    ),
                    if (widget.beforeLabel != null)
                      Positioned(top: 0, left: 0, child: _labelChip(context, widget.beforeLabel!)),
                    if (widget.afterLabel != null)
                      Positioned(top: 0, right: 0, child: _labelChip(context, widget.afterLabel!)),
                    Positioned(
                      left: handleX - 16,
                      top: 0,
                      bottom: 0,
                      child: Center(
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: c.background.withValues(alpha: 0.9),
                            border: Border.all(color: c.background, width: 2),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _RevealClipper extends CustomClipper<Rect> {
  const _RevealClipper(this.left);

  final double left;

  @override
  Rect getClip(Size size) => Rect.fromLTWH(left, 0, size.width - left, size.height);

  @override
  bool shouldReclip(covariant _RevealClipper oldClipper) => oldClipper.left != left;
}
