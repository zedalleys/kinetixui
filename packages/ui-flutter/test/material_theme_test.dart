// KinetixMaterialTheme — the Material bridge. These assert the mapping is the documented one (a bridge is
// only useful if it is predictable), that dark comes from the real dark palette, and that the adapter never
// invents a value a token already expresses.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

void main() {
  final ThemeData light = KinetixMaterialTheme.light();
  final ThemeData dark = KinetixMaterialTheme.dark();

  group('brightness and Material version', () {
    test('light and dark carry the right brightness, on the theme and its scheme', () {
      expect(light.brightness, Brightness.light);
      expect(light.colorScheme.brightness, Brightness.light);
      expect(dark.brightness, Brightness.dark);
      expect(dark.colorScheme.brightness, Brightness.dark);
    });

    test('targets Material 3', () {
      expect(light.useMaterial3, isTrue);
      expect(dark.useMaterial3, isTrue);
    });

    test('fromBrightness returns the same mapping as the named constructors', () {
      expect(KinetixMaterialTheme.fromBrightness(Brightness.light).colorScheme.primary, light.colorScheme.primary);
      expect(KinetixMaterialTheme.fromBrightness(Brightness.dark).colorScheme.primary, dark.colorScheme.primary);
    });
  });

  group('colour mapping is the documented one', () {
    test('maps every role from the Kinetix semantic palette', () {
      const KinetixColors c = KinetixColors.light;
      final ColorScheme s = light.colorScheme;
      expect(s.primary, c.action); // the interactive fill, not the brand `primary`
      expect(s.onPrimary, c.actionForeground);
      expect(s.primaryContainer, c.primary);
      expect(s.onPrimaryContainer, c.primaryForeground);
      expect(s.secondary, c.secondary);
      expect(s.onSecondary, c.secondaryForeground);
      expect(s.secondaryContainer, c.accent);
      expect(s.onSecondaryContainer, c.accentForeground);
      expect(s.tertiary, c.brand);
      expect(s.onTertiary, c.brandForeground);
      expect(s.error, c.destructive);
      expect(s.onError, c.destructiveForeground);
      expect(s.surface, c.background);
      expect(s.onSurface, c.foreground);
      expect(s.surfaceTint, c.action);
      expect(s.outline, c.border);
      expect(s.outlineVariant, c.input);
      expect(s.inverseSurface, c.foreground);
      expect(s.onInverseSurface, c.background);
    });

    test('dark uses the real generated dark values, not a transform of light', () {
      expect(dark.colorScheme.surface, KinetixColors.dark.background);
      expect(dark.colorScheme.onSurface, KinetixColors.dark.foreground);
      expect(dark.colorScheme.surface, isNot(light.colorScheme.surface));
      expect(dark.scaffoldBackgroundColor, KinetixColors.dark.background);
    });

    test('scaffold and divider colours come from tokens too', () {
      expect(light.scaffoldBackgroundColor, KinetixColors.light.background);
      expect(light.dividerColor, KinetixColors.light.border);
      expect(light.dividerTheme.color, KinetixColors.light.border);
    });

    test('colorSchemeFor is usable on its own, for an app with its own ThemeData', () {
      final ColorScheme scheme = KinetixMaterialTheme.colorSchemeFor(Brightness.dark, KinetixColors.dark);
      expect(scheme.brightness, Brightness.dark);
      expect(scheme.primary, KinetixColors.dark.action);
    });

    test('keeps the foreground readable on its surface in both themes', () {
      // not a full WCAG audit (pnpm check:contrast owns that against the token source) — this just
      // proves the adapter didn't pair a foreground with the wrong surface.
      expect(light.colorScheme.onSurface, isNot(light.colorScheme.surface));
      expect(dark.colorScheme.onSurface, isNot(dark.colorScheme.surface));
      expect(light.colorScheme.onPrimary, isNot(light.colorScheme.primary));
      expect(dark.colorScheme.onError, isNot(dark.colorScheme.error));
    });
  });

  group('typography comes from the generated scale', () {
    test('maps the Kinetix scale onto all 15 Material 3 slots', () {
      final TextTheme t = light.textTheme;
      expect(t.displayLarge?.fontSize, KinetixType.displayLg.fontSize);
      expect(t.displayMedium?.fontSize, KinetixType.displayMd.fontSize);
      expect(t.displaySmall?.fontSize, KinetixType.displaySm.fontSize);
      expect(t.headlineLarge?.fontSize, KinetixType.headlineLg.fontSize);
      expect(t.headlineMedium?.fontSize, KinetixType.headlineMd.fontSize);
      expect(t.headlineSmall?.fontSize, KinetixType.headlineSm.fontSize);
      expect(t.titleLarge?.fontSize, KinetixType.titleLg.fontSize);
      expect(t.titleMedium?.fontSize, KinetixType.titleMd.fontSize);
      expect(t.titleSmall?.fontSize, KinetixType.titleSm.fontSize);
      expect(t.bodyLarge?.fontSize, KinetixType.bodyLg.fontSize);
      expect(t.bodyMedium?.fontSize, KinetixType.bodyMd.fontSize);
      expect(t.bodySmall?.fontSize, KinetixType.bodySm.fontSize);
      expect(t.labelLarge?.fontSize, KinetixType.labelLg.fontSize);
      expect(t.labelMedium?.fontSize, KinetixType.labelMd.fontSize);
      expect(t.labelSmall?.fontSize, KinetixType.labelSm.fontSize);
    });

    test('keeps the generated family and weight rather than restating them', () {
      expect(light.textTheme.bodyMedium?.fontFamily, KinetixType.bodyMd.fontFamily);
      expect(light.textTheme.bodyMedium?.fontWeight, KinetixType.bodyMd.fontWeight);
      expect(light.textTheme.bodyMedium?.letterSpacing, KinetixType.bodyMd.letterSpacing);
    });

    test('tints text with the semantic foreground, per theme', () {
      expect(light.textTheme.bodyMedium?.color, KinetixColors.light.foreground);
      expect(dark.textTheme.bodyMedium?.color, KinetixColors.dark.foreground);
    });
  });

  group('shape comes from the radius scale', () {
    test('the bottom sheet uses the surface radius token', () {
      final RoundedRectangleBorder shape = light.bottomSheetTheme.shape! as RoundedRectangleBorder;
      expect(
        shape.borderRadius,
        const BorderRadius.vertical(top: Radius.circular(KinetixRadius.surface)),
      );
      expect(light.bottomSheetTheme.backgroundColor, KinetixColors.light.popover);
    });

    test('buttons use the control radius token and the label type role', () {
      final ButtonStyle? style = light.filledButtonTheme.style;
      final OutlinedBorder shape = style!.shape!.resolve(<WidgetState>{})!;
      expect(
        (shape as RoundedRectangleBorder).borderRadius,
        BorderRadius.circular(KinetixRadius.control),
      );
      expect(style.textStyle!.resolve(<WidgetState>{})!.fontSize, KinetixType.labelLg.fontSize);
    });

    test('the outlined button borrows its border colour from the input token', () {
      final BorderSide side = light.outlinedButtonTheme.style!.side!.resolve(<WidgetState>{})!;
      expect(side.color, KinetixColors.light.input);
    });
  });

  testWidgets('a MaterialApp built from it renders native widgets without any Kinetix widget', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: KinetixMaterialTheme.light(),
        darkTheme: KinetixMaterialTheme.dark(),
        home: const Scaffold(body: Center(child: Text('Hello'))),
      ),
    );
    expect(find.text('Hello'), findsOneWidget);
    final BuildContext context = tester.element(find.text('Hello'));
    expect(Theme.of(context).colorScheme.primary, KinetixColors.light.action);
  });
}
