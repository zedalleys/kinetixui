import 'package:flutter/animation.dart';
import 'kinetix_motion.dart';

/// Existing spatial role: slow entry, base exit, standard curve. Reduced
/// motion settles immediately, preserving the destination and modal lifecycle.
class KinetixSlideMotion {
  KinetixSlideMotion._();

  static Duration duration(
          {required bool entering, required bool reduceMotion}) =>
      reduceMotion
          ? Duration.zero
          : entering
              ? KinetixDuration.slow
              : KinetixDuration.base;
  static Curve get curve => KinetixEasing.standard;
}
