import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';
import 'package:kinetix_ui/src/kinetix_sheet_motion.dart';

// kx-verify: reducedMotion

class _Harness extends StatefulWidget {
  const _Harness(
      {super.key, this.drawer = false, this.direction = TextDirection.ltr});
  final bool drawer;
  final TextDirection direction;
  @override
  State<_Harness> createState() => _HarnessState();
}

class _HarnessState extends State<_Harness> {
  bool visible = false;
  bool reduce = false;
  bool showWidget = true;
  int dismissals = 0;
  int backgroundTaps = 0;
  double textScale = 1;
  final trigger = FocusNode();
  final first = FocusNode();
  final last = FocusNode();
  void change(VoidCallback update) => setState(update);
  void show(bool value) => setState(() => visible = value);
  void dismiss() => setState(() {
        dismissals++;
        visible = false;
      });
  @override
  void dispose() {
    trigger.dispose();
    first.dispose();
    last.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(
              disableAnimations: reduce,
              textScaler: TextScaler.linear(textScale)),
          child: Directionality(
            textDirection: widget.direction,
            child: KinetixTheme(
              brightness: Brightness.light,
              child: Scaffold(
                body: Stack(children: [
                  Align(
                      alignment: Alignment.topCenter,
                      child: TextButton(
                        focusNode: trigger,
                        onPressed: () {
                          backgroundTaps++;
                          show(true);
                        },
                        child: const Text('Open sheet'),
                      )),
                  if (showWidget)
                    if (widget.drawer)
                      KinetixDrawer(
                          visible: visible,
                          onDismiss: dismiss,
                          child: contents())
                    else
                      KinetixSheet(
                          visible: visible,
                          onDismiss: dismiss,
                          child: contents()),
                ]),
              ),
            ),
          ),
        ),
      );
  Widget contents() => SizedBox(
        key: const Key('panel-body'),
        height: 160,
        child: Column(children: [
          TextButton(
              focusNode: first,
              onPressed: () {},
              child: const Text('First action')),
          TextButton(
              focusNode: last,
              onPressed: () {},
              child: const Text('Last action')),
        ]),
      );
}

Future<_HarnessState> _host(WidgetTester tester,
    {bool drawer = false, TextDirection direction = TextDirection.ltr}) async {
  final key = GlobalKey<_HarnessState>();
  await tester
      .pumpWidget(_Harness(key: key, drawer: drawer, direction: direction));
  key.currentState!.trigger.requestFocus();
  await tester.pump();
  return key.currentState!;
}

double panelY(WidgetTester tester) =>
    tester.getTopLeft(find.byKey(const Key('panel-body'))).dy;

final sheetBarrier = find.descendant(
    of: find.byType(KinetixSheet), matching: find.byType(ModalBarrier));

void main() {
  test(
      'spatial durations use slow entry and base exit with a shortened reduced form',
      () {
    expect(KinetixSheetMotion.enterDuration(false), KinetixDuration.slow);
    expect(KinetixSheetMotion.exitDuration(false), KinetixDuration.base);
    expect(KinetixSheetMotion.enterDuration(true),
        lessThan(const Duration(milliseconds: 1)));
    expect(KinetixSheetMotion.exitDuration(true),
        lessThan(const Duration(milliseconds: 1)));
    expect(KinetixSheetMotion.curve, KinetixEasing.standard);
  });

  for (final drawer in [false, true]) {
    final name = drawer ? 'Drawer' : 'Sheet';
    testWidgets(
        '$name normal motion opens through a rendered slide midpoint and coordinated scrim',
        (tester) async {
      final state = await _host(tester, drawer: drawer);
      expect(find.byKey(const Key('panel-body')), findsNothing);
      state.show(true);
      await tester.pump();
      final start = panelY(tester);
      await tester.pump(const Duration(milliseconds: 200));
      final mid = panelY(tester);
      expect(mid, lessThan(start - 1));
      final opacity = tester.widget<ModalBarrier>(sheetBarrier).color!.a;
      await tester.pumpAndSettle();
      final end = panelY(tester);
      expect(mid, greaterThan(end + 1));
      expect(opacity, greaterThan(0));
      expect(opacity,
          lessThan(tester.widget<ModalBarrier>(sheetBarrier).color!.a));
    });

    testWidgets(
        '$name normal motion closes through a midpoint and retains the barrier until exit',
        (tester) async {
      final state = await _host(tester, drawer: drawer);
      state.show(true);
      await tester.pumpAndSettle();
      final open = panelY(tester);
      state.show(false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 120));
      expect(panelY(tester), greaterThan(open + 1));
      expect(sheetBarrier, findsOneWidget);
      await tester.pumpAndSettle();
      expect(sheetBarrier, findsNothing);
      expect(find.byKey(const Key('panel-body')), findsNothing);
      expect(state.trigger.hasFocus, isTrue);
    });

    testWidgets('$name reduced motion opens and closes without visible travel',
        (tester) async {
      final state = await _host(tester, drawer: drawer);
      state.change(() => state.reduce = true);
      await tester.pump();
      state.show(true);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 16));
      final settled = panelY(tester);
      await tester.pumpAndSettle();
      expect(panelY(tester), settled);
      state.show(false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 16));
      expect(sheetBarrier, findsNothing);
      await tester.pumpAndSettle();
      expect(state.trigger.hasFocus, isTrue);
    });
  }

  testWidgets(
      'reverses opening and closing without a position jump or stale completion',
      (tester) async {
    final state = await _host(tester);
    state.show(true);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 180));
    final opening = panelY(tester);
    state.show(false);
    await tester.pump();
    expect(panelY(tester), closeTo(opening, 0.01));
    await tester.pump(const Duration(milliseconds: 40));
    final closing = panelY(tester);
    expect(closing, greaterThan(opening));
    state.show(true);
    await tester.pump();
    expect(panelY(tester), closeTo(closing, 0.01));
    await tester.pumpAndSettle();
    expect(sheetBarrier, findsOneWidget);
    expect(state.trigger.hasFocus, isFalse);
    expect(state.dismissals, 0);
  });

  testWidgets('preference change during opening settles on the next frame',
      (tester) async {
    final state = await _host(tester);
    state.show(true);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    final mid = panelY(tester);
    state.change(() => state.reduce = true);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 16));
    expect(panelY(tester), lessThan(mid));
    final end = panelY(tester);
    await tester.pumpAndSettle();
    expect(panelY(tester), end);
  });

  testWidgets(
      'focus stays inside in both tab directions and Escape restores the trigger after exit',
      (tester) async {
    final state = await _host(tester);
    state.show(true);
    await tester.pumpAndSettle();
    expect(state.first.hasFocus, isTrue, reason: 'opening enters the first control');
    state.last.requestFocus();
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    expect(state.first.hasFocus, isTrue);
    expect(state.trigger.hasFocus, isFalse);
    await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
    await tester.pump();
    expect(state.last.hasFocus, isTrue);
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pump();
    expect(state.dismissals, 1);
    expect(sheetBarrier, findsOneWidget);
    await tester.pumpAndSettle();
    expect(state.trigger.hasFocus, isTrue);
  });

  testWidgets(
      'scrim blocks background taps and exposes a localized dismiss action',
      (tester) async {
    final semantics = tester.ensureSemantics();
    Iterable<String> labels() =>
        tester.semantics.simulatedAccessibilityTraversal().map((n) => n.label);
    final state = await _host(tester);
    state.show(true);
    await tester.pumpAndSettle();
    expect(labels(), isNot(contains('Open sheet')));
    expect(find.bySemanticsLabel('Dismiss'), findsOneWidget);
    await tester.tapAt(const Offset(400, 30));
    await tester.pump();
    expect(state.dismissals, 1);
    expect(state.backgroundTaps, 0);
    await tester.tapAt(const Offset(400, 30));
    await tester.pump();
    expect(state.backgroundTaps, 0);
    expect(state.dismissals, 1);
    await tester.pumpAndSettle();
    expect(labels(), contains('Open sheet'));
    semantics.dispose();
  });

  testWidgets('system back requests dismissal instead of leaving the route',
      (tester) async {
    final state = await _host(tester);
    state.show(true);
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(state.dismissals, 1);
    expect(find.text('Open sheet'), findsOneWidget);
  });

  testWidgets('rapid open close and unmount cancel pending focus and tickers',
      (tester) async {
    final state = await _host(tester);
    state.show(true);
    await tester.pump();
    state.show(false);
    await tester.pump();
    state.show(true);
    await tester.pump();
    state.change(() => state.showWidget = false);
    await tester.pump();
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(state.trigger.hasFocus, isTrue);
  });

  testWidgets('RTL at 200 percent text still opens and closes without overflow',
      (tester) async {
    final state = await _host(tester, direction: TextDirection.rtl);
    state.change(() => state.textScale = 2);
    state.show(true);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('panel-body')), findsOneWidget);
    expect(tester.takeException(), isNull);
    state.show(false);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('panel-body')), findsNothing);
  });
}
