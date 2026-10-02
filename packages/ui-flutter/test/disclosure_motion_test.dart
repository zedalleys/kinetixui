import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// kx-verify: reducedMotion

/// The disclosure family's reduced-motion contract on Flutter.
///
/// ## Why this is the strongest native evidence in the slice
///
/// `flutter_test` renders for real and lets a test drive the clock frame by
/// frame, so these assert what the other two platforms cannot: a **rendered
/// intermediate state**. `pump(const Duration(milliseconds: 100))` stops the
/// clock halfway through a 200ms disclosure and measures the box on screen —
/// the same shape of proof `scripts/motion.mjs` produces for the web, by a
/// different mechanism.
///
/// SwiftUI cannot do this (no view-inspection library in that package) and
/// Compose's Robolectric tests assert composition and settled state rather
/// than interpolated geometry. The three platforms are deliberately not
/// claimed to have equal evidence; see the PR body.
///
/// Every case runs in BOTH directions. The web gate shipped covering only
/// expansion and a review caught it: opening and closing are separate
/// animations with separate curves, so proving one says nothing about the
/// other.

/// Hosts a disclosure with a toggle, under a chosen `disableAnimations`.
Widget _host({required bool disableAnimations, required Widget Function(bool expanded) build}) {
  return MediaQuery(
    data: MediaQueryData(disableAnimations: disableAnimations),
    child: Directionality(
      textDirection: TextDirection.ltr,
      child: _Toggler(build: build),
    ),
  );
}

class _Toggler extends StatefulWidget {
  const _Toggler({required this.build});
  final Widget Function(bool expanded) build;
  @override
  State<_Toggler> createState() => _TogglerState();
}

class _TogglerState extends State<_Toggler> {
  bool expanded = false;
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GestureDetector(
          key: const Key('toggle'),
          onTap: () => setState(() => expanded = !expanded),
          child: const SizedBox(width: 100, height: 20, child: Text('toggle')),
        ),
        widget.build(expanded),
      ],
    );
  }
}

const _body = SizedBox(key: Key('body'), width: 200, height: 120);

double _collapsibleHeight(WidgetTester tester) =>
    tester.getSize(find.byType(AnimatedSize)).height;

void main() {
  group('the suppressed duration', () {
    test('is non-zero, which is load-bearing rather than fussy', () {
      // `AnimationController` notifies listeners synchronously at exactly zero, and
      // `RenderAnimatedSize` restarts its controller from inside `performLayout` — so
      // `Duration.zero` re-dirties the render object mid-layout and throws. CI caught that on
      // four reduced-motion tests. This pins the fix so it cannot be tidied back.
      expect(KinetixDisclosureMotion.suppressed, greaterThan(Duration.zero));
      expect(KinetixDisclosureMotion.suppressed.inMilliseconds, 0,
          reason: 'and still well inside one frame, so no movement is perceptible');
    });
  });

  group('KinetixCollapsible — normal motion', () {
    testWidgets('expanding renders a real intermediate height between the ends', (tester) async {
      await tester.pumpWidget(_host(
        disableAnimations: false,
        build: (e) => KinetixCollapsible(expanded: e, child: _body),
      ));
      final collapsed = _collapsibleHeight(tester);
      expect(collapsed, 0, reason: 'starts closed');

      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pump(); // start the animation
      await tester.pump(const Duration(milliseconds: 100)); // halfway through 200ms
      final mid = _collapsibleHeight(tester);

      await tester.pumpAndSettle();
      final open = _collapsibleHeight(tester);

      expect(open, 120, reason: 'ends at the content height');
      expect(mid, greaterThan(collapsed + 1), reason: 'a rendered midpoint, not a jump from 0');
      expect(mid, lessThan(open - 1), reason: 'the midpoint must be strictly between the ends');
    });

    testWidgets('collapsing renders a real intermediate height — the reverse direction', (tester) async {
      await tester.pumpWidget(_host(
        disableAnimations: false,
        build: (e) => KinetixCollapsible(expanded: e, child: _body),
      ));
      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pumpAndSettle();
      final open = _collapsibleHeight(tester);
      expect(open, 120);

      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      final mid = _collapsibleHeight(tester);

      await tester.pumpAndSettle();
      expect(_collapsibleHeight(tester), 0, reason: 'ends closed');
      expect(mid, lessThan(open - 1), reason: 'a rendered midpoint on the way down');
      expect(mid, greaterThan(1), reason: 'the midpoint must be strictly between the ends');
    });
  });

  group('KinetixCollapsible — reduced motion', () {
    testWidgets('expanding reaches the open height in one frame, with no midpoint', (tester) async {
      await tester.pumpWidget(_host(
        disableAnimations: true,
        build: (e) => KinetixCollapsible(expanded: e, child: _body),
      ));
      expect(_collapsibleHeight(tester), 0);

      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      // Same instant the normal-motion test measured a midpoint: here it is already done.
      expect(_collapsibleHeight(tester), 120,
          reason: 'with animations off the height must arrive, not travel');

      await tester.pumpAndSettle();
      expect(_collapsibleHeight(tester), 120, reason: 'and the final state must still be correct');
    });

    testWidgets('collapsing reaches closed in one frame — the reverse direction', (tester) async {
      await tester.pumpWidget(_host(
        disableAnimations: true,
        build: (e) => KinetixCollapsible(expanded: e, child: _body),
      ));
      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pumpAndSettle();
      expect(_collapsibleHeight(tester), 120);

      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(_collapsibleHeight(tester), 0, reason: 'closing is suppressed too, not just opening');
    });

    testWidgets('the content is still reachable — suppression is not removal', (tester) async {
      await tester.pumpWidget(_host(
        disableAnimations: true,
        build: (e) => KinetixCollapsible(expanded: e, child: _body),
      ));
      expect(find.byKey(const Key('body')), findsNothing);
      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('body')), findsOneWidget,
          reason: 'reduced motion removes the movement, never the state change');
    });
  });

  group('KinetixAccordion chevron', () {
    // Deliberately no MaterialApp: the trigger needs a `KinetixTheme` ancestor and
    // nothing more, and MaterialApp installs its own MediaQuery over the one these
    // tests set — the very setting under test would be silently discarded. CI caught
    // the missing theme as an assertion from `KinetixTheme.of`, which left no chevron
    // in the tree to read at all.
    Future<void> pumpAccordion(WidgetTester tester, {required bool disableAnimations}) {
      return tester.pumpWidget(MediaQuery(
        data: MediaQueryData(disableAnimations: disableAnimations),
        child: Directionality(
          textDirection: TextDirection.ltr,
          child: KinetixTheme(
            brightness: Brightness.light,
            child: _Toggler(build: (e) => KinetixAccordionTrigger('Q', expanded: e, onTap: () {})),
          ),
        ),
      ));
    }

    /// Scoped to the trigger's own subtree, so the angle read is the chevron's rather
    /// than any other rotation that happens to be in the tree.
    double chevronTurns(WidgetTester tester) => tester
        .widget<RotationTransition>(find.descendant(
          of: find.byType(KinetixAccordionTrigger),
          matching: find.byType(RotationTransition),
        ))
        .turns
        .value;

    testWidgets('rotates through an intermediate angle under normal motion', (tester) async {
      await pumpAccordion(tester, disableAnimations: false);
      expect(chevronTurns(tester), closeTo(0.0, 0.001), reason: 'starts unrotated');

      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      final mid = chevronTurns(tester);

      await tester.pumpAndSettle();
      expect(chevronTurns(tester), closeTo(0.5, 0.001), reason: 'ends at half a turn');
      expect(mid, greaterThan(0.001));
      expect(mid, lessThan(0.499), reason: 'a rendered angle between the two ends');
    });

    testWidgets('still reaches half a turn with animations off, in both directions', (tester) async {
      await pumpAccordion(tester, disableAnimations: true);

      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(chevronTurns(tester), closeTo(0.5, 0.001),
          reason: 'the angle is state — it must arrive, not be skipped');

      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pumpAndSettle();
      expect(chevronTurns(tester), closeTo(0.0, 0.001), reason: 'and come back');
    });
  });

  group('geometry under RTL and large text', () {
    // One case per test rather than a loop over a single tester. `pumpWidget` reuses the
    // element tree, so a second pump inside one test kept `_TogglerState.expanded` from
    // the first and the tap closed the disclosure instead of opening it — CI read 0 where
    // the open height was expected, and a re-pumped `AnimatedSize` additionally tripped
    // Flutter's "mutated in its own performLayout" assertion.
    Future<void> pumpIn(
      WidgetTester tester, {
      required TextDirection direction,
      double textScale = 1,
      bool reduce = false,
    }) {
      return tester.pumpWidget(MediaQuery(
        data: MediaQueryData(disableAnimations: reduce, textScaler: TextScaler.linear(textScale)),
        child: Directionality(
          textDirection: direction,
          child: _Toggler(build: (e) => KinetixCollapsible(expanded: e, child: _body)),
        ),
      ));
    }

    Future<void> openIt(WidgetTester tester) async {
      await tester.tap(find.byKey(const Key('toggle')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
    }

    testWidgets('disclosure reaches the same open height in LTR', (tester) async {
      await pumpIn(tester, direction: TextDirection.ltr);
      await openIt(tester);
      await tester.pumpAndSettle();
      expect(_collapsibleHeight(tester), 120);
    });

    testWidgets('disclosure reaches the same open height in RTL', (tester) async {
      await pumpIn(tester, direction: TextDirection.rtl);
      await openIt(tester);
      await tester.pumpAndSettle();
      expect(_collapsibleHeight(tester), 120,
          reason: 'disclosure is vertical: text direction must not change it');
    });

    testWidgets('a 2x text scale still settles with motion on', (tester) async {
      await pumpIn(tester, direction: TextDirection.ltr, textScale: 2);
      await openIt(tester);
      await tester.pumpAndSettle();
      expect(_collapsibleHeight(tester), 120,
          reason: 'the end state must not depend on text scale');
    });

    testWidgets('a 2x text scale still suppresses when asked, and still settles', (tester) async {
      await pumpIn(tester, direction: TextDirection.ltr, textScale: 2, reduce: true);
      await openIt(tester);
      expect(_collapsibleHeight(tester), 120,
          reason: 'suppressed at a large text scale too: the height arrives rather than travels');
      await tester.pumpAndSettle();
      expect(_collapsibleHeight(tester), 120);
    });
  });
}
