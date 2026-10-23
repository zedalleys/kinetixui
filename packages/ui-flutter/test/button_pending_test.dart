// `pending` on KinetixButton — the action is in flight.
//
// The four risks this state actually carries, in the order they bite:
//   1. the control is reported as UNAVAILABLE instead of BUSY (and loses focus) — the naive
//      `onPressed: null` implementation, exercised as a negative control at the bottom;
//   2. a second tap starts the work twice;
//   3. the status joins the button's NAME instead of staying separate from it;
//   4. the indicator appears and pushes the label sideways.
//
// Everything here reads the semantics Flutter declares or merges. That is a claim about the
// properties set, not a measurement of what TalkBack or VoiceOver says out loud — no screen-reader
// run stands behind these tests.

// ignore_for_file: prefer_const_constructors, prefer_const_literals_to_create_immutables

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

Widget host(Widget child) => MaterialApp(
      home: KinetixTheme(
        brightness: Brightness.light,
        child: Scaffold(body: Center(child: child)),
      ),
    );

/// The `Semantics` the button declares — the outer one, carrying `button: true`.
Finder declared(Finder owner) => find.descendant(
      of: owner,
      matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.button == true),
    );

SemanticsProperties props(WidgetTester tester) =>
    tester.widget<Semantics>(declared(find.byType(KinetixButton)).first).properties;

// kx-verify: accessibility
void main() {
  group('KinetixButton pending — semantics', () {
    testWidgets('stays an ENABLED button and carries the status as its value', (tester) async {
      await tester.pumpWidget(host(KinetixButton(pending: true, onPressed: () {}, child: const Text('Save'))));
      final p = props(tester);
      // The whole point: busy, not unavailable. `enabled: false` is what the naive version reports.
      expect(p.enabled, isTrue, reason: 'pending must not read as disabled');
      expect(p.value, 'Working…');
      expect(p.liveRegion, isTrue, reason: 'a CHANGE to the status has to be announced, not only read on focus');
    });

    testWidgets('the status is separate from the name', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(host(KinetixButton(pending: true, onPressed: () {}, child: const Text('Save'))));
      final node = tester.getSemantics(declared(find.byType(KinetixButton)).first);
      // The name is still the label the author wrote; the status rides on `value`. If the spinner or
      // the status leaked into the name, the label would no longer be exactly 'Save'.
      expect(node, isSemantics(label: 'Save', value: 'Working…', isButton: true, isEnabled: true));
      handle.dispose();
    });

    testWidgets('the indicator contributes no semantics of its own', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(host(KinetixButton(pending: true, onPressed: () {}, child: const Text('Save'))));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      // One source for the status. A progress indicator that kept its own node would have it
      // announced twice.
      final node = tester.getSemantics(declared(find.byType(KinetixButton)).first);
      expect(node.label, 'Save');
      handle.dispose();
    });

    testWidgets('pendingLabel localises the status', (tester) async {
      await tester.pumpWidget(host(KinetixButton(
        pending: true,
        pendingLabel: 'جارٍ الحفظ…',
        onPressed: () {},
        child: const Text('Save'),
      )));
      expect(props(tester).value, 'جارٍ الحفظ…');
    });

    testWidgets('pending false is opted in but idle: no status, no ring, still a live region target',
        (tester) async {
      await tester.pumpWidget(host(KinetixButton(pending: false, onPressed: () {}, child: const Text('Save'))));
      final p = props(tester);
      expect(p.value, isNull);
      expect(p.liveRegion, isFalse);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });
  });

  group('KinetixButton pending — activation', () {
    testWidgets('a tap while pending does not start the work twice', (tester) async {
      var presses = 0;
      await tester.pumpWidget(host(KinetixButton(pending: true, onPressed: () => presses++, child: const Text('Save'))));
      await tester.tap(find.byType(KinetixButton));
      await tester.pump();
      expect(presses, 0, reason: 'the callback is gated while the action is in flight');
    });

    testWidgets('the tap is released again once pending clears', (tester) async {
      var presses = 0;
      Widget at(bool pending) =>
          host(KinetixButton(pending: pending, onPressed: () => presses++, child: const Text('Save')));

      await tester.pumpWidget(at(true));
      await tester.tap(find.byType(KinetixButton));
      await tester.pump();
      expect(presses, 0);

      await tester.pumpWidget(at(false));
      await tester.tap(find.byType(KinetixButton));
      await tester.pump();
      expect(presses, 1, reason: 'the gate is the state, not a one-way latch');
    });

    testWidgets('the button is still hit-testable and actionable while pending', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(host(KinetixButton(pending: true, onPressed: () {}, child: const Text('Save'))));
      // Keeping the tap ACTION is what keeps the node in the accessibility tree as something the user
      // is on. Suppression happens inside the callback, not by removing the gesture.
      expect(tester.getSemantics(declared(find.byType(KinetixButton)).first), isSemantics(hasTapAction: true));
      handle.dispose();
    });
  });

  group('KinetixButton pending — layout', () {
    testWidgets('the label does not move when the ring appears', (tester) async {
      Widget at(bool pending) =>
          host(KinetixButton(pending: pending, onPressed: () {}, child: const Text('Save')));

      await tester.pumpWidget(at(false));
      final idle = tester.getTopLeft(find.text('Save'));

      await tester.pumpWidget(at(true));
      final busy = tester.getTopLeft(find.text('Save'));

      // The slot is reserved in both states, so the ring occupies space that was already there.
      expect(busy, idle, reason: 'the 18px slot must be sized in both states');
    });
  });

  group('KinetixButton without pending — unchanged', () {
    testWidgets('a call site that never mentions pending builds what it built before', (tester) async {
      var presses = 0;
      await tester.pumpWidget(host(KinetixButton(onPressed: () => presses++, child: const Text('Save'))));
      final p = props(tester);
      expect(p.value, isNull);
      expect(p.liveRegion, isNull, reason: 'not even declared — the property is absent, not false');
      expect(find.byType(CircularProgressIndicator), findsNothing);
      // No indicator slot and no gap: the label is the only child of the text style wrapper.
      expect(find.descendant(of: find.byType(KinetixButton), matching: find.byType(Row)), findsNothing);
      await tester.tap(find.byType(KinetixButton));
      expect(presses, 1);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Negative control. Not an implementation — proof that the obvious one is wrong.
  //
  // The naive "pending" is `onPressed: busy ? null : handler`. It does suppress the second tap, so a
  // test that only counted presses would pass. These assertions are the ones that fail, and they are
  // the accessibility ones.
  // ---------------------------------------------------------------------------------------------
  group('negative control — pending expressed as a null onPressed', () {
    testWidgets('reports UNAVAILABLE rather than busy, and says nothing about the status', (tester) async {
      await tester.pumpWidget(host(KinetixButton(onPressed: null, child: const Text('Save'))));
      final p = props(tester);

      expect(p.enabled, isFalse, reason: 'this is the defect: a working control reported as unavailable');
      expect(p.value, isNull, reason: 'and with nothing said about why');
      expect(p.liveRegion, isNull);

      // In Flutter a null `onPressed` also drops the InkWell's own gesture, so the node loses its tap
      // action — which is how the platform stops treating it as something the user is interacting
      // with. The real implementation keeps it (see the activation group above).
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(host(KinetixButton(onPressed: null, child: const Text('Save'))));
      expect(tester.getSemantics(declared(find.byType(KinetixButton)).first), isSemantics(hasTapAction: false));
      handle.dispose();
    });
  });
}
