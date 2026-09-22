// Foundation tokens — every design-token family is reachable from the package's public barrel with no
// Kinetix* widget involved. A user once reported spacing/radius as "missing" when both had shipped for
// releases (they were generated into a file named kinetix_motion.dart), so these tests pin the whole
// foundation surface as a public contract, not an implementation detail.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

void main() {
  group('the foundation families are all public', () {
    test('spacing, radius, motion, opacity and z-index resolve as plain constants', () {
      expect(KinetixSpacing.space4, 16);
      expect(KinetixRadius.container, 12);
      expect(KinetixDuration.fast, const Duration(milliseconds: 200));
      expect(KinetixEasing.standard, isA<Curve>());
      expect(KinetixOpacity.disabled, 0.5);
      expect(KinetixZIndex.overlay, 50);
    });

    test('the type scale is available without a widget or a BuildContext', () {
      expect(KinetixType.bodyMd, isA<TextStyle>());
      expect(KinetixType.bodyMd.fontSize, 14);
      // the one role Material's TextTheme has no slot for stays reachable
      expect(KinetixType.titleDialog.fontSize, 18);
    });

    test('the semantic palette is available without KinetixTheme', () {
      expect(KinetixColors.light.action, isA<Color>());
      expect(KinetixColors.dark.action, isA<Color>());
      expect(KinetixColors.light.background, isNot(KinetixColors.dark.background));
    });
  });

  group('KinetixShadow', () {
    test('exposes the elevation scale as const BoxShadow lists', () {
      expect(KinetixShadow.sm, isA<List<BoxShadow>>());
      expect(KinetixShadow.sm, hasLength(1));
      expect(KinetixShadow.md, hasLength(2)); // md is a two-layer shadow in the token source
      expect(KinetixShadow.lg, hasLength(2));
      expect(KinetixShadow.xl, hasLength(1));
    });

    test('carries the source geometry — sm is 0/1, blur 2, black at 5%', () {
      final BoxShadow sm = KinetixShadow.sm.single;
      expect(sm.offset, const Offset(0, 1));
      expect(sm.blurRadius, 2);
      expect(sm.spreadRadius, 0);
      expect(sm.color, const Color(0x0D000000));
    });

    test('keeps lg\'s negative spread, which is what tucks the shadow under the surface', () {
      expect(KinetixShadow.lg.first.spreadRadius, -1);
      expect(KinetixShadow.lg.last.spreadRadius, -2);
    });

    test('exposes the focus rings, each a crisp edge plus a soft glow', () {
      for (final List<BoxShadow> ring in <List<BoxShadow>>[
        KinetixShadow.focus,
        KinetixShadow.focusDestructive,
        KinetixShadow.focusSuccess,
        KinetixShadow.focusWarning,
      ]) {
        expect(ring, hasLength(2));
        expect(ring.first.spreadRadius, lessThan(ring.last.spreadRadius)); // inner edge, then glow
        // the edge is the opaque colour, the glow the same hue at lower alpha — so the two differ.
        // Compared as whole Colors rather than through an alpha accessor: that avoids depending on
        // either spelling (`Color.opacity` is deprecated, `Color.a` needs >= 3.27) and asserts more —
        // the layers differ as colours, not merely in one channel.
        expect(ring.first.color, isNot(ring.last.color));
      }
    });

    test('drops into a BoxDecoration directly', () {
      const BoxDecoration decoration = BoxDecoration(boxShadow: KinetixShadow.md);
      expect(decoration.boxShadow, hasLength(2));
    });
  });

  group('KinetixShadows — brightness resolution', () {
    test('only the focus rings differ between light and dark', () {
      expect(KinetixShadows.light.focus, isNot(KinetixShadows.dark.focus));
      // the elevation scale is theme-independent black-alpha, by design
      expect(KinetixShadows.light.sm, same(KinetixShadows.dark.sm));
      expect(KinetixShadows.light.md, same(KinetixShadows.dark.md));
      expect(KinetixShadows.light.lg, same(KinetixShadows.dark.lg));
      expect(KinetixShadows.light.xl, same(KinetixShadows.dark.xl));
    });

    test('the dark rings come from the dark token pass, not a tint of the light ones', () {
      expect(KinetixShadows.dark.focus, KinetixShadowDark.focus);
      expect(KinetixShadows.dark.focus.first.color, isNot(KinetixShadows.light.focus.first.color));
    });

    test('forBrightness picks the matching set', () {
      expect(KinetixShadows.forBrightness(Brightness.light).focus, KinetixShadow.focus);
      expect(KinetixShadows.forBrightness(Brightness.dark).focus, KinetixShadowDark.focus);
    });

    testWidgets('of(context) follows the platform brightness', (WidgetTester tester) async {
      late KinetixShadows resolved;
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(platformBrightness: Brightness.dark),
          child: Builder(
            builder: (BuildContext context) {
              resolved = KinetixShadows.of(context);
              return const SizedBox.shrink();
            },
          ),
        ),
      );
      expect(resolved.focus, KinetixShadowDark.focus);
    });
  });
}
