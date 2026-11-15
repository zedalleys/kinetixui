import 'dart:async';

import 'package:flutter/material.dart';

import 'app_text.dart';
import 'kinetix_motion.dart';
import 'kinetix_toast_motion.dart';
import 'theme.dart';

enum KinetixToastIntent { normal, success, error }

class KinetixToast {
  const KinetixToast(this.message, {this.intent = KinetixToastIntent.normal});

  final String message;
  final KinetixToastIntent intent;
}

/// Mirrors `packages/ui/src/components/sonner.tsx`. Place [KinetixToaster]
/// in a top-level `Stack` and drive it with a `KinetixToast?`; it shows a
/// bottom card and calls `onDismiss` after `duration`. The other ports
/// used the platform snackbar for the same role.
class KinetixToaster extends StatefulWidget {
  const KinetixToaster({
    super.key,
    required this.toast,
    required this.onDismiss,
    this.duration = const Duration(seconds: 3),
  });

  final KinetixToast? toast;
  final VoidCallback onDismiss;
  final Duration duration;

  @override
  State<KinetixToaster> createState() => _KinetixToasterState();
}

class _KinetixToasterState extends State<KinetixToaster> with SingleTickerProviderStateMixin {
  Timer? _timer;
  bool? _reduceMotion;
  late final AnimationController _entrance;
  late final _opacity = _entrance.drive(
    Tween(begin: KinetixOpacity.muted, end: KinetixOpacity.visible)
        .chain(CurveTween(curve: KinetixToastMotion.easing)),
  );

  @override
  void initState() {
    super.initState();
    _entrance = AnimationController(
      vsync: this,
      duration: KinetixToastMotion.duration,
      value: 1,
    );
    _scheduleDismissal();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduceMotion = KinetixToastMotion.reduceMotionOf(context);
    if (reduceMotion) {
      _entrance.value = 1;
    } else if (_reduceMotion == null && widget.toast != null) {
      _entrance.forward(from: 0);
    }
    _reduceMotion = reduceMotion;
  }

  @override
  void didUpdateWidget(covariant KinetixToaster oldWidget) {
    super.didUpdateWidget(oldWidget);
    final toast = widget.toast;
    final changed = toast?.message != oldWidget.toast?.message || toast?.intent != oldWidget.toast?.intent;
    if (changed || widget.duration != oldWidget.duration) {
      _scheduleDismissal();
    }
    if (changed) {
      if (toast != null && !KinetixToastMotion.reduceMotionOf(context)) {
        _entrance.forward(from: 0);
      } else {
        _entrance.value = 1;
      }
    }
  }

  void _scheduleDismissal() {
    _timer?.cancel();
    _timer = widget.toast == null
        ? null
        : Timer(widget.duration, () {
            _timer = null;
            widget.onDismiss();
          });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _entrance.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final toast = widget.toast;
    if (toast == null) return const SizedBox.shrink();
    final c = KinetixTheme.of(context);
    final Color color = switch (toast.intent) {
      KinetixToastIntent.success => c.success,
      KinetixToastIntent.error => c.destructive,
      KinetixToastIntent.normal => c.popoverForeground,
    };

    return FadeTransition(
      opacity: _opacity,
      alwaysIncludeSemantics: true,
      child: Align(
        alignment: Alignment.bottomCenter,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Semantics(
            liveRegion: true,
            child: _buildToast(toast, c, color),
          ),
        ),
      ),
    );
  }

  Widget _buildToast(KinetixToast toast, KinetixColors c, Color color) {
    return Material(
      color: c.popover,
      borderRadius: BorderRadius.circular(8),
      elevation: 6,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: c.border, width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (toast.intent != KinetixToastIntent.normal) ...[
              Icon(
                toast.intent == KinetixToastIntent.success
                    ? Icons.check_circle_outline
                    : Icons.error_outline,
                size: 16,
                color: color,
              ),
              const SizedBox(width: 8),
            ],
            Flexible(child: Text(toast.message, style: AppText.bodyMd.copyWith(color: color))),
          ],
        ),
      ),
    );
  }
}
