import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';
import 'package:kinetix_ui/src/kinetix_selection_indicator.dart';

void main() {
  for (final tabs in [false, true]) {
    final name = tabs ? 'Tabs' : 'SegmentedControl';
    testWidgets('$name forward retargets backward from the painted position',
        (tester) async {
      final selected = ValueNotifier(0);
      final reduced = ValueNotifier(false);
      final rtl = ValueNotifier(false);
      final label = ValueNotifier('A wider third item');
      addTearDown(() {
        selected.dispose();
        reduced.dispose();
        rtl.dispose();
        label.dispose();
      });

      await tester.pumpWidget(ListenableBuilder(
        listenable: Listenable.merge([selected, reduced, rtl, label]),
        builder: (context, child) => MediaQuery(
          data: MediaQueryData(disableAnimations: reduced.value),
          child: Directionality(
            textDirection: rtl.value ? TextDirection.rtl : TextDirection.ltr,
            child: KinetixTheme(
                child: Center(
              child: SizedBox(
                width: 480,
                child: tabs
                    ? KinetixTabsList(children: [
                        for (final (index, text)
                            in ['One', 'Second', label.value].indexed)
                          KinetixTabsTrigger(text,
                              selected: selected.value == index,
                              onTap: () => selected.value = index),
                      ])
                    : KinetixSegmentedControl(children: [
                        for (final (index, text)
                            in ['One', 'Second', label.value].indexed)
                          KinetixSegmentedControlItem(text,
                              selected: selected.value == index,
                              onTap: () => selected.value = index),
                      ]),
              ),
            )),
          ),
        ),
      ));

      final layer = find.byType(KinetixSelectionIndicator);
      Rect position() => tester
          .renderObject<KinetixSelectionIndicatorRender>(layer)
          .presentation!;
      final first = position();
      await tester.tap(find.text(label.value));
      await tester.pump();
      expect(selected.value, 2);
      expect(position(), first);
      await tester.pump(const Duration(milliseconds: 65));
      final intermediate = position();
      expect(intermediate.left, greaterThan(first.left));
      await tester.tap(find.text('Second'));
      await tester.pump();
      expect(position(), intermediate);
      await tester.pump(const Duration(milliseconds: 45));
      expect(position(), isNot(intermediate));

      reduced.value = true;
      await tester.pump();
      final second = position();
      await tester.pump(const Duration(milliseconds: 400));
      expect(position(), second);
      selected.value = 0;
      await tester.pump();
      expect(position(), first);

      reduced.value = false;
      await tester.pump(const Duration(milliseconds: 400));
      expect(position(), first);
      rtl.value = true;
      label.value = 'Wider third item';
      await tester.pump();
      expect(position().left, greaterThan(first.left));

      selected.value = 2;
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 40));
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }
}
