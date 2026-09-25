// Custom themes, and the promise that the old calls still mean what they meant.
//
// `test/generated/create_theme_fixture.dart` is emitted by the `flutter` exporter in
// `packages/create-theme` and committed so this package compiles it — the only place the exporter's
// output is type-checked against the real `KinetixColors` constructor. A TypeScript drift test fails if
// the committed file stops matching the exporter.
//
// Compiling is not enough on its own: a generated theme that analyses cleanly and then never reaches the
// widgets is a worse outcome than one that fails to build. So these read the palette back out of the
// element tree the way a `Kinetix*` widget does, through `KinetixTheme.of(context)`.

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

import 'generated/create_theme_fixture.dart';

void main() {
  /// Pump [child] and return the palette `KinetixTheme.of` resolves inside it.
  Future<KinetixColors> colorsUnder(WidgetTester tester, Widget Function(Widget probe) wrap) async {
    late KinetixColors seen;
    await tester.pumpWidget(
      wrap(
        Builder(
          builder: (BuildContext context) {
            seen = KinetixTheme.of(context);
            return const SizedBox.shrink();
          },
        ),
      ),
    );
    return seen;
  }

  group('a custom theme actually installs', () {
    testWidgets('explicit light uses the custom light palette', (WidgetTester tester) async {
      final KinetixColors colors = await colorsUnder(
        tester,
        (Widget probe) => KinetixTheme.custom(
          brightness: Brightness.light,
          light: CreateThemeFixture.light,
          dark: CreateThemeFixture.dark,
          child: probe,
        ),
      );

      expect(colors.action, CreateThemeFixture.light.action);
      expect(colors.background, CreateThemeFixture.light.background);
      expect(colors.chart, CreateThemeFixture.light.chart);
    });

    testWidgets('explicit dark uses the custom dark palette', (WidgetTester tester) async {
      final KinetixColors colors = await colorsUnder(
        tester,
        (Widget probe) => KinetixTheme.custom(
          brightness: Brightness.dark,
          light: CreateThemeFixture.light,
          dark: CreateThemeFixture.dark,
          child: probe,
        ),
      );

      expect(colors.action, CreateThemeFixture.dark.action);
      expect(colors.background, CreateThemeFixture.dark.background);
    });

    testWidgets('with no brightness it follows the platform', (WidgetTester tester) async {
      // MediaQuery is what KinetixTheme reads first, so a dark platform must select the dark palette
      // even though the widget was given no brightness.
      final KinetixColors colors = await colorsUnder(
        tester,
        (Widget probe) => MediaQuery(
          data: const MediaQueryData(platformBrightness: Brightness.dark),
          child: KinetixTheme.custom(
            light: CreateThemeFixture.light,
            dark: CreateThemeFixture.dark,
            child: probe,
          ),
        ),
      );

      expect(colors.background, CreateThemeFixture.dark.background);
    });

    test('light and dark are genuinely different sets', () {
      // Guards the shape of the tests above as much as the theme: if both branches were the same object
      // they would pass while proving nothing.
      expect(CreateThemeFixture.light.background, isNot(CreateThemeFixture.dark.background));
      expect(CreateThemeFixture.light.foreground, isNot(CreateThemeFixture.dark.foreground));
    });

    test('the fixture is a real custom theme, not the shipped one', () {
      expect(CreateThemeFixture.light.action, isNot(KinetixColors.light.action));
      expect(CreateThemeFixture.light.background, isNot(KinetixColors.light.background));
      // Its manual override survived the round trip through the engine and the exporter.
      expect(CreateThemeFixture.light.border, const Color(0xFFFF0000));
      expect(CreateThemeFixture.dark.border, const Color(0xFFFF0000));
    });

    test('the roles Compose cannot carry are carried here', () {
      // `input`, `ring` and `tertiaryForeground` are the three fields the Compose port lacks. Flutter has
      // all three, so the exporter has no unmapped roles to declare — asserted rather than assumed.
      expect(CreateThemeFixture.light.input, isNot(KinetixColors.light.input));
      expect(CreateThemeFixture.light.ring, isNot(KinetixColors.light.ring));
      // Create does not model tertiaryForeground, so it follows the library.
      expect(CreateThemeFixture.light.tertiaryForeground, KinetixColors.light.tertiaryForeground);
    });
  });

  group('the existing API is unchanged', () {
    testWidgets('KinetixTheme(child: …) still resolves the shipped palette', (WidgetTester tester) async {
      final KinetixColors colors = await colorsUnder(
        tester,
        (Widget probe) => MediaQuery(
          data: const MediaQueryData(platformBrightness: Brightness.light),
          child: KinetixTheme(child: probe),
        ),
      );

      expect(colors.action, KinetixColors.light.action);
      expect(colors.background, KinetixColors.light.background);
    });

    testWidgets('explicit brightness still selects the shipped dark palette', (WidgetTester tester) async {
      final KinetixColors colors = await colorsUnder(
        tester,
        (Widget probe) => KinetixTheme(brightness: Brightness.dark, child: probe),
      );

      expect(colors.action, KinetixColors.dark.action);
      expect(colors.background, KinetixColors.dark.background);
    });
  });

  group('updateShouldNotify', () {
    test('notifies when the brightness changes', () {
      const KinetixTheme a = KinetixTheme(brightness: Brightness.light, child: SizedBox.shrink());
      const KinetixTheme b = KinetixTheme(brightness: Brightness.dark, child: SizedBox.shrink());
      expect(b.updateShouldNotify(a), isTrue);
    });

    test('notifies when the palette changes but the brightness does not', () {
      // The case the old implementation would have missed: it compared only `brightness`, so swapping
      // themes would have left every Kinetix widget showing the previous colours.
      const KinetixTheme shipped = KinetixTheme(brightness: Brightness.light, child: SizedBox.shrink());
      final KinetixTheme custom = KinetixTheme.custom(
        brightness: Brightness.light,
        light: CreateThemeFixture.light,
        dark: CreateThemeFixture.dark,
        child: const SizedBox.shrink(),
      );

      expect(custom.updateShouldNotify(shipped), isTrue);
    });

    test('stays quiet when nothing changed', () {
      const KinetixTheme a = KinetixTheme(brightness: Brightness.light, child: SizedBox.shrink());
      const KinetixTheme b = KinetixTheme(brightness: Brightness.light, child: SizedBox.shrink());
      expect(b.updateShouldNotify(a), isFalse);
    });

    testWidgets('a widget rebuilt after a theme swap sees the new palette', (WidgetTester tester) async {
      // The end-to-end version: the assertions above are about the predicate, this is about the effect.
      late KinetixColors seen;
      Widget probe() => Builder(
            builder: (BuildContext context) {
              seen = KinetixTheme.of(context);
              return const SizedBox.shrink();
            },
          );

      await tester.pumpWidget(KinetixTheme(brightness: Brightness.light, child: probe()));
      expect(seen.action, KinetixColors.light.action);

      await tester.pumpWidget(
        KinetixTheme.custom(
          brightness: Brightness.light,
          light: CreateThemeFixture.light,
          dark: CreateThemeFixture.dark,
          child: probe(),
        ),
      );
      expect(seen.action, CreateThemeFixture.light.action);
    });
  });

  group('the Material and Cupertino adapters take a custom palette', () {
    test('KinetixMaterialTheme.fromColors maps the custom colours', () {
      final ThemeData light = KinetixMaterialTheme.fromColors(Brightness.light, CreateThemeFixture.light);
      final ThemeData dark = KinetixMaterialTheme.fromColors(Brightness.dark, CreateThemeFixture.dark);

      expect(light.brightness, Brightness.light);
      expect(light.colorScheme.primary, CreateThemeFixture.light.action);
      expect(dark.colorScheme.primary, CreateThemeFixture.dark.action);
      // And it is genuinely different from the shipped mapping.
      expect(light.colorScheme.primary, isNot(KinetixMaterialTheme.light().colorScheme.primary));
    });

    test('KinetixCupertinoTheme.fromColors maps the custom colours', () {
      final CupertinoThemeData light =
          KinetixCupertinoTheme.fromColors(Brightness.light, CreateThemeFixture.light);

      expect(light.brightness, Brightness.light);
      expect(light.primaryColor, CreateThemeFixture.light.action);
      expect(light.primaryColor, isNot(KinetixCupertinoTheme.light().primaryColor));
    });

    test('the shipped adapters are unchanged', () {
      expect(KinetixMaterialTheme.fromColors(Brightness.light, KinetixColors.light).colorScheme.primary,
          KinetixMaterialTheme.light().colorScheme.primary);
      expect(KinetixCupertinoTheme.fromColors(Brightness.dark, KinetixColors.dark).primaryColor,
          KinetixCupertinoTheme.dark().primaryColor);
    });
  });
}
