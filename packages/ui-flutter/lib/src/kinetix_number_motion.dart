import 'package:flutter/animation.dart';
import 'kinetix_motion.dart';

/// Shared token pairing. The widget removes its animator when disableAnimations is enabled.
class KinetixNumberMotion {
  KinetixNumberMotion._();
  static Duration get duration => KinetixDuration.base;
  static Curve get curve => KinetixEasing.linear;
}
