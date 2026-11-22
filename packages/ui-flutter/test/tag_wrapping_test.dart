// The wrapping contract for `KinetixTag`, added under M5.26 after the blocks acceptance gate chased a
// 200%-text clipping defect out of three block fixtures and into this library primitive
// (`lib/src/tag.dart`). The fix has two halves, and both are load-bearing:
//
//   1. Given a bounded width, the label WRAPS inside the tag. Before the fix a `Row` handed its single
//      inflexible child unbounded width, so the label measured at its full single-line length, ran past
//      the tag, and an ancestor with `Clip.antiAlias` — `KinetixCard` has one — clipped the words away
//      in silence. Nothing threw at `flutter_test`'s default 800x600 surface. WCAG 1.4.4.
//   2. Given an UNBOUNDED width, the previous behaviour must stand. `Flexible` asserts under unbounded
//      constraints, so a tag in a bare `Row` or a horizontal scroll view would crash outright if the
//      flexible form were unconditional. That is why `lib/src/tag.dart` chooses between the two forms
//      on `constraints.hasBoundedWidth`, and why the choice has a test of its own below.
//
// Every width here is MEASURED from the widget rather than written down: the tag's own single-line width
// is probed first, and the bounded cases are then sized as a fraction of it. A hard-coded pixel width
// would be a different test on every font, text scale and platform, and would pass for the wrong reason
// the first time either changed.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

Widget host(
  Widget child, {
  double textScale = 1.0,
  Brightness brightness = Brightness.light,
  TextDirection direction = TextDirection.ltr,
}) =>
    MaterialApp(
      home: KinetixTheme(
        brightness: brightness,
        child: Builder(
          // `MediaQuery.of(context).copyWith` rather than a fresh `MediaQueryData`: a fresh one has
          // `size: Size.zero` and no padding, which would change the layout being measured. This is the
          // same idiom the block fixtures' 200%-text gates use.
          builder: (BuildContext context) => MediaQuery(
            data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
            child: Directionality(
              textDirection: direction,
              child: Scaffold(body: Align(alignment: Alignment.topLeft, child: child)),
            ),
          ),
        ),
      ),
    );

/// A phone-width surface for one test. The defect this file pins was invisible at `flutter_test`'s
/// 800x600 default: it needs a narrow viewport AND large text at the same time.
void setPhone(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
}

/// Pumps [child] and returns every `RenderFlex` overflow Flutter reported while doing so.
///
/// `FlutterError.toString()` says only "A RenderFlex overflowed by N pixels" — it does NOT name the
/// widget that did it, which makes a red from it unactionable. `FlutterErrorDetails.toString()` DOES
/// name it, so the details object is what gets collected and what a failure prints.
Future<List<String>> pumpCollectingOverflows(WidgetTester tester, Widget child) async {
  final List<String> overflows = <String>[];
  final void Function(FlutterErrorDetails)? previousOnError = FlutterError.onError;
  FlutterError.onError = (FlutterErrorDetails details) => overflows.add(details.toString());
  try {
    await tester.pumpWidget(child);
    // Deliberately NOT pumpAndSettle: a blinking text cursor never settles, and
    // `KinetixMultiSelect` embeds a text field. Layout — the only thing measured here — is
    // complete after the first frame.
    await tester.pump(const Duration(milliseconds: 50));
  } finally {
    FlutterError.onError = previousOnError;
  }
  return overflows;
}

/// The size a tag takes when nothing constrains it: one line, full length. Both the bounded widths
/// below and the "did it actually wrap" assertions are derived from this.
Future<Size> probeSingleLineSize(
  WidgetTester tester,
  String label, {
  double textScale = 1.0,
  KinetixTagVariant variant = KinetixTagVariant.primary,
  bool removable = false,
}) async {
  await tester.pumpWidget(host(
    // A horizontal scroll view is the honest way to hand a child unbounded width: no clipping, no
    // overflow report, the child measures itself.
    SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: KinetixTag(label, variant: variant, onRemove: removable ? () {} : null),
    ),
    textScale: textScale,
  ));
  await tester.pump(const Duration(milliseconds: 50));
  return tester.getSize(find.byType(KinetixTag));
}

/// The pre-fix tag, reproduced here and nowhere else. Its only difference from `lib/src/tag.dart` is
/// that the label is NOT flexible — which is exactly the defect. It exists so the control below can
/// prove this file's instrument fires on the real cause rather than asserting its own conclusion.
class UnwrappedTagReplica extends StatelessWidget {
  const UnwrappedTagReplica(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: KinetixTheme.of(context).secondary,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[Text(label, style: const TextStyle(fontSize: 14))],
        ),
      );
}

void main() {
  // Two words, so wrapping has somewhere to break. A single long token could only be wrapped by
  // breaking mid-word, which is a different question from the one this file is about.
  const String label = 'Nurse recorded';

  group('bounded width: the label wraps inside the tag', () {
    for (final double scale in <double>[1.0, 2.0]) {
      testWidgets('at ${(scale * 100).round()}% text, nothing overflows and the words stay on screen',
          (WidgetTester tester) async {
        setPhone(tester);
        final Size single = await probeSingleLineSize(tester, label, textScale: scale);

        // 70% of the tag's single-line width. The label cannot fit on one line here — that is the point
        // — so a correct tag wraps and an incorrect one overflows.
        final double bounded = (single.width * 0.7).floorToDouble();

        final List<String> overflows = await pumpCollectingOverflows(
          tester,
          host(SizedBox(width: bounded, child: const KinetixTag(label)), textScale: scale),
        );

        expect(overflows, isEmpty, reason: overflows.join('\n\n'));
        expect(tester.takeException(), isNull);

        final Size wrapped = tester.getSize(find.byType(KinetixTag));

        // Inside its bound, not past it. This is the assertion the defect failed.
        expect(wrapped.width, lessThanOrEqualTo(bounded),
            reason: 'tag is ${wrapped.width}px wide inside a ${bounded}px bound');

        // And it grew taller, which proves the words WRAPPED rather than being clipped or ellipsised
        // away. A tag that silently dropped half its label would also satisfy the width assertion
        // above, so the height is what distinguishes a fix from a different defect.
        expect(wrapped.height, greaterThan(single.height),
            reason: 'tag is ${wrapped.height}px tall against ${single.height}px on one line, so it did '
                'not wrap — the label may have been clipped instead');

        // The label is still one Text, still carrying every word.
        expect(find.text(label), findsOneWidget);
      });
    }

    testWidgets('a removable tag wraps too, and its dismiss control stays named and tappable',
        (WidgetTester tester) async {
      setPhone(tester);
      final Size single =
          await probeSingleLineSize(tester, label, textScale: 2.0, removable: true);
      int removed = 0;

      final List<String> overflows = await pumpCollectingOverflows(
        tester,
        host(
          SizedBox(
            // Read off the REMOVABLE tag's own single-line width: the dismiss control takes room that a
            // plain tag's probe knows nothing about, and sizing from the plain probe would squeeze the
            // control below its minimum for a reason that has nothing to do with wrapping.
            width: (single.width * 0.8).floorToDouble(),
            child: KinetixTag(label, onRemove: () => removed++),
          ),
          textScale: 2.0,
        ),
      );

      expect(overflows, isEmpty, reason: overflows.join('\n\n'));
      expect(tester.takeException(), isNull);

      final Finder dismiss = find.bySemanticsLabel('Remove $label');
      expect(tester.getSemantics(dismiss), isSemantics(isButton: true, hasTapAction: true));
      await tester.tap(dismiss);
      expect(removed, 1, reason: 'the dismiss control must still work once the label wraps around it');
    });
  });

  group('unbounded width: the previous behaviour stands, and nothing asserts', () {
    // `Flexible` under unbounded constraints throws a parent-data/intrinsics assertion. These are the
    // three everyday unbounded hosts; if `lib/src/tag.dart` ever drops its `hasBoundedWidth` guard,
    // each of them crashes here rather than in someone's app.
    final Map<String, Widget Function(Widget tag)> unbounded = <String, Widget Function(Widget)>{
      'a horizontal scroll view':
          (Widget tag) => SingleChildScrollView(scrollDirection: Axis.horizontal, child: tag),
      'a Row inside a horizontal scroll view': (Widget tag) => SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: <Widget>[tag]),
          ),
    };

    for (final MapEntry<String, Widget Function(Widget)> entry in unbounded.entries) {
      testWidgets('in ${entry.key}, at 200% text', (WidgetTester tester) async {
        setPhone(tester);
        final List<String> overflows = await pumpCollectingOverflows(
          tester,
          host(entry.value(const KinetixTag(label)), textScale: 2.0),
        );

        // No overflow — there is no bound to overflow — and, the real point, NO ASSERTION.
        expect(overflows, isEmpty, reason: overflows.join('\n\n'));
        expect(tester.takeException(), isNull,
            reason: 'an unbounded width must not reach Flexible, or this throws a parent-data assertion');

        // One line, as before the fix. There is nothing to wrap against here, so wrapping would be the
        // wrong answer rather than a better one.
        final Size size = tester.getSize(find.byType(KinetixTag));
        final Size single = await probeSingleLineSize(tester, label, textScale: 2.0);
        expect(size.height, single.height);
        expect(size.width, single.width);
      });
    }

    testWidgets('a removable tag in an unbounded host does not assert either',
        (WidgetTester tester) async {
      setPhone(tester);
      final List<String> overflows = await pumpCollectingOverflows(
        tester,
        host(
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: KinetixTag(label, onRemove: () {}),
          ),
          textScale: 2.0,
        ),
      );
      expect(overflows, isEmpty, reason: overflows.join('\n\n'));
      expect(tester.takeException(), isNull);
    });
  });

  group('every variant, both themes, both directions', () {
    // The wrapping change is in the shared build method, so it applies to all five variants and both
    // brightnesses at once — including `outline`, the only one that draws a border and so the only one
    // whose box geometry differs. RTL matters because the dismiss control sits at the label's end: the
    // fix uses `Flexible` inside a `Row`, which is direction-aware, and a `Padding` with a
    // non-directional `EdgeInsets` would not have been.
    for (final KinetixTagVariant variant in KinetixTagVariant.values) {
      for (final Brightness brightness in Brightness.values) {
        for (final TextDirection direction in TextDirection.values) {
          testWidgets('${variant.name} / ${brightness.name} / ${direction.name} wraps without overflow',
              (WidgetTester tester) async {
            setPhone(tester);
            final Size single = await probeSingleLineSize(tester, label,
                textScale: 2.0, variant: variant, removable: true);
            final double bounded = (single.width * 0.8).floorToDouble();

            final List<String> overflows = await pumpCollectingOverflows(
              tester,
              host(
                SizedBox(
                  width: bounded,
                  child: KinetixTag(label, variant: variant, onRemove: () {}),
                ),
                textScale: 2.0,
                brightness: brightness,
                direction: direction,
              ),
            );

            expect(overflows, isEmpty, reason: overflows.join('\n\n'));
            expect(tester.takeException(), isNull);
            expect(tester.getSize(find.byType(KinetixTag)).width, lessThanOrEqualTo(bounded));
            expect(find.text(label), findsOneWidget);
            expect(find.bySemanticsLabel('Remove $label'), findsOneWidget);
          });
        }
      }
    }
  });

  group('negative controls', () {
    // A control that asserted "the fixed tag does not overflow" would pass with the fix deleted, because
    // nothing would have told it what overflowing looks like. These two inject the CAUSE instead and
    // require the instrument to fire.

    testWidgets('control: the pre-fix tag DOES overflow at the same width and scale',
        (WidgetTester tester) async {
      setPhone(tester);
      final Size single = await probeSingleLineSize(tester, label, textScale: 2.0);
      final double bounded = (single.width * 0.7).floorToDouble();

      final List<String> overflows = await pumpCollectingOverflows(
        tester,
        host(SizedBox(width: bounded, child: const UnwrappedTagReplica(label)), textScale: 2.0),
      );

      // If this is ever empty, the harness above is measuring nothing and every green in this file is
      // worthless.
      expect(overflows, isNotEmpty,
          reason: 'the unwrapped replica must overflow a ${bounded}px bound at 200% text, or this '
              "file's instrument is not working");
      expect(overflows.join('\n'), contains('overflowed'));
      expect(overflows.join('\n'), matches(RegExp(r'Row|RenderFlex')),
          reason: 'the details must NAME the widget that overflowed, not just the pixel count — that '
              'is the whole reason this file collects FlutterErrorDetails and not FlutterError');

      // `takeException` is drained so the control does not fail on the error it deliberately caused.
      expect(tester.takeException(), isNotNull);
    });

    testWidgets('control: a bound tighter than one word still reports rather than clipping silently',
        (WidgetTester tester) async {
      setPhone(tester);
      // Below the width of the longest single word there is no wrapping that can help, and the correct
      // behaviour is to SAY so — an overflow report — rather than clip the word away. This pins that the
      // fix did not buy its green by hiding the error.
      final Size single = await probeSingleLineSize(tester, label, textScale: 2.0);

      final List<String> overflows = await pumpCollectingOverflows(
        tester,
        host(SizedBox(width: (single.width * 0.2).floorToDouble(), child: const KinetixTag(label)),
            textScale: 2.0),
      );

      expect(overflows, isNotEmpty,
          reason: 'an impossible bound must still be reported, not clipped in silence');
      expect(tester.takeException(), isNotNull);
    });
  });

  group('existing consumers', () {
    testWidgets('KinetixMultiSelect chips wrap at 200% text on a phone', (WidgetTester tester) async {
      setPhone(tester);
      // The only non-block consumer of `KinetixTag` in this package. Its chips sit in a `Wrap`, which
      // hands each child a BOUNDED width, so every one of them now takes the flexible path — this is
      // the consumer most changed by the fix and the one most worth a regression test.
      final List<String> overflows = await pumpCollectingOverflows(
        tester,
        host(
          KinetixMultiSelect(
            options: const <KinetixMultiSelectOption>[
              KinetixMultiSelectOption('a', 'Nurse recorded'),
              KinetixMultiSelectOption('b', 'Clinician verified'),
            ],
            selected: const <String>{'a', 'b'},
            onSelectedChange: (Set<String> _) {},
          ),
          textScale: 2.0,
        ),
      );

      expect(overflows, isEmpty, reason: overflows.join('\n\n'));
      expect(tester.takeException(), isNull);
      expect(find.text('Nurse recorded'), findsOneWidget);
      expect(find.text('Clinician verified'), findsOneWidget);
    });

    testWidgets('a tag with a short label is unchanged — the fix is not a layout rewrite',
        (WidgetTester tester) async {
      setPhone(tester);
      // Guards against the fix quietly changing every tag in the system. A label that already fits must
      // measure exactly as it did: one line, same height, width unchanged by the bound.
      final Size single = await probeSingleLineSize(tester, 'Paid');
      final List<String> overflows = await pumpCollectingOverflows(
        tester,
        host(SizedBox(width: single.width + 80, child: const KinetixTag('Paid'))),
      );

      expect(overflows, isEmpty, reason: overflows.join('\n\n'));
      expect(tester.takeException(), isNull);
      expect(tester.getSize(find.byType(KinetixTag)), single);
    });
  });
}
