import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';
import 'package:kinetix_ui/src/kinetix_selection_indicator.dart';

/// The state the harness below hands each test, so every test drives the same widget tree.
class _Harness {
  _Harness(this.selected, this.reduced, this.rtl, this.label);

  final ValueNotifier<int> selected;
  final ValueNotifier<bool> reduced;
  final ValueNotifier<bool> rtl;
  final ValueNotifier<String> label;
}

/// One list with three items, the third deliberately wider, under a live reduced-motion preference
/// and a live text direction.
///
/// Factored out because the four tests below each need the whole tree and none of them needs a
/// different one. The split itself is the point: a single test named for both directions satisfied
/// `check:native-motion`'s two-direction clause twice over, which is the fail-open this branch
/// exists to close. Each direction now has a test of its own, named for that direction alone.
Future<_Harness> pumpList(WidgetTester tester, {required bool tabs}) async {
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

  return _Harness(selected, reduced, rtl, label);
}

/// Where the indicator is actually painted, not where it has been asked to go.
Rect painted(WidgetTester tester) => tester
    .renderObject<KinetixSelectionIndicatorRender>(
        find.byType(KinetixSelectionIndicator))
    .presentation!;

void main() {
  for (final tabs in [false, true]) {
    final name = tabs ? 'Tabs' : 'SegmentedControl';

    testWidgets('$name glides previous → next when a later item is selected',
        (tester) async {
      final h = await pumpList(tester, tabs: tabs);
      final first = painted(tester);

      await tester.tap(find.text(h.label.value));
      await tester.pump();
      expect(h.selected.value, 2);
      // One frame after the tap the bar has not moved: the travel is animated, not a jump.
      expect(painted(tester), first);

      await tester.pump(const Duration(milliseconds: 65));
      final intermediate = painted(tester);
      expect(intermediate.left, greaterThan(first.left));
      expect(intermediate.width, greaterThan(0));
    });

    testWidgets(
        '$name retargets next → previous from the painted position mid-travel',
        (tester) async {
      final h = await pumpList(tester, tabs: tabs);
      final first = painted(tester);

      // Start a forward travel and interrupt it before it lands.
      await tester.tap(find.text(h.label.value));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 65));
      final intermediate = painted(tester);
      expect(intermediate.left, greaterThan(first.left));

      await tester.tap(find.text('Second'));
      await tester.pump();
      // The reverse travel begins from where the bar is PAINTED, not from the target it was
      // heading for. A retarget that snapped to the old target first would read as a stutter.
      expect(painted(tester), intermediate);

      await tester.pump(const Duration(milliseconds: 45));
      expect(painted(tester), isNot(intermediate));
    });

    testWidgets('$name reaches the selected item with animations off',
        (tester) async {
      // The reader's preference is a MODE, not a direction: with travel removed the bar must still
      // arrive, in one frame, at the item that is actually selected.
      final h = await pumpList(tester, tabs: tabs);
      final first = painted(tester);

      h.reduced.value = true;
      await tester.pump();
      final settled = painted(tester);
      await tester.pump(const Duration(milliseconds: 400));
      expect(painted(tester), settled);

      h.selected.value = 0;
      await tester.pump();
      expect(painted(tester), first);

      h.reduced.value = false;
      await tester.pump(const Duration(milliseconds: 400));
      expect(painted(tester), first);
    });

    testWidgets('$name keeps its geometry in RTL and disposes cleanly',
        (tester) async {
      final h = await pumpList(tester, tabs: tabs);
      final first = painted(tester);

      h.rtl.value = true;
      h.label.value = 'Wider third item';
      await tester.pump();
      expect(painted(tester).left, greaterThan(first.left));

      h.selected.value = 2;
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 40));
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }
}
