import 'package:flutter/widgets.dart';

import 'kinetix_color_scheme.dart';
import 'kinetix_color_scheme.dark.dart';

/// The semantic colour set every `Kinetix*` widget resolves to — the same
/// handful of tokens each variant in `packages/ui/src/components` maps to
/// (bg-primary, text-foreground, …). Matches `KinetixColors` in the
/// Compose / SwiftUI ports field-for-field.
///
/// The values come from the generated, vendored [KinetixColorScheme] /
/// [KinetixColorSchemeDark] classes (`kinetix_color_scheme.dart` /
/// `.dark.dart` — do not hand-edit; re-run
/// `node scripts/vendor-flutter-tokens.mjs` after `pnpm build:tokens`).
@immutable
class KinetixColors {
  const KinetixColors({
    required this.primary,
    required this.primaryForeground,
    required this.secondary,
    required this.secondaryForeground,
    required this.destructive,
    required this.destructiveForeground,
    required this.foreground,
    required this.background,
    required this.border,
    required this.input,
    required this.ring,
    required this.muted,
    required this.mutedForeground,
    required this.accent,
    required this.accentForeground,
    required this.tertiary,
    required this.tertiaryForeground,
    required this.warning,
    required this.warningForeground,
    required this.card,
    required this.cardForeground,
    required this.success,
    required this.successForeground,
    required this.info,
    required this.infoForeground,
    required this.popover,
    required this.popoverForeground,
    required this.chart,
  });

  final Color primary;
  final Color primaryForeground;
  final Color secondary;
  final Color secondaryForeground;
  final Color destructive;
  final Color destructiveForeground;
  final Color foreground;
  final Color background;
  final Color border;
  final Color input;
  final Color ring;
  final Color muted;
  final Color mutedForeground;
  final Color accent;
  final Color accentForeground;
  final Color tertiary;
  final Color tertiaryForeground;
  final Color warning;
  final Color warningForeground;
  final Color card;
  final Color cardForeground;
  final Color success;
  final Color successForeground;
  final Color info;
  final Color infoForeground;
  final Color popover;
  final Color popoverForeground;

  /// The 5-stop categorical chart palette (`--chart-1` … `--chart-5`).
  final List<Color> chart;

  /// Built from the generated light class — `pnpm build:tokens`.
  static const KinetixColors light = KinetixColors(
    primary: KinetixColorScheme.primary,
    primaryForeground: KinetixColorScheme.primaryForeground,
    secondary: KinetixColorScheme.secondary,
    secondaryForeground: KinetixColorScheme.secondaryForeground,
    destructive: KinetixColorScheme.destructive,
    destructiveForeground: KinetixColorScheme.destructiveForeground,
    foreground: KinetixColorScheme.foreground,
    background: KinetixColorScheme.background,
    border: KinetixColorScheme.border,
    input: KinetixColorScheme.input,
    ring: KinetixColorScheme.ring,
    muted: KinetixColorScheme.muted,
    mutedForeground: KinetixColorScheme.mutedForeground,
    accent: KinetixColorScheme.accent,
    accentForeground: KinetixColorScheme.accentForeground,
    tertiary: KinetixColorScheme.tertiary,
    tertiaryForeground: KinetixColorScheme.tertiaryForeground,
    warning: KinetixColorScheme.warning,
    warningForeground: KinetixColorScheme.warningForeground,
    card: KinetixColorScheme.card,
    cardForeground: KinetixColorScheme.cardForeground,
    success: KinetixColorScheme.success,
    successForeground: KinetixColorScheme.successForeground,
    info: KinetixColorScheme.info,
    infoForeground: KinetixColorScheme.infoForeground,
    popover: KinetixColorScheme.popover,
    popoverForeground: KinetixColorScheme.popoverForeground,
    chart: <Color>[
      KinetixColorScheme.chart1,
      KinetixColorScheme.chart2,
      KinetixColorScheme.chart3,
      KinetixColorScheme.chart4,
      KinetixColorScheme.chart5,
    ],
  );

  /// Built from the generated dark class — the real dark pass, same as the
  /// web `.dark` selector.
  static const KinetixColors dark = KinetixColors(
    primary: KinetixColorSchemeDark.primary,
    primaryForeground: KinetixColorSchemeDark.primaryForeground,
    secondary: KinetixColorSchemeDark.secondary,
    secondaryForeground: KinetixColorSchemeDark.secondaryForeground,
    destructive: KinetixColorSchemeDark.destructive,
    destructiveForeground: KinetixColorSchemeDark.destructiveForeground,
    foreground: KinetixColorSchemeDark.foreground,
    background: KinetixColorSchemeDark.background,
    border: KinetixColorSchemeDark.border,
    input: KinetixColorSchemeDark.input,
    ring: KinetixColorSchemeDark.ring,
    muted: KinetixColorSchemeDark.muted,
    mutedForeground: KinetixColorSchemeDark.mutedForeground,
    accent: KinetixColorSchemeDark.accent,
    accentForeground: KinetixColorSchemeDark.accentForeground,
    tertiary: KinetixColorSchemeDark.tertiary,
    tertiaryForeground: KinetixColorSchemeDark.tertiaryForeground,
    warning: KinetixColorSchemeDark.warning,
    warningForeground: KinetixColorSchemeDark.warningForeground,
    card: KinetixColorSchemeDark.card,
    cardForeground: KinetixColorSchemeDark.cardForeground,
    success: KinetixColorSchemeDark.success,
    successForeground: KinetixColorSchemeDark.successForeground,
    info: KinetixColorSchemeDark.info,
    infoForeground: KinetixColorSchemeDark.infoForeground,
    popover: KinetixColorSchemeDark.popover,
    popoverForeground: KinetixColorSchemeDark.popoverForeground,
    chart: <Color>[
      KinetixColorSchemeDark.chart1,
      KinetixColorSchemeDark.chart2,
      KinetixColorSchemeDark.chart3,
      KinetixColorSchemeDark.chart4,
      KinetixColorSchemeDark.chart5,
    ],
  );
}

/// Inherited holder for the active [KinetixColors]. Wrap a screen (or the
/// whole app) in `KinetixTheme(child: …)`; every `Kinetix*` widget below
/// reads it via `KinetixTheme.of(context)`. Defaults to the platform
/// brightness — pass [brightness] to force light or dark, the same as the
/// Compose port's `KinetixTheme(darkTheme: …)`.
class KinetixTheme extends InheritedWidget {
  const KinetixTheme({
    super.key,
    this.brightness,
    required super.child,
  });

  final Brightness? brightness;

  Brightness _brightnessFor(BuildContext context) =>
      brightness ??
      MediaQuery.maybeOf(context)?.platformBrightness ??
      WidgetsBinding.instance.platformDispatcher.platformBrightness;

  KinetixColors _colorsFor(BuildContext context) =>
      _brightnessFor(context) == Brightness.dark ? KinetixColors.dark : KinetixColors.light;

  /// The active semantic colour set for [context].
  static KinetixColors of(BuildContext context) {
    final theme = context.dependOnInheritedWidgetOfExactType<KinetixTheme>();
    assert(
      theme != null,
      'No KinetixTheme found in context. Wrap your app in KinetixTheme(child: …).',
    );
    return theme!._colorsFor(context);
  }

  @override
  bool updateShouldNotify(KinetixTheme oldWidget) => oldWidget.brightness != brightness;
}
