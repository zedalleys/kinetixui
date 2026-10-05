// The icon contract (/docs/icons): the component owns an icon's place, size, colour and accessible name; the
// application may own the artwork. These tests pin both halves for the component-owned icons this package
// renders — the dismiss slot on Banner and Inform, and the names of the icon-only controls that used to be
// bare GestureDetectors (a tap action with no label and no button role).

// ignore_for_file: prefer_const_constructors

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

Widget host(Widget child, {TextDirection direction = TextDirection.ltr}) => MaterialApp(
      home: Directionality(
        textDirection: direction,
        child: KinetixTheme(
          brightness: Brightness.light,
          child: Scaffold(body: Center(child: child)),
        ),
      ),
    );

/// A product team's own icon: not an `Icon`, not Material, no size and no colour of its own.
class CompanyCloseMark extends StatelessWidget {
  const CompanyCloseMark({super.key});
  @override
  Widget build(BuildContext context) => const ColoredBox(color: Color(0xFF123456));
}

void expectNamedButton(WidgetTester tester, String label) {
  final node = tester.getSemantics(find.bySemanticsLabel(label));
  expect(node, isSemantics(label: label, isButton: true, hasTapAction: true));
}

void main() {
  group('dismiss icon slot', () {
    for (final (name, build) in [
      ('KinetixBanner', (VoidCallback onDismiss, Widget? icon) => KinetixBanner('Saved', onDismiss: onDismiss, dismissIcon: icon)),
      ('KinetixInform', (VoidCallback onDismiss, Widget? icon) => KinetixInform('Saved', onDismiss: onDismiss, dismissIcon: icon)),
    ]) {
      testWidgets('$name renders Icons.close by default, inside a button named Dismiss', (tester) async {
        final handle = tester.ensureSemantics();
        await tester.pumpWidget(host(build(() {}, null)));
        expect(find.byIcon(Icons.close), findsOneWidget);
        expectNamedButton(tester, 'Dismiss');
        handle.dispose();
      });

      testWidgets('$name takes a Cupertino icon and gives it the slot size and the content colour', (tester) async {
        await tester.pumpWidget(host(build(() {}, Icon(CupertinoIcons.xmark_circle))));
        expect(find.byIcon(Icons.close), findsNothing);
        final icon = find.byIcon(CupertinoIcons.xmark_circle);
        expect(icon, findsOneWidget);
        expect(tester.getSize(icon), const Size(14, 14));
        // The icon passed no colour: it inherits one from the control, not the ambient default.
        final theme = IconTheme.of(tester.element(icon));
        expect(theme.size, 14);
        expect(theme.color, isNot(const IconThemeData.fallback().color));
      });

      testWidgets('$name takes any widget, lays it out at 14×14, keeps the name, and still dismisses', (tester) async {
        final handle = tester.ensureSemantics();
        var dismissed = 0;
        await tester.pumpWidget(host(build(() => dismissed++, CompanyCloseMark())));
        expect(find.byType(Icon), findsNothing);
        expect(tester.getSize(find.byType(CompanyCloseMark)), const Size(14, 14));
        expectNamedButton(tester, 'Dismiss');
        await tester.tap(find.byType(CompanyCloseMark));
        expect(dismissed, 1);
        handle.dispose();
      });
    }

    testWidgets('no onDismiss, no control and no icon', (tester) async {
      await tester.pumpWidget(host(KinetixBanner('Saved', dismissIcon: CompanyCloseMark())));
      expect(find.byType(CompanyCloseMark), findsNothing);
      expect(find.bySemanticsLabel('Dismiss'), findsNothing);
    });
  });

  group('icon-only controls have a name and a button role', () {
    testWidgets('KinetixDialog close', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(host(KinetixDialog(visible: true, onDismiss: () {}, child: const Text('Body'))));
      await tester.pumpAndSettle();
      expectNamedButton(tester, 'Close');
      handle.dispose();
    });

    testWidgets('KinetixTag remove — and a screen reader can activate it', (tester) async {
      final handle = tester.ensureSemantics();
      var removed = 0;
      await tester.pumpWidget(host(KinetixTag('Design', onRemove: () => removed++)));
      expectNamedButton(tester, 'Remove Design');
      // What TalkBack / VoiceOver's activate gesture sends: the semantics tap action, not a pointer event.
      tester.semantics.tap(find.semantics.byLabel('Remove Design'));
      expect(removed, 1);
      handle.dispose();
    });

    testWidgets('KinetixNumberInput steppers can be activated by a screen reader', (tester) async {
      final handle = tester.ensureSemantics();
      var value = 2;
      await tester.pumpWidget(host(StatefulBuilder(
        builder: (context, setState) => SizedBox(
          width: 200,
          child: KinetixNumberInput(value: value, onChanged: (v) => setState(() => value = v)),
        ),
      )));
      expectNamedButton(tester, 'Increase');
      tester.semantics.tap(find.semantics.byLabel('Increase'));
      await tester.pump();
      expect(value, 3);
      handle.dispose();
    });

    testWidgets('KinetixNavigationBackButton', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(host(KinetixNavigationBackButton(onTap: () {})));
      expectNamedButton(tester, 'Back');
      handle.dispose();
    });

    testWidgets('KinetixPasswordInput visibility toggle names the action it will take', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(host(SizedBox(width: 320, child: KinetixPasswordInput())));
      expectNamedButton(tester, 'Show password');
      await tester.tap(find.bySemanticsLabel('Show password'));
      await tester.pump();
      expectNamedButton(tester, 'Hide password');
      handle.dispose();
    });

    testWidgets('KinetixFileUpload remove names the file', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(host(SizedBox(
        width: 360,
        child: KinetixFileUpload(
          files: const [KinetixFileItem(name: 'report.pdf')],
          onBrowse: () {},
          onRemove: (_) {},
        ),
      )));
      expectNamedButton(tester, 'Remove report.pdf');
      handle.dispose();
    });

    testWidgets('KinetixAudioPlayer transport controls', (tester) async {
      final handle = tester.ensureSemantics();
      var skipped = 0.0;
      await tester.pumpWidget(host(SizedBox(
        width: 360,
        child: KinetixAudioPlayer(
          title: 'Episode 1',
          isPlaying: false,
          position: 30,
          duration: 120,
          onPlayPause: () {},
          onSkip: (d) => skipped += d,
          onPrev: () {},
          onNext: () {},
        ),
      )));
      for (final name in ['Previous track', 'Back 10s', 'Play', 'Forward 10s', 'Next track']) {
        expectNamedButton(tester, name);
      }
      tester.semantics.tap(find.semantics.byLabel('Back 10s'));
      expect(skipped, -10);
      handle.dispose();
    });
  });

  group('direction', () {
    testWidgets('the back chevron follows the reading direction (matchTextDirection)', (tester) async {
      await tester.pumpWidget(host(KinetixNavigationBackButton(onTap: () {}), direction: TextDirection.rtl));
      final icon = tester.widget<Icon>(find.byIcon(Icons.chevron_left));
      expect(icon.icon!.matchTextDirection, isTrue);
      // Icon mirrors itself with a Transform when the icon asks to and the ambient direction is RTL.
      expect(find.descendant(of: find.byType(Icon), matching: find.byType(Transform)), findsOneWidget);
    });

    testWidgets('the dismiss mark does not mirror', (tester) async {
      await tester.pumpWidget(host(KinetixBanner('Saved', onDismiss: () {}), direction: TextDirection.rtl));
      expect(Icons.close.matchTextDirection, isFalse);
      expect(find.descendant(of: find.byIcon(Icons.close), matching: find.byType(Transform)), findsNothing);
    });
  });
}
