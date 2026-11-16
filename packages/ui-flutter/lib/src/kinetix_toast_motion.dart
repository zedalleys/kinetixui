import 'package:flutter/widgets.dart';

import 'kinetix_disclosure_motion.dart';
import 'kinetix_motion.dart';

/// The toast enters with the overlay role's fade. Clearing it removes the
/// surface immediately, along with its announcement.
class KinetixToastMotion {
  KinetixToastMotion._();

  static const duration = KinetixDuration.fast;
  static const easing = KinetixEasing.enter;

  static bool reduceMotionOf(BuildContext context) => KinetixDisclosureMotion.reduceMotionOf(context);
}
