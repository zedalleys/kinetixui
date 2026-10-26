// A date field's visible label has to name the field. The React source states the contract:
// the trigger's accessible name is the label PLUS the shown date, because a name of the label
// alone would drop the date out of it. Before this, KinetixDatePicker had no label at all and
// the trigger was announced as a bare date with nothing saying which field it belonged to.
//
// Two layers, matching semantics_test.dart: the `Semantics` the widget declares, and the merged
// node a platform accessibility service actually sees.

// ignore_for_file: prefer_const_constructors

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

final _date = DateTime(2026, 3, 9);

// kx-verify: accessibility
void main() {
  group('KinetixDatePicker label', () {
    testWidgets('names the trigger with the label and the shown date, not either alone', (tester) async {
      await tester.pumpWidget(
        host(KinetixDatePicker(selectedDate: _date, onChanged: (_) {}, label: 'Due date')),
      );
      final s = tester.widget<Semantics>(
        find
            .descendant(
              of: find.byType(KinetixDatePicker),
              matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.button == true),
            )
            .first,
      );
      expect(s.properties.label, 'Due date, 2026-03-09');
      expect(s.properties.button, isTrue);
    });

    testWidgets('renders the label visibly as well as in the name', (tester) async {
      await tester.pumpWidget(
        host(KinetixDatePicker(selectedDate: _date, onChanged: (_) {}, label: 'Due date')),
      );
      expect(find.text('Due date'), findsOneWidget);
    });

    testWidgets('keeps the tap action, which excludeSemantics would otherwise drop', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(
        host(KinetixDatePicker(selectedDate: _date, onChanged: (_) {}, label: 'Due date')),
      );
      final node = tester.getSemantics(
        find
            .descendant(
              of: find.byType(KinetixDatePicker),
              matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.button == true),
            )
            .first,
      );
      expect(node, matchesSemantics(label: 'Due date, 2026-03-09', isButton: true, hasTapAction: true));
      handle.dispose();
    });

    testWidgets('without a label the date still names the trigger, rather than nothing', (tester) async {
      // The Semantics wrapper is deliberately not applied here: excludeSemantics would replace a
      // node named by its date with a node named by nothing. This is the regression control for
      // that decision.
      await tester.pumpWidget(host(KinetixDatePicker(selectedDate: _date, onChanged: (_) {})));
      expect(find.text('2026-03-09'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(KinetixDatePicker),
          matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.button == true),
        ),
        findsNothing,
      );
    });

    testWidgets('a blank label is treated as absent, not as an empty name', (tester) async {
      // Writing this test is what found the bug: the first version of the fix checked only for
      // null, so `label: ''` produced the accessible name ", 2026-03-09" — a leading comma in
      // place of a field name, which is worse than the bare date it replaced.
      await tester.pumpWidget(
        host(KinetixDatePicker(selectedDate: _date, onChanged: (_) {}, label: '   ')),
      );
      expect(
        find.descendant(
          of: find.byType(KinetixDatePicker),
          matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.button == true),
        ),
        findsNothing,
      );
      expect(find.text('2026-03-09'), findsOneWidget);
    });
  });
}
