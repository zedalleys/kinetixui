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

/// A container that offers at most [width], the way a real one does.
///
/// Deliberately NOT `SizedBox(width:)`, which is a TIGHT constraint and makes its child exactly that
/// wide whatever the child wants — the pre-fix tag included. A tight box cannot tell a tag that hugs
/// its label from one that stretches to fill the room, and the short-label case below failed for
/// precisely that reason on its first run. A card's content box and a `Wrap`'s cell both hand their
/// child a LOOSE maximum, so that is what is modelled here.
Widget bound(double width, {required Widget child}) =>
    ConstrainedBox(constraints: BoxConstraints(maxWidth: width), child: child);

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

/// The pre-review tag, reproduced: the same `Row` and the same flexible label, wrapped in the
/// `LayoutBuilder` that Codex's exact-head review of `2415c61` had removed.
///
/// It exists because "`IntrinsicWidth` does not throw" is a claim about an instrument as much as about
/// the tag: it would pass just as well if nothing in this file could ever provoke an intrinsic-sizing
/// failure. Injecting the removed form and REQUIRING it to throw is what makes those cases evidence.
/// Retained as a standing control at the owner's direction, alongside [UnwrappedTagReplica], which is
/// the same idea for bounded wrapping.
class LayoutBuilderTagReplica extends StatelessWidget {
  const LayoutBuilderTagReplica(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: KinetixTheme.of(context).secondary,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (constraints.hasBoundedWidth)
                Flexible(child: Text(label, textWidthBasis: TextWidthBasis.longestLine))
              else
                Text(label, textWidthBasis: TextWidthBasis.longestLine),
            ],
          ),
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
          host(bound(bounded, child: const KinetixTag(label)), textScale: scale),
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
      // `getSemantics` throws unless the semantics tree is being built, and it must be asked for
      // before the first pump.
      final SemanticsHandle handle = tester.ensureSemantics();
      final Size single =
          await probeSingleLineSize(tester, label, textScale: 2.0, removable: true);
      int removed = 0;

      final List<String> overflows = await pumpCollectingOverflows(
        tester,
        host(
          // The bound is read off the REMOVABLE tag's own single-line width: the dismiss control takes
          // room that a plain tag's probe knows nothing about, and sizing from the plain probe would
          // squeeze the control below its minimum for a reason unrelated to wrapping.
          bound(
            (single.width * 0.8).floorToDouble(),
            child: KinetixTag(label, onRemove: () => removed++),
          ),
          textScale: 2.0,
        ),
      );

      expect(overflows, isEmpty, reason: overflows.join('\n\n'));
      expect(tester.takeException(), isNull);

      expect(tester.getSemantics(find.bySemanticsLabel('Remove $label')),
          isSemantics(label: 'Remove $label', isButton: true, hasTapAction: true));
      // What TalkBack / VoiceOver's activate gesture sends: the semantics tap action, not a pointer
      // event. A pointer tap would also pass while the control was unreachable to a screen reader.
      tester.semantics.tap(find.semantics.byLabel('Remove $label'));
      expect(removed, 1, reason: 'the dismiss control must still work once the label wraps around it');
      // Disposed here, not in a tearDown: flutter_test verifies that no handle is active at the end of
      // the test BODY, which runs before any tearDown, so addTearDown is too late.
      handle.dispose();
    });
  });

  group('unbounded width: the previous behaviour stands, and nothing asserts', () {
    // `Flexible` under unbounded constraints throws a parent-data/intrinsics assertion. These are the
    // everyday unbounded hosts; if `lib/src/tag.dart` ever drops its `hasBoundedWidth` guard, each of
    // them crashes here rather than in someone's app. `UnconstrainedBox` is deliberately NOT one of
    // them: it reports an overflow of its own when the child exceeds the incoming width, which at 200%
    // text on a 390 surface it would — so a red there would be a different defect wearing this one's
    // clothes. A scroll view clips without reporting, which is what this group needs.
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

  group('intrinsic sizing: a parent may ask the tag how wide it wants to be', () {
    // Added after Codex's exact-head review of `2415c61`, which was right: the first version of the
    // wrapping fix wrapped the whole tag in a `LayoutBuilder` to choose between a flexible and an
    // inflexible label. `LayoutBuilder` THROWS when asked for an intrinsic dimension — and with
    // assertions disabled returns zero instead, which is worse — so a tag under any intrinsic-sizing
    // parent broke on a layout that had worked before.
    //
    // The guard was also unnecessary. `RenderFlex` permits a LOOSE flexible child under unbounded
    // constraints when `mainAxisSize` is `min`; its assertion fires only for `MainAxisSize.max` or a
    // tight fit, and `Flexible` defaults to loose. The unbounded group above is the evidence for that
    // half: it passes with the label unconditionally flexible.
    //
    // These are the cases that would have caught the regression, and they are the reason the builder
    // is gone rather than merely suspected.
    final Map<String, Widget Function(Widget tag)> intrinsic = <String, Widget Function(Widget)>{
      'IntrinsicWidth': (Widget tag) => IntrinsicWidth(child: tag),
      'IntrinsicHeight around a row of tags': (Widget tag) => IntrinsicHeight(
            child: Row(mainAxisSize: MainAxisSize.min, children: <Widget>[tag]),
          ),
      'a Table column sized to its contents': (Widget tag) => Table(
            defaultColumnWidth: const IntrinsicColumnWidth(),
            children: <TableRow>[
              TableRow(children: <Widget>[tag]),
            ],
          ),
    };

    for (final MapEntry<String, Widget Function(Widget)> entry in intrinsic.entries) {
      testWidgets('${entry.key} does not throw, at 200% text', (WidgetTester tester) async {
        setPhone(tester);
        final List<String> overflows = await pumpCollectingOverflows(
          tester,
          host(entry.value(const KinetixTag(label)), textScale: 2.0),
        );

        // The assertion that matters is this one. A `LayoutBuilder` here throws
        // "LayoutBuilder does not support returning intrinsic dimensions".
        expect(tester.takeException(), isNull,
            reason: 'asking the tag for an intrinsic dimension must not throw');
        expect(overflows, isEmpty, reason: overflows.join('\n\n'));
        expect(find.text(label), findsOneWidget);
      });
    }

    testWidgets('IntrinsicWidth gives a short tag exactly the width it wants',
        (WidgetTester tester) async {
      setPhone(tester);
      // Not just "does not throw": the intrinsic width must be the RIGHT width. With assertions
      // disabled a `LayoutBuilder` reports zero rather than throwing, which would make a tag under
      // this parent collapse silently — so the size is asserted, not only the absence of an exception.
      final Size single = await probeSingleLineSize(tester, 'Paid');
      await tester.pumpWidget(host(const IntrinsicWidth(child: KinetixTag('Paid'))));
      await tester.pump(const Duration(milliseconds: 50));

      expect(tester.takeException(), isNull);
      expect(tester.getSize(find.byType(KinetixTag)), single);
    });

    testWidgets('control: the removed LayoutBuilder form DOES break under IntrinsicWidth',
        (WidgetTester tester) async {
      setPhone(tester);
      // Collected through `FlutterError.onError` rather than read from `takeException()`. One broken
      // intrinsic-sizing pass raises FOUR errors — the assertion in `performLayout` and three
      // consequences of the layout it abandoned — and `takeException()` then returns the aggregate
      // 'multiple exceptions (4) were detected' summary, which names no cause at all. Asserting the
      // documented reason against that summary failed on CI at `2191ddd` while the control was in fact
      // working perfectly: the first collected error reads 'LayoutBuilder does not support returning
      // intrinsic dimensions.' So the whole set is collected and the reason is required to appear in
      // it, which is both true to the framework's behaviour and still a statement about the cause.
      final List<String> errors = await pumpCollectingOverflows(
          tester, host(const IntrinsicWidth(child: LayoutBuilderTagReplica(label))));

      expect(errors, isNotEmpty,
          reason: 'the removed form must still break here, or the three cases above are claims about '
              'an instrument that cannot fail');
      expect(errors.any((String e) => e.toLowerCase().contains('intrinsic')), isTrue,
          reason: 'and it must break FOR THE DOCUMENTED REASON — LayoutBuilder refusing to report an '
              'intrinsic dimension — not for some unrelated reason that happens to throw. Collected:\n'
              '${errors.join('\n\n')}');
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
                bound(bounded, child: KinetixTag(label, variant: variant, onRemove: () {})),
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
        host(bound(bounded, child: const UnwrappedTagReplica(label)), textScale: 2.0),
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

      // Deliberately NOT asserting `takeException()` here. The collector above REPLACES
      // `FlutterError.onError` for the duration of the pump, so the error never reaches the test's own
      // exception reporter and `takeException()` is null — which says nothing either way. Asserting it
      // was non-null is a mistake this control made on its first run, and it failed for that reason
      // while the overflow it exists to catch had been caught correctly.
    });

    testWidgets('a bound tighter than the longest word is clipped INSIDE the paragraph, which this '
        'instrument cannot see', (WidgetTester tester) async {
      setPhone(tester);
      // A named limit, not a control. The first version of this test asserted that an impossible bound
      // would still be REPORTED rather than clipped in silence. It does not: measured, Flutter raises
      // nothing here. The flexed label is handed a loose constraint, `RenderParagraph` clamps its own
      // size to that constraint, and the glyphs that do not fit are drawn outside the paragraph's box
      // and clipped by whatever is above it. No `RenderFlex` ever overflows, so the whole family of
      // gates in this repository that watch for overflow — including this file — is blind to it.
      //
      // That blind spot is recorded here rather than left as a passing assertion about something else.
      // It is not reachable from the blocks: their narrowest real bound is a `KinetixCard` at ~342px
      // against a longest word of ~200px at 200% text. It would matter at a text scale beyond 200% or
      // in a container narrower than any this system ships.
      final Size single = await probeSingleLineSize(tester, label, textScale: 2.0);
      final double impossible = (single.width * 0.2).floorToDouble();

      final List<String> overflows = await pumpCollectingOverflows(
        tester,
        host(bound(impossible, child: const KinetixTag(label)), textScale: 2.0),
      );

      expect(overflows, isEmpty,
          reason: 'if this ever reddens, Flutter HAS started reporting the case and the comment above '
              'is out of date — rewrite it as a real control');
      expect(tester.getSize(find.byType(KinetixTag)).width, lessThanOrEqualTo(impossible));
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
        host(bound(single.width + 80, child: const KinetixTag('Paid'))),
      );

      expect(overflows, isEmpty, reason: overflows.join('\n\n'));
      expect(tester.takeException(), isNull);
      expect(tester.getSize(find.byType(KinetixTag)), single);
    });
  });
}
