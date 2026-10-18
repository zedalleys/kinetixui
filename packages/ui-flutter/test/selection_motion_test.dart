import 'package:flutter/semantics.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

/// The selection-STATE family's motion and semantics on Flutter: Toggle,
/// ToggleGroup, Checkbox and RadioButton.
///
/// ## What these measure
///
/// A rendered, interpolated colour — not a duration variable. `AnimatedContainer`
/// builds a `Container` whose decoration is the *evaluated* tween at the current
/// frame, so stopping the clock 100ms into a 200ms settle and reading that
/// decoration off the tree is a measurement of what is actually painted. This is
/// the strongest evidence any of the three native platforms has for this family:
/// SwiftUI's package cannot render at all, and Compose's test surface exposes
/// semantics rather than paint.
///
/// It is still **headless**. `flutter_test` has no device, no emulator and no
/// screen; nothing here is runtime evidence and nothing claims to be.
///
/// ## Both directions, every time
///
/// Unchecked → checked and checked → unchecked are asserted separately. A
/// symmetric spec makes it tempting to assume one proves the other; the
/// disclosure slice shipped a gate blind to every collapse on that assumption.

/// Hosts a control under a chosen preference and direction.
///
/// Deliberately no `MaterialApp`: these widgets need a `KinetixTheme` and a
/// `Directionality` and nothing more, and MaterialApp would install its own
/// `MediaQuery` over the one set here — discarding the very setting under test.
Widget _host({
  required Widget child,
  bool reduce = false,
  TextDirection direction = TextDirection.ltr,
}) {
  return MediaQuery(
    data: MediaQueryData(disableAnimations: reduce),
    child: Directionality(
      textDirection: direction,
      child: KinetixTheme(
        brightness: Brightness.light,
        child: Align(alignment: Alignment.topLeft, child: child),
      ),
    ),
  );
}

/// A checkbox that owns its value, so a tap really changes state.
class _CheckboxHost extends StatefulWidget {
  const _CheckboxHost({this.initial = false});
  final bool initial;
  @override
  State<_CheckboxHost> createState() => _CheckboxHostState();
}

class _CheckboxHostState extends State<_CheckboxHost> {
  late bool value = widget.initial;
  @override
  Widget build(BuildContext context) =>
      KinetixCheckbox(value: value, onChanged: (v) => setState(() => value = v));
}

/// A radio pair that owns its selection.
class _RadioHost extends StatefulWidget {
  const _RadioHost({this.initial = 0, this.groupLabel});
  final int initial;
  final String? groupLabel;
  @override
  State<_RadioHost> createState() => _RadioHostState();
}

class _RadioHostState extends State<_RadioHost> {
  late int chosen = widget.initial;
  @override
  Widget build(BuildContext context) {
    return KinetixRadioGroup(
      label: widget.groupLabel,
      children: [
        KinetixRadioButton(selected: chosen == 0, onTap: () => setState(() => chosen = 0), label: 'Card'),
        KinetixRadioButton(selected: chosen == 1, onTap: () => setState(() => chosen = 1), label: 'Transfer'),
      ],
    );
  }
}

/// A toggle that owns its pressed state.
class _ToggleHost extends StatefulWidget {
  const _ToggleHost({this.initial = false});
  final bool initial;
  @override
  State<_ToggleHost> createState() => _ToggleHostState();
}

class _ToggleHostState extends State<_ToggleHost> {
  late bool pressed = widget.initial;
  @override
  Widget build(BuildContext context) => KinetixToggle(
        pressed: pressed,
        onChanged: (v) => setState(() => pressed = v),
        child: const Text('Bold'),
      );
}

/// The box an `AnimatedContainer` builds, whose decoration is the evaluated tween.
Finder _animatedBox(Type of) => find.descendant(
      of: find.descendant(of: find.byType(of), matching: find.byType(AnimatedContainer)),
      matching: find.byType(Container),
    );

BoxDecoration _decoration(WidgetTester tester, Type of) =>
    tester.widget<Container>(_animatedBox(of).first).decoration! as BoxDecoration;

Color? _fill(WidgetTester tester, Type of) => _decoration(tester, of).color;
Color? _edge(WidgetTester tester, Type of) => _decoration(tester, of).border?.top.color;

/// Advances to the midpoint of a 200ms settle.
Future<void> _halfway(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  group('the duration comes from the tokens', () {
    Future<Duration> captured(WidgetTester tester, {required bool reduce}) async {
      late Duration d;
      await tester.pumpWidget(_host(
        reduce: reduce,
        child: Builder(builder: (c) {
          d = KinetixSelectionMotion.durationOf(c);
          return const SizedBox.shrink();
        }),
      ));
      return d;
    }

    testWidgets('normal motion settles over the canonical fast token', (tester) async {
      expect(await captured(tester, reduce: false), KinetixDuration.fast);
    });

    testWidgets('selection-state is deliberately not the switch role', (tester) async {
      // The owner decision of 2026-10-17 as an assertion rather than a comment: a refactor
      // that normalised the two selection roles to one duration would fail here.
      final selection = await captured(tester, reduce: false);
      expect(selection, isNot(KinetixDuration.instant));
      expect(KinetixDuration.instant, const Duration(milliseconds: 100));
    });

    testWidgets('reduced motion reuses the one shared suppressed value', (tester) async {
      final d = await captured(tester, reduce: true);
      expect(d, KinetixDisclosureMotion.suppressed);
      expect(d.inMilliseconds, 0, reason: 'well inside one frame');
    });
  });

  // kx-verify: interaction, reducedMotion
  group('normal motion — the colour settles', () {
    testWidgets('unchecked → checked renders a real intermediate fill', (tester) async {
      await tester.pumpWidget(_host(child: const _CheckboxHost()));
      final start = _fill(tester, KinetixCheckbox);

      await tester.tap(find.byType(KinetixCheckbox));
      await _halfway(tester);
      final mid = _fill(tester, KinetixCheckbox);

      await tester.pumpAndSettle();
      final end = _fill(tester, KinetixCheckbox);

      expect(end, isNot(start), reason: 'the fill must actually change');
      expect(mid, isNot(start), reason: 'a rendered midpoint, not a jump');
      expect(mid, isNot(end), reason: 'and it is strictly on the way');
    });

    testWidgets('checked → unchecked renders a real intermediate fill', (tester) async {
      await tester.pumpWidget(_host(child: const _CheckboxHost(initial: true)));
      final start = _fill(tester, KinetixCheckbox);

      await tester.tap(find.byType(KinetixCheckbox));
      await _halfway(tester);
      final mid = _fill(tester, KinetixCheckbox);

      await tester.pumpAndSettle();
      final end = _fill(tester, KinetixCheckbox);

      expect(end, isNot(start));
      expect(mid, isNot(start), reason: 'a rendered midpoint on the way back');
      expect(mid, isNot(end));
    });

    testWidgets('an unselected → selected radio settles its edge and fades its dot', (tester) async {
      await tester.pumpWidget(_host(child: const _RadioHost(initial: 1)));
      // Driven inside a real KinetixRadioGroup, not a loose pair: the group owns the layout
      // and, since MX1d, the optional name, and a radio tapped outside one is not the case
      // any caller has.
      expect(find.byType(KinetixRadioGroup), findsOneWidget);
      final unselected = find.byType(KinetixRadioButton).first;
      final startEdge = _edge(tester, KinetixRadioButton);

      await tester.tap(unselected);
      await _halfway(tester);
      final midEdge = _edge(tester, KinetixRadioButton);
      // The dot is in the tree either way now; what changes is its opacity.
      final midOpacity = tester.widgetList<FadeTransition>(
        find.descendant(of: unselected, matching: find.byType(FadeTransition)),
      ).first.opacity.value;

      await tester.pumpAndSettle();
      expect(_edge(tester, KinetixRadioButton), isNot(startEdge));
      expect(midEdge, isNot(startEdge), reason: 'the edge settles rather than cutting');
      expect(midOpacity, greaterThan(0.0), reason: 'the dot is mid-fade');
      expect(midOpacity, lessThan(1.0));
    });

    testWidgets('an unpressed → pressed toggle settles its background', (tester) async {
      await tester.pumpWidget(_host(child: const _ToggleHost()));
      final start = _fill(tester, KinetixToggle);

      await tester.tap(find.byType(KinetixToggle));
      await _halfway(tester);
      final mid = _fill(tester, KinetixToggle);

      await tester.pumpAndSettle();
      expect(_fill(tester, KinetixToggle), isNot(start));
      expect(mid, isNot(start));
      expect(mid, isNot(_fill(tester, KinetixToggle)));
    });
  });

  group('reduced motion — the colour arrives', () {
    testWidgets('unchecked → checked arrives with no midpoint', (tester) async {
      await tester.pumpWidget(_host(reduce: true, child: const _CheckboxHost()));
      await tester.tap(find.byType(KinetixCheckbox));
      await _halfway(tester);
      final atTheSameInstant = _fill(tester, KinetixCheckbox);

      await tester.pumpAndSettle();
      expect(atTheSameInstant, _fill(tester, KinetixCheckbox),
          reason: 'with animations off the colour must arrive, not settle');
    });

    testWidgets('checked → unchecked arrives with no midpoint', (tester) async {
      await tester.pumpWidget(_host(reduce: true, child: const _CheckboxHost(initial: true)));
      final before = _fill(tester, KinetixCheckbox);

      await tester.tap(find.byType(KinetixCheckbox));
      await _halfway(tester);
      final atTheSameInstant = _fill(tester, KinetixCheckbox);

      await tester.pumpAndSettle();
      expect(atTheSameInstant, _fill(tester, KinetixCheckbox),
          reason: 'turning off is suppressed too, not just turning on');
      expect(_fill(tester, KinetixCheckbox), isNot(before),
          reason: 'suppression removes the settle, never the state change');
    });

    testWidgets('a radio still reaches its selected end state under RTL with motion reduced',
        (tester) async {
      await tester.pumpWidget(
        _host(reduce: true, direction: TextDirection.rtl, child: const _RadioHost(initial: 1)),
      );
      final unselected = find.byType(KinetixRadioButton).first;
      await tester.tap(unselected);
      await tester.pumpAndSettle();
      final opacity = tester.widgetList<FadeTransition>(
        find.descendant(of: unselected, matching: find.byType(FadeTransition)),
      ).first.opacity.value;
      expect(opacity, 1.0, reason: 'the dot is fully shown whatever the direction or the setting');
    });
  });

  // kx-verify: accessibility
  group('accessibility', () {
    SemanticsProperties props(WidgetTester tester, Finder of) => tester
        .widget<Semantics>(
          find.descendant(of: of, matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.checked != null)).first,
        )
        .properties;

    testWidgets('a radio announces its checked state and its mutual exclusivity', (tester) async {
      // Before MX1d KinetixRadioButton declared no Semantics at all: a selected radio was
      // indistinguishable from an unselected one, and neither was announced as a radio.
      await tester.pumpWidget(_host(child: const _RadioHost(initial: 0)));
      final first = find.byType(KinetixRadioButton).first;
      final second = find.byType(KinetixRadioButton).last;

      expect(props(tester, first).checked, isTrue);
      expect(props(tester, second).checked, isFalse);
      expect(props(tester, first).inMutuallyExclusiveGroup, isTrue,
          reason: 'this is what makes it a radio and not a checkbox');
      expect(props(tester, first).label, 'Card');
      expect(props(tester, first).enabled, isTrue);
    });

    testWidgets('selecting a radio moves the announced state in the same frame as the tap',
        (tester) async {
      // The semantics must not wait for the paint to settle. Read at the midpoint, while the
      // edge colour is still interpolating.
      await tester.pumpWidget(_host(child: const _RadioHost(initial: 1)));
      final first = find.byType(KinetixRadioButton).first;
      expect(props(tester, first).checked, isFalse);

      await tester.tap(first);
      await tester.pump();
      expect(props(tester, first).checked, isTrue,
          reason: 'what assistive technology is told never waits for the colour');

      await tester.pumpAndSettle();
      expect(props(tester, first).checked, isTrue);
    });

    testWidgets('a disabled radio is announced as disabled and cannot be selected', (tester) async {
      await tester.pumpWidget(_host(
        child: const KinetixRadioGroup(
          children: [KinetixRadioButton(selected: false, onTap: null, label: 'Card')],
        ),
      ));
      final radio = find.byType(KinetixRadioButton).first;
      expect(props(tester, radio).enabled, isFalse);
      await tester.tap(radio, warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(props(tester, radio).checked, isFalse);
    });

    testWidgets('a named group carries its name without swallowing its options', (tester) async {
      await tester.pumpWidget(_host(child: const _RadioHost(groupLabel: 'Payment method')));
      final group = tester.widget<Semantics>(
        find
            .descendant(
              of: find.byType(KinetixRadioGroup),
              matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.label == 'Payment method'),
            )
            .first,
      );
      expect(group.properties.label, 'Payment method');
      expect(group.properties.explicitChildNodes, isTrue,
          reason: 'a merged group would be announceable but not choosable');
      // And the options are still there, with their own states.
      expect(props(tester, find.byType(KinetixRadioButton).first).checked, isTrue);
      expect(props(tester, find.byType(KinetixRadioButton).last).checked, isFalse);
    });

    testWidgets('a mixed checkbox still announces mixed with its fill animated', (tester) async {
      await tester.pumpWidget(_host(
        child: const KinetixCheckbox(value: false, onChanged: null, indeterminate: true),
      ));
      final declared = tester
          .widget<Semantics>(find
              .descendant(
                of: find.byType(KinetixCheckbox),
                matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.mixed != null),
              )
              .first)
          .properties;
      expect(declared.mixed, isTrue, reason: 'the third state must not be flattened by the animation');
      expect(declared.checked, isFalse);
    });
  });
}
