import 'dart:ui' show Tristate;

import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

void main() {
  for (final tabs in [true, false]) {
    final name = tabs ? 'Tabs' : 'SegmentedControl';
    testWidgets('$name skips disabled options and exposes their state', (
      tester,
    ) async {
      var activations = 0;
      void activate() => activations++;
      const labels = ['First', 'Unavailable', 'Last'];
      await tester.pumpWidget(
        WidgetsApp(
          color: const Color(0xffffffff),
          builder: (context, child) => KinetixTheme(
            child: Center(
              child: SizedBox(
                width: 420,
                height: 40,
                child: tabs
                    ? KinetixTabsList(
                        children: [
                          for (final (index, label) in labels.indexed)
                            KinetixTabsTrigger(
                              label,
                              selected: index == 1,
                              enabled: index != 1,
                              onTap: activate,
                            ),
                        ],
                      )
                    : KinetixSegmentedControl(
                        children: [
                          for (final (index, label) in labels.indexed)
                            KinetixSegmentedControlItem(
                              label,
                              selected: index == 1,
                              enabled: index != 1,
                              onTap: activate,
                            ),
                        ],
                      ),
              ),
            ),
          ),
        ),
      );
      SemanticsNode item(String label) =>
          tester.getSemantics(find.bySemanticsLabel(label));
      final owner = tester.binding.renderViews.single.owner!.semanticsOwner!;
      expect(
        item('Unavailable'),
        matchesSemantics(
          label: 'Unavailable',
          isButton: true,
          isSelected: true,
          hasSelectedState: true,
          hasEnabledState: true,
          textDirection: TextDirection.ltr,
        ),
      );

      await tester.tap(find.text('Unavailable'));
      await tester.pump();
      expect(activations, 0);

      owner.performAction(item('First').id, SemanticsAction.focus);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(item('Last').getSemanticsData().flagsCollection.isFocused,
          Tristate.isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      expect(activations, 1);
    });

    testWidgets('$name exposes selected buttons and preserves keyboard focus', (
      tester,
    ) async {
      final semantics = tester.ensureSemantics();
      try {
        var selected = 0;
        var activations = 0;
        await tester.pumpWidget(
          WidgetsApp(
            color: const Color(0xffffffff),
            builder: (context, child) => KinetixTheme(
              child: Center(
                child: SizedBox(
                  width: 360,
                  height: 40,
                  child: StatefulBuilder(
                    builder: (context, setState) {
                      void activate(int index) {
                        setState(() {
                          selected = index;
                          activations++;
                        });
                      }

                      const labels = ['One', 'Second', 'Third'];
                      return tabs
                          ? KinetixTabsList(
                              children: [
                                for (final (index, label) in labels.indexed)
                                  KinetixTabsTrigger(
                                    label,
                                    selected: selected == index,
                                    onTap: () => activate(index),
                                  ),
                              ],
                            )
                          : KinetixSegmentedControl(
                              children: [
                                for (final (index, label) in labels.indexed)
                                  KinetixSegmentedControlItem(
                                    label,
                                    selected: selected == index,
                                    onTap: () => activate(index),
                                  ),
                              ],
                            );
                    },
                  ),
                ),
              ),
            ),
          ),
        );
        Finder item(String label) => find.bySemanticsLabel(label);
        expect(
          tester.getSemantics(item('One')),
          matchesSemantics(
            label: 'One',
            isButton: true,
            hasEnabledState: true,
            isEnabled: true,
            isSelected: true,
            hasSelectedState: true,
            isFocusable: true,
            hasTapAction: true,
            hasFocusAction: true,
            textDirection: TextDirection.ltr,
          ),
        );
        // Seed keyboard focus as when entering the strip from an existing focus scope.
        final first = tester.getSemantics(item('One'));
        tester.binding.renderViews.single.owner!.semanticsOwner!.performAction(
          first.id,
          SemanticsAction.focus,
        );
        await tester.pump();
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        expect(
          tester.getSemantics(item('Second')),
          matchesSemantics(
            label: 'Second',
            isButton: true,
            hasEnabledState: true,
            isEnabled: true,
            hasSelectedState: true,
            isFocusable: true,
            isFocused: true,
            hasTapAction: true,
            hasFocusAction: true,
            textDirection: TextDirection.ltr,
          ),
        );

        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pump();
        expect(selected, 1);
        expect(activations, 1);
        expect(
          tester.getSemantics(item('Second')),
          matchesSemantics(
            label: 'Second',
            isButton: true,
            hasEnabledState: true,
            isEnabled: true,
            isSelected: true,
            hasSelectedState: true,
            isFocusable: true,
            isFocused: true,
            hasTapAction: true,
            hasFocusAction: true,
            textDirection: TextDirection.ltr,
          ),
        );
        await tester.pumpAndSettle();
        await tester.sendKeyEvent(LogicalKeyboardKey.space);
        await tester.pump();
        expect(activations, 2);
      } finally {
        semantics.dispose();
      }
    });
  }
}
