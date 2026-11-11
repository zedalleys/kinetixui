import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';
import 'package:kinetix_ui/src/kinetix_slide_motion.dart';

void main() {
  for (final drawer in [false, true]) {
    final kind = drawer ? 'Drawer' : 'Sheet';
    Widget host(bool visible,
            {bool reduced = false,
            TextDirection direction = TextDirection.ltr,
            VoidCallback? dismiss}) =>
        MaterialApp(
          home: MediaQuery(
              data: MediaQueryData(disableAnimations: reduced),
              child: Directionality(
                textDirection: direction,
                child: KinetixTheme(
                    child: Stack(children: [
                  const Positioned.fill(child: Text('background')),
                  if (drawer)
                    KinetixDrawer(
                        visible: visible,
                        onDismiss: dismiss ?? () {},
                        child: const SizedBox(
                            key: Key('body'),
                            height: 120,
                            child: Text('panel')))
                  else
                    KinetixSheet(
                        visible: visible,
                        onDismiss: dismiss ?? () {},
                        child: const SizedBox(
                            key: Key('body'),
                            height: 120,
                            child: Text('panel'))),
                ])),
              )),
        );
    double y(WidgetTester t) => t.getTopLeft(find.byKey(const Key('body'))).dy;
    Finder barrier() => find.descendant(
        of: find.byType(KinetixSheet), matching: find.byType(ModalBarrier));

    testWidgets('$kind slides with normal motion on opening and closing',
        (t) async {
      await t.pumpWidget(host(false));
      expect(find.text('panel'), findsNothing);
      await t.pumpWidget(host(true));
      final start = y(t);
      await t.pump(const Duration(milliseconds: 250));
      final middle = y(t);
      await t.pumpAndSettle();
      final end = y(t);
      expect(start, greaterThan(middle));
      expect(middle, greaterThan(end));
      await t.pumpWidget(host(false));
      expect(find.text('panel'), findsOneWidget,
          reason: 'exit retains its content');
      await t.pump(const Duration(milliseconds: 150));
      expect(y(t), greaterThan(end));
      expect(barrier(), findsOneWidget,
          reason: 'background remains blocked during exit');
      await t.pumpAndSettle();
      expect(find.text('panel'), findsNothing);
      expect(barrier(), findsNothing);
    });

    testWidgets('$kind reduced motion settles both directions and live changes',
        (t) async {
      await t.pumpWidget(host(false, reduced: true));
      await t.pumpWidget(host(true, reduced: true));
      final end = y(t);
      expect(t.binding.transientCallbackCount, 0);
      await t.pumpWidget(host(false, reduced: true));
      expect(find.text('panel'), findsNothing);
      await t.pumpWidget(host(true));
      await t.pump(const Duration(milliseconds: 100));
      expect(y(t), greaterThan(end));
      await t.pumpWidget(host(true, reduced: true));
      expect(y(t), closeTo(end, 0.1));
      expect(t.binding.transientCallbackCount, 0);
      await t.pumpWidget(host(false));
      await t.pump(const Duration(milliseconds: 50));
      await t.pumpWidget(host(false, reduced: true));
      expect(find.text('panel'), findsNothing);
    });

    testWidgets(
        '$kind reverses from the current position and disposes safely in RTL',
        (t) async {
      await t.pumpWidget(host(false, direction: TextDirection.rtl));
      await t.pumpWidget(host(true, direction: TextDirection.rtl));
      await t.pump(const Duration(milliseconds: 150));
      final position = y(t);
      await t.pumpWidget(host(false, direction: TextDirection.rtl));
      expect(y(t), closeTo(position, 0.1));
      await t.pump(const Duration(milliseconds: 40));
      final reversing = y(t);
      await t.pumpWidget(host(true, direction: TextDirection.rtl));
      expect(y(t), closeTo(reversing, 0.1));
      await t.pumpAndSettle();
      await t.pumpWidget(host(false));
      await t.pumpWidget(const SizedBox());
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
    });

    testWidgets('$kind barrier dismisses once and blocks background semantics',
        (t) async {
      var dismissals = 0;
      final semantics = t.ensureSemantics();
      await t
          .pumpWidget(host(true, reduced: true, dismiss: () => dismissals++));
      expect(find.bySemanticsLabel('background'), findsNothing);
      expect(find.bySemanticsLabel('panel'), findsOneWidget);
      await t.tapAt(const Offset(10, 10));
      expect(dismissals, 1);
      semantics.dispose();
    });
  }

  test('spatial timing uses existing role tokens in both directions', () {
    expect(KinetixSlideMotion.duration(entering: true, reduceMotion: false),
        const Duration(milliseconds: 500));
    expect(KinetixSlideMotion.duration(entering: false, reduceMotion: false),
        const Duration(milliseconds: 300));
    expect(KinetixSlideMotion.duration(entering: true, reduceMotion: true),
        Duration.zero);
    expect(KinetixSlideMotion.duration(entering: false, reduceMotion: true),
        Duration.zero);
  });

  testWidgets(
      'focus enters, loops through panel controls, Escape dismisses and focus returns',
      (t) async {
    final opener = FocusNode();
    final first = FocusNode();
    final last = FocusNode();
    var visible = false;
    late StateSetter change;
    await t.pumpWidget(MaterialApp(
        home: KinetixTheme(child: StatefulBuilder(builder: (context, setState) {
      change = setState;
      return MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: Stack(children: [
            TextButton(
                focusNode: opener,
                onPressed: () => setState(() => visible = true),
                child: const Text('Open')),
            KinetixSheet(
                visible: visible,
                onDismiss: () => setState(() => visible = false),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  TextButton(
                      focusNode: first,
                      onPressed: () {},
                      child: const Text('First')),
                  TextButton(
                      focusNode: last,
                      onPressed: () {},
                      child: const Text('Last')),
                ])),
          ]));
    }))));
    opener.requestFocus();
    await t.pump();
    change(() => visible = true);
    await t.pumpAndSettle();
    expect(first.hasFocus, isTrue);
    last.requestFocus();
    await t.pump();
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.pump();
    expect(first.hasFocus, isTrue);
    await t.sendKeyEvent(LogicalKeyboardKey.escape);
    await t.pumpAndSettle();
    expect(find.text('First'), findsNothing);
    expect(opener.hasFocus, isTrue);
    await t.pumpWidget(const SizedBox());
    opener.dispose();
    first.dispose();
    last.dispose();
  });
}
