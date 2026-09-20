// Adaptivity — the widgets hold up under right-to-left layout and large system text, the two settings
// that most often break a hand-built widget. Smoke tests only ever ran left-to-right at 1x text.

// ignore_for_file: prefer_const_constructors, prefer_const_literals_to_create_immutables

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

import 'smoke_test.dart' show inlineWidgets;

Widget host(Widget child, {TextDirection direction = TextDirection.ltr, double textScale = 1}) => MaterialApp(
      builder: (context, w) => Directionality(
        textDirection: direction,
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
          child: w!,
        ),
      ),
      home: KinetixTheme(
        brightness: Brightness.light,
        // no Center: the full-width scroll view gives Slider / Input the bounded width they need (as in smoke_test)
        child: Scaffold(body: SingleChildScrollView(child: child)),
      ),
    );

/// Inline widgets that currently overflow at 2x text. Each is a real defect to fix — this list may only
/// shrink. Adding a name here is a decision, not a convenience.
const Set<String> knownLargeTextOverflow = <String>{};

void main() {
  group('right-to-left', () {
    testWidgets('every inline widget builds under RTL', (tester) async {
      await tester.pumpWidget(
        host(
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: inlineWidgets().map((w) => Padding(padding: const EdgeInsets.all(6), child: w)).toList(),
          ),
          direction: TextDirection.rtl,
        ),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('the Switch thumb mirrors: "on" sits at the end edge in both directions', (tester) async {
      await tester.pumpWidget(host(KinetixSwitch(value: true, onChanged: (_) {})));
      final track = tester.widget<AnimatedContainer>(
        find.descendant(of: find.byType(KinetixSwitch), matching: find.byType(AnimatedContainer)),
      );
      expect(track.alignment!.resolve(TextDirection.ltr), Alignment.centerRight);
      expect(track.alignment!.resolve(TextDirection.rtl), Alignment.centerLeft);
    });

    testWidgets('the Switch thumb mirrors: "off" sits at the start edge in both directions', (tester) async {
      await tester.pumpWidget(host(KinetixSwitch(value: false, onChanged: (_) {})));
      final track = tester.widget<AnimatedContainer>(
        find.descendant(of: find.byType(KinetixSwitch), matching: find.byType(AnimatedContainer)),
      );
      expect(track.alignment!.resolve(TextDirection.ltr), Alignment.centerLeft);
      expect(track.alignment!.resolve(TextDirection.rtl), Alignment.centerRight);
    });
  });

  group('large text (2x)', () {
    testWidgets('inline widgets do not overflow, except the tracked ones', (tester) async {
      final failures = <String>{};
      final widgets = inlineWidgets();
      for (var i = 0; i < widgets.length; i++) {
        await tester.pumpWidget(host(Padding(padding: const EdgeInsets.all(6), child: widgets[i]), textScale: 2));
        if (tester.takeException() != null) failures.add(widgets[i].runtimeType.toString());
      }
      expect(
        failures.difference(knownLargeTextOverflow),
        isEmpty,
        reason: 'new large-text overflow (fix the widget, do not add it to the allow-list): $failures',
      );
      expect(
        knownLargeTextOverflow.difference(failures),
        isEmpty,
        reason: 'these no longer overflow — remove them from knownLargeTextOverflow',
      );
    });
  });
}
