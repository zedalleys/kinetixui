// Accessibility semantics — what a screen reader (TalkBack / VoiceOver) is told about the core controls.
// A bare GestureDetector or InkWell exposes a label at best: no "button" role, no checked / on / selected
// state, no enabled / disabled. These tests pin that each control declares them.
//
// Two layers: the `Semantics` each control declares (fast, exact), and one end-to-end check that the
// merged semantics node a platform accessibility service actually sees carries the same information.

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

/// The `Semantics` widget a control declares — the one carrying the property [has] asks about.
Finder declared(Finder owner, bool Function(SemanticsProperties p) has) => find.descendant(
      of: owner,
      matching: find.byWidgetPredicate((w) => w is Semantics && has(w.properties)),
    );

SemanticsProperties props(WidgetTester tester, Finder f) => tester.widget<Semantics>(f.first).properties;

void main() {
  group('KinetixButton', () {
    testWidgets('is announced as an enabled button', (tester) async {
      await tester.pumpWidget(host(KinetixButton(onPressed: () {}, child: const Text('Save'))));
      final p = props(tester, declared(find.byType(KinetixButton), (p) => p.button == true));
      expect(p.button, isTrue);
      expect(p.enabled, isTrue);
    });

    testWidgets('is announced as disabled when onPressed is null', (tester) async {
      await tester.pumpWidget(host(const KinetixButton(onPressed: null, child: Text('Save'))));
      final p = props(tester, declared(find.byType(KinetixButton), (p) => p.button == true));
      expect(p.enabled, isFalse);
    });

    testWidgets('the merged semantics node has the role, the state, a tap action and the label', (tester) async {
      final handle = tester.ensureSemantics();
      addTearDown(handle.dispose);
      await tester.pumpWidget(host(KinetixButton(onPressed: () {}, child: const Text('Save'))));
      final node = tester.getSemantics(declared(find.byType(KinetixButton), (p) => p.button == true).first);
      expect(
        node,
        // isSemantics checks only what is named (containsSemantics is deprecated since Flutter 3.40; CI tracks stable)
        isSemantics(label: 'Save', isButton: true, hasEnabledState: true, isEnabled: true, hasTapAction: true),
      );
    });
  });

  group('KinetixCheckbox', () {
    testWidgets('announces checked and unchecked', (tester) async {
      await tester.pumpWidget(host(KinetixCheckbox(value: true, onChanged: (_) {})));
      expect(props(tester, declared(find.byType(KinetixCheckbox), (p) => p.checked != null)).checked, isTrue);

      await tester.pumpWidget(host(KinetixCheckbox(value: false, onChanged: (_) {})));
      expect(props(tester, declared(find.byType(KinetixCheckbox), (p) => p.checked != null)).checked, isFalse);
    });

    testWidgets('announces the mixed state when indeterminate', (tester) async {
      await tester.pumpWidget(host(KinetixCheckbox(value: false, indeterminate: true, onChanged: (_) {})));
      final p = props(tester, declared(find.byType(KinetixCheckbox), (p) => p.mixed != null));
      expect(p.mixed, isTrue);
      expect(p.checked, isFalse);
    });

    testWidgets('announces disabled when onChanged is null', (tester) async {
      await tester.pumpWidget(host(const KinetixCheckbox(value: false, onChanged: null)));
      expect(props(tester, declared(find.byType(KinetixCheckbox), (p) => p.checked != null)).enabled, isFalse);
    });
  });

  group('KinetixSwitch', () {
    testWidgets('announces on and off', (tester) async {
      await tester.pumpWidget(host(KinetixSwitch(value: true, onChanged: (_) {})));
      expect(props(tester, declared(find.byType(KinetixSwitch), (p) => p.toggled != null)).toggled, isTrue);

      await tester.pumpWidget(host(KinetixSwitch(value: false, onChanged: (_) {})));
      expect(props(tester, declared(find.byType(KinetixSwitch), (p) => p.toggled != null)).toggled, isFalse);
    });

    testWidgets('announces disabled when onChanged is null', (tester) async {
      await tester.pumpWidget(host(const KinetixSwitch(value: true, onChanged: null)));
      expect(props(tester, declared(find.byType(KinetixSwitch), (p) => p.toggled != null)).enabled, isFalse);
    });
  });

  group('KinetixToggle', () {
    testWidgets('is a button that announces its pressed state', (tester) async {
      await tester.pumpWidget(host(KinetixToggle(pressed: true, onChanged: (_) {}, child: const Text('B'))));
      final p = props(tester, declared(find.byType(KinetixToggle), (p) => p.button == true));
      expect(p.button, isTrue);
      expect(p.toggled, isTrue);
    });
  });

  group('KinetixTabsTrigger', () {
    testWidgets('announces which tab is selected', (tester) async {
      await tester.pumpWidget(host(KinetixTabsTrigger('One', selected: true, onTap: () {})));
      expect(props(tester, declared(find.byType(KinetixTabsTrigger), (p) => p.selected != null)).selected, isTrue);

      await tester.pumpWidget(host(KinetixTabsTrigger('One', selected: false, onTap: () {})));
      expect(props(tester, declared(find.byType(KinetixTabsTrigger), (p) => p.selected != null)).selected, isFalse);
    });
  });
}
