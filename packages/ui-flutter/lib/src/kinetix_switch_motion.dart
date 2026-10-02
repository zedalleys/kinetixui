import 'package:flutter/widgets.dart';

import 'kinetix_disclosure_motion.dart';
import 'kinetix_motion.dart';

/// The selection-control family's motion on Flutter.
///
/// ## This is a motion spec, not a second reduced-motion system
///
/// The preference is read by [KinetixDisclosureMotion.reduceMotionOf], unchanged
/// and shared — one call to `MediaQuery.disableAnimationsOf`, one place that
/// knows how Flutter surfaces the platform setting. Nothing here detects
/// anything. What is separate is the *timing*, and it has to be: a disclosure
/// runs for `fast` on a directional easing pair, a switch thumb runs for
/// `instant` on `standard`, and one function returning both would have to lie
/// about one of them.
///
/// ## Why the duration changed
///
/// `AnimatedContainer` carried a literal `Duration(milliseconds: 150)` while
/// `kinetix_motion.dart` sat beside it holding `instant = 100`. The React port
/// these three native switches all say they mirror uses `duration-instant
/// ease-standard`. The token was already right; it simply was not being read.
///
/// ## The suppressed duration
///
/// Reuses [KinetixDisclosureMotion.suppressed] rather than naming its own value,
/// so there is one answer in the package to "how long is no animation".
///
/// It is worth being precise about why that value is non-zero, because the
/// reason is narrower than it looks. `Duration.zero` is a genuine hazard for
/// `AnimatedSize`, whose `RenderAnimatedSize` restarts its controller from
/// inside `performLayout` — and `AnimationController` notifies listeners
/// synchronously at exactly zero, so the render object re-dirties itself
/// mid-layout and throws. `AnimatedContainer` is NOT that case: its controller
/// belongs to a `State`. So this is reuse for consistency, not a claim that
/// `AnimatedContainer` rejects zero — it does not, and a guard that said
/// otherwise would be asserting something false.
class KinetixSwitchMotion {
  KinetixSwitchMotion._();

  /// How long the thumb travels: the canonical token, or imperceptibly brief
  /// when the reader has asked for no animation.
  static Duration durationOf(BuildContext context) =>
      KinetixDisclosureMotion.reduceMotionOf(context)
          ? KinetixDisclosureMotion.suppressed
          : KinetixDuration.instant;

  /// One curve, not a directional pair: a switch is symmetric — on and off are
  /// the same gesture reversed, with no enter/exit asymmetry to express.
  static Curve get curve => KinetixEasing.standard;

  /// Which end of the track the thumb rests at. State, not decoration:
  /// unchanged by the setting, so an off switch can never render as on.
  ///
  /// `AlignmentDirectional` rather than `Alignment`: the thumb must travel
  /// toward the reader's trailing edge, so it mirrors under RTL. `centerRight`
  /// would pin it to the physical right in both directions.
  static AlignmentGeometry thumbAlignment({required bool value}) =>
      value ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart;
}
