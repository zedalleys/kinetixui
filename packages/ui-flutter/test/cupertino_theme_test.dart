// KinetixCupertinoTheme — the Cupertino bridge. Cupertino's theme surface is much smaller than Material's,
// so these assert the fields it really has, and that Cupertino widgets keep their native behaviour.

import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

void main() {
  final CupertinoThemeData light = KinetixCupertinoTheme.light();
  final CupertinoThemeData dark = KinetixCupertinoTheme.dark();

  test('carries the right brightness', () {
    expect(light.brightness, Brightness.light);
    expect(dark.brightness, Brightness.dark);
  });

  test('maps the colour fields Cupertino actually has', () {
    expect(light.primaryColor, KinetixColors.light.action);
    expect(light.primaryContrastingColor, KinetixColors.light.actionForeground);
    expect(light.scaffoldBackgroundColor, KinetixColors.light.background);
    expect(light.barBackgroundColor, KinetixColors.light.card);
  });

  test('dark uses the real generated dark palette, not a transform of light', () {
    expect(dark.scaffoldBackgroundColor, KinetixColors.dark.background);
    expect(dark.primaryColor, KinetixColors.dark.action);
    expect(dark.scaffoldBackgroundColor, isNot(light.scaffoldBackgroundColor));
  });

  test('fromBrightness matches the named constructors', () {
    expect(KinetixCupertinoTheme.fromBrightness(Brightness.dark).primaryColor, dark.primaryColor);
    expect(KinetixCupertinoTheme.fromBrightness(Brightness.light).primaryColor, light.primaryColor);
  });

  group('typography', () {
    test('uses the generated Kinetix scale for the roles Cupertino exposes', () {
      expect(light.textTheme.textStyle.fontSize, KinetixType.bodyMd.fontSize);
      expect(light.textTheme.textStyle.fontFamily, KinetixType.bodyMd.fontFamily);
      expect(light.textTheme.actionTextStyle.fontSize, KinetixType.labelLg.fontSize);
      expect(light.textTheme.tabLabelTextStyle.fontSize, KinetixType.labelSm.fontSize);
      expect(light.textTheme.navTitleTextStyle.fontSize, KinetixType.titleMd.fontSize);
      expect(light.textTheme.navLargeTitleTextStyle.fontSize, KinetixType.headlineSm.fontSize);
    });

    test('tints text per theme', () {
      expect(light.textTheme.textStyle.color, KinetixColors.light.foreground);
      expect(dark.textTheme.textStyle.color, KinetixColors.dark.foreground);
    });

    test('action text uses the interactive colour, so buttons read as tappable', () {
      expect(light.textTheme.actionTextStyle.color, KinetixColors.light.action);
      expect(dark.textTheme.actionTextStyle.color, KinetixColors.dark.action);
    });
  });

  testWidgets('a CupertinoApp built from it renders native Cupertino widgets', (WidgetTester tester) async {
    await tester.pumpWidget(
      CupertinoApp(
        theme: KinetixCupertinoTheme.light(),
        home: CupertinoPageScaffold(
          child: Center(
            child: CupertinoButton(onPressed: () {}, child: const Text('Tap')),
          ),
        ),
      ),
    );
    expect(find.text('Tap'), findsOneWidget);
    final BuildContext context = tester.element(find.text('Tap'));
    expect(CupertinoTheme.of(context).primaryColor, KinetixColors.light.action);
  });
}
