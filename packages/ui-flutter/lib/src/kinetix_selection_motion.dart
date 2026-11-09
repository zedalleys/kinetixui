import 'package:flutter/widgets.dart';

import 'kinetix_disclosure_motion.dart';
import 'kinetix_motion.dart';

/// The selection-STATE family's motion on Flutter.
///
/// ## Why this is not [KinetixSwitchMotion]
///
/// Two roles, two durations, and by owner decision (2026-10-17) they are not to
/// be normalised: `selection-control` (Switch) runs for `instant` because a
/// thumb is a physical control that should land with the finger, and
/// `selection-state` (Toggle, ToggleGroup, Checkbox, RadioGroup) runs for
/// `fast` because nothing moves — a colour settles. One helper returning both
/// would have to lie about one of them, which is also why the disclosure and
/// switch families are separate files.
///
/// ## This is a spec, not a second reduced-motion system
///
/// The preference is read by [KinetixDisclosureMotion.reduceMotionOf],
/// unchanged and shared — one call to `MediaQuery.disableAnimationsOf`, one
/// place in the package that knows how Flutter surfaces the platform setting.
/// Nothing here detects anything.
///
/// ## The suppressed duration
///
/// Reuses [KinetixDisclosureMotion.suppressed] rather than naming its own
/// value, so the package has one answer to "how long is no animation". Why it
/// is one microsecond rather than `Duration.zero` is argued where the constant
/// lives: it matters for `AnimatedSize`, and is reuse for consistency here.
class KinetixSelectionMotion {
  KinetixSelectionMotion._();

  /// How long a selection colour settles: the canonical token, or imperceptibly
  /// brief when the reader has asked for no animation.
  static Duration durationOf(BuildContext context) =>
      KinetixDisclosureMotion.reduceMotionOf(context)
          ? KinetixDisclosureMotion.suppressed
          : KinetixDuration.fast;

  /// One curve, not a directional pair: selecting and unselecting are the same
  /// change reversed, with no enter/exit asymmetry to express.
  static Curve get curve => KinetixEasing.standard;
}
