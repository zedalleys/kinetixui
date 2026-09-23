// Interaction tests — the core controls do what their API says when a user acts on them.
// Smoke tests prove a widget *builds*; these prove it *behaves*: a press calls back once, a
// disabled control ignores input, a toggle reports the new value, typed text reaches `onChanged`.

// ignore_for_file: prefer_const_constructors, prefer_const_literals_to_create_immutables

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

Widget host(Widget child) => MaterialApp(
      home: KinetixTheme(
        brightness: Brightness.light,
        child: Scaffold(body: Center(child: child)),
      ),
    );

// kx-verify: interaction
void main() {
  group('KinetixButton', () {
    testWidgets('a tap calls onPressed once', (tester) async {
      var presses = 0;
      await tester.pumpWidget(host(KinetixButton(onPressed: () => presses++, child: const Text('Save'))));
      await tester.tap(find.byType(KinetixButton));
      await tester.pump();
      expect(presses, 1);
    });

    testWidgets('a null onPressed is disabled and ignores taps', (tester) async {
      await tester.pumpWidget(host(const KinetixButton(onPressed: null, child: Text('Save'))));
      await tester.tap(find.byType(KinetixButton));
      await tester.pump();
      expect(tester.takeException(), isNull);
    });

    for (final variant in KinetixButtonVariant.values) {
      testWidgets('${variant.name} variant is tappable', (tester) async {
        var presses = 0;
        await tester.pumpWidget(
          host(KinetixButton(variant: variant, onPressed: () => presses++, child: Text(variant.name))),
        );
        await tester.tap(find.byType(KinetixButton));
        expect(presses, 1);
      });
    }
  });

  group('KinetixCheckbox', () {
    testWidgets('a tap reports the opposite of the current value', (tester) async {
      bool? reported;
      await tester.pumpWidget(host(KinetixCheckbox(value: false, onChanged: (v) => reported = v)));
      await tester.tap(find.byType(KinetixCheckbox));
      expect(reported, isTrue);

      await tester.pumpWidget(host(KinetixCheckbox(value: true, onChanged: (v) => reported = v)));
      await tester.tap(find.byType(KinetixCheckbox));
      expect(reported, isFalse);
    });

    testWidgets('a null onChanged is disabled', (tester) async {
      await tester.pumpWidget(host(const KinetixCheckbox(value: false, onChanged: null)));
      await tester.tap(find.byType(KinetixCheckbox));
      expect(tester.takeException(), isNull);
    });
  });

  group('KinetixSwitch', () {
    testWidgets('a tap reports the opposite of the current value', (tester) async {
      bool? reported;
      await tester.pumpWidget(host(KinetixSwitch(value: false, onChanged: (v) => reported = v)));
      await tester.tap(find.byType(KinetixSwitch));
      expect(reported, isTrue);
    });

    testWidgets('a null onChanged is disabled', (tester) async {
      await tester.pumpWidget(host(const KinetixSwitch(value: true, onChanged: null)));
      await tester.tap(find.byType(KinetixSwitch));
      expect(tester.takeException(), isNull);
    });
  });

  group('KinetixToggle', () {
    testWidgets('a tap reports the opposite of the current value', (tester) async {
      bool? reported;
      await tester.pumpWidget(
        host(KinetixToggle(pressed: false, onChanged: (v) => reported = v, child: const Text('B'))),
      );
      await tester.tap(find.byType(KinetixToggle));
      expect(reported, isTrue);
    });
  });

  group('KinetixTabsTrigger', () {
    testWidgets('a tap calls onTap', (tester) async {
      var taps = 0;
      await tester.pumpWidget(host(KinetixTabsTrigger('One', selected: false, onTap: () => taps++)));
      await tester.tap(find.byType(KinetixTabsTrigger));
      expect(taps, 1);
    });
  });

  group('KinetixInput', () {
    testWidgets('typed text reaches onChanged', (tester) async {
      String? text;
      await tester.pumpWidget(host(SizedBox(width: 300, child: KinetixInput(onChanged: (v) => text = v))));
      await tester.enterText(find.byType(EditableText), 'hello');
      expect(text, 'hello');
    });
  });
}
