import 'package:flutter/cupertino.dart';

import 'app_text.dart';
import 'theme.dart';

/// Builds a [CupertinoThemeData] from the KinetixUI token contract, so an iOS
/// app can use ordinary Cupertino widgets in the Kinetix design language:
///
/// ```dart
/// CupertinoApp(
///   theme: KinetixCupertinoTheme.light(),
/// )
/// ```
///
/// Cupertino's theme surface is deliberately much smaller than Material's — it
/// carries a brightness, a handful of colours and a text theme, and nothing
/// resembling a shape or component theme. This adapter maps what exists and
/// does not pretend otherwise: corner radius, spacing and shadows stay explicit
/// via [KinetixRadius], [KinetixSpacing] and `KinetixShadow`, and everything
/// Cupertino has no slot for stays on [KinetixColors].
///
/// Cupertino widgets keep their native behaviour — this only changes colour and
/// type, it does not make them look like Material.
///
/// | Cupertino field | Kinetix token |
/// |---|---|
/// | `brightness` | the requested brightness |
/// | `primaryColor` | `action` |
/// | `primaryContrastingColor` | `actionForeground` |
/// | `scaffoldBackgroundColor` | `background` |
/// | `barBackgroundColor` | `card` — nav/tab bars sit on the raised surface |
/// | `textTheme` | the Kinetix type scale (see [textThemeFor]) |
class KinetixCupertinoTheme {
  KinetixCupertinoTheme._();

  /// The light Cupertino theme.
  static CupertinoThemeData light() => _build(Brightness.light, KinetixColors.light);

  /// The dark Cupertino theme — built from the real generated dark semantic
  /// values, never a transform of the light ones.
  static CupertinoThemeData dark() => _build(Brightness.dark, KinetixColors.dark);

  /// The theme for an explicit [brightness].
  static CupertinoThemeData fromBrightness(Brightness brightness) =>
      brightness == Brightness.dark ? dark() : light();

  /// The same mapping over your own palette — a theme exported from
  /// kinetixui.com/create with `kinetixui preset flutter`, or one written by
  /// hand:
  ///
  /// ```dart
  /// CupertinoApp(
  ///   theme: KinetixCupertinoTheme.fromColors(Brightness.light, AcmeTheme.light),
  /// )
  /// ```
  ///
  /// Mapping unchanged, so the caveat above applies here too: [CupertinoThemeData]
  /// is a small surface and this carries only the roles it can represent. Wrap
  /// the app in [KinetixTheme.custom] as well for `Kinetix*` widgets to see the
  /// full palette.
  static CupertinoThemeData fromColors(Brightness brightness, KinetixColors colors) =>
      _build(brightness, colors);

  static CupertinoThemeData _build(Brightness brightness, KinetixColors c) => CupertinoThemeData(
        brightness: brightness,
        primaryColor: c.action,
        primaryContrastingColor: c.actionForeground,
        scaffoldBackgroundColor: c.background,
        barBackgroundColor: c.card,
        textTheme: textThemeFor(c),
      );

  /// The [CupertinoTextThemeData] half of the adapter.
  ///
  /// Cupertino exposes far fewer roles than Material's 15-slot `TextTheme`, so
  /// this maps the five it has and leaves the rest of the scale to
  /// `KinetixType.*`. `navLargeTitleTextStyle` takes `headlineSm` rather than a
  /// display size: iOS large titles are ~34pt, and `displaySm` (36) is the
  /// closest Kinetix role but reads oversized in a nav bar, while `headlineSm`
  /// (24) is the nearest role that matches iOS proportions.
  static CupertinoTextThemeData textThemeFor(KinetixColors c) => CupertinoTextThemeData(
        primaryColor: c.action,
        textStyle: AppText.bodyMd.copyWith(color: c.foreground),
        actionTextStyle: AppText.labelLg.copyWith(color: c.action),
        tabLabelTextStyle: AppText.labelSm.copyWith(color: c.mutedForeground),
        navTitleTextStyle: AppText.titleMd.copyWith(color: c.foreground),
        navLargeTitleTextStyle: AppText.headlineSm.copyWith(color: c.foreground),
        navActionTextStyle: AppText.labelLg.copyWith(color: c.action),
      );
}
