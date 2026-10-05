import 'package:flutter/widgets.dart';

import 'kinetix_disclosure_motion.dart';
import 'kinetix_motion.dart';

/// The continuous-loop family's motion on Flutter: Spinner, Skeleton, Marquee
/// and the typing indicator.
///
/// ## This is a motion spec, not a second reduced-motion system
///
/// The preference is read by [KinetixDisclosureMotion.reduceMotionOf], unchanged
/// and shared. What differs from the disclosure and selection families is the
/// reduced FORM. Those families shorten a transition to nothing and keep its
/// destination. A loop has no destination: shortening one period just makes it
/// spin faster. So under the setting a loop does not run at all, and each
/// member renders a static state that still says what the motion said:
///
/// * Spinner — the arc at rest, plus its "Loading" label. The label is what
///   carries the state to assistive technology in both modes.
/// * Skeleton — the placeholder at full opacity. The block's presence is the
///   information; the pulse never was.
/// * Marquee — one copy of the content in a row the reader scrolls by hand.
///   Stopping the ticker in place would clip whatever sat past the edge.
/// * Typing indicator — three dots at rest at the muted opacity, plus its
///   "Typing" label.
///
/// ## The loop periods
///
/// These are not transition durations, so they are not the duration tokens:
/// `KinetixDuration` describes how long a change takes, and these describe how
/// often a decoration repeats. Each one mirrors the web keyframe the component
/// says it ports, and is named here once so the three native ports and their
/// tests read the same value.
class KinetixLoopMotion {
  KinetixLoopMotion._();

  /// Whether continuous motion runs. False when the reader has asked for no
  /// animation.
  static bool runsOf(BuildContext context) =>
      !KinetixDisclosureMotion.reduceMotionOf(context);

  /// Starts or stops [controller] to match the setting. Called from
  /// `didChangeDependencies`, so it also follows the setting when it changes
  /// while the widget is on screen. A stopped controller is reset to its rest
  /// value and schedules no frames.
  static void sync(AnimationController controller,
      {required bool runs, bool reverse = false}) {
    if (runs) {
      if (!controller.isAnimating) controller.repeat(reverse: reverse);
    } else {
      controller.reset();
    }
  }

  /// One full turn of the spinner.
  static const Duration spinnerPeriod = Duration(milliseconds: 800);

  /// One half-cycle of the skeleton pulse (1 → 0.5 opacity). Run in reverse,
  /// so the full cycle is 2s, which is Tailwind's `animate-pulse`.
  static const Duration skeletonHalfCycle = Duration(seconds: 1);

  /// One full typing-dot cycle, and the delay between neighbouring dots.
  static const Duration typingPeriod = Duration(milliseconds: 1200);
  static const Duration typingStagger = Duration(milliseconds: 150);

  /// The opacity typing dots rest at when they do not move: the muted opacity
  /// token. React reaches the same 0.7 through Tailwind's default
  /// `opacity-70` rather than the token's `opacity-muted`.
  static const double restingDotOpacity = KinetixOpacity.muted;
}
