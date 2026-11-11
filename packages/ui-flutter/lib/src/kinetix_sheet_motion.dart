import 'package:flutter/widgets.dart';

import 'kinetix_motion.dart';

/// The existing spatial role: slow entry, base exit, standard easing.
/// Reduced motion shortens both directions to one imperceptible frame.
class KinetixSheetMotion {
  KinetixSheetMotion._();

  static bool reduceMotionOf(BuildContext context) =>
      MediaQuery.disableAnimationsOf(context);

  // Non-zero avoids synchronous completion callbacks during a dependency update.
  static const suppressed = Duration(microseconds: 1);
  static Duration enterDuration(bool reduceMotion) =>
      reduceMotion ? suppressed : KinetixDuration.slow;
  static Duration exitDuration(bool reduceMotion) =>
      reduceMotion ? suppressed : KinetixDuration.base;
  static Curve get curve => KinetixEasing.standard;
}
