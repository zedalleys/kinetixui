import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

void main() {
  for (final tabs in [true, false]) {
    final name = tabs ? 'Tabs' : 'SegmentedControl';
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
        tester.binding.renderViews.single.owner!.semanticsOwner!
            .performAction(first.id, SemanticsAction.focus);
        await tester.pump();
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        expect(
          tester.getSemantics(item('Second')),
          matchesSemantics(
            label: 'Second',
            isButton: true,
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
