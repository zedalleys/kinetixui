import 'package:flutter/widgets.dart';

import 'kinetix_shadow.dart';
import 'kinetix_shadow.dark.dart';

export 'kinetix_shadow.dart' show KinetixShadow;
export 'kinetix_shadow.dark.dart' show KinetixShadowDark;

/// The shadow set for one theme — the elevation scale plus the focus rings.
///
/// Most of the time you want the generated [KinetixShadow] constants directly:
///
/// ```dart
/// Container(
///   decoration: const BoxDecoration(boxShadow: KinetixShadow.md),
/// )
/// ```
///
/// Use this class only when the shadow has to follow the active brightness.
/// **Only the focus rings are theme-dependent** — `tokens/semantic/shadow.dark.json`
/// overrides `focus*` and nothing else, because the `sm`/`md`/`lg`/`xl`
/// elevation scale is black-alpha and reads correctly on either surface. So
/// [sm], [md], [lg] and [xl] are identical in [light] and [dark] by design,
/// not by oversight, and they are not duplicated in the generated dark file.
///
/// The values come from the generated, vendored [KinetixShadow] /
/// [KinetixShadowDark] classes (`kinetix_shadow.dart` / `.dark.dart` — do not
/// hand-edit; re-run `node scripts/vendor-flutter-tokens.mjs` after
/// `pnpm build:tokens`). This class only chooses between them.
@immutable
class KinetixShadows {
  const KinetixShadows({
    required this.sm,
    required this.md,
    required this.lg,
    required this.xl,
    required this.focus,
    required this.focusDestructive,
    required this.focusSuccess,
    required this.focusWarning,
  });

  /// Elevation scale — theme-independent (see the class doc).
  final List<BoxShadow> sm;
  final List<BoxShadow> md;
  final List<BoxShadow> lg;
  final List<BoxShadow> xl;

  /// Focus rings — these DO change with brightness.
  final List<BoxShadow> focus;
  final List<BoxShadow> focusDestructive;
  final List<BoxShadow> focusSuccess;
  final List<BoxShadow> focusWarning;

  static const KinetixShadows light = KinetixShadows(
    sm: KinetixShadow.sm,
    md: KinetixShadow.md,
    lg: KinetixShadow.lg,
    xl: KinetixShadow.xl,
    focus: KinetixShadow.focus,
    focusDestructive: KinetixShadow.focusDestructive,
    focusSuccess: KinetixShadow.focusSuccess,
    focusWarning: KinetixShadow.focusWarning,
  );

  static const KinetixShadows dark = KinetixShadows(
    // the elevation scale is theme-independent — same generated constants as light
    sm: KinetixShadow.sm,
    md: KinetixShadow.md,
    lg: KinetixShadow.lg,
    xl: KinetixShadow.xl,
    // the focus rings are the only shadows the dark token pass overrides
    focus: KinetixShadowDark.focus,
    focusDestructive: KinetixShadowDark.focusDestructive,
    focusSuccess: KinetixShadowDark.focusSuccess,
    focusWarning: KinetixShadowDark.focusWarning,
  );

  /// The set for an explicit [brightness].
  static KinetixShadows forBrightness(Brightness brightness) =>
      brightness == Brightness.dark ? dark : light;

  /// The set for the **platform** brightness at [context] — the same signal
  /// `KinetixTheme` uses to pick its colours, so Kinetix widgets and these
  /// shadows agree by default.
  ///
  /// Note this reads the platform brightness, not an app-level override. If
  /// you drive brightness yourself — `MaterialApp(themeMode: ThemeMode.dark)`
  /// on a light device, say — pass the theme's own brightness instead, so the
  /// ring matches the surface it is drawn on:
  ///
  /// ```dart
  /// KinetixShadows.forBrightness(Theme.of(context).brightness)
  /// ```
  static KinetixShadows of(BuildContext context) => forBrightness(
        MediaQuery.maybeOf(context)?.platformBrightness ??
            WidgetsBinding.instance.platformDispatcher.platformBrightness,
      );
}
