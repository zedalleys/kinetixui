import 'package:flutter/widgets.dart';

import 'kinetix_motion.dart';

/// The disclosure family's motion on Flutter, and what the platform's
/// "remove animations" setting does to it.
///
/// ## Where the preference comes from
///
/// `MediaQuery.disableAnimationsOf(context)` — Flutter's own surfacing of the
/// platform accessibility feature (iOS Reduce Motion, Android's animator
/// scale). No preference is invented and nothing is added to a widget's API
/// for a caller to set by hand: the setting belongs to the reader. It is read
/// through `MediaQuery` rather than captured once, so a widget rebuilds if the
/// reader changes it while the app is open.
///
/// ## What suppression means
///
/// Not "no state change". The content still appears and disappears and the
/// chevron still ends up rotated — only the interpolation goes. `AnimatedSize`,
/// `AnimatedCrossFade` and `AnimatedRotation` all still run their state
/// machines and still settle, so anything awaiting completion still completes.
/// Removing the widgets instead would change the tree shape, which is a larger
/// difference than the one the reader asked for.
///
/// The suppressed duration is the smallest non-zero one rather than
/// `Duration.zero`, and that is not a cosmetic choice. `AnimationController`
/// notifies its listeners SYNCHRONOUSLY when the duration is exactly zero,
/// while `RenderAnimatedSize` restarts its controller from inside
/// `performLayout` — so `Duration.zero` re-dirties the render object in the
/// middle of its own layout and trips the framework's own assertion:
///
///     A RenderAnimatedSize was mutated in its own performLayout implementation.
///
/// CI caught this; it is a real defect in a reduced-motion path, not a test
/// artefact, and it would have thrown for exactly the reader this exists for.
/// One microsecond takes the ordinary scheduled path and still completes within
/// the first frame, so nothing is perceptible. The web side floors reduced
/// motion the same way and for a comparable reason: `animation-duration:
/// 0.01ms` rather than `animation: none`, because Radix unmounts on
/// `animationend` and a removed animation never fires it.
///
/// ## Why the durations come from the tokens
///
/// These widgets carried literal `Duration(milliseconds: 200)` while
/// `kinetix_motion.dart` sat beside them holding the same 200ms as
/// `KinetixDuration.fast`. The value was right and the provenance was not.
/// Disclosure also uses the directional easing pair the tokens exist for:
/// opening decelerates (`enter`), closing accelerates (`exit`).
class KinetixDisclosureMotion {
  KinetixDisclosureMotion._();

  /// True when the reader has asked the platform for no animation.
  static bool reduceMotionOf(BuildContext context) => MediaQuery.disableAnimationsOf(context);

  /// The suppressed duration. Non-zero by necessity — see the class doc.
  static const Duration suppressed = Duration(microseconds: 1);

  /// How long a disclosure runs: the canonical token, or imperceptibly brief
  /// when the reader has asked for no animation.
  static Duration durationOf(BuildContext context) =>
      reduceMotionOf(context) ? suppressed : KinetixDuration.fast;

  /// Opening decelerates.
  static Curve get enterCurve => KinetixEasing.enter;

  /// Closing accelerates. Separate from [enterCurve] because a collapse is its
  /// own curve, not an expansion played backwards.
  static Curve get exitCurve => KinetixEasing.exit;

  /// The chevron's turns value. Unchanged by the setting: the angle is state,
  /// not decoration, so it still lands at half a turn — it just gets there in
  /// one frame.
  static double chevronTurns({required bool expanded}) => expanded ? 0.5 : 0.0;
}
