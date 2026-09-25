import 'package:flutter/material.dart';

import 'app_text.dart';
import 'kinetix_motion.dart';
import 'theme.dart';

/// Builds a Material [ThemeData] from the KinetixUI token contract, so an app
/// can use ordinary Flutter widgets — `Card`, `FilledButton`, `Text` — and
/// still render in the Kinetix design language. No `Kinetix*` widget and no
/// [KinetixTheme] are required:
///
/// ```dart
/// MaterialApp(
///   theme: KinetixMaterialTheme.light(),
///   darkTheme: KinetixMaterialTheme.dark(),
/// )
/// ```
///
/// This is a **bridge, not a replacement**. Material's [ColorScheme] has fewer
/// roles than the Kinetix semantic palette, so several tokens have no slot here
/// and stay available on [KinetixColors]. Flutter also has no global spacing
/// scale: use [KinetixSpacing] for layout, [KinetixRadius] for corners and
/// `KinetixShadow` for shadows — the same tokens the Kinetix widgets use.
///
/// ## Colour mapping
///
/// | Material role | Kinetix token |
/// |---|---|
/// | `primary` / `onPrimary` | `action` / `actionForeground` — the interactive fill, which is the role Material's `primary` actually plays |
/// | `primaryContainer` / `onPrimaryContainer` | `primary` / `primaryForeground` |
/// | `secondary` / `onSecondary` | `secondary` / `secondaryForeground` |
/// | `secondaryContainer` / `onSecondaryContainer` | `accent` / `accentForeground` |
/// | `tertiary` / `onTertiary` | `brand` / `brandForeground` |
/// | `error` / `onError` | `destructive` / `destructiveForeground` |
/// | `surface` / `onSurface` | `background` / `foreground` |
/// | `surfaceTint` | `action` |
/// | `outline` | `border` |
/// | `outlineVariant` | `input` |
/// | `inverseSurface` / `onInverseSurface` | `foreground` / `background` |
/// | `shadow` | `foreground` |
///
/// **Deliberately unmapped** — no honest Material equivalent, so read them from
/// [KinetixColors]: `link`, `focus`, `ring`, `actionHover`, `actionPressed`,
/// `muted` / `mutedForeground`, `tertiary` / `tertiaryForeground` (the Kinetix
/// neutral — unrelated to Material's `tertiary` accent), `warning`, `success`,
/// `info` and their foregrounds, `card` / `cardForeground`, `popover` /
/// `popoverForeground`, and `chart`.
///
/// ## Typography
///
/// The Kinetix scale maps 1:1 onto Material 3's 15 [TextTheme] slots
/// (`display` / `headline` / `title` / `body` / `label` × `Lg` / `Md` / `Sm`).
/// Kinetix has one extra role with no Material slot, `KinetixType.titleDialog`;
/// apply it directly where a dialog title needs it.
///
/// ## What this deliberately does NOT theme
///
/// `cardTheme`, `dialogTheme`, `inputDecorationTheme` and `appBarTheme` are not
/// set. Flutter renamed those slots' types (`CardTheme` -> `CardThemeData`, and
/// the same for Dialog / InputDecoration / AppBar) in 3.32, which splits this
/// package's supported range (Flutter >= 3.27, see `pubspec.yaml`) in two: the
/// new `*ThemeData` names do not exist on 3.27-3.31, and the old ones are
/// deprecated from 3.32 on — where `flutter analyze` treats a deprecation as a
/// failure. No single spelling is valid across the whole range. Rather than
/// raise the floor again for cosmetic defaults, style those surfaces directly:
///
/// ```dart
/// Card(
///   shape: RoundedRectangleBorder(
///     borderRadius: BorderRadius.circular(KinetixRadius.container),
///   ),
///   child: …,
/// )
/// ```
class KinetixMaterialTheme {
  KinetixMaterialTheme._();

  /// The light Material theme.
  static ThemeData light() => _build(Brightness.light, KinetixColors.light);

  /// The dark Material theme — built from the real generated dark semantic
  /// values, never a transform of the light ones.
  static ThemeData dark() => _build(Brightness.dark, KinetixColors.dark);

  /// The theme for an explicit [brightness].
  static ThemeData fromBrightness(Brightness brightness) =>
      brightness == Brightness.dark ? dark() : light();

  /// The same mapping over your own palette — a theme exported from
  /// kinetixui.com/create with `kinetixui preset flutter`, or one written by
  /// hand:
  ///
  /// ```dart
  /// MaterialApp(
  ///   theme: KinetixMaterialTheme.fromColors(Brightness.light, AcmeTheme.light),
  ///   darkTheme: KinetixMaterialTheme.fromColors(Brightness.dark, AcmeTheme.dark),
  /// )
  /// ```
  ///
  /// Mapping unchanged, which means the caveat above applies here too: Material's
  /// [ColorScheme] is smaller than the Kinetix contract, so this carries the
  /// subset [colorSchemeFor] documents and no more. Wrap the app in
  /// [KinetixTheme.custom] as well for `Kinetix*` widgets to see the full palette.
  static ThemeData fromColors(Brightness brightness, KinetixColors colors) =>
      _build(brightness, colors);

  static ThemeData _build(Brightness brightness, KinetixColors c) {
    final ColorScheme colorScheme = colorSchemeFor(brightness, c);
    final TextTheme textTheme = textThemeFor(c);
    final ButtonStyle shared = _buttonStyle(textTheme);

    return ThemeData(
      // Material 3 is the current default; set explicitly so the mapping above
      // can't quietly change meaning if a consumer's Flutter defaults differ.
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: c.background,
      canvasColor: c.background,
      dividerColor: c.border,

      dividerTheme: DividerThemeData(color: c.border, thickness: 1),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.popover,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(KinetixRadius.surface)),
        ),
      ),

      // `styleFrom` rather than a raw ButtonStyle: these values are the same in
      // every widget state, so wrapping each one in a WidgetStateProperty would
      // add noise without adding meaning. (`WidgetState*` would be available —
      // it landed in 3.22, below this package's 3.27 floor — this is a
      // readability choice, not a compatibility one.) Colours are left to the
      // colorScheme so each button variant keeps its own Material semantics.
      filledButtonTheme: FilledButtonThemeData(style: shared),
      elevatedButtonTheme: ElevatedButtonThemeData(style: shared),
      textButtonTheme: TextButtonThemeData(style: shared),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          textStyle: textTheme.labelLarge,
          side: BorderSide(color: c.input),
          padding: _buttonPadding,
          shape: _buttonShape,
        ),
      ),
    );
  }

  /// The [ColorScheme] half of the adapter, exposed so an app that already has
  /// its own [ThemeData] can adopt just the Kinetix palette:
  /// `ThemeData(colorScheme: KinetixMaterialTheme.colorSchemeFor(brightness, KinetixColors.light))`.
  static ColorScheme colorSchemeFor(Brightness brightness, KinetixColors c) => ColorScheme(
        brightness: brightness,
        primary: c.action,
        onPrimary: c.actionForeground,
        primaryContainer: c.primary,
        onPrimaryContainer: c.primaryForeground,
        secondary: c.secondary,
        onSecondary: c.secondaryForeground,
        secondaryContainer: c.accent,
        onSecondaryContainer: c.accentForeground,
        tertiary: c.brand,
        onTertiary: c.brandForeground,
        error: c.destructive,
        onError: c.destructiveForeground,
        surface: c.background,
        onSurface: c.foreground,
        surfaceTint: c.action,
        outline: c.border,
        outlineVariant: c.input,
        inverseSurface: c.foreground,
        onInverseSurface: c.background,
        shadow: c.foreground,
      );

  /// The [TextTheme] half of the adapter — the generated Kinetix type scale,
  /// tinted with the semantic foreground colours.
  static TextTheme textThemeFor(KinetixColors c) {
    TextStyle on(TextStyle s) => s.copyWith(color: c.foreground);
    TextStyle muted(TextStyle s) => s.copyWith(color: c.mutedForeground);
    return TextTheme(
      displayLarge: on(AppText.displayLg),
      displayMedium: on(AppText.displayMd),
      displaySmall: on(AppText.displaySm),
      headlineLarge: on(AppText.headlineLg),
      headlineMedium: on(AppText.headlineMd),
      headlineSmall: on(AppText.headlineSm),
      titleLarge: on(AppText.titleLg),
      titleMedium: on(AppText.titleMd),
      titleSmall: on(AppText.titleSm),
      bodyLarge: on(AppText.bodyLg),
      bodyMedium: on(AppText.bodyMd),
      bodySmall: muted(AppText.bodySm),
      labelLarge: on(AppText.labelLg),
      labelMedium: on(AppText.labelMd),
      labelSmall: muted(AppText.labelSm),
    );
  }

  static const EdgeInsets _buttonPadding = EdgeInsets.symmetric(
    horizontal: KinetixSpacing.space4,
    vertical: KinetixSpacing.space3,
  );

  static const RoundedRectangleBorder _buttonShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.all(Radius.circular(KinetixRadius.control)),
  );

  static ButtonStyle _buttonStyle(TextTheme textTheme) => TextButton.styleFrom(
        textStyle: textTheme.labelLarge,
        padding: _buttonPadding,
        shape: _buttonShape,
      );
}
